import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '1' })
  tenantId!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Pepe Perez' })
  password!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Pepe Perez' })
  fullName!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '1122334455' })
  document!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Operaciones' })
  department!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Guarda de Seguridad' })
  position!: string;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({ example: false })
  isRetired?: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({ example: true })
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({ example: true })
  isFirstLogin?: boolean;
}
