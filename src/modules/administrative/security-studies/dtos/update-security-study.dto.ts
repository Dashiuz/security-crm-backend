import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateSecurityStudyDto {
  @ApiPropertyOptional({ description: 'Nombre o título del estudio de seguridad' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Descripción o notas del estudio de seguridad' })
  @IsOptional()
  @IsString()
  description?: string;
}
