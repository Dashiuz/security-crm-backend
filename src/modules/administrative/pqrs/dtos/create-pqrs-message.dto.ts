import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreatePqrsMessageDto {
  @ApiProperty({
    description: 'Contenido del mensaje o respuesta en el hilo de la PQRS',
    example:
      'Hemos recibido su novedad y estamos coordinando con el supervisor de zona.',
  })
  @IsString()
  @IsNotEmpty({ message: 'El contenido del mensaje es obligatorio' })
  content: string;
}
