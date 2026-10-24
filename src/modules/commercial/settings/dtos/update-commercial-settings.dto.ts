import {
  IsNumber,
  IsBoolean,
  IsString,
  IsOptional,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCommercialSettingsDto {
  @ApiPropertyOptional({ example: 0.1, description: 'Tasa base de AIU (10%)' })
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  defaultAiuRate?: number;

  @ApiPropertyOptional({
    example: 0.19,
    description: 'Tasa de IVA aplicada sobre el AIU (19%)',
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  defaultIvaOnAiuRate?: number;

  @ApiPropertyOptional({
    example: 0.02,
    description: 'Tasa de Retención en la Fuente sobre AIU (2%)',
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  defaultRetefuenteRate?: number;

  @ApiPropertyOptional({
    example: 0.0138,
    description: 'Tasa de ReteICA sobre Subtotal (1.38%)',
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  defaultReteIcaRate?: number;

  @ApiPropertyOptional({
    example: 0.8,
    description: 'Tope máximo de reinversión en contratos a 1 año (80%)',
  })
  @IsNumber()
  @Min(0)
  @Max(5)
  @IsOptional()
  maxReinvestmentPct1Yr?: number;

  @ApiPropertyOptional({
    example: 1.6,
    description: 'Tope máximo de reinversión en contratos a 2 años (160%)',
  })
  @IsNumber()
  @Min(0)
  @Max(10)
  @IsOptional()
  maxReinvestmentPct2Yr?: number;

  @ApiPropertyOptional({
    example: 15,
    description: 'Días hábiles de validez por defecto para cotizaciones',
  })
  @IsNumber()
  @Min(1)
  @Max(180)
  @IsOptional()
  defaultQuoteValidityDays?: number;

  @ApiPropertyOptional({
    example: true,
    description:
      'Permite visibilizar el desglose salarial del guarda en propuestas',
  })
  @IsBoolean()
  @IsOptional()
  enableGuardSalaryDisplay?: boolean;

  @ApiPropertyOptional({
    example: 'CM-F-001',
    description: 'Código de calidad ISO para formatos comerciales',
  })
  @IsString()
  @IsOptional()
  qualityDocCode?: string;

  @ApiPropertyOptional({
    example: 'V.4',
    description: 'Versión del documento de calidad ISO',
  })
  @IsString()
  @IsOptional()
  qualityDocVersion?: string;

  @ApiPropertyOptional({
    example: '2026-01-15',
    description: 'Fecha de revisión del documento de calidad ISO',
  })
  @IsDateString()
  @IsOptional()
  qualityDocRevisionDate?: string;
}
