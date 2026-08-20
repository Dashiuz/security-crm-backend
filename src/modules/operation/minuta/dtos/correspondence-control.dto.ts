import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  RecordSource,
  CorrespondenceType,
  CorrespondenceStatus,
} from '@prisma/client';

export class CreateCorrespondenceDto {
  @ApiProperty({ example: '2024-02-19' })
  @IsDateString({}, { message: 'La fecha de recepción debe ser una fecha válida.' })
  @IsNotEmpty({ message: 'La fecha es requerida.' })
  date!: string;

  @ApiProperty({ example: '16:00:00' })
  @IsString({ message: 'La hora de recepción debe ser un texto en formato HH:mm:ss.' })
  @IsNotEmpty({ message: 'La hora es requerida.' })
  time!: string;

  @ApiProperty({ example: '2024-02-19T16:00:00Z' })
  @IsDateString({}, { message: 'La marca de tiempo debe ser una fecha ISO válida.' })
  @IsNotEmpty({ message: 'La marca de tiempo de recepción es requerida.' })
  occurredAt!: string;

  @ApiProperty({ example: '16:00:00' })
  @IsString({ message: 'La hora de llegada debe ser un texto válido.' })
  @IsNotEmpty({ message: 'La hora de llegada es requerida.' })
  receivedTime!: string;

  @ApiProperty({ example: 'Apt 501' })
  @IsString({ message: 'El destino o vivienda destinataria debe ser un texto válido.' })
  @IsNotEmpty({ message: 'El destino de la correspondencia es requerido.' })
  destination!: string;

  @ApiPropertyOptional({ example: 'Amazon' })
  @IsString({ message: 'El remitente debe ser un texto válido.' })
  @IsOptional()
  sender?: string;

  @ApiPropertyOptional({ example: 'Servientrega' })
  @IsString({ message: 'La empresa de mensajería debe ser un texto válido.' })
  @IsOptional()
  courierCompany?: string;

  @ApiPropertyOptional({ example: 'TRK-123456' })
  @IsString({ message: 'El número de guía o seguimiento debe ser un texto válido.' })
  @IsOptional()
  trackingNumber?: string;

  @ApiPropertyOptional({ example: 'Pepe' })
  @IsString({ message: 'El nombre de quien recibe en portería debe ser un texto válido.' })
  @IsOptional()
  receivedByName?: string;

  @ApiProperty({ enum: CorrespondenceType })
  @IsEnum(CorrespondenceType, { message: 'El tipo de paquete/correspondencia no es válido.' })
  @IsNotEmpty({ message: 'El tipo de correspondencia es requerido.' })
  correspondenceType!: CorrespondenceType;

  @ApiPropertyOptional()
  @IsString({ message: 'Las observaciones deben ser un texto válido.' })
  @IsOptional()
  observations?: string;

  @ApiPropertyOptional({ enum: RecordSource, default: RecordSource.WEB })
  @IsEnum(RecordSource, { message: 'El origen del registro no es válido.' })
  @IsOptional()
  source?: RecordSource;
}

export class UpdateCorrespondenceDto {
  @ApiPropertyOptional()
  @IsDateString({}, { message: 'La fecha debe ser una fecha válida.' })
  @IsOptional()
  date?: string;

  @ApiPropertyOptional({ example: '16:00:00' })
  @IsString({ message: 'La hora debe ser un texto válido.' })
  @IsOptional()
  time?: string;

  @ApiPropertyOptional()
  @IsDateString({}, { message: 'La marca de tiempo debe ser una fecha ISO válida.' })
  @IsOptional()
  occurredAt?: string;

  @ApiPropertyOptional({ example: '16:00:00' })
  @IsString({ message: 'La hora de recepción debe ser un texto válido.' })
  @IsOptional()
  receivedTime?: string;

  @ApiPropertyOptional({ enum: CorrespondenceStatus })
  @IsEnum(CorrespondenceStatus, { message: 'El estado de entrega no es válido.' })
  @IsOptional()
  status?: CorrespondenceStatus;

  @ApiPropertyOptional()
  @IsDateString({}, { message: 'La fecha de entrega al residente debe ser una fecha válida.' })
  @IsOptional()
  deliveredAt?: string;

  @ApiPropertyOptional({ example: 'Resident Name' })
  @IsString({ message: 'El nombre de la persona que recibe debe ser un texto válido.' })
  @IsOptional()
  deliveredToName?: string;

  @ApiPropertyOptional()
  @IsString({ message: 'Las observaciones deben ser un texto válido.' })
  @IsOptional()
  observations?: string;
}
