import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from 'src/modules/regulation/auth/strategies/jwt.strategy';
import { requireEnv } from 'src/settings/env';
import { UserModule, UserService } from 'src/modules/index';
import {
  UserRepositoryModule,
  EmployeeRepositoryModule,
} from '../../../common/repository/index';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: requireEnv('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: configService.get('api.expiresIn'),
        },
      }),
    }),
    UserModule,
    UserRepositoryModule,
    //EmployeeRepositoryModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, UserService, LocalStrategy, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
