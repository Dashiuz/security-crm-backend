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
  InteractionChannel,
  FollowUpMilestoneStatus,
  DealLossReasonCategory,
} from '@prisma/client';

export class CreateFollowUpDto {
  @ApiProperty({ description: 'ID del cliente o prospecto' })
  @IsString()
  @IsNotEmpty()
  clientId: string;

  @ApiPropertyOptional({ example: '2026-10-24T18:00:00Z' })
  @IsOptional()
  @IsDateString()
  interactionDate?: string;

  @ApiProperty({ enum: InteractionChannel, example: InteractionChannel.PHONE_CALL })
  @IsEnum(InteractionChannel)
  contactChannel: InteractionChannel;

  @ApiProperty({ example: 'Dora Gómez' })
  @IsString()
  @IsNotEmpty()
  contactPersonName: string;

  @ApiPropertyOptional({ example: 'Administradora P.H.' })
  @IsOptional()
  @IsString()
  contactPersonRole?: string;

  @ApiProperty({ example: 'Se presentó dossier y cotización económica. Manifiestan interés.' })
  @IsString()
  @IsNotEmpty()
  managementSummary: string;

  @ApiPropertyOptional({ example: '2026-11-05', description: 'Fecha de próximo contacto agendado' })
  @IsOptional()
  @IsDateString()
  nextContactDate?: string;

  @ApiPropertyOptional({ enum: FollowUpMilestoneStatus, default: FollowUpMilestoneStatus.PENDING })
  @IsOptional()
  @IsEnum(FollowUpMilestoneStatus)
  statusAfterFollowUp?: FollowUpMilestoneStatus;

  // Inteligencia de Pérdida (Si aplica)
  @ApiPropertyOptional({ enum: DealLossReasonCategory })
  @IsOptional()
  @IsEnum(DealLossReasonCategory)
  lossReasonCategory?: DealLossReasonCategory;

  @ApiPropertyOptional({ example: 'El competidor ofertó un 10% por debajo de la tarifa regulada.' })
  @IsOptional()
  @IsString()
  lossReasonDescription?: string;

  @ApiPropertyOptional({ example: 'Seguridad Atlas Ltda.' })
  @IsOptional()
  @IsString()
  winningCompetitorName?: string;

  @ApiPropertyOptional({ example: 10500000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  competitorPriceQuoted?: number;

  @ApiPropertyOptional({ example: 1600000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  competitorGuardsSalary?: number;
}

export class UpdateFollowUpDto extends CreateFollowUpDto {}

export class FollowUpFilterDto {
  @ApiPropertyOptional({ description: 'Filtrar por cliente' })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({ enum: FollowUpMilestoneStatus })
  @IsOptional()
  @IsEnum(FollowUpMilestoneStatus)
  status?: FollowUpMilestoneStatus;

  @ApiPropertyOptional({ description: 'Filtrar por comercial' })
  @IsOptional()
  @IsString()
  commercialId?: string;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  take?: number = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cursor?: string;
}
