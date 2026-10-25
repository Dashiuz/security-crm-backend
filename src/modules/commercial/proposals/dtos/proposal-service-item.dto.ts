import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import {
  CommercialSector,
  ShiftScheduleType,
  WeaponModality,
} from '@prisma/client';

export class ProposalServiceItemDto {
  @ApiPropertyOptional({ example: 'serv_catalog_cuid' })
  @IsOptional()
  @IsString()
  serviceCatalogId?: string;

  @ApiProperty({ example: 'Guarda Recepción 24h' })
  @IsNotEmpty({ message: 'El título del cargo es obligatorio' })
  @IsString()
  positionTitle!: string;

  @ApiProperty({ example: 1, default: 1 })
  @IsInt({ message: 'La cantidad debe ser un entero' })
  @Min(1, { message: 'La cantidad mínima es 1' })
  quantity!: number;

  @ApiProperty({ enum: ShiftScheduleType, example: ShiftScheduleType.SCHEDULE_2X2X2 })
  @IsEnum(ShiftScheduleType, { message: 'Esquema de turno inválido' })
  scheduleType!: ShiftScheduleType;

  @ApiProperty({ enum: WeaponModality, example: WeaponModality.NO_WEAPON, default: WeaponModality.NO_WEAPON })
  @IsEnum(WeaponModality, { message: 'Modalidad de arma inválida' })
  weaponModality!: WeaponModality;

  @ApiProperty({ enum: CommercialSector, example: CommercialSector.RESIDENTIAL_STRATA_4_6, default: CommercialSector.RESIDENTIAL_STRATA_4_6 })
  @IsEnum(CommercialSector, { message: 'Categoría tarifaria inválida' })
  tariffCategory!: CommercialSector;

  @ApiProperty({ example: 12450000.00, description: 'Precio unitario facturado mensual al cliente' })
  @IsNumber({}, { message: 'El precio unitario mensual debe ser un número válido' })
  @Min(0, { message: 'El precio unitario mensual no puede ser negativo' })
  unitMonthlyBilledPrice!: number;

  @ApiProperty({ example: 8850000.00, description: 'Costo unitario mensual real de nómina y recargos' })
  @IsNumber({}, { message: 'El costo unitario mensual debe ser un número válido' })
  @Min(0, { message: 'El costo unitario mensual no puede ser negativo' })
  unitMonthlyRealCost!: number;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
