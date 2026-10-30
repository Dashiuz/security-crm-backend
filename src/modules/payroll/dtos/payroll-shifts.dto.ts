import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsDateString,
  Min,
  Max,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShiftDayCode, DependencyAssignmentRole } from '@prisma/client';

export class CreateShiftSequenceDto {
  @ApiProperty({ example: '2X2X2' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({
    example: 'Secuencia 2 Diurnos, 2 Nocturnos, 2 Descansos (12H)',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: ['D', 'D', 'N', 'N', 'X', 'X'] })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  patternJson: string[];

  @ApiPropertyOptional({ example: 6, default: 6 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  cycleDaysLength?: number;

  @ApiPropertyOptional({ example: 12, default: 12 })
  @IsNumber()
  @IsOptional()
  dayShiftHours?: number;

  @ApiPropertyOptional({ example: 12, default: 12 })
  @IsNumber()
  @IsOptional()
  nightShiftHours?: number;

  @ApiPropertyOptional({ example: '06:00', default: '06:00' })
  @IsString()
  @IsOptional()
  defaultDayStartTime?: string;

  @ApiPropertyOptional({ example: '18:00', default: '18:00' })
  @IsString()
  @IsOptional()
  defaultNightStartTime?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class CreateDependencyAssignmentDto {
  @ApiProperty({ example: 'emp-uuid-123' })
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @ApiProperty({ example: 'dep-uuid-123' })
  @IsString()
  @IsNotEmpty()
  dependencyId: string;

  @ApiPropertyOptional({
    enum: DependencyAssignmentRole,
    default: DependencyAssignmentRole.TITULAR,
  })
  @IsEnum(DependencyAssignmentRole)
  @IsOptional()
  assignmentRole?: DependencyAssignmentRole;

  @ApiProperty({ example: '2026-03-01' })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;

  @ApiPropertyOptional({ example: 'Asignación titular puesto portería 24H' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateDependencyAssignmentDto {
  @ApiPropertyOptional({ enum: DependencyAssignmentRole })
  @IsEnum(DependencyAssignmentRole)
  @IsOptional()
  assignmentRole?: DependencyAssignmentRole;

  @ApiPropertyOptional({ example: '2026-06-30' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}

export class GenerateMonthShiftsDto {
  @ApiProperty({ example: 2026 })
  @IsNumber()
  @Min(2020)
  @Max(2050)
  @IsNotEmpty()
  year: number;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(1)
  @Max(12)
  @IsNotEmpty()
  month: number;

  @ApiPropertyOptional({ example: 'dep-uuid-123' })
  @IsString()
  @IsOptional()
  dependencyId?: string;

  @ApiPropertyOptional({ example: 'branch-uuid-123' })
  @IsString()
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional({ example: '2X2X2' })
  @IsString()
  @IsOptional()
  sequenceCode?: string;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  startStepOffset?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  overwriteExistingNonReinforcement?: boolean;
}

export class UpdateSingleShiftRecordDto {
  @ApiProperty({ example: 'emp-uuid-123' })
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @ApiProperty({ example: 'dep-uuid-123' })
  @IsString()
  @IsNotEmpty()
  dependencyId: string;

  @ApiProperty({ example: '2026-10-15' })
  @IsDateString()
  @IsNotEmpty()
  shiftDate: string;

  @ApiProperty({ enum: ShiftDayCode })
  @IsEnum(ShiftDayCode)
  @IsNotEmpty()
  shiftCode: ShiftDayCode;

  @ApiPropertyOptional({ example: false, default: false })
  @IsBoolean()
  @IsOptional()
  isReinforcement?: boolean;

  @ApiPropertyOptional({ example: 'Cambio de turno por solicitud de guarda' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class BulkUpdateShiftRecordsDto {
  @ApiProperty({ type: [UpdateSingleShiftRecordDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateSingleShiftRecordDto)
  records: UpdateSingleShiftRecordDto[];
}

export class CreateReinforcementShiftDto {
  @ApiProperty({ example: 'emp-uuid-123' })
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @ApiProperty({ example: 'dep-uuid-123' })
  @IsString()
  @IsNotEmpty()
  dependencyId: string;

  @ApiProperty({ example: '2026-10-20' })
  @IsDateString()
  @IsNotEmpty()
  shiftDate: string;

  @ApiPropertyOptional({ enum: ShiftDayCode, default: ShiftDayCode.R })
  @IsEnum(ShiftDayCode)
  @IsOptional()
  shiftCode?: ShiftDayCode;

  @ApiPropertyOptional({ example: 12 })
  @IsNumber()
  @Min(1)
  @Max(24)
  @IsOptional()
  hours?: number;

  @ApiPropertyOptional({
    example: 'Refuerzo por evento especial fin de semana',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
