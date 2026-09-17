import { PartialType, OmitType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateTenantDto } from './create-tenant.dto';
import { ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateTenantProfileDto } from './tenant-profile.dto';
import { UpdateTenantSubscriptionDto } from './tenant-subscription.dto';
import { UpdateTenantSettingsDto } from './tenant-settings.dto';

export class UpdateTenantDto extends PartialType(
  OmitType(CreateTenantDto, ['profile', 'subscription', 'settings'] as const),
) {
  @ApiPropertyOptional({ type: () => UpdateTenantProfileDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateTenantProfileDto)
  profile?: UpdateTenantProfileDto;

  @ApiPropertyOptional({ type: () => UpdateTenantSubscriptionDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateTenantSubscriptionDto)
  subscription?: UpdateTenantSubscriptionDto;

  @ApiPropertyOptional({ type: () => UpdateTenantSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateTenantSettingsDto)
  settings?: UpdateTenantSettingsDto;
}
