import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsOptional,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { VacationSettlementType, SocialBenefitType } from '@prisma/client';

export class SimulateVacationDto {
  @ApiProperty({ description: 'ID del empleado' })
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @ApiProperty({
    enum: VacationSettlementType,
    default: VacationSettlementType.ENJOYED_IN_TIME,
  })
  @IsEnum(VacationSettlementType)
  vacationType: VacationSettlementType;

  @ApiProperty({
    example: '2026-06-01',
    description: 'Fecha de inicio del disfrute (YYYY-MM-DD)',
  })
  @IsString()
  @IsNotEmpty()
  enjoymentStartDate: string;

  @ApiProperty({
    example: 15,
    default: 15,
    description: 'Días hábiles a otorgar/compensar',
  })
  @IsNumber()
  @Min(1)
  @Max(30)
  businessDays: number;

  @ApiPropertyOptional({
    example: 0,
    default: 0,
    description: 'Descuento voluntario por préstamos/libranzas',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  loansToDeduct?: number;
}

export class CreateVacationSettlementDto extends SimulateVacationDto {
  @ApiProperty({
    example: '2025-01-01',
    description: 'Inicio del periodo causado acumulado',
  })
  @IsString()
  @IsNotEmpty()
  accrualStartDate: string;

  @ApiProperty({
    example: '2025-12-31',
    description: 'Fin del periodo causado acumulado',
  })
  @IsString()
  @IsNotEmpty()
  accrualEndDate: string;

  @ApiPropertyOptional({
    example: '2026-05-30',
    description: 'Fecha de desembolso bancario',
  })
  @IsOptional()
  @IsString()
  paymentDate?: string;

  @ApiPropertyOptional({ example: 'Vacaciones ordinarias primer periodo' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class GenerateSocialBenefitBatchDto {
  @ApiProperty({
    enum: SocialBenefitType,
    example: SocialBenefitType.PRIMA_FIRST_SEMESTER,
  })
  @IsEnum(SocialBenefitType)
  benefitType: SocialBenefitType;

  @ApiProperty({ example: 2026 })
  @IsNumber()
  year: number;

  @ApiProperty({
    example: '2026-05-31',
    description: 'Fecha de corte real para acumulados (YYYY-MM-DD)',
  })
  @IsString()
  @IsNotEmpty()
  cutoffDate: string;

  @ApiProperty({
    example: '2026-06-30',
    description: 'Fecha proyectada de cierre del periodo (YYYY-MM-DD)',
  })
  @IsString()
  @IsNotEmpty()
  projectionEndDate: string;

  @ApiPropertyOptional({
    example: '2026-06-15',
    description: 'Fecha programada de pago',
  })
  @IsOptional()
  @IsString()
  paymentDate?: string;

  @ApiPropertyOptional({ example: 'Prima de Servicios Primer Semestre 2026' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateSocialBenefitItemDto {
  @ApiPropertyOptional({
    example: 850000,
    description: 'Valor aprobado de prima/cesantías ajustado manualmente',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  approvedBenefitAmount?: number;

  @ApiPropertyOptional({
    example: 51000,
    description: 'Valor aprobado de intereses ajustado',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  approvedInterestAmount?: number;

  @ApiPropertyOptional({
    example: 'Ajuste manual de promedio variable por acuerdo',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class InjectBenefitToPayrollDto {
  @ApiProperty({
    description:
      'ID del periodo de nómina abierto donde se inyectará la novedad',
  })
  @IsString()
  @IsNotEmpty()
  targetPeriodId: string;

  @ApiPropertyOptional({
    description:
      'ID del concepto de nómina específico para la novedad (opcional)',
  })
  @IsOptional()
  @IsString()
  conceptId?: string;
}

export class SimulateFinalLiquidationDto {
  @ApiProperty({ description: 'ID del empleado a liquidar' })
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @ApiProperty({
    example: '2026-06-30',
    description: 'Fecha efectiva de retiro (YYYY-MM-DD)',
  })
  @IsString()
  @IsNotEmpty()
  retirementDate: string;

  @ApiProperty({ description: 'ID del motivo de retiro (PayrollExitReason)' })
  @IsString()
  @IsNotEmpty()
  exitReasonId: string;

  @ApiPropertyOptional({
    example: true,
    default: true,
    description: 'Incluir sueldo de días pendientes del mes de retiro',
  })
  @IsOptional()
  @IsBoolean()
  includePendingPayroll?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Forzar aplicación o exoneración de indemnización Art. 64 CST',
  })
  @IsOptional()
  @IsBoolean()
  applyIndemnification?: boolean;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  otherEarningsAmount?: number;

  @ApiPropertyOptional({ example: 'Bonificación voluntaria por retiro' })
  @IsOptional()
  @IsString()
  otherEarningsConcept?: string;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  otherDeductionsAmount?: number;

  @ApiPropertyOptional({ example: 'Daños a dotación' })
  @IsOptional()
  @IsString()
  otherDeductionsConcept?: string;

  @ApiPropertyOptional({
    example: false,
    default: false,
    description: 'Bloquear para recontratación en Base de Datos Negativa',
  })
  @IsOptional()
  @IsBoolean()
  blockForRehireBdn?: boolean;
}

export class CreateFinalContractSettlementDto extends SimulateFinalLiquidationDto {
  @ApiPropertyOptional({
    example: '2026-07-05',
    description: 'Fecha de pago de la liquidación total',
  })
  @IsOptional()
  @IsString()
  paymentDate?: string;

  @ApiPropertyOptional({
    example: 'Liquidación definitiva de contrato por vencimiento de término',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
