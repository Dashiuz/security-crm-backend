import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsNotEmpty,
  Min,
} from 'class-validator';
import { DependencySettlementType, ArlRiskClass } from '@prisma/client';

export class CreatePayrollDependencyDto {
  @ApiProperty({
    example: 243,
    description: 'Código numérico de dependencia operativa',
  })
  @IsNumber()
  code: number;

  @ApiProperty({
    example: 'CONJUNTO RESIDENCIAL LOS ALPES - PORTERIA PRINCIPAL',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;

  @ApiProperty({ example: 'branch-cuid' })
  @IsString()
  @IsNotEmpty()
  branchId: string;

  @ApiProperty({ example: 'client-cuid', required: false })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiProperty({ example: 'service-order-position-cuid', required: false })
  @IsOptional()
  @IsString()
  serviceOrderPositionId?: string;

  @ApiProperty({ example: 'OMEGA-2026-001-P1', required: false })
  @IsOptional()
  @IsString()
  omegaCode?: string;

  @ApiProperty({ example: 'CC-001', required: false })
  @IsOptional()
  @IsString()
  accountingCostCenter?: string;

  @ApiProperty({ example: 'SUB-01', required: false })
  @IsOptional()
  @IsString()
  accountingSubCostCenter?: string;

  @ApiProperty({ example: 2450000.0, default: 1750905.0 })
  @IsNumber()
  @Min(0)
  monthlyPaidValue: number;

  @ApiProperty({ example: 2450000.0, required: false })
  @IsOptional()
  @IsNumber()
  prestacionalAmount?: number;

  @ApiProperty({ example: 81666.67, required: false })
  @IsOptional()
  @IsNumber()
  dailyValue?: number;

  @ApiProperty({
    enum: DependencySettlementType,
    default: DependencySettlementType.BY_AVERAGE_GUARANTEED,
  })
  @IsEnum(DependencySettlementType)
  settlementType: DependencySettlementType;

  @ApiProperty({ example: 'modality-cuid', required: false })
  @IsOptional()
  @IsString()
  modalityId?: string;

  @ApiProperty({ enum: ArlRiskClass, default: ArlRiskClass.RISK_IV })
  @IsEnum(ArlRiskClass)
  arlRiskClass: ArlRiskClass;

  @ApiProperty({ example: '01', default: '01', required: false })
  @IsOptional()
  @IsString()
  cotizanteTypeCode?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isVariable?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePayrollDependencyDto extends PartialType(
  CreatePayrollDependencyDto,
) {}

export class CalculateBreakdownSimulationDto {
  @ApiProperty({ example: 2450000.0 })
  @IsNumber()
  @Min(0)
  monthlyPaidValue: number;

  @ApiProperty({ example: 'modality-cuid' })
  @IsString()
  @IsNotEmpty()
  modalityId: string;

  @ApiProperty({ example: 30, default: 30, required: false })
  @IsOptional()
  @IsNumber()
  daysWorked?: number;
}
