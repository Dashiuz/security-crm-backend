import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ColombianHolidayEngine } from './engines/colombian-holiday.engine';
import { ModalityBreakdownEngine } from './engines/modality-breakdown.engine';
import { ShiftSequenceEngine } from './engines/shift-sequence.engine';
import { PayrollLiquidationEngine } from './engines/payroll-liquidation.engine';
import { BankAchGeneratorEngine } from './engines/bank-ach-generator.engine';
import { PayrollSettingsService } from './services/payroll-settings.service';
import { PayrollConceptsService } from './services/payroll-concepts.service';
import { PayrollDependenciesService } from './services/payroll-dependencies.service';
import { PayrollCatalogsService } from './services/payroll-catalogs.service';
import { PayrollEmployeesService } from './services/payroll-employees.service';
import { RenovaExcelExporterService } from './services/renova-excel-exporter.service';
import { PayrollNoveltiesService } from './services/payroll-novelties.service';
import { PayrollShiftsService } from './services/payroll-shifts.service';
import { PayrollPayslipPdfService } from './services/payroll-payslip-pdf.service';
import { PayrollSettlementService } from './services/payroll-settlement.service';
import { PayrollEmployeesRepository } from './repositories/payroll-employees.repository';
import { PayrollSettingsController } from './controllers/payroll-settings.controller';
import { PayrollConceptsController } from './controllers/payroll-concepts.controller';
import { PayrollDependenciesController } from './controllers/payroll-dependencies.controller';
import { PayrollCatalogsController } from './controllers/payroll-catalogs.controller';
import { PayrollEmployeesController } from './controllers/payroll-employees.controller';
import { PayrollNoveltiesController } from './controllers/payroll-novelties.controller';
import { PayrollShiftsController } from './controllers/payroll-shifts.controller';
import { PayrollSettlementController } from './controllers/payroll-settlement.controller';

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
    PayrollSettlementController,
  ],
  providers: [
    ColombianHolidayEngine,
    ModalityBreakdownEngine,
    ShiftSequenceEngine,
    PayrollLiquidationEngine,
    BankAchGeneratorEngine,
    PayrollPayslipPdfService,
    PayrollSettingsService,
    PayrollConceptsService,
    PayrollDependenciesService,
    PayrollCatalogsService,
    PayrollEmployeesRepository,
    RenovaExcelExporterService,
    PayrollEmployeesService,
    PayrollNoveltiesService,
    PayrollShiftsService,
    PayrollSettlementService,
  ],
  exports: [
    ColombianHolidayEngine,
    ModalityBreakdownEngine,
    ShiftSequenceEngine,
    PayrollLiquidationEngine,
    BankAchGeneratorEngine,
    PayrollPayslipPdfService,
    PayrollSettingsService,
    PayrollConceptsService,
    PayrollDependenciesService,
    PayrollCatalogsService,
    PayrollEmployeesService,
    RenovaExcelExporterService,
    PayrollNoveltiesService,
    PayrollShiftsService,
    PayrollSettlementService,
  ],
})
export class PayrollModule {}
