import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateTenantProfileDto {
  @ApiProperty({ example: 'Seguridad Andina S.A.S.' })
  @IsString({ message: 'La razón social debe ser un texto válido.' })
  @IsNotEmpty({ message: 'La razón social es obligatoria.' })
  @MaxLength(150, { message: 'La razón social no puede superar 150 caracteres.' })
  legalName!: string;

  @ApiProperty({ example: '900123456-7' })
  @IsString({ message: 'El NIT o RUT debe ser un texto válido.' })
  @IsNotEmpty({ message: 'El NIT o RUT es obligatorio.' })
  @MaxLength(50, { message: 'El NIT o RUT no puede superar 50 caracteres.' })
  taxId!: string;

  @ApiProperty({ example: 'contacto@seguridadandina.com' })
  @IsEmail({}, { message: 'El correo de contacto debe ser un email válido.' })
  @IsNotEmpty({ message: 'El correo de contacto es obligatorio.' })
  @MaxLength(100, { message: 'El correo de contacto no puede superar 100 caracteres.' })
  contactEmail!: string;

  @ApiPropertyOptional({ example: '+57 300 123 4567' })
  @IsOptional()
  @IsString({ message: 'El teléfono debe ser un texto válido.' })
  @MaxLength(50, { message: 'El teléfono no puede superar 50 caracteres.' })
  contactPhone?: string;

  @ApiPropertyOptional({ example: 'Calle 100 #15-20, Oficina 501' })
  @IsOptional()
  @IsString({ message: 'La dirección debe ser un texto válido.' })
  @MaxLength(200, { message: 'La dirección no puede superar 200 caracteres.' })
  address?: string;

  @ApiPropertyOptional({ example: 'Bogotá' })
  @IsOptional()
  @IsString({ message: 'La ciudad debe ser un texto válido.' })
  @MaxLength(100, { message: 'La ciudad no puede superar 100 caracteres.' })
  city?: string;

  @ApiPropertyOptional({ example: 'Colombia' })
  @IsOptional()
  @IsString({ message: 'El país debe ser un texto válido.' })
  @MaxLength(100, { message: 'El país no puede superar 100 caracteres.' })
  country?: string;

  @ApiPropertyOptional({ example: 'Juan Pérez Gómez' })
  @IsOptional()
  @IsString({ message: 'El representante legal debe ser un texto válido.' })
  @MaxLength(150, { message: 'El representante legal no puede superar 150 caracteres.' })
  legalRepresentative?: string;
}

export class UpdateTenantProfileDto extends PartialType(CreateTenantProfileDto) {}

export class TenantProfileResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty()
  legalName!: string;

  @ApiProperty()
  taxId!: string;

  @ApiProperty()
  contactEmail!: string;

  @ApiPropertyOptional()
  contactPhone?: string | null;

  @ApiPropertyOptional()
  address?: string | null;

  @ApiPropertyOptional()
  city?: string | null;

  @ApiPropertyOptional()
  country?: string | null;

  @ApiPropertyOptional()
  legalRepresentative?: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
