import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { configuration } from './settings/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/regulation/auth/auth.module';
import { AccessControlModule } from './modules/regulation/access-control/access-control.module';
import { EmployeeModule } from './modules/regulation/employee/employee.module';

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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
