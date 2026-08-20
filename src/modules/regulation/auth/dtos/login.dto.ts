import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: '1122334455' })
  @IsString({ message: 'El número de documento debe ser un texto válido.' })
  @IsNotEmpty({ message: 'El número de documento es requerido.' })
  document!: string;

  @ApiProperty({ example: 'P@ssw0rd123' })
  @IsString({ message: 'La contraseña debe ser un texto válido.' })
  @IsNotEmpty({ message: 'La contraseña es requerida.' })
  password!: string;
}
