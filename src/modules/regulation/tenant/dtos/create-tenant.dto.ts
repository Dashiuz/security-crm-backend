import {
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsOptional,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateTenantProfileDto } from './tenant-profile.dto';
import { CreateTenantSubscriptionDto } from './tenant-subscription.dto';
import { CreateTenantSettingsDto } from './tenant-settings.dto';

export class CreateTenantDto {
  @ApiProperty({ example: 'Mi Empresa Tenant' })
  @IsString({
    message: 'El nombre de la organización (tenant) debe ser un texto válido.',
  })
  @IsNotEmpty({
    message: 'El nombre de la organización (tenant) es requerido.',
  })
  @MaxLength(100, {
    message: 'El nombre de la organización no puede superar 100 caracteres.',
  })
  name!: string;

  @ApiProperty({ example: 'mi-empresa-slug' })
  @IsString({ message: 'El slug identificador debe ser un texto válido.' })
  @IsNotEmpty({ message: 'El slug identificador es requerido.' })
  @MaxLength(50, {
    message: 'El slug identificador no puede superar 50 caracteres.',
  })
  slug!: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean({ message: 'El estado activo debe ser un valor booleano.' })
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'https://example.com/logo.png' })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({ example: '#1976d2' })
  @IsOptional()
  @IsString()
  primaryColor?: string;

  @ApiPropertyOptional({ example: '#9c27b0' })
  @IsOptional()
  @IsString()
  secondaryColor?: string;

  @ApiPropertyOptional({ example: '#252b27' })
  @IsOptional()
  @IsString()
  sidebarColor?: string;

  @ApiPropertyOptional({ type: () => CreateTenantProfileDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateTenantProfileDto)
  profile?: CreateTenantProfileDto;

  @ApiPropertyOptional({ type: () => CreateTenantSubscriptionDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateTenantSubscriptionDto)
  subscription?: CreateTenantSubscriptionDto;

  @ApiPropertyOptional({ type: () => CreateTenantSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateTenantSettingsDto)
  settings?: CreateTenantSettingsDto;
}
