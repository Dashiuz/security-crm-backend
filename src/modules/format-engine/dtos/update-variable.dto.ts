import { PartialType } from '@nestjs/swagger';
import { CreateVariableDto } from './create-variable.dto';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateVariableDto extends PartialType(CreateVariableDto) {
  @ApiPropertyOptional({ description: 'Estado activo de la variable' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
