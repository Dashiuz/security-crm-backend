import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { configuration } from './settings/config';
import { PrismaModule } from './prisma/prisma.module';
import { ContextModule } from './common/context/context.module';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import {
  AuthModule,
  AccessControlModule,
  EmployeeModule,
  UserModule,
  PermissionModule,
  RoleModule,
  TenantModule,
  DepartmentModule,
  PositionModule,
  MinutaModule,
  ClientModule,
  ResidentModule,
  ProspectModule,
  StorageModule,
} from './modules/index';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [`.env.${process.env.NODE_ENV || 'development'}`, '.env'],
      load: [configuration],
      isGlobal: true,
    }),
    ContextModule,
    PrismaModule,
    AuthModule,
    AccessControlModule,
    TenantModule,
    RoleModule,
    PermissionModule,
    DepartmentModule,
    PositionModule,
    ClientModule,
    ResidentModule,
    ProspectModule,
    EmployeeModule,
    UserModule,
    MinutaModule,
    StorageModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
