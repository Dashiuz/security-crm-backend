import {
  IsString,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShiftScheduleType } from '@prisma/client';

export class SalaryMatrixItemDto {
  @ApiPropertyOptional({ example: 'clx...' })
  @IsString()
  @IsOptional()
  id?: string;

  @ApiProperty({
    example: 'Guarda Portero',
    description: 'Nombre o título del cargo operativo',
  })
  @IsString()
  @IsNotEmpty()
  positionTitle: string;

  @ApiPropertyOptional({
    enum: ShiftScheduleType,
    default: ShiftScheduleType.SCHEDULE_2X2X2,
  })
  @IsEnum(ShiftScheduleType)
  @IsOptional()
  scheduleType?: ShiftScheduleType;

  @ApiPropertyOptional({
    example: 3.0,
    description: 'Guardas requeridos por puesto para cubrir 24h',
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  guardsRequiredPerPost?: number;

  @ApiProperty({
    example: 1750905.0,
    description: 'Sueldo base mensual (SMMLV 2026)',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  baseSalary: number;

  @ApiProperty({
    example: 249095.0,
    description: 'Auxilio de transporte mensual legal',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  transportAllowance: number;

  @ApiPropertyOptional({
    example: 8,
    default: 8,
    description: 'Horas ordinarias por turno',
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  shiftOrdinaryHours?: number;

  @ApiPropertyOptional({
    example: 4,
    default: 4,
    description: 'Horas extras por turno',
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  shiftExtraHours?: number;

  @ApiProperty({
    example: 680000.0,
    description: 'Total estimado de horas extras y recargos',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  estimatedOvertimePay: number;

  @ApiProperty({ example: 2680000.0, description: 'Total devengado bruto' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  grossSalary: number;

  @ApiPropertyOptional({
    example: 0.04,
    default: 0.04,
    description: 'Porcentaje deducción salud (4%)',
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  healthDeductionPct?: number;

  @ApiPropertyOptional({
    example: 0.04,
    default: 0.04,
    description: 'Porcentaje deducción pensión (4%)',
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  pensionDeductionPct?: number;

  @ApiProperty({ example: 97236.0, description: 'Valor retenido de salud' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  healthDeduction: number;

  @ApiProperty({ example: 97236.0, description: 'Valor retenido de pensión' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  pensionDeduction: number;

  @ApiProperty({ example: 194472.0, description: 'Total deducciones' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalDeductions: number;

  @ApiPropertyOptional({
    example: 0,
    default: 0,
    description: 'Bonificación fija no salarial',
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  fixedBonusNonSalary?: number;

  @ApiPropertyOptional({
    example: 0,
    default: 0,
    description: 'Rodamiento de vehículo',
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  vehicleAllowance?: number;

  @ApiProperty({
    example: 2485528.0,
    description: 'Sueldo neto bancario a recibir por el guarda',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  netTakeHomePay: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpsertSalaryMatrixDto {
  @ApiProperty({
    type: [SalaryMatrixItemDto],
    description: 'Listado de cargos para sincronización masiva',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalaryMatrixItemDto)
  items: SalaryMatrixItemDto[];
}
