import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProposalServiceItemDto } from './proposal-service-item.dto';
import { ProposalValueAddedItemDto } from './proposal-value-added-item.dto';
import { PnlHealthStatus } from '@prisma/client';

export class CalculatePnlDto {
  @ApiPropertyOptional({ example: 12, default: 12 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  contractDurationMonths?: number;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  promptPaymentDiscPercent?: number;

  @ApiProperty({ type: [ProposalServiceItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProposalServiceItemDto)
  items!: ProposalServiceItemDto[];

  @ApiPropertyOptional({ type: [ProposalValueAddedItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProposalValueAddedItemDto)
  valueAddedItems?: ProposalValueAddedItemDto[];
}

export interface PnlCalculationResult {
  subtotalMonthlyPreDisc: number;
  promptPaymentDiscPercent: number;
  promptPaymentDiscAmount: number;
  subtotalMonthlyAfterDisc: number;
  aiuBaseAmount: number;
  ivaAmount: number;
  totalMonthlyWithTax: number;
  totalAnnualContractValue: number;
  estimatedMonthlyRealCost: number;
  monthlyVagAmortization: number;
  totalMonthlyOperatingCost: number;
  netMonthlyMarginAmount: number;
  netMarginPercentage: number;
  pnlStatus: PnlHealthStatus;
}
