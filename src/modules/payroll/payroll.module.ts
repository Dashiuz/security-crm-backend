import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ColombianHolidayEngine } from './engines/colombian-holiday.engine';
import { ModalityBreakdownEngine } from './engines/modality-breakdown.engine';
import { ShiftSequenceEngine } from './engines/shift-sequence.engine';
import { PayrollSettingsService } from './services/payroll-settings.service';
import { PayrollConceptsService } from './services/payroll-concepts.service';
import { PayrollDependenciesService } from './services/payroll-dependencies.service';
import { PayrollCatalogsService } from './services/payroll-catalogs.service';
import { PayrollEmployeesService } from './services/payroll-employees.service';
import { RenovaExcelExporterService } from './services/renova-excel-exporter.service';
import { PayrollNoveltiesService } from './services/payroll-novelties.service';
import { PayrollShiftsService } from './services/payroll-shifts.service';
import { PayrollEmployeesRepository } from './repositories/payroll-employees.repository';
import { PayrollSettingsController } from './controllers/payroll-settings.controller';
import { PayrollConceptsController } from './controllers/payroll-concepts.controller';
import { PayrollDependenciesController } from './controllers/payroll-dependencies.controller';
import { PayrollCatalogsController } from './controllers/payroll-catalogs.controller';
import { PayrollEmployeesController } from './controllers/payroll-employees.controller';
import { PayrollNoveltiesController } from './controllers/payroll-novelties.controller';
import { PayrollShiftsController } from './controllers/payroll-shifts.controller';

@Module({
  imports: [PrismaModule],
  controllers: [
    PayrollSettingsController,
    PayrollConceptsController,
    PayrollDependenciesController,
    PayrollCatalogsController,
    PayrollEmployeesController,
    PayrollNoveltiesController,
    PayrollShiftsController,
  ],
  providers: [
    ColombianHolidayEngine,
    ModalityBreakdownEngine,
    ShiftSequenceEngine,
    PayrollSettingsService,
    PayrollConceptsService,
    PayrollDependenciesService,
    PayrollCatalogsService,
    PayrollEmployeesRepository,
    RenovaExcelExporterService,
    PayrollEmployeesService,
    PayrollNoveltiesService,
    PayrollShiftsService,
  ],
  exports: [
    ColombianHolidayEngine,
    ModalityBreakdownEngine,
    ShiftSequenceEngine,
    PayrollSettingsService,
    PayrollConceptsService,
    PayrollDependenciesService,
    PayrollCatalogsService,
    PayrollEmployeesService,
    RenovaExcelExporterService,
    PayrollNoveltiesService,
    PayrollShiftsService,
  ],
})
export class PayrollModule {}
