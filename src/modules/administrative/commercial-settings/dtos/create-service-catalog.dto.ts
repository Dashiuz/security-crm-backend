import {
  IsString,
  IsInt,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsNotEmpty,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CommercialSector,
  WeaponModality,
  ShiftScheduleType,
  WorkingDaysModality,
} from '@prisma/client';

export class CreateServiceCatalogDto {
  @ApiProperty({
    example: 1,
    description: 'Código numérico único del servicio dentro del tenant',
  })
  @IsInt()
  @Min(1)
  serviceCode: number;

  @ApiProperty({
    example: 'Servicio de Vigilancia 24 horas',
    description: 'Nombre descriptivo del servicio',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'Guarda Portero',
    description: 'Cargo operativo objetivo del servicio',
  })
  @IsString()
  @IsNotEmpty()
  targetPosition: string;

  @ApiProperty({
    enum: CommercialSector,
    example: CommercialSector.COMMERCIAL_PUBLIC,
  })
  @IsEnum(CommercialSector)
  sector: CommercialSector;

  @ApiProperty({ enum: WeaponModality, example: WeaponModality.LETHAL_WEAPON })
  @IsEnum(WeaponModality)
  weaponModality: WeaponModality;

  @ApiPropertyOptional({
    enum: ShiftScheduleType,
    default: ShiftScheduleType.SCHEDULE_2X2X2,
  })
  @IsEnum(ShiftScheduleType)
  @IsOptional()
  scheduleType?: ShiftScheduleType;

  @ApiPropertyOptional({
    enum: WorkingDaysModality,
    default: WorkingDaysModality.DAYS_30_ALL_MONTH,
  })
  @IsEnum(WorkingDaysModality)
  @IsOptional()
  daysModality?: WorkingDaysModality;

  @ApiProperty({ example: 24, description: 'Horas diarias de cobertura' })
  @IsInt()
  @Min(1)
  @Max(24)
  dailyTotalHours: number;

  @ApiProperty({
    example: 15,
    description: 'Horas diurnas asignadas (06:00 a 21:00)',
  })
  @IsInt()
  @Min(0)
  @Max(24)
  dayHours: number;

  @ApiProperty({
    example: 9,
    description: 'Horas nocturnas asignadas (21:00 a 06:00)',
  })
  @IsInt()
  @Min(0)
  @Max(24)
  nightHours: number;

  @ApiProperty({ example: 30, description: 'Días facturables al mes' })
  @IsInt()
  @Min(1)
  @Max(31)
  billableDaysPerMonth: number;

  @ApiProperty({
    example: 0.1,
    description:
      'Porcentaje de Administración y Supervisión (A&S) (ej. 0.08, 0.10, 0.11)',
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  adminSupervisionPct: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  isSystemStandard?: boolean;

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
