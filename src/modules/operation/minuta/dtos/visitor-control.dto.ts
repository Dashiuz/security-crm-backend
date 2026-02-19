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
  @IsDateString()
  @IsNotEmpty()
  @ApiProperty({ example: '2024-02-19' })
  date!: string;

  @IsDateString()
  @IsNotEmpty()
  @ApiProperty({ example: '10:00:00' })
  time!: string;

  @IsDateString()
  @IsNotEmpty()
  @ApiProperty({ example: '2024-02-19T10:00:00Z' })
  occurredAt!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Juan Perez' })
  visitorFullName!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '1098765432' })
  visitorIdNumber!: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'CC' })
  visitorIdType?: string;

  @IsDateString()
  @IsNotEmpty()
  @ApiProperty({ example: '10:00:00' })
  entryTime!: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'Admin' })
  authorizedByFullName?: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  @ApiPropertyOptional({ example: 1 })
  peopleCount?: number;

  @IsEnum(VisitorMode)
  @IsNotEmpty()
  @ApiProperty({ enum: VisitorMode })
  mode!: VisitorMode;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'Tower 1 Apt 101' })
  destination?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'T-1' })
  block?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: '101' })
  apartment?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'F-10' })
  ticketNumber?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'BMW' })
  brand?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'XYZ-789' })
  plate?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  observations?: string;

  @IsEnum(RecordSource)
  @IsOptional()
  @ApiPropertyOptional({ enum: RecordSource, default: RecordSource.WEB })
  source?: RecordSource;
}

export class UpdateVisitorEntryDto {
  @IsDateString()
  @IsOptional()
  @ApiPropertyOptional()
  exitTime?: string;

  @IsDateString()
  @IsOptional()
  @ApiPropertyOptional()
  exitAt?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  observations?: string;
}
