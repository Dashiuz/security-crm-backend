import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  RecordSource,
  CorrespondenceType,
  CorrespondenceStatus,
} from '@prisma/client';

export class CreateCorrespondenceDto {
  @IsDateString()
  @IsNotEmpty()
  @ApiProperty({ example: '2024-02-19' })
  date!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '16:00:00' })
  time!: string;

  @IsDateString()
  @IsNotEmpty()
  @ApiProperty({ example: '2024-02-19T16:00:00Z' })
  occurredAt!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '16:00:00' })
  receivedTime!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Apt 501' })
  destination!: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'Amazon' })
  sender?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'Servientrega' })
  courierCompany?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'TRK-123456' })
  trackingNumber?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'Pepe' })
  receivedByName?: string;

  @IsEnum(CorrespondenceType)
  @IsNotEmpty()
  @ApiProperty({ enum: CorrespondenceType })
  correspondenceType!: CorrespondenceType;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  observations?: string;

  @IsEnum(RecordSource)
  @IsOptional()
  @ApiPropertyOptional({ enum: RecordSource, default: RecordSource.WEB })
  source?: RecordSource;
}

export class UpdateCorrespondenceDto {
  @IsEnum(CorrespondenceStatus)
  @IsOptional()
  @ApiPropertyOptional({ enum: CorrespondenceStatus })
  status?: CorrespondenceStatus;

  @IsDateString()
  @IsOptional()
  @ApiPropertyOptional()
  deliveredAt?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'Resident Name' })
  deliveredToName?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  observations?: string;
}
