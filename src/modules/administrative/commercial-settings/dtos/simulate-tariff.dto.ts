import { IsEnum, IsInt, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CommercialSector, WeaponModality } from '@prisma/client';

export class SimulateTariffDto {
  @ApiPropertyOptional({
    description:
      'ID del tramo tarifario guardado. Si se omite, usa los parámetros manuales o el tramo activo.',
  })
  @IsOptional()
  tariffPeriodId?: string;

  @ApiPropertyOptional({
    example: 1750905.0,
    description: 'SMMLV manual para simulación libre',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  manualSmmlv?: number;

  @ApiPropertyOptional({
    example: 249095.0,
    description: 'Auxilio de transporte mensual manual',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  manualTransportAux?: number;

  @ApiProperty({
    enum: CommercialSector,
    example: CommercialSector.RESIDENTIAL_STRATA_4_6,
    description: 'Sector / Estrato del cliente',
  })
  @IsEnum(CommercialSector)
  sector: CommercialSector;

  @ApiProperty({
    enum: WeaponModality,
    example: WeaponModality.NO_WEAPON,
    description: 'Modalidad de arma o medio',
  })
  @IsEnum(WeaponModality)
  weaponModality: WeaponModality;

  @ApiProperty({
    example: 15,
    description:
      'Horas diurnas en el turno (ej. 15 en 24h, 3 en 12h noche, 12 en 12h día)',
  })
  @IsInt()
  @Min(0)
  @Max(24)
  dayHours: number;

  @ApiProperty({
    example: 9,
    description:
      'Horas nocturnas en el turno (ej. 9 en 24h, 9 en 12h noche, 0 en 12h día)',
  })
  @IsInt()
  @Min(0)
  @Max(24)
  nightHours: number;

  @ApiProperty({
    example: 30,
    description: 'Días facturables al mes (30, 26, 24, 22, 20, 10, 8, 2)',
  })
  @IsInt()
  @Min(1)
  @Max(30)
  billableDays: number;

  @ApiPropertyOptional({
    example: 0.05,
    description: 'Descuento por pronto pago (ej: 0.05 = 5%)',
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  discountPct?: number;

  @ApiPropertyOptional({
    example: 8.8,
    description: 'Sobrescritura manual de multiplicador',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  customSectorMultiplier?: number;
}
