import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEmail,
  IsEnum,
  IsInt,
  IsBoolean,
  IsDateString,
  Min,
  Max,
  ValidateIf,
  IsObject,
  IsNotEmpty,
} from 'class-validator';
import {
  ClientStatus,
  ContractStatus,
  ClientSector,
  AdministrationType,
} from '@prisma/client';

export class CreateClientDto {
  @ApiProperty({ example: 'C001', required: false })
  @IsString()
  @IsOptional()
  internalCode?: string;

  @ApiProperty({ enum: ClientStatus, default: ClientStatus.ACTIVE })
  @IsEnum(ClientStatus, { message: 'Estado del cliente no válido.' })
  @IsOptional()
  clientStatus?: ClientStatus;

  @ApiProperty({ enum: ContractStatus, default: ContractStatus.ACTIVE })
  @IsEnum(ContractStatus, { message: 'Estado del contrato no válido.' })
  @IsOptional()
  contractStatus?: ContractStatus;

  @ApiProperty({ example: 'CONT-2026-001', required: false })
  @IsString()
  @IsOptional()
  contractNumber?: string;

  @ApiProperty({ example: '900123456-7' })
  @IsString({ message: 'El NIT es requerido.' })
  nit: string;

  @ApiProperty({ example: 'Conjunto Residencial Las Palmas' })
  @IsString({ message: 'El Nombre o Razón Social es requerido.' })
  name: string;

  @ApiProperty({ example: 'admin@laspalmas.com', required: false })
  @ValidateIf(
    (o) => o.email !== undefined && o.email !== null && o.email !== '',
  )
  @IsEmail(
    {},
    { message: 'El correo electrónico principal no tiene un formato válido.' },
  )
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

  @ApiProperty({ example: '3101234567', required: false })
  @IsString()
  @IsOptional()
  quadrantPhone?: string;

  @ApiProperty({ example: 'CAI Cedritos', required: false })
  @IsString()
  @IsOptional()
  cai?: string;

  @ApiProperty({ example: 'Observaciones generales', required: false })
  @IsString()
  @IsOptional()
  observations?: string;

  @ApiProperty({ enum: ClientSector, default: ClientSector.RESIDENTIAL })
  @IsEnum(ClientSector, { message: 'Sector del cliente no válido.' })
  @IsOptional()
  sector?: ClientSector;

  @ApiProperty({ example: 4, required: false, description: 'Estrato socioeconómico (1 al 6)' })
  @IsInt({ message: 'El estrato debe ser un número entero.' })
  @Min(1, { message: 'El estrato mínimo permitido es 1.' })
  @Max(6, { message: 'El estrato máximo permitido es 6.' })
  @IsOptional()
  stratum?: number;

  @ApiProperty({ example: 'cuid-employee-1', required: false })
  @IsString()
  @IsOptional()
  coordinatorInChargeId?: string | null;

  @ApiProperty({ example: 'cuid-employee-2', required: false })
  @IsString()
  @IsOptional()
  commercialContactId?: string | null;

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
  @ValidateIf(
    (o) =>
      o.administratorEmail !== undefined &&
      o.administratorEmail !== null &&
      o.administratorEmail !== '',
  )
  @IsEmail(
    {},
    {
      message:
        'El correo electrónico del administrador no tiene un formato válido.',
    },
  )
  @IsOptional()
  administratorEmail?: string;

  @ApiProperty({ example: '2026-03-09', required: false })
  @ValidateIf(
    (o) =>
      o.contractDate !== undefined &&
      o.contractDate !== null &&
      o.contractDate !== '',
  )
  @IsDateString(
    {},
    { message: 'La fecha de contrato debe ser una fecha válida.' },
  )
  @IsOptional()
  contractDate?: string;

  @ApiProperty({ example: '2026-03-09', required: false })
  @ValidateIf(
    (o) =>
      o.lastContractDate !== undefined &&
      o.lastContractDate !== null &&
      o.lastContractDate !== '',
  )
  @IsDateString(
    {},
    { message: 'La fecha de fin de contrato debe ser una fecha válida.' },
  )
  @IsOptional()
  lastContractDate?: string;

