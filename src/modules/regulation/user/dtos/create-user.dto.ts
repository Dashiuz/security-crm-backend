import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsArray } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'password' })
  @IsString({ message: 'La contraseña debe ser un texto válido.' })
  @IsNotEmpty({ message: 'La contraseña es requerida.' })
  password!: string;

  @ApiProperty({ example: '12345678' })
  @IsString({ message: 'El número de documento debe ser un texto válido.' })
  @IsNotEmpty({ message: 'El número de documento es requerido.' })
  document!: string;

  @ApiPropertyOptional({ example: ['role_id_1'] })
  @IsArray({ message: 'Los roles deben proporcionarse en una lista.' })
  @IsString({ each: true, message: 'Cada ID de rol debe ser un texto válido.' })
  @IsOptional()
  roleIds?: string[];
}
