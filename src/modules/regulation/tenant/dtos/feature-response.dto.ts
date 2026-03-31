import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FeatureResponseDto {
  @ApiProperty({ example: 'minuta' })
  key!: string;

  @ApiProperty({ example: 'Minuta General' })
  name!: string;

  @ApiPropertyOptional({ example: 'Registro de novedades generales' })
  description?: string;
}
