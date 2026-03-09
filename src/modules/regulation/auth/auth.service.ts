import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { CookieOptions } from 'express';
import { randomBytes, createHash, timingSafeEqual } from 'crypto';
import * as argon2 from 'argon2';
import { UserRepositoryService } from '../../../common/repository/index';
import { JwtPayload } from './types/jwt-payload';
import { LoginResult } from './types/login-result';
import { RefreshResult } from './types/refresh-result';
import { SessionObjectInterface } from '../../../common/interfaces/index';

@Injectable()
export class AuthService {
  private readonly refreshCookieName = 'refresh_token';

  constructor(
    private readonly userRepository: UserRepositoryService,
    private readonly jwt: JwtService,
  ) {}

  // Password verification (LocalStrategy uses this)
  async validateUser(document: string, password: string, tenantId: string) {
    const user = await this.userRepository.findActiveByDocument(document);

    if (!user) return null;

    const ok = await argon2.verify(user.passwordHash, password);

    if (!ok) return null;

    return {
      id: user.id,
      tenantId: user.tenantId,
      username: user.fullName,
      document,
    };
  }

  // Login issues access + refresh (rotating sessions)
  async login(
    user: { id: string; tenantId: string },
    meta: { ip?: string; userAgent?: string },
  ): Promise<LoginResult> {
    const [permissions, roles, features] = await Promise.all([
      this.userRepository.getUserPermissions(user.id),
      this.userRepository.getUserRoles(user.id),
      this.userRepository.getTenantFeatures(user.tenantId),
    ]);

    const accessToken = await this.signAccessToken({
      sub: user.id,
      tenantId: user.tenantId,
      permissions,
      roles,
      features,
      jti: this.newJti(),
    });

    const { refreshToken, sessionId } = await this.createRefreshSession(
      user.id,
      meta,
    );

    return {
      accessToken,
      refreshCookie: this.buildRefreshCookie(refreshToken),
    };
  }

  // Refresh rotation
  async refresh(
    refreshTokenRaw: string | undefined,
    meta: { ip?: string; userAgent?: string },
  ): Promise<RefreshResult> {
    if (!refreshTokenRaw)
      throw new UnauthorizedException('Missing refresh token');

    const parsed = this.parseRefreshToken(refreshTokenRaw);

    if (!parsed)
      throw new UnauthorizedException('Invalid refresh token format');

    const { sessionId, secret } = parsed;

    const session = await this.userRepository.findUserSession(sessionId);

    if (!session) throw new UnauthorizedException('Session not found');

    if (session.revokedAt) throw new UnauthorizedException('Session revoked');

    if (session.expiresAt.getTime() <= Date.now())
      throw new UnauthorizedException('Session expired');

    if (!session.user.isActive || !session.user.tenant.isActive)
      throw new ForbiddenException('User/Tenant inactive');

    const secretHash = this.hashRefreshSecret(secret);

    if (!this.safeEqual(secretHash, session.refreshTokenHash)) {
      // Potential token theft: revoke session (and optionally all sessions for that user).
      await this.userRepository.tokenThiefRevokeSession(session.id);

      throw new UnauthorizedException('Refresh token mismatch');
    }

    // Fetch updated permissions/roles/features for the new access token
    const [permissions, roles, features] = await Promise.all([
      this.userRepository.getUserPermissions(session.userId),
      this.userRepository.getUserRoles(session.userId),
      this.userRepository.getTenantFeatures(session.user.tenantId),
    ]);

    // Final Step: Decide whether to rotate the refresh token or just issue a new access token
    const rotateWindowDays = Number(
      process.env.REFRESH_ROTATE_WINDOW_DAYS ?? 3,
    );
    const rotateWindowMs = rotateWindowDays * 24 * 60 * 60 * 1000;

    const shouldRotate =
      session.expiresAt.getTime() - Date.now() <= rotateWindowMs;

    const accessToken = await this.signAccessToken({
      sub: session.userId,
      tenantId: session.user.tenantId,
      permissions,
      roles,
      features,
      jti: this.newJti(),
    });

    if (!shouldRotate) {
      // No rotation: just return the new access token
      return { accessToken };
    }

    // Full Rotation: revoke old session + create new
    const { refreshToken: newRefreshToken, sessionId: newSessionId } =
      await this.createRefreshSession(session.userId, meta);

    await this.userRepository.refreshUserSession(session.id, newSessionId);

    return {
      accessToken,
      refreshCookie: this.buildRefreshCookie(newRefreshToken),
    };
  }

  // Logout: revoke current session with cookie
  async logout(refreshTokenRaw: string | undefined) {
    if (!refreshTokenRaw) return;

    const parsed = this.parseRefreshToken(refreshTokenRaw);
    if (!parsed) return;

    await this.userRepository.revokeSession(parsed.sessionId);
  }

  // Logout: revoke all sessions for user
  async logoutAllSessions(userId: string) {
    await this.userRepository.revokeAllSessionsForUser(userId);
  }

  // =========================
  // Internals
  // =========================

  private async signAccessToken(payload: JwtPayload): Promise<string> {
    return this.jwt.signAsync(payload);
  }

  private newJti(): string {
    return randomBytes(16).toString('hex');
  }

  private async createRefreshSession(
    userId: string,
    meta: { ip?: string; userAgent?: string },
  ) {
    const sessionTtlDays = Number(process.env.REFRESH_TTL_DAYS ?? 14);
    const expiresAt = new Date(
      Date.now() + sessionTtlDays * 24 * 60 * 60 * 1000,
    );

    const sessionData: SessionObjectInterface = {
      userId,
      refreshTokenHash: 'placeholder', // set below
      ip: meta.ip,
      userAgent: meta.userAgent,
      expiresAt,
    };

    const session = await this.userRepository.createUserSession(sessionData);
    const secret = randomBytes(32).toString('hex');
    const refreshToken = `${session.id}.${secret}`;
    const refreshTokenHash = this.hashRefreshSecret(secret);

    await this.userRepository.updateUserSessionTokenHash(
      session.id,
      refreshTokenHash,
    );

    return { refreshToken, sessionId: session.id };
  }

  private parseRefreshToken(
    token: string,
  ): { sessionId: string; secret: string } | null {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [sessionId, secret] = parts;
    if (!sessionId || !secret) return null;
    return { sessionId, secret };
  }

  private hashRefreshSecret(secret: string): string {
    return createHash('sha256').update(secret).digest('hex');
  }

  private safeEqual(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);

    if (bufA.length !== bufB.length) return false;

    return timingSafeEqual(bufA, bufB);
  }

  private buildRefreshCookie(value: string) {
    const isProd = (process.env.NODE_ENV ?? 'development') === 'production';

    const cookieOptions: CookieOptions = {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax', // if frontend is on a different domain, use 'none' + secure
      path: '/',
      maxAge: Number(
        process.env.REFRESH_COOKIE_MAXAGE_MS ?? 14 * 24 * 60 * 60 * 1000,
      ),
    };

    return { name: this.refreshCookieName, value, options: cookieOptions };
  }

  clearRefreshCookie() {
    const isProd = (process.env.NODE_ENV ?? 'development') === 'production';

    const options: CookieOptions = {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
      maxAge: 0,
    };

    return { name: this.refreshCookieName, value: '', options };
  }
}
