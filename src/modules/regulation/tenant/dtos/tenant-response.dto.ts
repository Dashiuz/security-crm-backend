import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TenantProfileResponseDto } from './tenant-profile.dto';
import { TenantSubscriptionResponseDto } from './tenant-subscription.dto';
import { TenantSettingsResponseDto } from './tenant-settings.dto';

export class TenantResponseDto {
  @ApiProperty({ example: 'clk1234567890' })
  id!: string;

  @ApiProperty({ example: 'My Customer Tenant' })
  name!: string;

  @ApiProperty({ example: 'customer-slug' })
  slug!: string;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiPropertyOptional()
  logoUrl?: string | null;

  @ApiPropertyOptional()
  primaryColor?: string | null;

  @ApiPropertyOptional()
  secondaryColor?: string | null;

  @ApiPropertyOptional()
  sidebarColor?: string | null;

  @ApiPropertyOptional({ type: () => TenantProfileResponseDto })
  profile?: TenantProfileResponseDto | null;

  @ApiPropertyOptional({ type: () => TenantSubscriptionResponseDto })
  subscription?: TenantSubscriptionResponseDto | null;

  @ApiPropertyOptional({ type: () => TenantSettingsResponseDto })
  settings?: TenantSettingsResponseDto | null;

  @ApiPropertyOptional({ type: [String] })
  features?: string[];

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
