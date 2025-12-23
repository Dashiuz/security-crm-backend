import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { JwtFromRequestFunction } from 'passport-jwt';
import { JwtPayload } from 'src/common/types/jwtPayload.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly configService: ConfigService) {
    const jwtFromAuthHeader: JwtFromRequestFunction =
      ExtractJwt.fromAuthHeaderAsBearerToken();
    const secret: string | undefined = configService.get<string>('api.secret');

    if (!secret) {
      throw new Error(
        'JWT secret is not configured. Set `api.secret` in your configuration.',
      );
    }

    super({
      jwtFromRequest: jwtFromAuthHeader,
      secretOrKey: secret,
    });
  }

  validate(payload: JwtPayload) {
    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Invalid token payload');
    }

    const requiredScope = 'reports:module';
    if (payload.scope && !payload.scope.includes(requiredScope)) {
      throw new ForbiddenException('Insufficient scope for reports');
    }

    return {
      sub: payload.sub,
      scope: payload.scope ?? [],
      jti: payload.jti,
    };
  }
}
