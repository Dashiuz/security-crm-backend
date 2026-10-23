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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTariffPeriodDto {
  @ApiProperty({ example: 2026, description: 'Año fiscal de la vigencia' })
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
  @IsNumber()
  @Min(0)
  smmlv: number;

  @ApiProperty({
    example: 249095.0,
    description: 'Auxilio de transporte mensual legal',
  })
  @IsNumber()
  @Min(0)
  monthlyTransportAux: number;

  @ApiProperty({
    example: 8303.17,
    description: 'Auxilio de transporte diario',
  })
  @IsNumber()
  @Min(0)
  dailyTransportAux: number;

  @ApiPropertyOptional({
    example: 44,
    description: 'Jornada legal semanal vigente (Ley 2101)',
  })
  @IsInt()
  @IsOptional()
  statutoryWeeklyHours?: number;

  @ApiPropertyOptional({
    example: 7959.0,
    description: 'Valor hora base ordinaria diurna',
  })
  @IsNumber()
  @IsOptional()
  baseHourlyRate?: number;

  @ApiPropertyOptional({
    example: 15,
    description: 'Horas diurnas legales de la jornada',
  })
  @IsInt()
  @IsOptional()
  statutoryDayHours?: number;

  @ApiPropertyOptional({
    example: 9,
    description: 'Horas nocturnas legales de la jornada',
  })
  @IsInt()
  @IsOptional()
  statutoryNightHours?: number;

  @ApiPropertyOptional({
    example: 0.5597,
    description: 'Factor de peso proporcional día',
  })
  @IsNumber()
  @IsOptional()
  dayProportionFactor?: number;

  @ApiPropertyOptional({
    example: 0.4403,
    description: 'Factor de peso proporcional noche',
  })
  @IsNumber()
  @IsOptional()
  nightProportionFactor?: number;

  @ApiPropertyOptional({
    example: 8.8,
    description: 'Multiplicador Sector Comercial/Público',
  })
  @IsNumber()
  @IsOptional()
  commercialMultiplier?: number;

  @ApiPropertyOptional({
    example: 8.6,
    description: 'Multiplicador Sector Residencial Estrato 4, 5 y 6',
  })
  @IsNumber()
  @IsOptional()
  strata46Multiplier?: number;

  @ApiPropertyOptional({
    example: 7.66376105,
    description: 'Multiplicador Sector Residencial Estrato 1, 2 y 3',
  })
  @IsNumber()
  @IsOptional()
  strata13Multiplier?: number;
}
