import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
  ValidateNested,
  IsDateString,
  Min,
  IsEmail,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceOrderStatus, ServiceOrderType } from '@prisma/client';
import {
  CreateServiceOrderPositionDto,
  CreateServiceOrderEquipmentDto,
} from './create-service-order.dto';

export class UpdateServiceOrderDto {
  @ApiPropertyOptional({ enum: ServiceOrderType })
  @IsOptional()
  @IsEnum(ServiceOrderType)
  orderType?: ServiceOrderType;

  @ApiPropertyOptional({ enum: ServiceOrderStatus })
  @IsOptional()
  @IsEnum(ServiceOrderStatus)
  status?: ServiceOrderStatus;

  @ApiPropertyOptional({ example: '2026-11-01' })
  @IsOptional()
  @IsDateString()
  installationDate?: string;

  @ApiPropertyOptional({ example: '2027-10-31' })
  @IsOptional()
  @IsDateString()
  contractEndDate?: string;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  empalmeDaysPrior?: number;

  @ApiPropertyOptional({ example: 'Calle 100 # 15-20' })
  @IsOptional()
  @IsString()
  siteAddress?: string;

  @ApiPropertyOptional({ example: 'Bogotá D.C.' })
  @IsOptional()
  @IsString()
  siteCity?: string;

  @ApiPropertyOptional({ example: '6017420000' })
  @IsOptional()
  @IsString()
  sitePhone?: string;

  @ApiPropertyOptional({ example: 'Carlos Mendoza' })
  @IsOptional()
  @IsString()
  legalRepName?: string;

  @ApiPropertyOptional({ example: '3109998877' })
  @IsOptional()
  @IsString()
  legalRepPhone?: string;

  @ApiPropertyOptional({ example: 'Dora Gómez' })
  @IsOptional()
  @IsString()
  administratorName?: string;

  @ApiPropertyOptional({ example: '3154443322' })
  @IsOptional()
  @IsString()
  administratorPhone?: string;

  @ApiPropertyOptional({ example: 'administracion@edificiolospinos.com' })
  @IsOptional()
  @IsEmail()
  administratorEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assignedCoordinatorId?: string;

  @ApiPropertyOptional({ example: 'Capitán Juan Pérez' })
  @IsOptional()
  @IsString()
  assignedCoordinatorName?: string;

  @ApiPropertyOptional({ example: 24000000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalMonthlyBeforeTax?: number;

  @ApiPropertyOptional({ example: 24456000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalMonthlyWithTax?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  operationalNotes?: string;

  @ApiPropertyOptional({ type: [CreateServiceOrderPositionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateServiceOrderPositionDto)
  positions?: CreateServiceOrderPositionDto[];

  @ApiPropertyOptional({ type: [CreateServiceOrderEquipmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateServiceOrderEquipmentDto)
  equipment?: CreateServiceOrderEquipmentDto[];
}
