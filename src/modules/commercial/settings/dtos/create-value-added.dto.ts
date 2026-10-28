import {
  IsString,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsNotEmpty,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ValueAddedCategory } from '@prisma/client';

export class CreateValueAddedDto {
  @ApiProperty({
    example: 'Locker metálico 4 puestos',
    description: 'Nombre del bien o servicio en especie',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    enum: ValueAddedCategory,
    example: ValueAddedCategory.POST_EQUIPMENT,
  })
  @IsEnum(ValueAddedCategory)
  category: ValueAddedCategory;

  @ApiPropertyOptional({
    example: 'Locker calibre 22 con portacandado y celosías de ventilación',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: 450000.0,
    description: 'Costo interno de referencia para análisis de P&L',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  internalReferenceCost: number;

  @ApiPropertyOptional({ example: false, default: false })
  @IsBoolean()
  @IsOptional()
  isStandardBenefit?: boolean;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(1)
  defaultQuantity?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
