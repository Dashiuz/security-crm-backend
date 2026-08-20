import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateUserPasswordDto {
  @ApiProperty({ example: '1122334455' })
  @IsString({ message: 'El número de documento debe ser un texto válido.' })
  @IsNotEmpty({ message: 'El número de documento es requerido.' })
  document: string;

  @ApiProperty({ example: 'p455w0rd' })
  @IsString({ message: 'La contraseña actual debe ser un texto válido.' })
  @IsNotEmpty({ message: 'La contraseña actual es requerida.' })
  oldPassword: string;

  @ApiProperty({ example: '4w350m3p455w0rd' })
  @IsString({ message: 'La nueva contraseña debe ser un texto válido.' })
  @IsNotEmpty({ message: 'La nueva contraseña es requerida.' })
  newPassword: string;
}
