import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsEnum,
  IsDateString,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PayrollConceptNature, PayrollDisbursementType } from '@prisma/client';

export class LiquidatePeriodDto {
  @ApiPropertyOptional({ description: 'Filtrar por sucursal específica' })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por cliente (centro de costo)' })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por dependencia/puesto específico',
  })
  @IsOptional()
  @IsString()
  dependencyId?: string;

  @ApiPropertyOptional({
    description: 'Lista específica de IDs de empleados a liquidar (opcional)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  employeeIds?: string[];

  @ApiPropertyOptional({
    description:
      'Si es true, preserva renglones editados manualmente en pre-nómina previa',
    default: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  preserveManualEdits?: boolean;
}

export class SettlementLineEditDto {
  @ApiPropertyOptional({
    description: 'ID de la línea existente (si se modifica)',
  })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ description: 'ID del concepto de nómina' })
  @IsString()
  conceptId: string;

  @ApiPropertyOptional({
    description: 'ID de la dependencia donde se imputa el costo',
  })
  @IsOptional()
  @IsString()
  dependencyId?: string;

  @ApiProperty({
    description: 'Naturaleza del concepto',
    enum: PayrollConceptNature,
  })
  @IsEnum(PayrollConceptNature)
  nature: PayrollConceptNature;

  @ApiProperty({ description: 'Cantidad (días u horas)', default: 1 })
  @Type(() => Number)
  @IsNumber()
  quantity: number;

  @ApiProperty({ description: 'Valor unitario' })
  @Type(() => Number)
  @IsNumber()
  unitValue: number;

  @ApiProperty({ description: 'Valor total' })
  @Type(() => Number)
  @IsNumber()
  totalValue: number;

  @ApiPropertyOptional({
    description: 'Indica si es constitutivo de salario',
    default: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isConstitutiveOfSalary?: boolean;

  @ApiPropertyOptional({
    description: 'Indica si puede eliminarse',
    default: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isDeletable?: boolean;

  @ApiPropertyOptional({
    description: 'Notas u observación de la edición manual',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ManualEditSettlementDto {
  @ApiPropertyOptional({ description: 'Notas generales del ajuste manual' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    description: 'Líneas actualizadas de la pre-nómina',
    type: [SettlementLineEditDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SettlementLineEditDto)
  lines: SettlementLineEditDto[];
}

export class GenerateAdvanceDto {
  @ApiProperty({ description: 'Año de la vigencia', example: 2026 })
  @Type(() => Number)
  @IsNumber()
  year: number;

  @ApiProperty({ description: 'Mes (1..12)', example: 10 })
  @Type(() => Number)
  @IsNumber()
  month: number;

  @ApiPropertyOptional({
    description: 'Fecha de corte del anticipo (por defecto día 15 del mes)',
  })
  @IsOptional()
  @IsDateString()
  cutoffDate?: string;

  @ApiPropertyOptional({
    description:
      'Porcentaje por defecto de anticipo sobre el básico (ej. 0.40 para 40%)',
    default: 0.4,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  defaultAdvancePct?: number;

  @ApiPropertyOptional({
    description:
      'Si es true, descuenta días de ausencia ocurridos en la 1ra quincena',
    default: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  deductAbsences?: boolean;
}

export class UpdateAdvanceItemDto {
  @ApiProperty({ description: 'Monto aprobado definitivo a pagar de anticipo' })
  @Type(() => Number)
  @IsNumber()
  approvedAmount: number;

  @ApiPropertyOptional({ description: 'Observaciones de la modificación' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class GenerateAchFileDto {
  @ApiProperty({
    enum: PayrollDisbursementType,
    description: 'Tipo de dispersión: PAYROLL_PERIOD o FORTNIGHT_ADVANCE',
    default: PayrollDisbursementType.PAYROLL_PERIOD,
  })
  @IsEnum(PayrollDisbursementType)
  disbursementType: PayrollDisbursementType;

  @ApiPropertyOptional({
    description:
      'ID del periodo de nómina (si disbursementType es PAYROLL_PERIOD)',
  })
  @IsOptional()
  @IsString()
  periodId?: string;

  @ApiPropertyOptional({
    description:
      'ID del lote de anticipo (si disbursementType es FORTNIGHT_ADVANCE)',
  })
  @IsOptional()
  @IsString()
  advanceSettlementId?: string;

  @ApiPropertyOptional({
    description:
      'ID del banco específico (si es para una sola entidad bancaria)',
  })
  @IsOptional()
  @IsString()
  bankId?: string;

  @ApiPropertyOptional({
    description:
      'Formato de exportación bancaria: PAB_BANCOLOMBIA | DAVIVIENDA | BCSC | BOGOTA | STANDARD_ACH',
    default: 'STANDARD_ACH',
  })
  @IsOptional()
  @IsString()
  exportFormat?: string;
}

export class SendPayslipsEmailDto {
  @ApiPropertyOptional({
    description:
      'Lista de IDs de empleados a quienes despachar el desprendible por correo (si está vacío, envía a todos)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  employeeIds?: string[];

  @ApiPropertyOptional({
    description:
      'Si es true, agrupa horas extras y recargos en una sola fila en el desprendible PDF',
    default: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  groupOvertime?: boolean;
}

export class QuerySettlementsDto {
  @ApiPropertyOptional({
    description: 'Búsqueda por nombre o documento del trabajador',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filtrar por sucursal' })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por dependencia/puesto' })
  @IsOptional()
  @IsString()
  dependencyId?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por estado (DRAFT, APPROVED, PAID)',
  })
  @IsOptional()
  @IsString()
  status?: string;
}
