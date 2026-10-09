import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PqrsPriority, PqrsType } from '@prisma/client';

export class CreatePqrsTicketDto {
  @ApiProperty({
    description: 'Asunto o título de la PQRS',
    example: 'Inconformidad con el cambio de turno en portería',
  })
  @IsString()
  @IsNotEmpty({ message: 'El asunto es obligatorio' })
  @MaxLength(200, { message: 'El asunto no puede exceder 200 caracteres' })
  subject: string;

  @ApiProperty({
    description: 'Descripción detallada de la solicitud',
    example: 'El día de ayer se presentó una novedad...',
  })
  @IsString()
  @IsNotEmpty({ message: 'La descripción es obligatoria' })
  description: string;

  @ApiProperty({
    enum: PqrsType,
    description:
      'Tipo de solicitud (PETICION, QUEJA, RECLAMO, SUGERENCIA, FELICITACION)',
    example: PqrsType.QUEJA,
  })
  @IsEnum(PqrsType, { message: 'Tipo de PQRS no válido' })
  @IsNotEmpty({ message: 'El tipo de PQRS es obligatorio' })
  type: PqrsType;

  @ApiPropertyOptional({
    enum: PqrsPriority,
    description: 'Prioridad asignada (LOW, MEDIUM, HIGH, CRITICAL)',
    default: PqrsPriority.MEDIUM,
  })
  @IsEnum(PqrsPriority, { message: 'Prioridad no válida' })
  @IsOptional()
  priority?: PqrsPriority;

  @ApiPropertyOptional({
    description:
      'ID del cliente/conjunto. Obligatorio si el usuario es del Tenant y no tiene clientId asignado',
  })
  @IsString()
  @IsOptional()
  clientId?: string;
}
