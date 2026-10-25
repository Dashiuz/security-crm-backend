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
import { BenefitPeriodicity } from '@prisma/client';

export class ProposalValueAddedItemDto {
  @ApiPropertyOptional({ example: 'vag_catalog_cuid' })
  @IsOptional()
  @IsString()
  valueAddedCatalogItemId?: string;

  @ApiProperty({ example: 'Locker metálico de 4 puestos' })
  @IsNotEmpty({ message: 'El nombre del valor agregado es obligatorio' })
  @IsString()
  itemName!: string;

  @ApiProperty({ example: 1, default: 1 })
  @IsInt({ message: 'La cantidad debe ser un entero' })
  @Min(1, { message: 'La cantidad mínima es 1' })
  quantity!: number;

  @ApiProperty({
    enum: BenefitPeriodicity,
    example: BenefitPeriodicity.SINGLE_ONE_TIME,
    default: BenefitPeriodicity.SINGLE_ONE_TIME,
  })
  @IsEnum(BenefitPeriodicity, { message: 'Periodicidad de beneficio inválida' })
  periodicity!: BenefitPeriodicity;

  @ApiProperty({ example: 650000.00, description: 'Costo interno unitario para la empresa' })
  @IsNumber({}, { message: 'El costo interno debe ser un número válido' })
  @Min(0, { message: 'El costo interno no puede ser negativo' })
  itemInternalCost!: number;

  @ApiPropertyOptional({ example: 'Instalación en la garita principal de entrada' })
  @IsOptional()
  @IsString()
  notes?: string;
}
