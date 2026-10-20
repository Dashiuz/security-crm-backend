import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'ADMIN_SYSTEM' })
  @IsString({ message: 'El nombre del rol debe ser un texto válido.' })
  @IsNotEmpty({ message: 'El nombre del rol es requerido.' })
  name!: string;

  @ApiProperty({ example: true, required: false })
  @IsBoolean({ message: 'El estado activo debe ser un valor booleano.' })
  @IsOptional()
  isActive?: boolean;
}
