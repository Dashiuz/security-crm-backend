import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSecurityStudyDto {
  @ApiProperty({ description: 'ID del cliente asociado' })
  @IsString()
  @IsNotEmpty()
  clientId: string;

  @ApiProperty({ description: 'Nombre o título del estudio' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Descripción o notas del estudio' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Ruta S3 de la imagen base satelital' })
  @IsOptional()
  @IsString()
  baseImageS3Key?: string;

  @ApiPropertyOptional({ description: 'Latitud central de la imagen base' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  mapboxCenterLat?: number;

  @ApiPropertyOptional({ description: 'Longitud central de la imagen base' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  mapboxCenterLng?: number;

  @ApiPropertyOptional({ description: 'Nivel de zoom de la imagen base' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  mapboxZoom?: number;

  @ApiPropertyOptional({ description: 'Latitud mínima del Bounding Box' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  mapboxBboxMinLat?: number;

  @ApiPropertyOptional({ description: 'Longitud mínima del Bounding Box' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  mapboxBboxMinLng?: number;

  @ApiPropertyOptional({ description: 'Latitud máxima del Bounding Box' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  mapboxBboxMaxLat?: number;

  @ApiPropertyOptional({ description: 'Longitud máxima del Bounding Box' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  mapboxBboxMaxLng?: number;


  @ApiPropertyOptional({
    description: 'Estado vectorial completo del Canva Konva.js',
  })
  @IsOptional()
  canvasState?: any;

  @ApiPropertyOptional({
    description: 'Archivos o documentos adjuntos (PDFs, fotos)',
  })
  @IsOptional()
  files?: any;
}
