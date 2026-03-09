import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
  IsJSON,
} from 'class-validator';
import { RecordSource, VehicleCondition } from '@prisma/client';

export class CreateParkingControlDto {
  @IsDateString()
  @IsNotEmpty()
  @ApiProperty({ example: '2024-02-19' })
  date!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '08:00:00' })
  time!: string;

  @IsDateString()
  @IsNotEmpty()
  @ApiProperty({ example: '2024-02-19T08:00:00Z' })
  occurredAt!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '08:00:00' })
  entryTime!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'P-101' })
  parkingNumber!: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'F-55' })
  ticketNumber?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'Tower 1' })
  interior?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: '502' })
  apartment?: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'ABC-123' })
  plate!: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'Toyota' })
  brand?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'White' })
  color?: string;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional()
  mirrors?: boolean;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional()
  antenna?: boolean;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional()
  radio?: boolean;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional()
  spareTire?: boolean;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional()
  hubcaps?: boolean;

  @IsOptional()
  @ApiPropertyOptional({ type: Object })
  vehicleChecklist?: any;

  @IsEnum(VehicleCondition)
  @IsOptional()
  @ApiPropertyOptional({
    enum: VehicleCondition,
    default: VehicleCondition.GOOD,
  })
  condition?: VehicleCondition;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  observations?: string;

  @IsEnum(RecordSource)
  @IsOptional()
  @ApiPropertyOptional({ enum: RecordSource, default: RecordSource.WEB })
  source?: RecordSource;
}

export class UpdateParkingControlDto {
  @IsString()
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

  @IsEnum(VehicleCondition)
  @IsOptional()
  @ApiPropertyOptional({ enum: VehicleCondition })
  condition?: VehicleCondition;

  @IsOptional()
  @ApiPropertyOptional({ type: Object })
  vehicleChecklist?: any;
}
