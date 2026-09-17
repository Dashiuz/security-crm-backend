import {
  IsEnum,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsString,
  IsBoolean,
  IsEmail,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { PasswordPolicy } from '@prisma/client';

export class CreateTenantSettingsDto {
  @ApiPropertyOptional({ example: 'America/Bogota', default: 'America/Bogota' })
  @IsOptional()
  @IsString({ message: 'La zona horaria debe ser un texto válido.' })
  @MaxLength(50, { message: 'La zona horaria no puede superar 50 caracteres.' })
  timezone?: string;

  @ApiPropertyOptional({ example: 'COP', default: 'COP' })
  @IsOptional()
  @IsString({ message: 'La moneda debe ser un texto válido.' })
  @MaxLength(10, { message: 'La moneda no puede superar 10 caracteres.' })
  currency?: string;

  @ApiPropertyOptional({ example: 'DD/MM/YYYY', default: 'DD/MM/YYYY' })
  @IsOptional()
  @IsString({ message: 'El formato de fecha debe ser un texto válido.' })
  @MaxLength(20, { message: 'El formato de fecha no puede superar 20 caracteres.' })
  dateFormat?: string;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean({ message: 'mfaRequired debe ser un valor booleano.' })
  mfaRequired?: boolean;

  @ApiPropertyOptional({ example: 60, default: 60 })
  @IsOptional()
  @IsInt({ message: 'sessionTimeoutMinutes debe ser un número entero.' })
  @Min(5, { message: 'sessionTimeoutMinutes debe ser al menos 5 minutos.' })
  @Max(1440, { message: 'sessionTimeoutMinutes no puede exceder 1440 minutos (24 horas).' })
  sessionTimeoutMinutes?: number;

  @ApiPropertyOptional({ enum: PasswordPolicy, default: PasswordPolicy.MEDIUM })
  @IsOptional()
  @IsEnum(PasswordPolicy, { message: 'La política de contraseñas debe ser LOW, MEDIUM o STRICT.' })
  passwordPolicy?: PasswordPolicy;

  @ApiPropertyOptional({ example: 'https://example.com/favicon.ico' })
  @IsOptional()
  @IsString({ message: 'El faviconUrl debe ser un texto válido.' })
  @MaxLength(255, { message: 'El faviconUrl no puede superar 255 caracteres.' })
  faviconUrl?: string;

  @ApiPropertyOptional({ example: 'https://example.com/bg.jpg' })
  @IsOptional()
  @IsString({ message: 'El loginBackgroundUrl debe ser un texto válido.' })
  @MaxLength(255, { message: 'El loginBackgroundUrl no puede superar 255 caracteres.' })
  loginBackgroundUrl?: string;

  @ApiPropertyOptional({ example: 'soporte@empresa.com' })
  @IsOptional()
  @IsEmail({}, { message: 'El correo de soporte debe ser un email válido.' })
  @MaxLength(100, { message: 'El correo de soporte no puede superar 100 caracteres.' })
  supportEmail?: string;

  @ApiPropertyOptional({ example: '+57 300 000 0000' })
  @IsOptional()
  @IsString({ message: 'El teléfono de soporte debe ser un texto válido.' })
  @MaxLength(50, { message: 'El teléfono de soporte no puede superar 50 caracteres.' })
  supportPhone?: string;
}

export class UpdateTenantSettingsDto extends PartialType(CreateTenantSettingsDto) {}

export class TenantSettingsResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty()
  timezone!: string;

  @ApiProperty()
  currency!: string;

  @ApiProperty()
  dateFormat!: string;

  @ApiProperty()
  mfaRequired!: boolean;

  @ApiProperty()
  sessionTimeoutMinutes!: number;

  @ApiProperty({ enum: PasswordPolicy })
  passwordPolicy!: PasswordPolicy;

  @ApiPropertyOptional()
  faviconUrl?: string | null;

  @ApiPropertyOptional()
  loginBackgroundUrl?: string | null;

  @ApiPropertyOptional()
  supportEmail?: string | null;

  @ApiPropertyOptional()
  supportPhone?: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
