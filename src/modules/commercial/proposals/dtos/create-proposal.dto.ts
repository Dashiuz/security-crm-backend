import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProposalContractType } from '@prisma/client';
import { ProposalServiceItemDto } from './proposal-service-item.dto';
import { ProposalValueAddedItemDto } from './proposal-value-added-item.dto';

export class CreateProposalDto {
  @ApiProperty({ example: 'client_cuid_123' })
  @IsNotEmpty({ message: 'El id del cliente o prospecto es obligatorio' })
  @IsString()
  clientId!: string;

  @ApiProperty({ example: 'tariff_period_2026_cuid' })
  @IsNotEmpty({ message: 'El id de la vigencia tarifaria es obligatorio' })
  @IsString()
  tariffPeriodId!: string;

  @ApiPropertyOptional({
    enum: ProposalContractType,
    example: ProposalContractType.NEW_CONTRACT,
    default: ProposalContractType.NEW_CONTRACT,
  })
  @IsOptional()
  @IsEnum(ProposalContractType, { message: 'Tipo de contrato inválido' })
  contractType?: ProposalContractType;

  @ApiPropertyOptional({ example: 12, default: 12, description: 'Duración del contrato en meses (ej: 12 o 24)' })
  @IsOptional()
  @IsInt({ message: 'La duración del contrato debe ser en meses' })
  @Min(1, { message: 'La duración mínima es de 1 mes' })
  @Max(60, { message: 'La duración máxima es de 60 meses' })
  contractDurationMonths?: number;

  @ApiPropertyOptional({ example: 0, default: 0, description: 'Descuento de pronto pago acordado en porcentaje' })
  @IsOptional()
  @IsNumber({}, { message: 'El porcentaje de descuento debe ser un número válido' })
  @Min(0, { message: 'El descuento mínimo es 0%' })
  @Max(100, { message: 'El descuento máximo es 100%' })
  promptPaymentDiscPercent?: number;

  // Switches del Dossier Comercial
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  includePresentation?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  includeTechSecurityStudy?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  includeEconomicQuote?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  includeValuesAdded?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  includeHseqAnnexes?: boolean;

  // Líneas del Contrato
  @ApiProperty({ type: [ProposalServiceItemDto] })
  @IsArray({ message: 'Los puestos cotizados deben ser un arreglo' })
  @ValidateNested({ each: true })
  @Type(() => ProposalServiceItemDto)
  items!: ProposalServiceItemDto[];

  @ApiPropertyOptional({ type: [ProposalValueAddedItemDto] })
  @IsOptional()
  @IsArray({ message: 'Los valores agregados deben ser un arreglo' })
  @ValidateNested({ each: true })
  @Type(() => ProposalValueAddedItemDto)
  valueAddedItems?: ProposalValueAddedItemDto[];

  // Snapshot JSON opcional para estado de borrador del frontend
  @ApiPropertyOptional({ description: 'Snapshot completo del estado de interfaz para borrador' })
  @IsOptional()
  draftSnapshotJson?: Record<string, any>;
}
