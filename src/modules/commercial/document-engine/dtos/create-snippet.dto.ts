import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSnippetDto {
  @ApiProperty({
    description: 'Clave única del fragmento o cláusula',
    example: 'COVER_LETTER_RESIDENTIAL',
  })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({
    description: 'Título descriptivo de la cláusula',
    example: 'Carta de Presentación - Sector Residencial',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Cuerpo de la plantilla con formato HTML/TipTap y {{tokens}}',
    example: '<p>Respetados señores de {{nombre_cliente}}...</p>',
  })
  @IsString()
  @IsNotEmpty()
  bodyTemplate: string;

  @ApiProperty({
    description: 'Categoría funcional del fragmento',
    example: 'COMMERCIAL_PROPOSAL',
  })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiPropertyOptional({
    description: 'Lista de variables dinámicas sugeridas para autocompletar en el editor TipTap',
    example: ['nombre_cliente', 'nit', 'canon_mensual', 'vigencia_dias'],
  })
  @IsOptional()
  @IsArray()
  availableVariables?: string[];

  @ApiPropertyOptional({
    description: 'Si es la cláusula o carta predeterminada en su categoría',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
