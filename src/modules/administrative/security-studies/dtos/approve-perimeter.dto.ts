import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class ApprovePerimeterDto {
  @ApiPropertyOptional({
    description:
      'Polígono GeoJSON opcional con coordenadas perimetrales [ [ [lng, lat], ... ] ]. Si no se envía, se extraerá de canvasState.',
  })
  @IsOptional()
  perimeterGeoJson?: {
    type: 'Polygon';
    coordinates: number[][][];
  };
}
