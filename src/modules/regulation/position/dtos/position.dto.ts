import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsBoolean,
  IsOptional,
  IsInt,
} from 'class-validator';

export class CreatePositionDto {
  @ApiProperty({ example: 'Supervisor de Seguridad' })
  @IsString({ message: 'El nombre del cargo o posición debe ser un texto válido.' })
  @IsNotEmpty({ message: 'El nombre del cargo o posición es requerido.' })
  name!: string;

  @ApiProperty({ example: 1, required: false })
  @IsInt({ message: 'El nivel jerárquico debe ser un número entero.' })
  @IsOptional()
  level?: number;

  @ApiProperty({ example: true, required: false })
  @IsBoolean({ message: 'El estado activo debe ser un valor booleano.' })
  @IsOptional()
  isActive?: boolean;
}

export class UpdatePositionDto {
  @ApiProperty({ example: 'Director Operativo', required: false })
  @IsString({ message: 'El nombre del cargo o posición debe ser un texto válido.' })
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 2, required: false })
  @IsInt({ message: 'El nivel jerárquico debe ser un número entero.' })
  @IsOptional()
  level?: number;

  @ApiProperty({ example: true, required: false })
  @IsBoolean({ message: 'El estado activo debe ser un valor booleano.' })
  @IsOptional()
  isActive?: boolean;
}

export class PositionResponseDto {
  @ApiProperty({ example: 'id_123' })
  id!: string;

  @ApiProperty({ example: 'tenant_id_123' })
  tenantId!: string;

  @ApiProperty({ example: 'Supervisor de Seguridad' })
  name!: string;

  @ApiProperty({ example: 1 })
  level?: number;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: '2021-01-01T00:00:00.000Z' })
  createdAt!: Date;
}
