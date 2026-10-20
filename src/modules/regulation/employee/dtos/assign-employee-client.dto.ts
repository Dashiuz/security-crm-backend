import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class AssignEmployeeClientDto {
  @ApiProperty({
    description: 'ID of the client to assign',
    example: 'aioaybigrz5eswn62ttlsibk',
  })
  @IsString()
  @IsNotEmpty()
  clientId!: string;

  @ApiPropertyOptional({
    description:
      'If true (default), assigns concurrently without closing previous active assignments.',
    default: true,
  })
  @IsOptional()
  isConcurrent?: boolean;

  @ApiPropertyOptional({
    description: 'Effective start date of assignment (YYYY-MM-DD)',
    example: '2026-10-15',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'assignedAt must be formatted as YYYY-MM-DD',
  })
  assignedAt?: string;

  @ApiPropertyOptional({
    description:
      'Effective end date of previous client assignment if applicable (YYYY-MM-DD)',
    example: '2026-10-15',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'unassignedAt must be formatted as YYYY-MM-DD',
  })
  unassignedAt?: string;

  @ApiPropertyOptional({
    description:
      'Optional notes or observations about the assignment or transfer',
    example: 'Reubicación por rotación de turno',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
