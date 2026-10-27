import { IsEnum, IsNotEmpty, IsOptional, IsString, IsBoolean, IsObject, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FormatCategory, FormatVisibilityScope } from '@prisma/client';

export class CreateFormatDto {
  @ApiProperty({ description: 'Código institucional o de calidad (ej. CM-F-01)', example: 'CM-F-01' })
  @IsNotEmpty()
  @IsString()
  code: string;

  @ApiProperty({ description: 'Título oficial del formato', example: 'Solicitud Oficial de Vacaciones' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Descripción del propósito del formato' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: FormatCategory, default: FormatCategory.GENERAL })
  @IsOptional()
  @IsEnum(FormatCategory)
  category?: FormatCategory;

  @ApiPropertyOptional({ enum: FormatVisibilityScope, default: FormatVisibilityScope.PERSONAL })
  @IsOptional()
  @IsEnum(FormatVisibilityScope)
  scope?: FormatVisibilityScope;

  @ApiProperty({ description: 'Contenido HTML con tablas y tokens {{variable}}' })
  @IsNotEmpty()
  @IsString()
  bodyTemplate: string;

  @ApiPropertyOptional({ description: 'Configuración modular de bloques (Piezas de Lego)', type: Object })
  @IsOptional()
  @IsObject()
  sectionsConfig?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Lista de variables descubiertas en la plantilla', type: [String] })
  @IsOptional()
  @IsArray()
  detectedVariables?: string[];

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
