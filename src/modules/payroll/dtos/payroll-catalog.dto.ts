import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';
import { SocialSecurityEntityType, PayrollPeriodStatus } from '@prisma/client';

export class CreatePayrollEntityDto {
  @ApiProperty({ example: 'EPS010' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'EPS SURA' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: SocialSecurityEntityType })
  @IsEnum(SocialSecurityEntityType)
  entityType: SocialSecurityEntityType;

  @ApiProperty({ example: '800088702' })
  @IsString()
  @IsNotEmpty()
  nit: string;

  @ApiProperty({ example: '2', required: false })
  @IsOptional()
  @IsString()
  dv?: string;

  @ApiProperty({ example: 'EPS010' })
  @IsString()
  @IsNotEmpty()
  pluCode: string;

  @ApiProperty({ example: 611, required: false })
  @IsOptional()
  @IsNumber()
  legacyConceptCode?: number;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePayrollEntityDto extends PartialType(
  CreatePayrollEntityDto,
) {}

export class CreatePayrollBankDto {
  @ApiProperty({ example: '1007' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'BANCOLOMBIA' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '007', required: false })
  @IsOptional()
  @IsString()
  achCode?: string;

  @ApiProperty({
    example: 'PAB_BANCOLOMBIA',
    default: 'STANDARD_ACH',
    required: false,
  })
  @IsOptional()
  @IsString()
  exportFormat?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePayrollBankDto extends PartialType(CreatePayrollBankDto) {}

export class CreatePayrollExitReasonDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  code: number;

  @ApiProperty({ example: 'Renuncia Voluntaria' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  isJustCause?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePayrollExitReasonDto extends PartialType(
  CreatePayrollExitReasonDto,
) {}

export class CreatePayrollSvspLevelDto {
  @ApiProperty({ example: '1101' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'FUNDAMENTACION VIGILANCIA' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 365, default: 365, required: false })
  @IsOptional()
  @IsNumber()
  validityDays?: number;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePayrollSvspLevelDto extends PartialType(
  CreatePayrollSvspLevelDto,
) {}

export class CreatePayrollAcademyDto {
  @ApiProperty({ example: 1, description: 'Código de la academia en Pronos' })
  @IsNumber()
  @IsNotEmpty()
  code: number;

  @ApiProperty({ example: 'ACADEMIA NACIONAL DE SEGURIDAD PRIVADA (ASONAL)' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '860012345-1' })
  @IsString()
  @IsNotEmpty()
  nit: string;

  @ApiProperty({ example: 'CALLE 45 # 13-22', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ example: '6013344556', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'contacto@academianacional.edu.co', required: false })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({ example: 'DR. CARLOS MENDEZ', required: false })
  @IsOptional()
  @IsString()
  legalRepName?: string;

  @ApiProperty({ example: 'BOGOTA D.C.', required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePayrollAcademyDto extends PartialType(
  CreatePayrollAcademyDto,
) {}

// 9. CIE-10 Medical Diagnosis Codes
export class CreatePayrollCie10Dto {
  @ApiProperty({
    example: 'J00',
    description: 'Código alfanumérico CIE-10 (3 o 4 caracteres)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  code: string;

  @ApiProperty({
    example: 'Rinofaringitis aguda (resfriado común)',
    description: 'Descripción clínica de la patología',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    example: 'J00-J99',
    description: 'Familia o capítulo de 3 caracteres CIE-10',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  familyCode?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePayrollCie10Dto extends PartialType(CreatePayrollCie10Dto) {}

export class CreatePayrollPeriodDto {
  @ApiProperty({ example: 401 })
  @IsNumber()
  code: number;

  @ApiProperty({ example: 'Nómina Mensual Enero 2026' })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({ example: 2026 })
  @IsNumber()
  year: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  month: number;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @IsNumber()
  periodNumber?: number;

  @ApiProperty({ example: '2026-01-01' })
  @IsString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ example: '2026-01-31' })
  @IsString()
  @IsNotEmpty()
  endDate: string;

  @ApiPropertyOptional({ example: '2026-01-30' })
  @IsOptional()
  @IsString()
  paymentDate?: string;

  @ApiPropertyOptional({
    enum: PayrollPeriodStatus,
    default: PayrollPeriodStatus.OPEN,
  })
  @IsOptional()
  @IsEnum(PayrollPeriodStatus)
  status?: PayrollPeriodStatus;

  @ApiPropertyOptional({ example: 'Periodo ordinario mensual' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class GenerateYearPeriodsDto {
  @ApiProperty({ example: 2026 })
  @IsNumber()
  year: number;

  @ApiPropertyOptional({
    example: 400,
    description: 'Base consecutive code for month 1..12',
  })
  @IsOptional()
  @IsNumber()
  baseCode?: number;
}
