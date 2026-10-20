import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateUserStatusDto {
  @ApiProperty({
    description:
      'Estado activo o inactivo de las credenciales de acceso digital',
    example: true,
  })
  @IsBoolean({ message: 'isActive debe ser un valor booleano.' })
  isActive!: boolean;
}
