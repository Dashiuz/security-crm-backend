import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsEmail,
  IsDateString,
  Matches,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateDocumentSkinDto {
  @ApiPropertyOptional({
    example: '#1E1B4B',
    description: 'Color primario institucional en Hex',
  })
  @IsString()
  @Matches(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, {
    message: 'El color primario debe ser un código HEX válido',
  })
  @IsOptional()
  primaryBrandColorHex?: string;

  @ApiPropertyOptional({
    example: '#7C3AED',
    description: 'Color acento institucional en Hex',
  })
  @IsString()
  @Matches(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, {
    message: 'El color acento debe ser un código HEX válido',
  })
  @IsOptional()
  accentBrandColorHex?: string;

  @ApiPropertyOptional({ example: 'tenants/logos/primary-logo.webp' })
  @IsString()
  @IsOptional()
  logoS3Key?: string;

  @ApiPropertyOptional({ example: 'tenants/logos/secondary-logo.webp' })
  @IsString()
  @IsOptional()
  secondaryLogoS3Key?: string;

  @ApiPropertyOptional({ example: 'NOXIA SEGURIDAD PRIVADA S.A.S.' })
  @IsString()
  @IsOptional()
  companyLegalName?: string;

  @ApiPropertyOptional({ example: '901.345.678-9' })
  @IsString()
  @IsOptional()
  companyNit?: string;

  @ApiPropertyOptional({ example: '0029384-01' })
  @IsString()
  @IsOptional()
  commercialRegisterNum?: string;

  @ApiPropertyOptional({ example: 'RES-2024-SVSP-004921' })
  @IsString()
  @IsOptional()
  supervigilanciaLicense?: string;

  @ApiPropertyOptional({ example: '2024-03-15' })
  @IsDateString()
  @IsOptional()
  supervigilanciaLicDate?: string;

  @ApiPropertyOptional({ example: '2029-03-15' })
  @IsDateString()
  @IsOptional()
  supervigilanciaLicExpiry?: string;

  @ApiPropertyOptional({ example: 'TIC-00918-2023' })
  @IsString()
  @IsOptional()
  minTicLicenseNum?: string;

  @ApiPropertyOptional({ example: 'RES-UNI-2023-11' })
  @IsString()
  @IsOptional()
  uniformsResolutionNum?: string;

  @ApiPropertyOptional({ example: 'RES-EXT-2023-45' })
  @IsString()
  @IsOptional()
  overtimeResolutionNum?: string;

  @ApiPropertyOptional({
    example: 99.5,
    description: 'Porcentaje de implementación de SG-SST',
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  sstImplementationPct?: number;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  hasIso9001Certified?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  hasBascCertified?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  hasPoliceSupportNetwork?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  hasDijinEnterpriseFront?: boolean;
}
