import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class UnassignEmployeeClientDto {
  @ApiPropertyOptional({
    description:
      'Specific client ID to unassign. If omitted, unassigns the active assignment.',
    example: 'aioaybigrz5eswn62ttlsibk',
  })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({
    description: 'Effective end date of current client assignment (YYYY-MM-DD)',
    example: '2026-10-15',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'unassignedAt must be formatted as YYYY-MM-DD',
  })
  unassignedAt?: string;

  @ApiPropertyOptional({
    description: 'Optional notes or observations about the unassignment',
    example: 'Fin de asignación en puesto, disponible en base',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