  // Extended Contract Fields
  @ApiProperty({ default: false, required: false })
  @IsBoolean()
  @IsOptional()
  renewedContract?: boolean;

  @ApiProperty({ example: '2027-03-09', required: false })
  @ValidateIf(
    (o) =>
      o.contractEndDate !== undefined &&
      o.contractEndDate !== null &&
      o.contractEndDate !== '',
  )
  @IsDateString(
    {},
    { message: 'La fecha final de contrato debe ser una fecha válida.' },
  )
  @IsOptional()
  contractEndDate?: string;

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  contractMediaFiles?: Record<string, any>;

  // Extended Administration Fields
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

  @ApiProperty({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateClientDto extends PartialType(CreateClientDto) {}

export class UpdateClientGeneralDto {
  @ApiProperty({ example: 'C001', required: false })
  @IsString()
  @IsOptional()
  internalCode?: string;

  @ApiProperty({
    enum: ClientStatus,
    default: ClientStatus.ACTIVE,
    required: false,
  })
  @IsEnum(ClientStatus, { message: 'Estado del cliente no válido.' })
  @IsOptional()
  clientStatus?: ClientStatus;

  @ApiProperty({ example: '900123456-7', required: false })
  @IsString({ message: 'El NIT es requerido.' })
  @IsOptional()
  nit?: string;

  @ApiProperty({ example: 'Conjunto Residencial Las Palmas', required: false })
  @IsString({ message: 'El Nombre o Razón Social es requerido.' })
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'admin@laspalmas.com', required: false })
  @ValidateIf(
    (o) => o.email !== undefined && o.email !== null && o.email !== '',
  )
  @IsEmail(
    {},
    { message: 'El correo electrónico principal no tiene un formato válido.' },
  )
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

  @ApiProperty({ example: '3101234567', required: false })
  @IsString()
  @IsOptional()
  quadrantPhone?: string;

  @ApiProperty({ example: 'CAI Cedritos', required: false })
  @IsString()
  @IsOptional()
  cai?: string;

  @ApiProperty({ example: 'Observaciones generales', required: false })
  @IsString()
  @IsOptional()
  observations?: string;

  @ApiProperty({
    enum: ClientSector,
    default: ClientSector.RESIDENTIAL,
    required: false,
  })
  @IsEnum(ClientSector, { message: 'Sector del cliente no válido.' })
  @IsOptional()
  sector?: ClientSector;

  @ApiProperty({ example: 4, required: false, description: 'Estrato socioeconómico (1 al 6)' })
  @IsInt({ message: 'El estrato debe ser un número entero.' })
  @Min(1, { message: 'El estrato mínimo permitido es 1.' })
  @Max(6, { message: 'El estrato máximo permitido es 6.' })
  @IsOptional()
  stratum?: number;

  @ApiProperty({ example: 'cuid-employee-1', required: false })
  @IsString()
  @IsOptional()
  coordinatorInChargeId?: string | null;

  @ApiProperty({ example: 'cuid-employee-2', required: false })
  @IsString()
  @IsOptional()
  commercialContactId?: string | null;

  @ApiProperty({ default: false, required: false })
  @IsBoolean()
  @IsOptional()
  installedTech?: boolean;

  @ApiProperty({ example: 'EST-2026', required: false })
  @IsString()
  @IsOptional()
  securityStudy?: string;

  @ApiProperty({ default: 0, required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  weaponsAmount?: number;

  @ApiProperty({ default: true, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateClientLegalDto {
  @ApiProperty({ enum: ContractStatus, required: false })
  @IsEnum(ContractStatus, { message: 'Estado del contrato no válido.' })
  @IsOptional()
  contractStatus?: ContractStatus;

  @ApiProperty({ example: 'CONT-2026-001', required: false })
  @IsString()
  @IsOptional()
  contractNumber?: string;

  @ApiProperty({ example: 'Juan Pérez', required: false })
  @IsString()
  @IsOptional()
  administrator?: string;

  @ApiProperty({ example: '3001234567', required: false })
  @IsString()
  @IsOptional()
  administratorPhone?: string;

  @ApiProperty({ example: 'juan.perez@gmail.com', required: false })
  @ValidateIf(
    (o) =>
      o.administratorEmail !== undefined &&
      o.administratorEmail !== null &&
      o.administratorEmail !== '',
  )
  @IsEmail(
    {},
    {
      message:
        'El correo electrónico del administrador no tiene un formato válido.',
    },
  )
  @IsOptional()
  administratorEmail?: string;

  @ApiProperty({ example: '2026-03-09', required: false })
  @ValidateIf(
    (o) =>
      o.contractDate !== undefined &&
      o.contractDate !== null &&
      o.contractDate !== '',
  )
  @IsDateString(
    {},
    { message: 'La fecha de contrato debe ser una fecha válida.' },
  )
  @IsOptional()
  contractDate?: string;

  @ApiProperty({ example: '2026-03-09', required: false })
  @ValidateIf(
    (o) =>
      o.lastContractDate !== undefined &&
      o.lastContractDate !== null &&
      o.lastContractDate !== '',
  )
  @IsDateString(
    {},
    { message: 'La fecha de fin de contrato debe ser una fecha válida.' },
  )
  @IsOptional()
  lastContractDate?: string;

  @ApiProperty({ default: false, required: false })
  @IsBoolean()
  @IsOptional()
  renewedContract?: boolean;

  @ApiProperty({ example: '2027-03-09', required: false })
  @ValidateIf(
    (o) =>
      o.contractEndDate !== undefined &&
      o.contractEndDate !== null &&
      o.contractEndDate !== '',
  )
  @IsDateString(
    {},
    { message: 'La fecha final de contrato debe ser una fecha válida.' },
  )
  @IsOptional()
  contractEndDate?: string;

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

export class AssignClientUserDto {
  @ApiProperty({
    description: 'ID del usuario a vincular con el cliente',
    example: 'cuid-user-1',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'Rol o cargo contextual asignado en el cliente',
    example: 'COORDINADOR',
    required: false,
  })
  @IsString()
  @IsOptional()
  roleName?: string;
}

export enum DigitalAccountStatus {
  ACTIVE = 'ACTIVE', // Cuenta digital activa (puede ingresar al software)
  DISABLED = 'DISABLED', // Cuenta digital suspendida
  NO_ACCOUNT = 'NO_ACCOUNT', // Solo puesto físico, sin credenciales creadas
}

export class ClientWorkforceItemDto {
  @ApiProperty({ description: 'ID de la asignación UserClientAccess' })
  id: string;

  @ApiProperty({
    description: 'ID del usuario digital vinculado',
    required: false,
    nullable: true,
  })
  userId: string | null;

  @ApiProperty({
    description: 'ID del empleado vinculado',
    required: false,
    nullable: true,
  })
  employeeId: string | null;

  @ApiProperty({ description: 'ID del cliente' })
  clientId: string;

  @ApiProperty({
    description: 'Cargo / Rol contextual',
    required: false,
    nullable: true,
  })
  roleName: string | null;

  @ApiProperty({ description: 'Estado de la vinculación' })
  isActive: boolean;

  @ApiProperty({ description: 'Indica si tiene acceso digital activo' })
  hasDigitalAccess: boolean;

  @ApiProperty({
    enum: DigitalAccountStatus,
    description: 'Estado detallado de la cuenta digital',
  })
  digitalAccountStatus: DigitalAccountStatus;

  @ApiProperty({ description: 'Fecha de creación de la vinculación' })
  createdAt: Date | string;

  @ApiProperty({ description: 'Datos del personal unificado' })
  user: {
    id: string | null;
    fullName: string;
    document: string;
    department?: string | null;
    position?: string | null;
    email: string | null;
    phone: string | null;
    isActive: boolean;
    roles?: Array<{
      role: {
        id: string;
        name: string;
      };
    }>;
  };
}
