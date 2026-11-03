import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import {
  PayrollPaymentFrequency,
  PayrollAdvanceMode,
  DianProviderMode,
  DianEnvironmentType,
  AccountingExportFormat,
} from '@prisma/client';

export class UpdatePayrollSettingsDto {
  @ApiProperty({ example: 'EMPRESA DE SEGURIDAD LTDA', required: false })
  @IsOptional()
  @IsString()
  companyLegalName?: string;

  @ApiProperty({ example: '900000000', required: false })
  @IsOptional()
  @IsString()
  companyNit?: string;

  @ApiProperty({ example: '1', required: false })
  @IsOptional()
  @IsString()
  companyDv?: string;

  @ApiProperty({ example: '14-28', required: false })
  @IsOptional()
  @IsString()
  arlEntityCode?: string;

  @ApiProperty({ example: 'ARL SURA', required: false })
  @IsOptional()
  @IsString()
  arlEntityName?: string;

  @ApiProperty({ example: '8010', required: false })
  @IsOptional()
  @IsString()
  daneEconomicActivityCode?: string;

  @ApiProperty({ example: '11001', required: false })
  @IsOptional()
  @IsString()
  daneCityCode?: string;

  @ApiProperty({ example: 'BOGOTÁ D.C.', required: false })
  @IsOptional()
  @IsString()
  daneCityName?: string;

  @ApiProperty({ example: '11', required: false })
  @IsOptional()
  @IsString()
  daneDepartmentCode?: string;

  @ApiProperty({ example: 'BOGOTÁ D.C.', required: false })
  @IsOptional()
  @IsString()
  daneDepartmentName?: string;

  @ApiProperty({ example: 'Carrera 7 # 72-10', required: false })
  @IsOptional()
  @IsString()
  companyAddress?: string;

  @ApiProperty({ example: '+57 1 234 5678', required: false })
  @IsOptional()
  @IsString()
  companyPhone?: string;

  @ApiProperty({ example: 'nomina@empresa.com', required: false })
  @IsOptional()
  @IsString()
  companyEmail?: string;

  @ApiProperty({ example: '1020304050', required: false })
  @IsOptional()
  @IsString()
  legalRepDocument?: string;

  @ApiProperty({ example: 'Juan Perez', required: false })
  @IsOptional()
  @IsString()
  legalRepFullName?: string;

  @ApiProperty({ example: 'Firma 1', required: false })
  @IsOptional()
  @IsString()
  signatureName1?: string;

  @ApiProperty({ example: 'Director de Talento Humano', required: false })
  @IsOptional()
  @IsString()
  signatureRole1?: string;

  @ApiProperty({ example: 'Firma 2', required: false })
  @IsOptional()
  @IsString()
  signatureName2?: string;

  @ApiProperty({ example: 'Gerente General', required: false })
  @IsOptional()
  @IsString()
  signatureRole2?: string;

  @ApiProperty({ enum: PayrollPaymentFrequency, required: false })
  @IsOptional()
  @IsEnum(PayrollPaymentFrequency)
  paymentFrequency?: PayrollPaymentFrequency;

  @ApiProperty({ enum: PayrollAdvanceMode, required: false })
  @IsOptional()
  @IsEnum(PayrollAdvanceMode)
  advanceMode?: PayrollAdvanceMode;

