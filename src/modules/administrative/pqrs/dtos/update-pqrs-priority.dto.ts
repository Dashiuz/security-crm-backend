import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { PqrsPriority } from '@prisma/client';

export class UpdatePqrsPriorityDto {
  @ApiProperty({
    enum: PqrsPriority,
    description: 'Nueva prioridad asignada al ticket',
    example: PqrsPriority.HIGH,
  })
  @IsEnum(PqrsPriority, { message: 'Prioridad no válida' })
  @IsNotEmpty({ message: 'La prioridad es obligatoria' })
  priority: PqrsPriority;
}
