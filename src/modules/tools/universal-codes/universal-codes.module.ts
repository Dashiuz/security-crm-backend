import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { ContextModule } from '../../../common/context/context.module';
import { UniversalCodesController } from './controllers/universal-codes.controller';
import { PublicUniversalCodesController } from './controllers/public-universal-codes.controller';
import { UniversalCodesService } from './services/universal-codes.service';
import { UniversalCodesRepository } from './repositories/universal-codes.repository';

@Module({
  imports: [PrismaModule, ContextModule],
  controllers: [UniversalCodesController, PublicUniversalCodesController],
  providers: [UniversalCodesRepository, UniversalCodesService],
  exports: [UniversalCodesService, UniversalCodesRepository],
})
export class UniversalCodesModule {}