  @ApiProperty({ example: 0.4, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  defaultAdvancePct?: number;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  deductAbsencesInAdvance?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  saturdayIsWorkingDay?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  applyExonerationLaw1607?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  enforceUgpp40PctRule?: boolean;

  @ApiProperty({ example: '2026-11-05', required: false })
  @IsOptional()
  @IsDateString()
  scheduleLockDate?: string;

  @ApiProperty({ example: 2026, required: false })
  @IsOptional()
  @IsNumber()
  activeYear?: number;

  @ApiProperty({ example: 1750905.0, required: false })
  @IsOptional()
  @IsNumber()
  smmlv?: number;

  @ApiProperty({ example: 249095.0, required: false })
  @IsOptional()
  @IsNumber()
  transportAllowance?: number;

  @ApiProperty({ example: 49799.0, required: false })
  @IsOptional()
  @IsNumber()
  uvtValue?: number;

  @ApiProperty({ example: 44, required: false })
  @IsOptional()
  @IsNumber()
  weeklyWorkingHours?: number;

  @ApiProperty({ example: 220, required: false })
  @IsOptional()
  @IsNumber()
  monthlyDivisorHours?: number;

  @ApiProperty({ example: 2, required: false })
  @IsOptional()
  @IsNumber()
  transportTopSmmlvMultiple?: number;

  @ApiProperty({ example: 35.0, required: false })
  @IsOptional()
  @IsNumber()
  nightSurchargePct?: number;

  @ApiProperty({ example: 125.0, required: false })
  @IsOptional()
  @IsNumber()
  extraDayPct?: number;

  @ApiProperty({ example: 175.0, required: false })
  @IsOptional()
  @IsNumber()
  extraNightPct?: number;

  @ApiProperty({ example: 80.0, required: false })
  @IsOptional()
  @IsNumber()
  sundayCompensatedPct?: number;

  @ApiProperty({ example: 80.0, required: false })
  @IsOptional()
  @IsNumber()
  holidaySurchargePct?: number;

  @ApiProperty({ example: 205.0, required: false })
  @IsOptional()
  @IsNumber()
  extraHolidayDayPct?: number;

  @ApiProperty({ example: 255.0, required: false })
  @IsOptional()
  @IsNumber()
  extraHolidayNightPct?: number;

  @ApiProperty({ example: 4.0, required: false })
  @IsOptional()
  @IsNumber()
  employeeHealthPct?: number;

  @ApiProperty({ example: 4.0, required: false })
  @IsOptional()
  @IsNumber()
  employeePensionPct?: number;

  @ApiProperty({ example: 1.0, required: false })
  @IsOptional()
  @IsNumber()
  fspBasePct?: number;

  @ApiProperty({ example: 8.5, required: false })
  @IsOptional()
  @IsNumber()
  employerHealthPct?: number;

  @ApiProperty({ example: 12.0, required: false })
  @IsOptional()
  @IsNumber()
  employerPensionPct?: number;

  @ApiProperty({ example: 4.0, required: false })
  @IsOptional()
  @IsNumber()
  ccfPct?: number;

  @ApiProperty({ example: 2.0, required: false })
  @IsOptional()
  @IsNumber()
  senaPct?: number;

  @ApiProperty({ example: 3.0, required: false })
  @IsOptional()
  @IsNumber()
  icbfPct?: number;

  @ApiProperty({ example: 66.67, required: false })
  @IsOptional()
  @IsNumber()
  employerSickLeaveRatePct?: number;

  @ApiProperty({ example: 66.67, required: false })
  @IsOptional()
  @IsNumber()
  epsSickLeaveRateDays3To90Pct?: number;

  @ApiProperty({ example: 50.0, required: false })
  @IsOptional()
  @IsNumber()
  epsSickLeaveRateDays91To180Pct?: number;

  @ApiProperty({ enum: DianProviderMode, required: false })
  @IsOptional()
  @IsEnum(DianProviderMode)
  defaultDianProviderMode?: DianProviderMode;

  @ApiProperty({ enum: AccountingExportFormat, required: false })
  @IsOptional()
  @IsEnum(AccountingExportFormat)
  defaultAccountingFormat?: AccountingExportFormat;

  @ApiProperty({ enum: DianEnvironmentType, required: false })
  @IsOptional()
  @IsEnum(DianEnvironmentType)
  dianEnvironment?: DianEnvironmentType;

  @ApiProperty({ example: 'NE', required: false })
  @IsOptional()
  @IsString()
  dianPrefix?: string;

  @ApiProperty({ example: 'NA', required: false })
  @IsOptional()
  @IsString()
  dianAdjustmentPrefix?: string;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsNumber()
  dianNextConsecutive?: number;

  @ApiProperty({ example: 'dian-sw-1234', required: false })
  @IsOptional()
  @IsString()
  dianSoftwareId?: string;

  @ApiProperty({ example: '12345', required: false })
  @IsOptional()
  @IsString()
  dianSoftwarePin?: string;

  @ApiProperty({ example: 'token-api-xyz', required: false })
  @IsOptional()
  @IsString()
  dianApiToken?: string;
}
