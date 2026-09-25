import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GenerateBaseMapDto {
  @ApiProperty({ description: 'ID del cliente asociado' })
  @IsString()
  @IsNotEmpty()
  clientId: string;

  @ApiProperty({ description: 'Latitud central', example: 4.711 })
  @Type(() => Number)
  @IsNumber()
  lat: number;

  @ApiProperty({ description: 'Longitud central', example: -74.0721 })
  @Type(() => Number)
  @IsNumber()
  lng: number;

  @ApiProperty({ description: 'Nivel de zoom (14 a 20)', example: 17 })
  @Type(() => Number)
  @IsNumber()
  @Min(12)
  @Max(22)
  zoom: number;

  @ApiPropertyOptional({ description: 'Ancho en píxeles de la imagen', default: 1280 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(300)
  @Max(2560)
  width?: number = 1280;

  @ApiPropertyOptional({ description: 'Alto en píxeles de la imagen', default: 720 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(300)
  @Max(1440)
  height?: number = 720;

  @ApiPropertyOptional({
    description: 'Estilo de mapa Mapbox',
    default: 'mapbox/satellite-v9',
  })
  @IsOptional()
  @IsString()
  style?: string = 'mapbox/satellite-v9';
}
