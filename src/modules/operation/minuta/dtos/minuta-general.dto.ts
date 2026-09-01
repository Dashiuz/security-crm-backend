import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { RecordSource } from '@prisma/client';

export class CreateMinutaDto {
  @ApiProperty({ example: '2024-02-19' })
  @IsDateString({}, { message: 'La fecha del evento debe ser una fecha válida.' })
  @IsNotEmpty({ message: 'La fecha del evento es requerida.' })
  date!: string;

  @ApiProperty({ example: '14:30:00', description: 'Formato HH:mm:ss' })
  @IsString({ message: 'La hora debe ser un texto válido en formato HH:mm:ss.' })
  @IsNotEmpty({ message: 'La hora del evento es requerida.' })
  time!: string;

  @ApiProperty({ example: '2024-02-19T14:30:00Z' })
  @IsDateString({}, { message: 'La fecha/hora exacta del suceso debe ser una fecha ISO válida.' })
  @IsNotEmpty({ message: 'La marca de tiempo del evento es requerida.' })
  occurredAt!: string;

  @ApiProperty({ example: 'Cambio de turno sin novedades.' })
  @IsString({ message: 'La anotación o descripción debe ser un texto válido.' })
  @IsNotEmpty({ message: 'La anotación de la minuta es requerida.' })
  annotation!: string;

  @ApiPropertyOptional({ example: 'GENERAL' })
  @IsString({ message: 'La categoría debe ser un texto válido.' })
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ example: 3 })
  @IsInt({ message: 'La prioridad debe ser un número entero entre 1 y 5.' })
  @Min(1, { message: 'La prioridad mínima es 1.' })
  @Max(5, { message: 'La prioridad máxima es 5.' })
  @IsOptional()
  priority?: number;

  @ApiPropertyOptional({ example: ['turno', 'novedad'] })
  @IsString({ each: true, message: 'Cada etiqueta debe ser un texto válido.' })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ example: false })
  @IsBoolean({ message: 'El indicador de confidencialidad debe ser un booleano.' })
  @IsOptional()
  isConfidential?: boolean;

  @ApiPropertyOptional({ enum: RecordSource, default: RecordSource.WEB })
  @IsEnum(RecordSource, { message: 'El origen del registro no es válido.' })
  @IsOptional()
  source?: RecordSource;

  @ApiPropertyOptional()
  @IsString({ message: 'La referencia externa debe ser un texto válido.' })
  @IsOptional()
  externalRef?: string;
}

export class UpdateMinutaDto {
  @ApiPropertyOptional()
  @IsDateString({}, { message: 'La fecha debe ser una fecha válida.' })
  @IsOptional()
  date?: string;

  @ApiPropertyOptional({ example: '14:30:00' })
  @IsString({ message: 'La hora debe ser un texto válido.' })
  @IsOptional()
  time?: string;

  @ApiPropertyOptional()
  @IsDateString({}, { message: 'La marca de tiempo de suceso debe ser válida.' })
  @IsOptional()
  occurredAt?: string;

  @ApiPropertyOptional()
  @IsString({ message: 'La anotación debe ser un texto válido.' })
  @IsOptional()
  annotation?: string;

  @ApiPropertyOptional()
  @IsString({ message: 'La categoría debe ser un texto válido.' })
  @IsOptional()
  category?: string;

  @ApiPropertyOptional()
  @IsInt({ message: 'La prioridad debe ser un número entero entre 1 y 5.' })
  @Min(1, { message: 'La prioridad mínima es 1.' })
  @Max(5, { message: 'La prioridad máxima es 5.' })
  @IsOptional()
  priority?: number;

  @ApiPropertyOptional()
  @IsString({ each: true, message: 'Cada etiqueta debe ser un texto válido.' })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional()
  @IsBoolean({ message: 'El indicador de confidencialidad debe ser un booleano.' })
  @IsOptional()
  isConfidential?: boolean;
}

export class VoidRecordDto {
  @ApiProperty({ example: 'Error en la digitación.' })
  @IsString({ message: 'El motivo de anulación debe ser un texto válido.' })
  @IsNotEmpty({ message: 'El motivo de anulación es requerido.' })
  voidReason!: string;
}
