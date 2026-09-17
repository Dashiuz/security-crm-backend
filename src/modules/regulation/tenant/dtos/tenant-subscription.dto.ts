import {
  IsEnum,
  IsOptional,
  IsInt,
  Min,
  IsDateString,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { PlanTier, SubscriptionStatus } from '@prisma/client';

export class CreateTenantSubscriptionDto {
  @ApiPropertyOptional({ enum: PlanTier, default: PlanTier.BASIC })
  @IsOptional()
  @IsEnum(PlanTier, { message: 'El plan debe ser BASIC, PRO o ENTERPRISE.' })
  planTier?: PlanTier;

  @ApiPropertyOptional({ enum: SubscriptionStatus, default: SubscriptionStatus.TRIAL })
  @IsOptional()
  @IsEnum(SubscriptionStatus, { message: 'El estado de suscripción debe ser TRIAL, ACTIVE, PAST_DUE o CANCELED.' })
  status?: SubscriptionStatus;

  @ApiPropertyOptional({ example: 5, default: 5 })
  @IsOptional()
  @IsInt({ message: 'maxClients debe ser un número entero.' })
  @Min(1, { message: 'maxClients debe ser al menos 1.' })
  maxClients?: number;

  @ApiPropertyOptional({ example: 50, default: 50 })
  @IsOptional()
  @IsInt({ message: 'maxUsers debe ser un número entero.' })
  @Min(1, { message: 'maxUsers debe ser al menos 1.' })
  maxUsers?: number;

  @ApiPropertyOptional({ example: 50, default: 50 })
  @IsOptional()
  @IsInt({ message: 'maxEmployees debe ser un número entero.' })
  @Min(1, { message: 'maxEmployees debe ser al menos 1.' })
  maxEmployees?: number;

  @ApiPropertyOptional({ example: '2027-12-31T23:59:59.000Z' })
  @IsOptional()
  @IsDateString({}, { message: 'subscriptionEndsAt debe ser una fecha ISO válida.' })
  subscriptionEndsAt?: string;

  @ApiPropertyOptional({ example: 'cus_123456789' })
  @IsOptional()
  @IsString({ message: 'El ID de pasarela debe ser un texto válido.' })
  @MaxLength(100, { message: 'El ID de pasarela no puede superar 100 caracteres.' })
  paymentGatewayId?: string;
}

export class UpdateTenantSubscriptionDto extends PartialType(CreateTenantSubscriptionDto) {}

export class TenantSubscriptionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty({ enum: PlanTier })
  planTier!: PlanTier;

  @ApiProperty({ enum: SubscriptionStatus })
  status!: SubscriptionStatus;

  @ApiProperty()
  maxClients!: number;

  @ApiProperty()
  maxUsers!: number;

  @ApiProperty()
  maxEmployees!: number;

  @ApiPropertyOptional()
  subscriptionEndsAt?: Date | null;

  @ApiPropertyOptional()
  paymentGatewayId?: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
