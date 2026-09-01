import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'ADMIN_SYSTEM' })
  @IsString({ message: 'El nombre del rol debe ser un texto válido.' })
  @IsNotEmpty({ message: 'El nombre del rol es requerido.' })
  name!: string;
}
