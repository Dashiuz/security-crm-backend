import {
  IsString,
  IsInt,
  IsNumber,
  IsDateString,
  IsOptional,
  IsNotEmpty,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTariffPeriodDto {
  @ApiProperty({ example: 2026, description: 'Año fiscal de la vigencia' })
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  @Max(2050)
  year: number;

  @ApiProperty({
    example: 'Tarifa Vigencia Oficial SVSP 2026 (44 Horas)',
    description: 'Etiqueta descriptiva del tramo',
  })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({
    example: '2026-01-01',
    description: 'Fecha de inicio del tramo (YYYY-MM-DD)',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    example: '2026-12-31',
    description: 'Fecha final del tramo (YYYY-MM-DD)',
  })
  @IsDateString()
  endDate: string;

  @ApiProperty({
    example: 1750905.0,
    description: 'Salario Mínimo Legal Vigente decretado para el año',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  smmlv: number;

  @ApiProperty({
    example: 249095.0,
    description: 'Auxilio de transporte mensual legal',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monthlyTransportAux: number;

  @ApiProperty({
    example: 8303.17,
    description: 'Auxilio de transporte diario',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  dailyTransportAux: number;

  @ApiPropertyOptional({
    example: 44,
    description: 'Jornada legal semanal vigente (Ley 2101)',
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  statutoryWeeklyHours?: number;

  @ApiPropertyOptional({
    example: 7959.0,
    description: 'Valor hora base ordinaria diurna',
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  baseHourlyRate?: number;

  @ApiPropertyOptional({
    example: 15,
    description: 'Horas diurnas legales de la jornada',
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  statutoryDayHours?: number;

  @ApiPropertyOptional({
    example: 9,
    description: 'Horas nocturnas legales de la jornada',
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  statutoryNightHours?: number;

  @ApiPropertyOptional({
    example: 0.5597,
    description: 'Factor de peso proporcional día',
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  dayProportionFactor?: number;

  @ApiPropertyOptional({
    example: 0.4403,
    description: 'Factor de peso proporcional noche',
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  nightProportionFactor?: number;

  @ApiPropertyOptional({
    example: 8.8,
    description: 'Multiplicador Sector Comercial/Público',
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  commercialMultiplier?: number;

  @ApiPropertyOptional({
    example: 8.6,
    description: 'Multiplicador Sector Residencial Estrato 4, 5 y 6',
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  strata46Multiplier?: number;

  @ApiPropertyOptional({
    example: 7.66376105,
    description: 'Multiplicador Sector Residencial Estrato 1, 2 y 3',
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  strata13Multiplier?: number;
}
