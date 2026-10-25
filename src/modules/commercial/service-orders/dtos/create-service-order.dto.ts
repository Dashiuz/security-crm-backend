import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsArray,
  ValidateNested,
  IsDateString,
  Min,
  IsEmail,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ShiftScheduleType,
  WeaponModality,
  ServiceOrderType,
} from '@prisma/client';

export class CreateServiceOrderPositionDto {
  @ApiProperty({ example: 'Guarda Recepción / Portero' })
  @IsString()
  @IsNotEmpty()
  positionTitle: string;

  @ApiProperty({ example: 2, default: 1 })
  @IsNumber()
  @Min(1)
  quantityGuards: number;

  @ApiProperty({ enum: ShiftScheduleType, example: ShiftScheduleType.SCHEDULE_2X2X2 })
  @IsEnum(ShiftScheduleType)
  scheduleType: ShiftScheduleType;

  @ApiProperty({ enum: WeaponModality, example: WeaponModality.NO_WEAPON })
  @IsEnum(WeaponModality)
  weaponModality: WeaponModality;

  @ApiProperty({ example: 1750000, description: 'Sueldo pactado neto a pagar al guarda' })
  @IsNumber()
  @Min(0)
  netMonthlySalaryToPay: number;

  @ApiPropertyOptional({ example: 2, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minYearsExperiencePh?: number;

  @ApiPropertyOptional({ example: 'INDISTINTO' })
  @IsOptional()
  @IsString()
  preferredGender?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  requiresCurrentCourse?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  requiresGalaUniform?: boolean;

  @ApiPropertyOptional({ description: 'Habilidades específicas, manejo CCTV, etc.' })
  @IsOptional()
  specificProfileTraits?: any;
}

export class CreateServiceOrderEquipmentDto {
  @ApiProperty({ example: 'Radio Motorola DGP8550' })
  @IsString()
  @IsNotEmpty()
  itemName: string;

  @ApiProperty({ example: 2, default: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isMandatoryOnSite?: boolean;

  @ApiPropertyOptional({ example: 'SN-998822, SN-998823' })
  @IsOptional()
  @IsString()
  serialNumbers?: string;

  @ApiPropertyOptional({ example: 'Baterías de repuesto incluidas' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateServiceOrderDto {
  @ApiProperty({ description: 'ID del cliente o copropiedad' })
  @IsString()
  @IsNotEmpty()
  clientId: string;

  @ApiPropertyOptional({ description: 'ID de la propuesta ganada asociada' })
  @IsOptional()
  @IsString()
  proposalId?: string;

  @ApiPropertyOptional({ enum: ServiceOrderType, default: ServiceOrderType.NEW_SITE })
  @IsOptional()
  @IsEnum(ServiceOrderType)
  orderType?: ServiceOrderType;

  @ApiProperty({ example: '2026-11-01', description: 'Fecha inicio del servicio físico' })
  @IsDateString()
  installationDate: string;

  @ApiProperty({ example: '2027-10-31', description: 'Fecha fin de vigencia del contrato' })
  @IsDateString()
  contractEndDate: string;

  @ApiPropertyOptional({ example: 3, default: 3 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  empalmeDaysPrior?: number;

  @ApiProperty({ example: 'Calle 100 # 15-20' })
  @IsString()
  @IsNotEmpty()
  siteAddress: string;

  @ApiProperty({ example: 'Bogotá D.C.' })
  @IsString()
  @IsNotEmpty()
  siteCity: string;

  @ApiPropertyOptional({ example: '6017420000' })
  @IsOptional()
  @IsString()
  sitePhone?: string;

  @ApiProperty({ example: 'Carlos Mendoza' })
  @IsString()
  @IsNotEmpty()
  legalRepName: string;

  @ApiPropertyOptional({ example: '3109998877' })
  @IsOptional()
  @IsString()
  legalRepPhone?: string;

  @ApiProperty({ example: 'Dora Gómez' })
  @IsString()
  @IsNotEmpty()
  administratorName: string;

  @ApiPropertyOptional({ example: '3154443322' })
  @IsOptional()
  @IsString()
  administratorPhone?: string;

  @ApiPropertyOptional({ example: 'administracion@edificiolospinos.com' })
  @IsOptional()
  @IsEmail()
  administratorEmail?: string;

  @ApiPropertyOptional({ description: 'ID del coordinador zonal de operaciones asignado' })
  @IsOptional()
  @IsString()
  assignedCoordinatorId?: string;

  @ApiPropertyOptional({ example: 'Capitán Juan Pérez' })
  @IsOptional()
  @IsString()
  assignedCoordinatorName?: string;

  @ApiProperty({ example: 24000000 })
  @IsNumber()
  @Min(0)
  totalMonthlyBeforeTax: number;

  @ApiProperty({ example: 24456000 })
  @IsNumber()
  @Min(0)
  totalMonthlyWithTax: number;

  @ApiPropertyOptional({ example: 'Puesto requiere especial atención en acceso vehicular subterráneo.' })
  @IsOptional()
  @IsString()
  operationalNotes?: string;

  @ApiProperty({ type: [CreateServiceOrderPositionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateServiceOrderPositionDto)
  positions: CreateServiceOrderPositionDto[];

  @ApiPropertyOptional({ type: [CreateServiceOrderEquipmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateServiceOrderEquipmentDto)
  equipment?: CreateServiceOrderEquipmentDto[];
}
