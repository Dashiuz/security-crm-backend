import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  expiresIn: number;
  secret: string;

  constructor(
    private readonly jwtService: JwtService,
    private configService: ConfigService,
  ) {
    this.expiresIn = this.configService.get<number>('api.expiresIn') || 86400;
    this.secret = this.configService.get<string>('api.secret') || '';
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async generateDummyToken() {
    if (!this.secret) {
      throw new Error('JWT secret is not defined');
    }

    const payload = {
      sub: crypto.randomUUID(),
      scope: ['reports:module'],
      jti: crypto.randomUUID(),
      iat: Math.floor(Date.now() / 1000),
    };

    return this.jwtService.sign(payload, { expiresIn: this.expiresIn });
  }
}
