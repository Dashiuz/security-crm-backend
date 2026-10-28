import { PartialType } from '@nestjs/swagger';
import { CreateTariffPeriodDto } from './create-tariff-period.dto';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTariffPeriodDto extends PartialType(CreateTariffPeriodDto) {
  @ApiPropertyOptional({
    example: true,
    description: 'Estado activo del tramo tarifario',
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
