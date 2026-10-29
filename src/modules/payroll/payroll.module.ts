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
import { PayrollEmployeesController } from './controllers/payroll-employees.controller';
import { PayrollEmployeesService } from './services/payroll-employees.service';
import { RenovaExcelExporterService } from './services/renova-excel-exporter.service';
import { PayrollEmployeesRepository } from './repositories/payroll-employees.repository';

@Module({
  imports: [PrismaModule],
  controllers: [
    PayrollSettingsController,
    PayrollConceptsController,
    PayrollDependenciesController,
    PayrollCatalogsController,
    PayrollEmployeesController,
  ],
  providers: [
    ColombianHolidayEngine,
    ModalityBreakdownEngine,
    PayrollSettingsService,
    PayrollConceptsService,
    PayrollDependenciesService,
    PayrollCatalogsService,
    PayrollEmployeesRepository,
    RenovaExcelExporterService,
    PayrollEmployeesService,
  ],
  exports: [
    ColombianHolidayEngine,
    ModalityBreakdownEngine,
    PayrollSettingsService,
    PayrollConceptsService,
    PayrollDependenciesService,
    PayrollCatalogsService,
    PayrollEmployeesService,
    RenovaExcelExporterService,
  ],
})
export class PayrollModule {}
