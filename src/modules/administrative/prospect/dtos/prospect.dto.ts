import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEmail,
  IsEnum,
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  ValidateIf,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ClientSector, AdministrationType } from '@prisma/client';
import { StructureConfigDto } from '../../client/dtos/client-structure.dto';

export class CreateProspectDto {
  @ApiProperty({ enum: ClientSector, default: ClientSector.RESIDENTIAL })
  @IsEnum(ClientSector, { message: 'Sector no válido.' })
  @IsNotEmpty({ message: 'El sector es requerido.' })
  sector: ClientSector;

  @ApiProperty({ example: 'Conjunto Residencial Los Sauces' })
  @IsString({ message: 'El Nombre o Razón Social es requerido.' })
  @IsNotEmpty({ message: 'El Nombre o Razón Social es requerido.' })
  name: string;

  @ApiProperty({ example: '900987654-3' })
  @IsString({ message: 'El NIT es requerido.' })
  @IsNotEmpty({ message: 'El NIT es requerido.' })
  nit: string;

  @ApiProperty({ example: 'Calle 45 # 67-89' })
  @IsString({ message: 'La dirección es requerida.' })
  @IsNotEmpty({ message: 'La dirección es requerida.' })
  address: string;

  @ApiProperty({ example: '3109876543' })
  @IsString({ message: 'El teléfono es requerido.' })
  @IsNotEmpty({ message: 'El teléfono es requerido.' })
  phone: string;

  @ApiProperty({ example: 'contacto@lossauces.com' })
  @IsEmail({}, { message: 'El correo electrónico no tiene un formato válido.' })
  @IsNotEmpty({ message: 'El correo electrónico es requerido.' })
  email: string;

  @ApiProperty({ example: 'Suba', required: false })
  @IsString()
  @IsOptional()
  commune?: string;

  @ApiProperty({ example: 'Rincon', required: false })
  @IsString()
  @IsOptional()
  neighborhood?: string;

  @ApiProperty({ example: 'Bogotá', required: false })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty({ example: 'CAI Rincón', required: false })
  @IsString()
  @IsOptional()
  cai?: string;

  @ApiProperty({ example: 'Q14', required: false })
  @IsString()
  @IsOptional()
  quadrant?: string;

  @ApiProperty({ example: '3101234567', required: false })
  @IsString()
  @IsOptional()
  quadrantPhone?: string;

  @ApiProperty({ example: 'Interesado en cotización de 5 guardias', required: false })
  @IsString()
  @IsOptional()
  observations?: string;

  @ApiProperty({ example: 'PROSP-1001', required: false })
  @IsString()
  @IsOptional()
  internalCode?: string;
}

export class CreateProspectWithStructureDto extends CreateProspectDto {
  @ApiProperty({ type: StructureConfigDto, required: false })
  @ValidateNested()
  @Type(() => StructureConfigDto)
  @IsOptional()
  structureConfig?: StructureConfigDto;
}

export class UpdateProspectDto extends PartialType(CreateProspectDto) {
  @ApiProperty({ type: StructureConfigDto, required: false })
  @ValidateNested()
  @Type(() => StructureConfigDto)
  @IsOptional()
  structureConfig?: StructureConfigDto;
}

export class ConvertProspectDto {
  @ApiProperty({ example: 'CONT-2026-901' })
  @IsString({ message: 'El número de contrato es requerido.' })
  @IsNotEmpty({ message: 'El número de contrato es requerido.' })
  contractNumber: string;

  @ApiProperty({ example: '2026-03-01' })
  @IsDateString({}, { message: 'La fecha inicial de contrato debe ser válida.' })
  @IsNotEmpty({ message: 'La fecha inicial de contrato es requerida.' })
  contractDate: string;

  @ApiProperty({ example: '2027-02-28' })
  @IsDateString({}, { message: 'La última fecha de contrato debe ser válida.' })
  @IsNotEmpty({ message: 'La última fecha de contrato es requerida.' })
  lastContractDate: string;

  @ApiProperty({ example: '2027-02-28', required: false })
  @ValidateIf((o) => o.contractEndDate !== undefined && o.contractEndDate !== null && o.contractEndDate !== '')
  @IsDateString({}, { message: 'La fecha final de contrato debe ser válida.' })
  @IsOptional()
  contractEndDate?: string;

  @ApiProperty({ default: false, required: false })
  @IsBoolean()
  @IsOptional()
  renewedContract?: boolean;

  @ApiProperty({ example: 'cuid-employee-1', required: false })
  @IsString()
  @IsOptional()
  coordinatorInChargeId?: string | null;

  @ApiProperty({ example: 'cuid-employee-2', required: false })
  @IsString()
  @IsOptional()
  commercialContactId?: string | null;

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  contractMediaFiles?: Record<string, any>;

  @ApiProperty({ enum: AdministrationType, required: false })
  @IsEnum(AdministrationType, { message: 'Tipo de administración no válido.' })
  @IsOptional()
  administrationType?: AdministrationType;

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  administrationCompanyData?: Record<string, any>;

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  councilData?: Record<string, any>;
}

export class ProspectResponseDto extends CreateProspectDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  clientStatus: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ required: false })
  createdBy?: string;
}
