import {
  IsInt,
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
  IsString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ShiftScheduleType } from '@prisma/client';

export class SimulateSalaryDto {
  @ApiPropertyOptional({
    description:
      'ID de la vigencia tarifaria en BD. Si se omite, consume la vigencia activa.',
  })
  @IsString()
  @IsOptional()
  tariffPeriodId?: string;

  @ApiPropertyOptional({
    example: 1750905.0,
    description: 'SMMLV base de simulación',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  smmlv?: number;

  @ApiPropertyOptional({
    example: 249095.0,
    description: 'Auxilio de transporte mensual',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  transportAllowance?: number;

  @ApiPropertyOptional({
    example: 44,
    description: 'Jornada laboral semanal legal en horas',
  })
  @IsInt()
  @Min(30)
  @IsOptional()
  statutoryWeeklyHours?: number;

  @ApiPropertyOptional({
    example: 150000.0,
    description: 'Bonificación fija no prestacional',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  fixedBonusNonSalary?: number;

  @ApiPropertyOptional({
    example: 0,
    description: 'Rodamiento para supervisores motorizados',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  vehicleAllowance?: number;

  @ApiPropertyOptional({
    enum: ShiftScheduleType,
    example: ShiftScheduleType.SCHEDULE_2X2X2,
  })
  @IsEnum(ShiftScheduleType)
  @IsOptional()
  scheduleType?: ShiftScheduleType;

  @ApiPropertyOptional({
    example: 10,
    description: 'Horas extras diurnas estimadas en el mes',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  overtimeHoursDay?: number;

  @ApiPropertyOptional({
    example: 20,
    description: 'Horas extras nocturnas estimadas en el mes',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  overtimeHoursNight?: number;

  @ApiPropertyOptional({
    example: 8,
    description: 'Horas dominicales/festivas diurnas estimadas',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  sundayHolidayHoursDay?: number;

  @ApiPropertyOptional({
    example: 12,
    description: 'Horas dominicales/festivas nocturnas estimadas',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  sundayHolidayHoursNight?: number;
}
