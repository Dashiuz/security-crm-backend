import { Module } from '@nestjs/common';
import { CommercialSettingsController } from './controllers/commercial-settings.controller';
import { CommercialSettingsService } from './services/commercial-settings.service';
import { TariffCalculationEngine } from './services/tariff-calculation.service';
import { GuardSalaryCalculationEngine } from './services/guard-salary-calculation.service';
import { PrismaModule } from '../../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CommercialSettingsController],
  providers: [
    CommercialSettingsService,
    TariffCalculationEngine,
    GuardSalaryCalculationEngine,
  ],
  exports: [
    CommercialSettingsService,
    TariffCalculationEngine,
    GuardSalaryCalculationEngine,
  ],
})
export class CommercialSettingsModule {}
