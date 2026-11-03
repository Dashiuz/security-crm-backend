import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ColombianHolidayEngine } from './engines/colombian-holiday.engine';
import { ModalityBreakdownEngine } from './engines/modality-breakdown.engine';
import { ShiftSequenceEngine } from './engines/shift-sequence.engine';
import { PayrollLiquidationEngine } from './engines/payroll-liquidation.engine';
import { BankAchGeneratorEngine } from './engines/bank-ach-generator.engine';
import { PilaGeneratorEngine } from './engines/pila-generator.engine';
import { DianElectronicPayrollEngine } from './engines/dian-electronic-payroll.engine';
import { AccountingInterfaceEngine } from './engines/accounting-interface.engine';
import { Form220AndAccumulatedEngine } from './engines/form220-and-accumulated.engine';
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
import { PayrollBenefitsPdfService } from './services/payroll-benefits-pdf.service';
import { PayrollBenefitsService } from './services/payroll-benefits.service';
import { PayrollCompliancePdfService } from './services/payroll-compliance-pdf.service';
import { PayrollComplianceService } from './services/payroll-compliance.service';
import { PayrollEmployeesRepository } from './repositories/payroll-employees.repository';
import { PayrollSettingsController } from './controllers/payroll-settings.controller';
import { PayrollConceptsController } from './controllers/payroll-concepts.controller';
import { PayrollDependenciesController } from './controllers/payroll-dependencies.controller';
import { PayrollCatalogsController } from './controllers/payroll-catalogs.controller';
import { PayrollEmployeesController } from './controllers/payroll-employees.controller';
import { PayrollNoveltiesController } from './controllers/payroll-novelties.controller';
import { PayrollShiftsController } from './controllers/payroll-shifts.controller';
import { PayrollSettlementController } from './controllers/payroll-settlement.controller';
import { PayrollBenefitsController } from './controllers/payroll-benefits.controller';
import { PayrollComplianceController } from './controllers/payroll-compliance.controller';

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
    PayrollBenefitsController,
    PayrollComplianceController,
  ],
  providers: [
    ColombianHolidayEngine,
    ModalityBreakdownEngine,
    ShiftSequenceEngine,
    PayrollLiquidationEngine,
    BankAchGeneratorEngine,
    PilaGeneratorEngine,
    DianElectronicPayrollEngine,
    AccountingInterfaceEngine,
    Form220AndAccumulatedEngine,
    PayrollPayslipPdfService,
    PayrollBenefitsPdfService,
    PayrollCompliancePdfService,
    PayrollBenefitsService,
    PayrollComplianceService,
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
    PilaGeneratorEngine,
    DianElectronicPayrollEngine,
    AccountingInterfaceEngine,
    Form220AndAccumulatedEngine,
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
    PayrollBenefitsPdfService,
    PayrollBenefitsService,
    PayrollCompliancePdfService,
    PayrollComplianceService,
  ],
})
export class PayrollModule {}
