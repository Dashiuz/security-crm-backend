import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
} from 'class-validator';
import { RecordSource, VehicleCondition } from '@prisma/client';

export class CreateParkingControlDto {
  @ApiProperty({ example: '2024-02-19' })
  @IsDateString({}, { message: 'La fecha del registro debe ser una fecha válida.' })
  @IsNotEmpty({ message: 'La fecha es requerida.' })
  date!: string;

  @ApiProperty({ example: '08:00:00' })
  @IsString({ message: 'La hora debe ser un texto en formato HH:mm:ss.' })
  @IsNotEmpty({ message: 'La hora es requerida.' })
  time!: string;

  @ApiProperty({ example: '2024-02-19T08:00:00Z' })
  @IsDateString({}, { message: 'La marca de tiempo de entrada debe ser una fecha ISO válida.' })
  @IsNotEmpty({ message: 'La marca de tiempo es requerida.' })
  occurredAt!: string;

  @ApiProperty({ example: '08:00:00' })
  @IsString({ message: 'La hora de ingreso debe ser un texto válido.' })
  @IsNotEmpty({ message: 'La hora de ingreso es requerida.' })
  entryTime!: string;

  @ApiProperty({ example: 'P-101' })
  @IsString({ message: 'El número de parqueadero debe ser un texto válido.' })
  @IsNotEmpty({ message: 'El número de parqueadero es requerido.' })
  parkingNumber!: string;

  @ApiPropertyOptional({ example: 'F-55' })
  @IsString({ message: 'El número de ficha debe ser un texto válido.' })
  @IsOptional()
  ticketNumber?: string;

  @ApiPropertyOptional({ example: 'Tower 1' })
  @IsString({ message: 'La torre o interior debe ser un texto válido.' })
  @IsOptional()
  interior?: string;

  @ApiPropertyOptional({ example: '502' })
  @IsString({ message: 'El apartamento o vivienda debe ser un texto válido.' })
  @IsOptional()
  apartment?: string;

  @ApiProperty({ example: 'ABC-123' })
  @IsString({ message: 'La placa del vehículo debe ser un texto válido.' })
  @IsNotEmpty({ message: 'La placa del vehículo es requerida.' })
  plate!: string;

  @ApiPropertyOptional({ example: 'Toyota' })
  @IsString({ message: 'La marca del vehículo debe ser un texto válido.' })
  @IsOptional()
  brand?: string;

  @ApiPropertyOptional({ example: 'White' })
  @IsString({ message: 'El color del vehículo debe ser un texto válido.' })
  @IsOptional()
  color?: string;

  @ApiPropertyOptional()
  @IsBoolean({ message: 'El indicador de espejos debe ser un valor booleano.' })
  @IsOptional()
  mirrors?: boolean;

  @ApiPropertyOptional()
  @IsBoolean({ message: 'El indicador de antena debe ser un valor booleano.' })
  @IsOptional()
  antenna?: boolean;

  @ApiPropertyOptional()
  @IsBoolean({ message: 'El indicador de radio debe ser un valor booleano.' })
  @IsOptional()
  radio?: boolean;

  @ApiPropertyOptional()
  @IsBoolean({ message: 'El indicador de llanta de repuesto debe ser un valor booleano.' })
  @IsOptional()
  spareTire?: boolean;

  @ApiPropertyOptional()
  @IsBoolean({ message: 'El indicador de copas/rines debe ser un valor booleano.' })
  @IsOptional()
  hubcaps?: boolean;

  @IsOptional()
  @ApiPropertyOptional({ type: Object })
  vehicleChecklist?: any;

  @ApiPropertyOptional({
    enum: VehicleCondition,
    default: VehicleCondition.GOOD,
  })
  @IsEnum(VehicleCondition, { message: 'El estado o condición del vehículo no es válido.' })
  @IsOptional()
  condition?: VehicleCondition;

  @ApiPropertyOptional()
  @IsString({ message: 'Las observaciones deben ser un texto válido.' })
  @IsOptional()
  observations?: string;

  @ApiPropertyOptional({ enum: RecordSource, default: RecordSource.WEB })
  @IsEnum(RecordSource, { message: 'El origen del registro no es válido.' })
  @IsOptional()
  source?: RecordSource;
}

export class UpdateParkingControlDto {
  @ApiPropertyOptional()
  @IsDateString({}, { message: 'La fecha debe ser una fecha válida.' })
  @IsOptional()
  date?: string;

  @ApiPropertyOptional({ example: '08:00:00' })
  @IsString({ message: 'La hora debe ser un texto válido.' })
  @IsOptional()
  time?: string;

  @ApiPropertyOptional()
  @IsDateString({}, { message: 'La marca de tiempo debe ser una fecha ISO válida.' })
  @IsOptional()
  occurredAt?: string;

  @ApiPropertyOptional({ example: '08:00:00' })
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
  @IsString({ message: 'Las observaciones deben ser un texto válido.' })
  @IsOptional()
  observations?: string;

  @ApiPropertyOptional({ enum: VehicleCondition })
  @IsEnum(VehicleCondition, { message: 'La condición del vehículo no es válida.' })
  @IsOptional()
  condition?: VehicleCondition;

  @IsOptional()
  @ApiPropertyOptional({ type: Object })
  vehicleChecklist?: any;
}
