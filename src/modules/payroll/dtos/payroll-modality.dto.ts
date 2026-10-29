import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ShiftModalityClass } from '@prisma/client';

export class ModalityItemDto {
  @ApiProperty({ example: 'concept-cuid' })
  @IsString()
  @IsNotEmpty()
  conceptId: string;

  @ApiProperty({ example: 35.9 })
  @IsNumber()
  @Min(0)
  @Max(100)
  percentage: number;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class CreatePayrollShiftModalityDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  code: number;

  @ApiProperty({ example: 'TURNO 24 HORAS ROTATIVO (2X2X2)' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    enum: ShiftModalityClass,
    default: ShiftModalityClass.ROTATING,
  })
  @IsEnum(ShiftModalityClass)
  shiftClass: ShiftModalityClass;

  @ApiProperty({ example: 12, default: 12, required: false })
  @IsOptional()
  @IsNumber()
  hoursPerShift?: number;

  @ApiProperty({
    example: 'Distribución operativa de 24 horas',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ type: [ModalityItemDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ModalityItemDto)
  items?: ModalityItemDto[];

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePayrollShiftModalityDto extends PartialType(
  CreatePayrollShiftModalityDto,
) {}
