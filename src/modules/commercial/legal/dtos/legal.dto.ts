import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsDateString,
  IsNumber,
  Min,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  PolicyType,
  PolicyStatus,
  AnsCommitmentType,
  AnsCommitmentStatus,
} from '@prisma/client';

// ==========================================
// Pólizas de Seguros Contractuales
// ==========================================

export class CreateInsurancePolicyDto {
  @ApiProperty({ description: 'ID del cliente' })
  @IsString()
  @IsNotEmpty()
  clientId: string;

  @ApiProperty({ enum: PolicyType, example: PolicyType.CIVIL_LIABILITY_PLO })
  @IsEnum(PolicyType)
  policyType: PolicyType;

  @ApiProperty({ example: 'Seguros del Estado S.A.' })
  @IsString()
  @IsNotEmpty()
  insuranceCompanyName: string;

  @ApiProperty({ example: 'POL-2026-998822' })
  @IsString()
  @IsNotEmpty()
  policyCertificateNumber: string;

  @ApiProperty({ example: 500000000 })
  @IsNumber()
  @Min(0)
  insuredAmount: number;

  @ApiProperty({ example: '2026-11-01' })
  @IsDateString()
  effectiveStartDate: string;

  @ApiProperty({ example: '2027-10-31' })
  @IsDateString()
  effectiveEndDate: string;

  @ApiPropertyOptional({ enum: PolicyStatus, default: PolicyStatus.ACTIVE })
  @IsOptional()
  @IsEnum(PolicyStatus)
  status?: PolicyStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mediaAttachmentId?: string;
}

export class UpdateInsurancePolicyDto extends CreateInsurancePolicyDto {}

// ==========================================
// Otrosíes y Adiciones Contractuales (OSI)
// ==========================================

export class CreateContractAddendumDto {
  @ApiProperty({ description: 'ID del cliente' })
  @IsString()
  @IsNotEmpty()
  clientId: string;

  @ApiProperty({ example: 'OSI-001' })
  @IsString()
  @IsNotEmpty()
  addendumNumber: string;

  @ApiProperty({
    example: 'Otrosí No. 1 - Adición de Puesto Portería y Reinversión',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: '2026-11-01' })
  @IsDateString()
  effectiveStartDate: string;

  @ApiProperty({ example: '2027-10-31' })
  @IsDateString()
  effectiveEndDate: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationYears?: number;

  @ApiPropertyOptional({ example: 5000000, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  reinvestmentAmountPact?: number;

  @ApiPropertyOptional({ example: 2500000, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  disbursedAmount?: number;

  @ApiPropertyOptional({ example: '2026-11-15' })
  @IsOptional()
  @IsDateString()
  disbursementDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mediaAttachmentId?: string;
}

export class UpdateContractAddendumDto extends CreateContractAddendumDto {}

// ==========================================
// Compromisos de Niveles de Servicio (ANS)
// ==========================================

export class CreateAnsCommitmentDto {
  @ApiProperty({ description: 'ID del cliente' })
  @IsString()
  @IsNotEmpty()
  clientId: string;

  @ApiProperty({
    enum: AnsCommitmentType,
    example: AnsCommitmentType.SECURITY_STUDY_DELIVERY,
  })
  @IsEnum(AnsCommitmentType)
  commitmentType: AnsCommitmentType;

  @ApiProperty({
    example: 'Entrega Estudio de Seguridad Física de Copropiedad',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: '2026-11-15' })
  @IsDateString()
  dueDate: string;

  @ApiPropertyOptional({ example: '2026-11-10' })
  @IsOptional()
  @IsDateString()
  deliveredDate?: string;

  @ApiPropertyOptional({
    enum: AnsCommitmentStatus,
    default: AnsCommitmentStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(AnsCommitmentStatus)
  status?: AnsCommitmentStatus;

  @ApiPropertyOptional({
    example: 'Entregado en reunión con Consejo de Administración',
  })
  @IsOptional()
  @IsString()
  evidenceNotes?: string;
}

export class UpdateAnsCommitmentDto extends CreateAnsCommitmentDto {}
