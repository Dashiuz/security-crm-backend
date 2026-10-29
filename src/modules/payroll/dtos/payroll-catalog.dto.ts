import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsNotEmpty,
} from 'class-validator';
import { SocialSecurityEntityType } from '@prisma/client';

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
