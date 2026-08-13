import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateEmployeeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @ApiProperty({ example: 'Juan' })
  firstName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @ApiProperty({ example: 'Camilo' })
  secondName?: string | null;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @ApiProperty({ example: 'Perez' })
  lastName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @ApiProperty({ example: 'Gomez' })
  maternalSurname?: string | null;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'CC' })
  documentType!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '1122334455' })
  document!: string;

  @IsDateString()
  @ApiProperty({ example: '1990-01-01' })
  birthdate!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'M' })
  gender!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Calle 123' })
  address!: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ example: 'nxthvhdl3b2jfbvdr825mapd' })
  clientId?: string | null;

  @IsString()
  @IsOptional()
  @ApiProperty({ example: 'nxthvhdl3b2jfbvdr825mapd' })
  departmentId?: string | null;

  @IsString()
  @IsOptional()
  @ApiProperty({ example: 'dnxbiihgnsdfss9btas86392' })
  positionId?: string | null;

  @IsOptional()
  @IsEmail()
  @ApiProperty({ example: 'juan.perez@example.com' })
  email?: string | null;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: '555-1234' })
  phone?: string | null;

  @IsDateString()
  @ApiProperty({ example: '2020-05-15' })
  entryDate!: string;

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
