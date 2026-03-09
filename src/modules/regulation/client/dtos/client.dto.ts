import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEmail,
  IsEnum,
  IsInt,
  IsBoolean,
  IsDateString,
  IsUUID,
  Min,
} from 'class-validator';
import { ClientStatus, ContractStatus, ClientSector } from '@prisma/client';

export class CreateClientDto {
  @ApiProperty({ example: 'C001' })
  @IsString()
  internalCode: string;

  @ApiProperty({ enum: ClientStatus, default: ClientStatus.ACTIVE })
  @IsEnum(ClientStatus)
  @IsOptional()
  clientStatus?: ClientStatus;

  @ApiProperty({ enum: ContractStatus, default: ContractStatus.ACTIVE })
  @IsEnum(ContractStatus)
  @IsOptional()
  contractStatus?: ContractStatus;

  @ApiProperty({ example: 'CONT-2026-001' })
  @IsString()
  contractNumber: string;

  @ApiProperty({ example: '900123456-7' })
  @IsString()
  nit: string;

  @ApiProperty({ example: 'Conjunto Residencial Las Palmas' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'admin@laspalmas.com', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: '6012345678', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: '6012345679', required: false })
  @IsString()
  @IsOptional()
  receptionPhone?: string;

  @ApiProperty({ example: '110111', required: false })
  @IsString()
  @IsOptional()
  zipCode?: string;

  @ApiProperty({ example: 'Calle 123 # 45-67', required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ example: 'Colombia', required: false })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiProperty({ example: 'Bogotá', required: false })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty({ example: 'Cundinamarca', required: false })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiProperty({ example: 'Usaquén', required: false })
  @IsString()
  @IsOptional()
  commune?: string;

  @ApiProperty({ example: 'Cedritos', required: false })
  @IsString()
  @IsOptional()
  neighborhood?: string;

  @ApiProperty({ example: 'Q1', required: false })
  @IsString()
  @IsOptional()
  quadrant?: string;

  @ApiProperty({ example: 'Observaciones generales', required: false })
  @IsString()
  @IsOptional()
  observations?: string;

  @ApiProperty({ enum: ClientSector, default: ClientSector.RESIDENTIAL })
  @IsEnum(ClientSector)
  @IsOptional()
  sector?: ClientSector;

  @ApiProperty({ example: 'uuid-employee-1', required: false })
  @IsUUID()
  @IsOptional()
  coordinatorInChargeId?: string;

  @ApiProperty({ example: 'uuid-employee-2', required: false })
  @IsUUID()
  @IsOptional()
  commercialContactId?: string;

  @ApiProperty({ default: false })
  @IsBoolean()
  @IsOptional()
  installedTech?: boolean;

  @ApiProperty({ example: 'EST-2026', required: false })
  @IsString()
  @IsOptional()
  securityStudy?: string;

  @ApiProperty({ default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  weaponsAmount?: number;

  @ApiProperty({ example: 'Juan Pérez', required: false })
  @IsString()
  @IsOptional()
  administrator?: string;

  @ApiProperty({ example: '3001234567', required: false })
  @IsString()
  @IsOptional()
  administratorPhone?: string;

  @ApiProperty({ example: 'juan.perez@gmail.com', required: false })
  @IsEmail()
  @IsOptional()
  administratorEmail?: string;

  @ApiProperty({ example: '2026-03-09' })
  @IsDateString()
  contractDate: string;

  @ApiProperty({ example: '2026-03-09' })
  @IsDateString()
  lastContractDate: string;

  @ApiProperty({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateClientDto extends PartialType(CreateClientDto) {}

export class ClientResponseDto extends CreateClientDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
