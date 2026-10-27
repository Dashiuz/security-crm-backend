import {
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  IsEnum,
  IsEmail,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { InternalDepartment } from '@prisma/client';

export class DepartmentOverrideDto {
  @ApiPropertyOptional({ enum: InternalDepartment })
  @IsEnum(InternalDepartment)
  department: InternalDepartment;

  @ApiPropertyOptional({ example: 'operaciones@empresa.com' })
  @IsEmail()
  email: string;
}

export class DispatchServiceOrderDto {
  @ApiPropertyOptional({
    example: 'Despacho urgente por inicio anticipado pactado con cliente.',
  })
  @IsOptional()
  @IsString()
  dispatchNotes?: string;

  @ApiPropertyOptional({ type: [DepartmentOverrideDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DepartmentOverrideDto)
  departmentOverrides?: DepartmentOverrideDto[];
}
