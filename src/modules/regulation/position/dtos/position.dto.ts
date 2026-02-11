import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsBoolean,
  IsOptional,
  IsInt,
} from 'class-validator';

export class CreatePositionDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Junior Developer' })
  name!: string;

  @IsInt()
  @IsOptional()
  @ApiProperty({ example: 1, required: false })
  level?: number;

  @IsBoolean()
  @IsOptional()
  @ApiProperty({ example: true, required: false })
  isActive?: boolean;
}

export class UpdatePositionDto {
  @IsString()
  @IsOptional()
  @ApiProperty({ example: 'Senior Developer', required: false })
  name?: string;

  @IsInt()
  @IsOptional()
  @ApiProperty({ example: 2, required: false })
  level?: number;

  @IsBoolean()
  @IsOptional()
  @ApiProperty({ example: true, required: false })
  isActive?: boolean;
}

export class PositionResponseDto {
  @ApiProperty({ example: 'id_123' })
  id!: string;

  @ApiProperty({ example: 'tenant_id_123' })
  tenantId!: string;

  @ApiProperty({ example: 'Junior Developer' })
  name!: string;

  @ApiProperty({ example: 1 })
  level?: number;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: '2021-01-01T00:00:00.000Z' })
  createdAt!: Date;
}
