import { IsString, IsBoolean, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTextSnippetDto {
  @ApiProperty({
    example: 'COVER_LETTER_RESIDENTIAL',
    description: 'Identificador único de la plantilla',
  })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({
    example: 'Carta de Presentación - Sector Residencial',
    description: 'Título de la plantilla',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example:
      'Estimados señores {{client_name}}, presentamos nuestra oferta con NIT {{nit}}...',
    description: 'Cuerpo de la plantilla con placeholders {{variable}}',
  })
  @IsString()
  @IsNotEmpty()
  bodyTemplate: string;

  @ApiProperty({
    example: 'LETTERS',
    description: 'Categoría (ej: LETTERS, LEGAL_NOTES, WELFARE, SLA)',
  })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiPropertyOptional({ example: false, default: false })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
