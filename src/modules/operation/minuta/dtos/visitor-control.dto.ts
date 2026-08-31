import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsInt,
  Min,
} from 'class-validator';
import { RecordSource, VisitorMode } from '@prisma/client';

export class CreateVisitorEntryDto {
  @ApiProperty({ example: '2024-02-19' })
  @IsDateString({}, { message: 'La fecha del registro debe ser una fecha válida.' })
  @IsNotEmpty({ message: 'La fecha es requerida.' })
  date!: string;

  @ApiProperty({ example: '10:00:00' })
  @IsString({ message: 'La hora debe ser un texto en formato HH:mm:ss.' })
  @IsNotEmpty({ message: 'La hora es requerida.' })
  time!: string;

  @ApiProperty({ example: '2024-02-19T10:00:00Z' })
  @IsDateString({}, { message: 'La marca de tiempo debe ser una fecha ISO válida.' })
  @IsNotEmpty({ message: 'La marca de tiempo de la entrada es requerida.' })
  occurredAt!: string;

  @ApiProperty({ example: 'Juan Perez' })
  @IsString({ message: 'El nombre completo del visitante debe ser un texto válido.' })
  @IsNotEmpty({ message: 'El nombre completo del visitante es requerido.' })
  visitorFullName!: string;

  @ApiProperty({ example: '1098765432' })
  @IsString({ message: 'El número de documento del visitante debe ser un texto válido.' })
  @IsNotEmpty({ message: 'El documento del visitante es requerido.' })
  visitorIdNumber!: string;

  @ApiPropertyOptional({ example: 'CC' })
  @IsString({ message: 'El tipo de documento debe ser un texto válido.' })
  @IsOptional()
  visitorIdType?: string;

  @ApiProperty({ example: '10:00:00' })
  @IsString({ message: 'La hora de ingreso debe ser un texto válido.' })
  @IsNotEmpty({ message: 'La hora de ingreso es requerida.' })
  entryTime!: string;

  @ApiPropertyOptional({ example: 'Admin' })
  @IsString({ message: 'El nombre de quien autoriza debe ser un texto válido.' })
  @IsOptional()
  authorizedByFullName?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsInt({ message: 'El número de personas debe ser un número entero.' })
  @Min(1, { message: 'El número de personas debe ser al menos 1.' })
  @IsOptional()
  peopleCount?: number;

  @ApiProperty({ enum: VisitorMode })
  @IsEnum(VisitorMode, { message: 'El modo de ingreso del visitante no es válido.' })
  @IsNotEmpty({ message: 'El modo de ingreso es requerido.' })
  mode!: VisitorMode;

  @ApiPropertyOptional({ example: 'Torre 1 Apt 101' })
  @IsString({ message: 'El destino debe ser un texto válido.' })
  @IsOptional()
  destination?: string;

  @ApiPropertyOptional({ example: 'T-1' })
  @IsString({ message: 'La torre o bloque debe ser un texto válido.' })
  @IsOptional()
  block?: string;

  @ApiPropertyOptional({ example: '101' })
  @IsString({ message: 'El apartamento o vivienda debe ser un texto válido.' })
  @IsOptional()
  apartment?: string;

  @ApiPropertyOptional({ example: 'F-10' })
  @IsString({ message: 'El número de ficha debe ser un texto válido.' })
  @IsOptional()
  ticketNumber?: string;

  @ApiPropertyOptional({ example: 'BMW' })
  @IsString({ message: 'La marca del vehículo debe ser un texto válido.' })
  @IsOptional()
  brand?: string;

  @ApiPropertyOptional({ example: 'XYZ-789' })
  @IsString({ message: 'La placa del vehículo debe ser un texto válido.' })
  @IsOptional()
  plate?: string;

  @ApiPropertyOptional()
  @IsString({ message: 'Las observaciones deben ser un texto válido.' })
  @IsOptional()
  observations?: string;

  @ApiPropertyOptional({ example: 'client-id-123' })
  @IsString({ message: 'El ID del cliente/conjunto debe ser un texto válido.' })
  @IsOptional()
  clientId?: string;

  @ApiPropertyOptional({ example: 'unit-id-123' })
  @IsString({ message: 'El ID de la unidad o apartamento debe ser un texto válido.' })
  @IsOptional()
  unitId?: string;

  @ApiPropertyOptional({ example: 'resident-id-123' })
  @IsString({ message: 'El ID del residente debe ser un texto válido.' })
  @IsOptional()
  residentId?: string;

  @ApiPropertyOptional({ enum: RecordSource, default: RecordSource.WEB })
  @IsEnum(RecordSource, { message: 'El origen del registro no es válido.' })
  @IsOptional()
  source?: RecordSource;
}

export class UpdateVisitorEntryDto {
  @ApiPropertyOptional()
  @IsDateString({}, { message: 'La fecha debe ser una fecha válida.' })
  @IsOptional()
  date?: string;

  @ApiPropertyOptional({ example: '10:00:00' })
  @IsString({ message: 'La hora debe ser un texto válido.' })
  @IsOptional()
  time?: string;

  @ApiPropertyOptional()
  @IsDateString({}, { message: 'La marca de tiempo debe ser válida.' })
  @IsOptional()
  occurredAt?: string;

  @ApiPropertyOptional({ example: '10:00:00' })
  @IsString({ message: 'La hora de ingreso debe ser un texto válido.' })
  @IsOptional()
  entryTime?: string;

  @ApiPropertyOptional()
  @IsString({ message: 'La hora de salida debe ser un texto válido.' })
  @IsOptional()
  exitTime?: string;

  @ApiPropertyOptional()
  @IsDateString({}, { message: 'La fecha/hora de salida debe ser válida.' })
  @IsOptional()
  exitAt?: string;

  @ApiPropertyOptional()
  @IsString({ message: 'El ID de la unidad debe ser un texto válido.' })
  @IsOptional()
  unitId?: string;

  @ApiPropertyOptional()
  @IsString({ message: 'El ID del residente debe ser un texto válido.' })
  @IsOptional()
  residentId?: string;

  @ApiPropertyOptional()
  @IsString({ message: 'Las observaciones deben ser un texto válido.' })
  @IsOptional()
  observations?: string;
}

export class RegisterVisitorExitDto {
  @ApiPropertyOptional({ example: '18:30:00' })
  @IsString({ message: 'La hora de salida debe ser un texto válido.' })
  @IsOptional()
  exitTime?: string;

  @ApiPropertyOptional({ example: '2026-08-29T18:30:00Z' })
  @IsDateString({}, { message: 'La fecha/hora de salida debe ser una fecha válida.' })
  @IsOptional()
  exitAt?: string;

  @ApiPropertyOptional()
  @IsString({ message: 'Las observaciones deben ser un texto válido.' })
  @IsOptional()
  observations?: string;
}
