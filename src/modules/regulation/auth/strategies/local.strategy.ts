import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
  constructor(private readonly auth: AuthService) {
    super({
      usernameField: 'document',
      passwordField: 'password',
      passReqToCallback: true,
    });
  }

  async validate(req: any, document: string, password: string) {
    const tenantId = req.body.tenantId;
    const user = await this.auth.validateUser(document, password, tenantId);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    return user;
  }
}
