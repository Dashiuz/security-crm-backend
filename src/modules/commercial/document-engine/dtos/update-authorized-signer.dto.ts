import { PartialType } from '@nestjs/swagger';
import { CreateAuthorizedSignerDto } from './create-authorized-signer.dto';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAuthorizedSignerDto extends PartialType(CreateAuthorizedSignerDto) {
  @ApiPropertyOptional({
    description: 'Estado activo/inactivo del firmante',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
