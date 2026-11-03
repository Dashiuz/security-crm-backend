import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsDateString,
  Min,
  Max,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  LeaveAndAbsenceType,
  EpsClaimStatus,
  PayrollLoanStatus,
  NoveltyPeriodicityRule,
  PermanentConceptScope,
  NoveltyOriginType,
} from '@prisma/client';

export class PreviewLeaveDto {
  @ApiProperty({ enum: LeaveAndAbsenceType })
  @IsEnum(LeaveAndAbsenceType)
  @IsNotEmpty()
  leaveType: LeaveAndAbsenceType;

  @ApiPropertyOptional({ example: 'concept-uuid-123' })
  @IsString()
  @IsOptional()
  conceptId?: string;

  @ApiProperty({ example: '2026-03-01' })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ example: '2026-03-05' })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @ApiPropertyOptional({ example: 3000000 })
  @IsNumber()
  @IsOptional()
  baseSalaryMonthly?: number;

  @ApiPropertyOptional({ example: 'emp-uuid-123' })
  @IsString()
  @IsOptional()
  employeeId?: string;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  isExtension?: boolean;

  @ApiPropertyOptional({ example: 0 })
  @IsNumber()
  @IsOptional()
  accumulatedPriorDays?: number;
}

export class CreateLeaveAndAbsenceDto {
  @ApiProperty({ example: 'emp-uuid-123' })
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @ApiProperty({ enum: LeaveAndAbsenceType })
  @IsEnum(LeaveAndAbsenceType)
  @IsNotEmpty()
  leaveType: LeaveAndAbsenceType;

  @ApiPropertyOptional({ example: 'concept-uuid-123' })
  @IsString()
  @IsOptional()
  conceptId?: string;

