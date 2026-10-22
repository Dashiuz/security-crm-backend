import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SignatureDocumentType } from '@prisma/client';

export class CreateSignatureRequestDto {
  @ApiProperty({
    enum: SignatureDocumentType,
    description: 'Tipo de documento legal o comercial',
    example: SignatureDocumentType.SERVICE_ORDER,
  })
  @IsEnum(SignatureDocumentType)
  documentType: SignatureDocumentType;

  @ApiProperty({
    description:
      'ID del registro asociado en el ERP (ej: id de cotización o contrato)',
    example: 'cm20194829103',
  })
  @IsString()
  @IsNotEmpty()
  documentId: string;

  @ApiProperty({
    description:
      'Título legible del documento para la plantilla de correo y encabezado',
    example: 'Orden de Servicio OS-2026-0042',
  })
  @IsString()
  @IsNotEmpty()
  documentTitle: string;

  @ApiProperty({
    description: 'Nombre completo del firmante externo',
    example: 'Carlos Eduardo Mendoza',
  })
  @IsString()
  @IsNotEmpty()
  signerName: string;

  @ApiProperty({
    description:
      'Correo electrónico del destinatario donde se enviará el enlace de firma',
    example: 'carlos.mendoza@cliente.com',
  })
  @IsEmail()
  signerEmail: string;

  @ApiPropertyOptional({
    description: 'Número de documento de identidad (Cédula o NIT)',
    example: '1020304050',
  })
  @IsOptional()
  @IsString()
  signerDocument?: string;

  @ApiPropertyOptional({
    description: 'Teléfono de contacto del firmante',
    example: '+573001234567',
  })
  @IsOptional()
  @IsString()
  signerPhone?: string;

  @ApiPropertyOptional({
    description: 'Cargo o rol del firmante en su organización',
    example: 'Representante Legal',
  })
  @IsOptional()
  @IsString()
  signerRole?: string;

  @ApiPropertyOptional({
    description:
      'Snapshot estructurado en JSONB para renderizado al vuelo en memoria',
    example: { total: 4500000, items: [] },
  })
  @IsOptional()
  draftSnapshot?: any;

  @ApiPropertyOptional({
    description: 'Días de vigencia del enlace (TTL oficial: 15 días)',
    default: 15,
    example: 15,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(60)
  expiresDays?: number = 15;
}
