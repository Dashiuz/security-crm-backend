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
import { RecordStatus, RecordSource } from '@prisma/client';

export class CreateMinutaDto {
  @IsDateString()
  @IsNotEmpty()
  @ApiProperty({ example: '2024-02-19' })
  date!: string;

  @IsDateString()
  @IsNotEmpty()
  @ApiProperty({ example: '14:30:00', description: 'Format HH:mm:ss' })
  time!: string;

  @IsDateString()
  @IsNotEmpty()
  @ApiProperty({ example: '2024-02-19T14:30:00Z' })
  occurredAt!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Cambio de turno sin novedades.' })
  annotation!: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'GENERAL' })
  category?: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(5)
  @ApiPropertyOptional({ example: 3 })
  priority?: number;

  @IsString({ each: true })
  @IsOptional()
  @ApiPropertyOptional({ example: ['turno', 'novedad'] })
  tags?: string[];

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({ example: false })
  isConfidential?: boolean;

  @IsEnum(RecordSource)
  @IsOptional()
  @ApiPropertyOptional({ enum: RecordSource, default: RecordSource.WEB })
  source?: RecordSource;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  externalRef?: string;
}

export class UpdateMinutaDto {
  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  annotation?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  category?: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(5)
  @ApiPropertyOptional()
  priority?: number;

  @IsString({ each: true })
  @IsOptional()
  @ApiPropertyOptional()
  tags?: string[];

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional()
  isConfidential?: boolean;
}

export class VoidRecordDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Error en la digitación.' })
  voidReason!: string;
}
