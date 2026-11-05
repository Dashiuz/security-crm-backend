import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsNotEmpty,
} from 'class-validator';
import { PayrollConceptNature, PayrollProportionality } from '@prisma/client';

export class CreatePayrollConceptDto {
  @ApiProperty({ example: 1, description: 'Código consecutivo del concepto' })
  @IsNumber()
  code: number;

  @ApiProperty({ example: 'SUELDO BASICO' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    enum: PayrollConceptNature,
    default: PayrollConceptNature.DEVENGO,
  })
  @IsEnum(PayrollConceptNature)
  nature: PayrollConceptNature;

  @ApiProperty({
    enum: PayrollProportionality,
    default: PayrollProportionality.DAYS,
  })
  @IsEnum(PayrollProportionality)
  proportionality: PayrollProportionality;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isDeletableOnLiquidation?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isConstitutiveOfSalary?: boolean;

  @ApiProperty({ example: '510506', required: false })
  @IsOptional()
  @IsString()
  adminPucAccount?: string;

  @ApiProperty({ example: '720506', required: false })
  @IsOptional()
  @IsString()
  operativePucAccount?: string;

  @ApiProperty({ example: '520506', required: false })
  @IsOptional()
  @IsString()
  commercialPucAccount?: string;

  @ApiProperty({ example: '250501', required: false })
  @IsOptional()
  @IsString()
  creditCounterpartPuc?: string;

  @ApiProperty({ example: '900123456', required: false })
  @IsOptional()
  @IsString()
  thirdPartyNit?: string;

  @ApiProperty({ example: 'Entidad Tercero', required: false })
  @IsOptional()
  @IsString()
  thirdPartyName?: string;

  @ApiProperty({ example: 'NIE070', required: false })
  @IsOptional()
  @IsString()
  dianNieCode?: string;

  @ApiProperty({ example: 'SueldoTrabajado', required: false })
  @IsOptional()
  @IsString()
  dianNieFieldName?: string;

  // 10 Base Grouping Tables + UGPP
  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  inLiq?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  inPri?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  inTis?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  inVac?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  inCes?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  inIbcEpsAfp?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  inIbcArl?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  inIbcCcf?: boolean;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  inLhex?: boolean;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  inLnr?: boolean;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  inUgpp40Pct?: boolean;

  @ApiProperty({ example: 35.0, required: false })
  @IsOptional()
  @IsNumber()
  defaultRatePct?: number;

  @ApiProperty({ example: 'INC', required: false })
  @IsOptional()
  @IsString()
  shiftCodeMap?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePayrollConceptDto extends PartialType(
  CreatePayrollConceptDto,
) {}

export class UpdateConceptBaseMatrixDto {
  @ApiProperty({ example: 'concept-cuid' })
  @IsString()
  @IsNotEmpty()
  conceptId: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  inLiq?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  inPri?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  inTis?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  inVac?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  inCes?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  inIbcEpsAfp?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  inIbcArl?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  inIbcCcf?: boolean;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  inLhex?: boolean;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  inLnr?: boolean;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  inUgpp40Pct?: boolean;
}
