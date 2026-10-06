import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PqrsStatus } from '@prisma/client';

export class UpdatePqrsStatusDto {
  @ApiProperty({
    enum: PqrsStatus,
    description: 'Nuevo estado para la solicitud PQRS',
    example: PqrsStatus.IN_PROGRESS,
  })
  @IsEnum(PqrsStatus, { message: 'Estado de PQRS no válido' })
  @IsNotEmpty({ message: 'El estado es obligatorio' })
  status: PqrsStatus;

  @ApiPropertyOptional({
    description: 'Motivo o justificación del cambio de estado',
  })
  @IsString()
  @IsOptional()
  reason?: string;
}
