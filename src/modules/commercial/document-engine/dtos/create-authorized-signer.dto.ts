import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsBoolean,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SignerRoleScope } from '@prisma/client';

export class CreateAuthorizedSignerDto {
  @ApiProperty({
    description: 'Nombre completo del firmante institucional',
    example: 'Dr. Alejandro Morales Ramos',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  fullName: string;

  @ApiProperty({
    description: 'Cédula de ciudadanía o identificación legal',
    example: '19.824.912',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  idNumber: string;

  @ApiProperty({
    description: 'Cargo corporativo oficial',
    example: 'Director Comercial y de Operaciones',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  corporateTitle: string;

  @ApiProperty({
    description: 'Correo electrónico corporativo',
    example: 'alejandro.morales@seguridad.com',
  })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(150)
  email: string;

  @ApiPropertyOptional({
    description: 'Teléfono o celular de contacto',
    example: '+57 310 987 6543',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({
    enum: SignerRoleScope,
    description: 'Ámbito funcional de firma',
    default: SignerRoleScope.CUSTOM,
    example: SignerRoleScope.COMMERCIAL_DIRECTOR,
  })
  @IsOptional()
  @IsEnum(SignerRoleScope)
  roleScope?: SignerRoleScope;

  @ApiPropertyOptional({
    description: 'Firma digital en Base64 Data URL (si proviene del visor de dibujo)',
  })
  @IsOptional()
  @IsString()
  signatureDataUrl?: string;

  @ApiPropertyOptional({
    description: 'Marcar como firmante comercial por defecto',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isDefaultCommercial?: boolean;

  @ApiPropertyOptional({
    description: 'Marcar como representante legal por defecto',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isDefaultLegal?: boolean;
}
