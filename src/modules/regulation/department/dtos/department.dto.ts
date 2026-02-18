import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsBoolean, IsOptional } from 'class-validator';

export class CreateDepartmentDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Human Resources' })
  name!: string;

  @IsBoolean()
  @IsOptional()
  @ApiProperty({ example: true, required: false })
  isActive?: boolean;
}

export class UpdateDepartmentDto {
  @IsString()
  @IsOptional()
  @ApiProperty({ example: 'Updated Department Name', required: false })
  name?: string;

  @IsBoolean()
  @IsOptional()
  @ApiProperty({ example: true, required: false })
  isActive?: boolean;
}

export class DepartmentResponseDto {
  @ApiProperty({ example: 'id_123' })
  id!: string;

  @ApiProperty({ example: 'tenant_id_123' })
  tenantId!: string;

  @ApiProperty({ example: 'Human Resources' })
  name!: string;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: '2021-01-01T00:00:00.000Z' })
  createdAt!: Date;
}
