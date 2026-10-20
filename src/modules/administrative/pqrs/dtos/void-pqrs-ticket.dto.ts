import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class VoidPqrsTicketDto {
  @ApiProperty({
    description: 'Motivo o justificación formal de anulación de la PQRS',
    example:
      'El peticionario solicitó la anulación por haber radicado la información con error involuntario',
  })
  @IsString({ message: 'El motivo de anulación debe ser un texto válido' })
  @IsNotEmpty({ message: 'El motivo de anulación es obligatorio' })
  @MinLength(10, {
    message: 'El motivo de anulación debe contener al menos 10 caracteres',
  })
  reason: string;
}