  @ApiProperty({ example: '2026-03-01' })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ example: '2026-03-05' })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @ApiPropertyOptional({ example: 'cie10-uuid' })
  @IsString()
  @IsOptional()
  cie10Id?: string;

  @ApiPropertyOptional({ example: 'entity-uuid' })
  @IsString()
  @IsOptional()
  entityId?: string;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  isExtension?: boolean;

  @ApiPropertyOptional({ example: 0 })
  @IsNumber()
  @IsOptional()
  accumulatedPriorDays?: number;

  @ApiPropertyOptional({ example: 'CERT-98234' })
  @IsString()
  @IsOptional()
  certificateNumber?: string;

  @ApiPropertyOptional({ example: 'Gripe severa' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateClaimStatusDto {
  @ApiProperty({ enum: EpsClaimStatus })
  @IsEnum(EpsClaimStatus)
  @IsNotEmpty()
  claimStatus: EpsClaimStatus;

  @ApiPropertyOptional({ example: 'RAD-2026-9923' })
  @IsString()
  @IsOptional()
  certificateNumber?: string;

  @ApiPropertyOptional({ example: '2026-03-10' })
  @IsDateString()
  @IsOptional()
  filingDate?: string;

  @ApiPropertyOptional({ example: '2026-04-15' })
  @IsDateString()
  @IsOptional()
  paymentDate?: string;

  @ApiPropertyOptional({ example: 200000 })
  @IsNumber()
  @IsOptional()
  reimbursedAmount?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  rejectionReason?: string;
}

export class CreatePayrollLoanDto {
  @ApiProperty({ example: 'emp-uuid-123' })
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @ApiProperty({ example: 'concept-uuid' })
  @IsString()
  @IsNotEmpty()
  conceptId: string;

  @ApiPropertyOptional({ example: 'LOAN-2026-001' })
  @IsString()
  @IsOptional()
  loanNumber?: string;

  @ApiProperty({ example: 1000000 })
  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  principalAmount: number;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  totalInstallments: number;

  @ApiProperty({ example: 100000 })
  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  installmentAmount: number;

  @ApiProperty({
    enum: NoveltyPeriodicityRule,
    default: NoveltyPeriodicityRule.ALL_PERIODS,
  })
  @IsEnum(NoveltyPeriodicityRule)
  @IsOptional()
  periodicity?: NoveltyPeriodicityRule;

  @ApiPropertyOptional({ example: '2026-03-01' })
  @IsDateString()
  @IsOptional()
  firstDeductionDate?: string;

  @ApiPropertyOptional({ example: 'Bancolombia' })
  @IsString()
  @IsOptional()
  creditorName?: string;

  @ApiPropertyOptional({ example: 'Préstamo de calamidad doméstica' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class RecordLoanInstallmentDto {
  @ApiProperty({ example: 100000 })
  @IsNumber()
  @Min(0.01)
  @IsNotEmpty()
  amount: number;

  @ApiPropertyOptional({ example: 'period-uuid' })
  @IsString()
  @IsOptional()
  periodId?: string;

  @ApiPropertyOptional({ example: 'Pago por nómina 1ra quincena' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateLoanStatusDto {
  @ApiProperty({ enum: PayrollLoanStatus })
  @IsEnum(PayrollLoanStatus)
  @IsNotEmpty()
  status: PayrollLoanStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreatePermanentConceptDto {
  @ApiProperty({
    enum: PermanentConceptScope,
    default: PermanentConceptScope.BY_EMPLOYEE,
  })
  @IsEnum(PermanentConceptScope)
  @IsNotEmpty()
  scope: PermanentConceptScope;

  @ApiPropertyOptional({ example: 'emp-uuid-123' })
  @IsString()
  @IsOptional()
  employeeId?: string;

  @ApiPropertyOptional({ example: 'dep-uuid-123' })
  @IsString()
  @IsOptional()
  dependencyId?: string;

  @ApiProperty({ example: 'concept-uuid' })
  @IsString()
  @IsNotEmpty()
  conceptId: string;

  @ApiProperty({ example: 150000 })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  amount: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  isProportionalToDays?: boolean;

  @ApiPropertyOptional({
    enum: NoveltyPeriodicityRule,
    default: NoveltyPeriodicityRule.ALL_PERIODS,
  })
  @IsEnum(NoveltyPeriodicityRule)
  @IsOptional()
  applicationRule?: NoveltyPeriodicityRule;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsDateString()
  @IsOptional()
  validFrom?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsDateString()
  @IsOptional()
  validUntil?: string;

  @ApiPropertyOptional({ example: 'Auxilio de movilidad no salarial' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreatePeriodNoveltyDto {
  @ApiProperty({ example: 'period-uuid' })
  @IsString()
  @IsNotEmpty()
  periodId: string;

  @ApiProperty({ example: 'emp-uuid-123' })
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @ApiPropertyOptional({ example: 'dep-uuid-123' })
  @IsString()
  @IsOptional()
  dependencyId?: string;

  @ApiProperty({ example: 'concept-uuid' })
  @IsString()
  @IsNotEmpty()
  conceptId: string;

  @ApiProperty({ example: '2026-03-15' })
  @IsDateString()
  @IsNotEmpty()
  noveltyDate: string;

  @ApiProperty({ example: 4.0 })
  @IsNumber()
  @Min(0.01)
  @IsNotEmpty()
  quantity: number;

  @ApiPropertyOptional({ example: 15000 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  unitValue?: number;

  @ApiProperty({ example: 60000 })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  totalValue: number;

  @ApiPropertyOptional({
    enum: NoveltyOriginType,
    default: NoveltyOriginType.MANUAL,
  })
  @IsEnum(NoveltyOriginType)
  @IsOptional()
  origin?: NoveltyOriginType;

  @ApiPropertyOptional({ example: 'Horas extras por evento deportivo' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class BulkImportPeriodNoveltiesDto {
  @ApiProperty({ type: [CreatePeriodNoveltyDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePeriodNoveltyDto)
  novelties: CreatePeriodNoveltyDto[];
}
