import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEmail,
  IsEnum,
  IsDateString,
  IsNotEmpty,
  ValidateIf,
} from 'class-validator';
import { ResidentType, IdType } from '@prisma/client';

export class CreateResidentDto {
  @ApiProperty({ example: 'cuid-client-id' })
  @IsString({ message: 'El ID del cliente debe ser un texto válido.' })
  @IsNotEmpty({ message: 'El cliente o conjunto residencial es requerido.' })
  clientId: string;

  @ApiProperty({ example: 'cuid-unit-id' })
  @IsString({ message: 'El ID de la vivienda u objeto debe ser un texto válido.' })
  @IsNotEmpty({ message: 'La vivienda/unidad residencial es requerida.' })
  unitId: string;

  @ApiProperty({ enum: ResidentType, default: ResidentType.OWNER })
  @IsEnum(ResidentType, { message: 'El tipo de residente especificado no es válido.' })
  residentType: ResidentType;

  @ApiProperty({ enum: IdType, required: false })
  @ValidateIf((o) => o.idType !== undefined && o.idType !== null && o.idType !== '')
  @IsEnum(IdType, { message: 'El tipo de documento de identidad no es válido.' })
  @IsOptional()
  idType?: IdType;

  @ApiProperty({ example: 'Carlos' })
  @IsString({ message: 'El nombre debe ser un texto válido.' })
  @IsNotEmpty({ message: 'El nombre del residente es requerido.' })
  firstName: string;

  @ApiProperty({ example: 'Mendoza' })
  @IsString({ message: 'El apellido debe ser un texto válido.' })
  @IsNotEmpty({ message: 'El apellido del residente es requerido.' })
  lastName: string;

  @ApiProperty({ example: '1018234567' })
  @IsString({ message: 'El número de documento debe ser un texto válido.' })
  @IsNotEmpty({ message: 'El número de documento es requerido.' })
  document: string;

  @ApiProperty({ example: '3109876543' })
  @IsString({ message: 'El número de teléfono debe ser un texto válido.' })
  @IsNotEmpty({ message: 'El teléfono de contacto es requerido.' })
  phoneNumber: string;

  @ApiProperty({ example: 'carlos.mendoza@gmail.com', required: false })
  @ValidateIf((o) => o.email !== undefined && o.email !== null && o.email !== '')
  @IsEmail({}, { message: 'El correo electrónico del residente no tiene un formato válido.' })
  @IsOptional()
  email?: string;

  @ApiProperty({ example: 'M', required: false })
  @ValidateIf((o) => o.gender !== undefined && o.gender !== null && o.gender !== '')
  @IsString({ message: 'El género debe ser un texto válido.' })
  @IsOptional()
  gender?: string;

  @ApiProperty({ example: '1990-05-15', required: false })
  @ValidateIf((o) => o.birthdate !== undefined && o.birthdate !== null && o.birthdate !== '')
  @IsDateString({}, { message: 'La fecha de nacimiento debe ser una fecha válida.' })
  @IsOptional()
  birthdate?: string;

  @ApiProperty({ example: '2024-01-01', required: false })
  @ValidateIf((o) => o.residentSince !== undefined && o.residentSince !== null && o.residentSince !== '')
  @IsDateString({}, { message: 'La fecha de inicio de residencia debe ser una fecha válida.' })
  @IsOptional()
  residentSince?: string;

  @ApiProperty({ example: '2024-01-01', required: false })
  @ValidateIf((o) => o.accessStartDate !== undefined && o.accessStartDate !== null && o.accessStartDate !== '')
  @IsDateString({}, { message: 'La fecha de inicio de acceso debe ser una fecha válida.' })
  @IsOptional()
  accessStartDate?: string;

  @ApiProperty({ example: '2025-12-31', required: false })
  @ValidateIf((o) => o.accessEndDate !== undefined && o.accessEndDate !== null && o.accessEndDate !== '')
  @IsDateString({}, { message: 'La fecha de fin de acceso debe ser una fecha válida.' })
  @IsOptional()
  accessEndDate?: string;
}

export class UpdateResidentDto extends PartialType(CreateResidentDto) {}

export class ResidentResponseDto extends CreateResidentDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
