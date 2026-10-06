import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PqrsPriority } from '@prisma/client';

export class AssignPqrsTicketDto {
  @ApiProperty({
    description: 'ID del usuario al que se le asignará el ticket de PQRS',
    example: 'clxxx...id',
  })
  @IsString()
  @IsNotEmpty({ message: 'El ID del usuario a asignar es obligatorio' })
  assignedToId: string;

  @ApiPropertyOptional({
    enum: PqrsPriority,
    description: 'Prioridad asignada o ajustada al momento de asignar el ticket',
    example: PqrsPriority.HIGH,
  })
  @IsEnum(PqrsPriority, { message: 'Prioridad no válida' })
  @IsOptional()
  priority?: PqrsPriority;
}

