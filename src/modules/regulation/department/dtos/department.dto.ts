import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsBoolean, IsOptional } from 'class-validator';

export class CreateDepartmentDto {
  @ApiProperty({ example: 'Recursos Humanos' })
  @IsString({ message: 'El nombre del departamento debe ser un texto válido.' })
  @IsNotEmpty({ message: 'El nombre del departamento es requerido.' })
  name!: string;

  @ApiProperty({ example: true, required: false })
  @IsBoolean({ message: 'El estado activo debe ser un valor booleano.' })
  @IsOptional()
  isActive?: boolean;
}

export class UpdateDepartmentDto {
  @ApiProperty({ example: 'Operaciones de Seguridad', required: false })
  @IsString({ message: 'El nombre del departamento debe ser un texto válido.' })
  @IsOptional()
  name?: string;

  @ApiProperty({ example: true, required: false })
  @IsBoolean({ message: 'El estado activo debe ser un valor booleano.' })
  @IsOptional()
  isActive?: boolean;
}

export class DepartmentResponseDto {
  @ApiProperty({ example: 'id_123' })
  id!: string;

  @ApiProperty({ example: 'tenant_id_123' })
  tenantId!: string;

  @ApiProperty({ example: 'Recursos Humanos' })
  name!: string;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: '2021-01-01T00:00:00.000Z' })
  createdAt!: Date;
}
