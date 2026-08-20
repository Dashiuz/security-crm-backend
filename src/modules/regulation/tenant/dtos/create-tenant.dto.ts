import {
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTenantDto {
  @ApiProperty({ example: 'Mi Empresa Tenant' })
  @IsString({ message: 'El nombre de la organización (tenant) debe ser un texto válido.' })
  @IsNotEmpty({ message: 'El nombre de la organización (tenant) es requerido.' })
  @MaxLength(100, { message: 'El nombre de la organización no puede superar 100 caracteres.' })
  name!: string;

  @ApiProperty({ example: 'mi-empresa-slug' })
  @IsString({ message: 'El slug identificador debe ser un texto válido.' })
  @IsNotEmpty({ message: 'El slug identificador es requerido.' })
  @MaxLength(50, { message: 'El slug identificador no puede superar 50 caracteres.' })
  slug!: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean({ message: 'El estado activo debe ser un valor booleano.' })
  @IsOptional()
  isActive?: boolean;
}
