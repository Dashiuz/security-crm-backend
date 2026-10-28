import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FormatVisibilityScope, VariableSourceType } from '@prisma/client';

export class CreateVariableDto {
  @ApiProperty({
    description: 'Clave única del token (sin llaves)',
    example: 'MI_FIRMA',
  })
  @IsNotEmpty()
  @IsString()
  key: string;

  @ApiProperty({
    description: 'Etiqueta amigable de la variable',
    example: 'Mi Firma Digital',
  })
  @IsNotEmpty()
  @IsString()
  label: string;

  @ApiPropertyOptional({
    description: 'Categoría para agrupamiento',
    default: 'GENERAL',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    enum: VariableSourceType,
    default: VariableSourceType.STATIC_TEXT,
  })
  @IsOptional()
  @IsEnum(VariableSourceType)
  sourceType?: VariableSourceType;

  @ApiPropertyOptional({
    enum: FormatVisibilityScope,
    default: FormatVisibilityScope.PERSONAL,
  })
  @IsOptional()
  @IsEnum(FormatVisibilityScope)
  scope?: FormatVisibilityScope;

  @ApiPropertyOptional({
    description: 'Valor de texto fijo cuando sourceType es STATIC_TEXT',
  })
  @IsOptional()
  @IsString()
  staticValue?: string;

  @ApiPropertyOptional({
    description:
      'Ruta del atributo en base de datos cuando sourceType es DATABASE_SYSTEM',
    example: 'employee.fullName',
  })
  @IsOptional()
  @IsString()
  systemPath?: string;
}
