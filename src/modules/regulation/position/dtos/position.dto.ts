import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsBoolean,
  IsOptional,
  IsInt,
  IsEnum,
} from 'class-validator';
import { OperationalCategory } from '@prisma/client';

export { OperationalCategory };

export class CreatePositionDto {
  @ApiProperty({ example: 'Supervisor de Seguridad' })
  @IsString({
    message: 'El nombre del cargo o posición debe ser un texto válido.',
  })
  @IsNotEmpty({ message: 'El nombre del cargo o posición es requerido.' })
  name!: string;

  @ApiProperty({ example: 1, required: false })
  @IsInt({ message: 'El nivel jerárquico debe ser un número entero.' })
  @IsOptional()
  level?: number;

  @ApiProperty({
    enum: OperationalCategory,
    example: OperationalCategory.SUPERVISOR,
    required: false,
    default: OperationalCategory.GUARD,
  })
  @IsEnum(OperationalCategory, {
    message:
      'La categoría operativa debe ser un valor válido (DIRECTOR, COORDINATOR, SUPERVISOR, GUARD, OPERATOR, ADMINISTRATIVE, OTHER).',
  })
  @IsOptional()
  operationalCategory?: OperationalCategory;

  @ApiProperty({ example: true, required: false })
  @IsBoolean({ message: 'El estado activo debe ser un valor booleano.' })
  @IsOptional()
  isActive?: boolean;
}

export class UpdatePositionDto {
  @ApiProperty({ example: 'Director Operativo', required: false })
  @IsString({
    message: 'El nombre del cargo o posición debe ser un texto válido.',
  })
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 2, required: false })
  @IsInt({ message: 'El nivel jerárquico debe ser un número entero.' })
  @IsOptional()
  level?: number;

  @ApiProperty({
    enum: OperationalCategory,
    example: OperationalCategory.DIRECTOR,
    required: false,
  })
  @IsEnum(OperationalCategory, {
    message: 'La categoría operativa debe ser un valor válido.',
  })
  @IsOptional()
  operationalCategory?: OperationalCategory;

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

  @ApiProperty({
    enum: OperationalCategory,
    example: OperationalCategory.SUPERVISOR,
  })
  operationalCategory!: OperationalCategory;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: '2021-01-01T00:00:00.000Z' })
  createdAt!: Date;
}
