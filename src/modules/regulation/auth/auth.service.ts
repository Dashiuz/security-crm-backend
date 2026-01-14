import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { CookieOptions } from 'express';
import { randomBytes, createHash, timingSafeEqual } from 'crypto';
import * as argon2 from 'argon2';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserService } from '../user/user.service';
import { JwtPayload } from './types/jwt-payload';
import { LoginResult } from './types/login-result';
import { RefreshResult } from './types/refresh-result';

@Injectable()
export class AuthService {
  private readonly refreshCookieName = 'refresh_token';

  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UserService,
    private readonly jwt: JwtService,
  ) {}

  // ----- Password verification (LocalStrategy uses this)
  async validateUser(document: string, password: string) {
    const user = await this.users.findActiveByDocument(document);

    console.log('user data');
    console.log(user);

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

  // ----- Login issues access + refresh (rotating sessions)
  async login(
    user: { id: string; tenantId: string },
    meta: { ip?: string; userAgent?: string },
  ): Promise<LoginResult> {
    const permissions = await this.users.getUserPermissions(user.id);

    const accessToken = await this.signAccessToken({
      sub: user.id,
      tenantId: user.tenantId,
      permissions,
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

  // ----- Refresh rotation
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

    const session = await this.prisma.userSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        revokedAt: true,
        refreshTokenHash: true,
        user: {
          select: {
            id: true,
            tenantId: true,
            isActive: true,
            tenant: { select: { isActive: true } },
          },
        },
      },
    });

    if (!session) throw new UnauthorizedException('Session not found');
    if (session.revokedAt) throw new UnauthorizedException('Session revoked');
    if (session.expiresAt.getTime() <= Date.now())
      throw new UnauthorizedException('Session expired');
    if (!session.user.isActive || !session.user.tenant.isActive)
      throw new ForbiddenException('User/Tenant inactive');

    const secretHash = this.hashRefreshSecret(secret);
    if (!this.safeEqual(secretHash, session.refreshTokenHash)) {
      // Potential token theft: revoke session (and optionally all sessions for that user).
      await this.prisma.userSession.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Refresh token mismatch');
    }

    // Rotate: revoke old session + create new
    const permissions = await this.users.getUserPermissions(session.userId);
    const accessToken = await this.signAccessToken({
      sub: session.userId,
      tenantId: session.user.tenantId,
      permissions,
      jti: this.newJti(),
    });

    const { refreshToken: newRefreshToken, sessionId: newSessionId } =
      await this.createRefreshSession(session.userId, meta);

    await this.prisma.userSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date(), replacedById: newSessionId },
    });

    return {
      accessToken,
      refreshCookie: this.buildRefreshCookie(newRefreshToken),
    };
  }

  // ----- Logout: revoke current session
  async logout(refreshTokenRaw: string | undefined) {
    if (!refreshTokenRaw) return;

    const parsed = this.parseRefreshToken(refreshTokenRaw);
    if (!parsed) return;

    await this.prisma.userSession.updateMany({
      where: { id: parsed.sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
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

    const session = await this.prisma.userSession.create({
      data: {
        userId,
        refreshTokenHash: 'placeholder', // set below
        ip: meta.ip,
        userAgent: meta.userAgent,
        expiresAt,
      },
      select: { id: true },
    });

    const secret = randomBytes(32).toString('hex');
    const refreshToken = `${session.id}.${secret}`;
    const refreshTokenHash = this.hashRefreshSecret(secret);

    await this.prisma.userSession.update({
      where: { id: session.id },
      data: { refreshTokenHash },
    });

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
    // Constant-ish time compare for equal-length strings
    // if (a.length !== b.length) return false;
    // let res = 0;
    // for (let i = 0; i < a.length; i++) res |= a.charCodeAt(i) ^ b.charCodeAt(i);
    // return res === 0;

    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }

  private buildRefreshCookie(value: string) {
    const isProd = (process.env.NODE_ENV ?? 'development') === 'production';

    const cookieOptions: CookieOptions = {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax', // if frontend is on a different domain, use 'none' + secure
      path: '/auth/refresh',
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
      path: '/auth/refresh',
      maxAge: 0,
    };

    return { name: this.refreshCookieName, value: '', options };
  }
}
