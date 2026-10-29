import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ColombianHolidayEngine } from './engines/colombian-holiday.engine';
import { ModalityBreakdownEngine } from './engines/modality-breakdown.engine';
import { PayrollSettingsService } from './services/payroll-settings.service';
import { PayrollConceptsService } from './services/payroll-concepts.service';
import { PayrollDependenciesService } from './services/payroll-dependencies.service';
import { PayrollCatalogsService } from './services/payroll-catalogs.service';
import { PayrollSettingsController } from './controllers/payroll-settings.controller';
import { PayrollConceptsController } from './controllers/payroll-concepts.controller';
import { PayrollDependenciesController } from './controllers/payroll-dependencies.controller';
import { PayrollCatalogsController } from './controllers/payroll-catalogs.controller';

@Module({
  imports: [PrismaModule],
  controllers: [
    PayrollSettingsController,
    PayrollConceptsController,
    PayrollDependenciesController,
    PayrollCatalogsController,
  ],
  providers: [
    ColombianHolidayEngine,
    ModalityBreakdownEngine,
    PayrollSettingsService,
    PayrollConceptsService,
    PayrollDependenciesService,
    PayrollCatalogsService,
  ],
  exports: [
    ColombianHolidayEngine,
    ModalityBreakdownEngine,
    PayrollSettingsService,
    PayrollConceptsService,
    PayrollDependenciesService,
    PayrollCatalogsService,
  ],
})
export class PayrollModule {}
