import { ApiProperty } from '@nestjs/swagger';

export class ClientAdministratorDto {
  @ApiProperty({ description: 'Nombre completo del administrador o contacto' })
  name: string;

  @ApiProperty({ description: 'Documento o identificación nacional' })
  document: string;

  @ApiProperty({ description: 'Correo electrónico de contacto' })
  email: string;

  @ApiProperty({ description: 'Teléfono de contacto' })
  phone: string;

  @ApiProperty({ description: 'Cargo o rol registrado en los datos legales' })
  roleName: string;

  @ApiProperty({
    enum: ['INDIVIDUAL', 'ENTERPRISE'],
    description: 'Tipo de administración',
  })
  administrationType: 'INDIVIDUAL' | 'ENTERPRISE';

  @ApiProperty({
    description:
      'Indica si ya existe un usuario registrado en el sistema con este documento',
  })
  isAlreadyUser: boolean;

  @ApiProperty({
    description:
      'Indica si este usuario ya tiene acceso activo a este conjunto residencial',
  })
  hasAccessToThisClient: boolean;

  @ApiProperty({ required: false, description: 'ID del usuario si ya existe' })
  userId?: string;
}
