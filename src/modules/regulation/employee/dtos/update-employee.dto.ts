import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateEmployeeDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @ApiProperty({ example: 'Juan' })
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @ApiProperty({ example: 'Camilo' })
  secondName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @ApiProperty({ example: 'Perez' })
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @ApiProperty({ example: 'Gomez' })
  maternalSurname?: string | null;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'CC' })
  documentType?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: '1122334455' })
  document?: string;

  @IsOptional()
  @IsDateString()
  @ApiProperty({ example: '1990-01-01' })
  birthdate?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'M' })
  gender?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'Operaciones' })
  department?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'Guarda de Seguridad' })
  position?: string;

  @IsOptional()
  @IsEmail()
  @ApiProperty({ example: 'juan.perez@example.com' })
  email?: string | null;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: '555-1234' })
  phone?: string | null;

  @IsOptional()
  @IsDateString()
  @ApiProperty({ example: '2020-05-15' })
  entryDate?: string;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({ example: false })
  isRetired?: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({ example: true })
  isActive?: boolean;

  @IsOptional()
  @IsDateString()
  @ApiProperty({ example: '2023-12-31' })
  retiredAt?: string | null;
}
