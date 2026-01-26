import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { configuration } from './settings/config';
import { PrismaModule } from './prisma/prisma.module';
import {
  AuthModule,
  AccessControlModule,
  EmployeeModule,
  UserModule,
  PermissionModule,
  RoleModule,
} from './modules/index';

@Module({
  imports: [
    ConfigModule.forRoot({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      envFilePath: configuration[process.env.NODE_ENV || ''] || '.env',
      load: [configuration],
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    AccessControlModule,
    EmployeeModule,
    UserModule,
    PermissionModule,
    RoleModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
