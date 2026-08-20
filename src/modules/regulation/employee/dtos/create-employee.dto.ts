import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class CreateEmployeeDto {
  @ApiProperty({ example: 'Juan' })
  @IsString({ message: 'El primer nombre debe ser un texto válido.' })
  @IsNotEmpty({ message: 'El primer nombre es requerido.' })
  @MaxLength(100, { message: 'El primer nombre no puede superar 100 caracteres.' })
  firstName!: string;

  @ApiProperty({ example: 'Camilo' })
  @IsString({ message: 'El segundo nombre debe ser un texto válido.' })
  @MaxLength(100, { message: 'El segundo nombre no puede superar 100 caracteres.' })
  @IsOptional()
  secondName?: string | null;

  @ApiProperty({ example: 'Perez' })
  @IsString({ message: 'El primer apellido debe ser un texto válido.' })
  @IsNotEmpty({ message: 'El primer apellido es requerido.' })
  @MaxLength(100, { message: 'El primer apellido no puede superar 100 caracteres.' })
  lastName!: string;

  @ApiProperty({ example: 'Gomez' })
  @IsString({ message: 'El segundo apellido debe ser un texto válido.' })
  @MaxLength(100, { message: 'El segundo apellido no puede superar 100 caracteres.' })
  @IsOptional()
  maternalSurname?: string | null;

  @ApiProperty({ example: 'CC' })
  @IsString({ message: 'El tipo de documento debe ser un texto válido.' })
  @IsNotEmpty({ message: 'El tipo de documento es requerido.' })
  documentType!: string;

  @ApiProperty({ example: '1122334455' })
  @IsString({ message: 'El número de documento debe ser un texto válido.' })
  @IsNotEmpty({ message: 'El número de documento es requerido.' })
  document!: string;

  @ApiProperty({ example: '1990-01-01' })
  @IsDateString({}, { message: 'La fecha de nacimiento debe ser una fecha válida.' })
  birthdate!: string;

  @ApiProperty({ example: 'M' })
  @IsString({ message: 'El género debe ser un texto válido.' })
  @IsNotEmpty({ message: 'El género es requerido.' })
  gender!: string;

  @ApiProperty({ example: 'Calle 123' })
  @IsString({ message: 'La dirección debe ser un texto válido.' })
  @IsNotEmpty({ message: 'La dirección de residencia es requerida.' })
  address!: string;

  @ApiProperty({ example: 'nxthvhdl3b2jfbvdr825mapd' })
  @IsString({ message: 'El ID del cliente asignado debe ser un texto válido.' })
  @IsOptional()
  clientId?: string | null;

  @ApiProperty({ example: 'nxthvhdl3b2jfbvdr825mapd' })
  @IsString({ message: 'El ID del departamento debe ser un texto válido.' })
  @IsOptional()
  departmentId?: string | null;

  @ApiProperty({ example: 'dnxbiihgnsdfss9btas86392' })
  @IsString({ message: 'El ID del cargo o posición debe ser un texto válido.' })
  @IsOptional()
  positionId?: string | null;

  @ApiProperty({ example: 'juan.perez@example.com' })
  @ValidateIf((o) => o.email !== undefined && o.email !== null && o.email !== '')
  @IsEmail({}, { message: 'El correo electrónico no tiene un formato válido.' })
  @IsOptional()
  email?: string | null;

  @ApiProperty({ example: '555-1234' })
  @IsString({ message: 'El teléfono debe ser un texto válido.' })
  @IsOptional()
  phone?: string | null;

  @ApiProperty({ example: '2020-05-15' })
  @IsDateString({}, { message: 'La fecha de ingreso debe ser una fecha válida.' })
  entryDate!: string;

  @ApiProperty({ example: false })
  @IsBoolean({ message: 'El estado de retiro debe ser un valor booleano.' })
  @IsOptional()
  isRetired?: boolean;

  @ApiProperty({ example: true })
  @IsBoolean({ message: 'El estado activo debe ser un valor booleano.' })
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ example: '2023-12-31' })
  @IsDateString({}, { message: 'La fecha de retiro debe ser una fecha válida.' })
  @IsOptional()
  retiredAt?: string | null;
}
