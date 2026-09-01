import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreatePermissionDto {
  @ApiProperty({
    example: 'employee:read',
    description: 'Clave única del permiso',
  })
  @IsString({ message: 'La clave del permiso debe ser un texto válido.' })
  @IsNotEmpty({ message: 'La clave del permiso es requerida.' })
  @MaxLength(100, { message: 'La clave del permiso no puede superar 100 caracteres.' })
  key!: string;

  @ApiProperty({
    example: 'Permite leer información de empleados',
    description: 'Descripción del permiso',
    required: false,
  })
  @IsString({ message: 'La descripción del permiso debe ser un texto válido.' })
  @MaxLength(255, { message: 'La descripción no puede superar 255 caracteres.' })
  @IsOptional()
  desc?: string;
}
