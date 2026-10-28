import { PartialType } from '@nestjs/swagger';
import { CreateFormatDto } from './create-format.dto';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateFormatDto extends PartialType(CreateFormatDto) {
  @ApiPropertyOptional({ description: 'Estado activo del formato' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
