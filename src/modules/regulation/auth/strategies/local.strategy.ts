import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
  constructor(private readonly auth: AuthService) {
    super({ usernameField: 'document', passwordField: 'password' });
  }

  async validate(document: string, password: string) {
    const user = await this.auth.validateUser(document, password);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    return user;
  }
}
