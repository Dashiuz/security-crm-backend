import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsEnum,
  Matches,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentHeaderLayout } from '@prisma/client';

export class UpdateTenantDocumentSkinDto {
  @ApiPropertyOptional({
    description: 'Color primario de la marca en hexadecimal (#RRGGBB)',
    example: '#1E1B4B',
  })
  @IsOptional()
  @IsString()
  @Matches(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, {
    message: 'primaryBrandColorHex debe ser un código HEX válido (#1E1B4B)',
  })
  primaryBrandColorHex?: string;

  @ApiPropertyOptional({
    description: 'Color secundario o de acento de la marca en hexadecimal',
    example: '#7C3AED',
  })
  @IsOptional()
  @IsString()
  @Matches(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, {
    message: 'accentBrandColorHex debe ser un código HEX válido (#7C3AED)',
  })
  accentBrandColorHex?: string;

  @ApiPropertyOptional({
    description: 'Color secundario para alertas y badges',
    example: '#F59E0B',
  })
  @IsOptional()
  @IsString()
  secondaryColorHex?: string;

  @ApiPropertyOptional({
    description: 'Color oscuro neutro para tipografía principal',
    example: '#0F172A',
  })
  @IsOptional()
  @IsString()
  neutralDarkHex?: string;

  @ApiPropertyOptional({
    description: 'Color claro neutro para fondos de tabla',
    example: '#F8FAFC',
  })
  @IsOptional()
  @IsString()
  neutralLightHex?: string;

  @ApiPropertyOptional({
    enum: DocumentHeaderLayout,
    description: 'Diseño arquitectónico del encabezado / membrete',
    example: DocumentHeaderLayout.CLASSIC_MEMBRETE,
  })
  @IsOptional()
  @IsEnum(DocumentHeaderLayout)
  headerLayout?: DocumentHeaderLayout;

  @ApiPropertyOptional({
    description: 'Habilitar o deshabilitar marca de agua institucional',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  watermarkEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Opacidad de la marca de agua (0.01 a 0.50)',
    example: 0.06,
  })
  @IsOptional()
  @IsNumber()
  watermarkOpacity?: number;

  @ApiPropertyOptional({
    description: 'Prefijo de codificación de documentos BASC/ISO',
    example: 'CM-F',
  })
  @IsOptional()
  @IsString()
  isoDocumentCodePrefix?: string;

  @ApiPropertyOptional({
    description: 'Descargo de responsabilidad y pie de página legal predeterminado',
    example: 'Vigilado SuperVigilancia | Certificación BASC COLBOG00123',
  })
  @IsOptional()
  @IsString()
  defaultFooterDisclaimer?: string;

  // Credenciales Legales
  @ApiPropertyOptional({ description: 'Razón social legal', example: 'SEGURIDAD NOXIA LTDA' })
  @IsOptional()
  @IsString()
  companyLegalName?: string;

  @ApiPropertyOptional({ description: 'NIT de la empresa con dígito de verificación', example: '900.123.456-7' })
  @IsOptional()
  @IsString()
  companyNit?: string;

  @ApiPropertyOptional({ description: 'Matrícula mercantil de la Cámara de Comercio' })
  @IsOptional()
  @IsString()
  commercialRegisterNum?: string;

  @ApiPropertyOptional({ description: 'Número de resolución de licencia SuperVigilancia' })
  @IsOptional()
  @IsString()
  supervigilanciaLicense?: string;

  @ApiPropertyOptional({ description: 'Fecha de expedición de la licencia SVSP (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  supervigilanciaLicDate?: string;

  @ApiPropertyOptional({ description: 'Fecha de vencimiento de la licencia SVSP (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  supervigilanciaLicExpiry?: string;

  @ApiPropertyOptional({ description: 'Resolución de red de telecomunicaciones MinTIC' })
  @IsOptional()
  @IsString()
  minTicLicenseNum?: string;

  @ApiPropertyOptional({ description: 'Resolución de aprobación de uniformes SVSP' })
  @IsOptional()
  @IsString()
  uniformsResolutionNum?: string;

  @ApiPropertyOptional({ description: 'Resolución de horas extras MinTrabajo' })
  @IsOptional()
  @IsString()
  overtimeResolutionNum?: string;

  @ApiPropertyOptional({ description: 'Porcentaje de implementación de SG-SST (0 - 100)', example: 99.5 })
  @IsOptional()
  @IsNumber()
  sstImplementationPct?: number;

  // Sellos y Certificaciones
  @ApiPropertyOptional({ description: 'Certificado ISO 9001 activo' })
  @IsOptional()
  @IsBoolean()
  hasIso9001Certified?: boolean;

  @ApiPropertyOptional({ description: 'Certificación BASC activa' })
  @IsOptional()
  @IsBoolean()
  hasBascCertified?: boolean;

  @ApiPropertyOptional({ description: 'Vinculado a Red de Apoyo de la Policía Nacional' })
  @IsOptional()
  @IsBoolean()
  hasPoliceSupportNetwork?: boolean;

  @ApiPropertyOptional({ description: 'Afiliado a Frente de Seguridad Empresarial DIJIN' })
  @IsOptional()
  @IsBoolean()
  hasDijinEnterpriseFront?: boolean;
}
