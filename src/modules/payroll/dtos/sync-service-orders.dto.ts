import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class SyncServiceOrdersToDependenciesDto {
  @ApiProperty({
    example: 'client-cuid',
    required: false,
    description: 'ID de cliente opcional para sincronizar sólo sus puestos',
  })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiProperty({
    example: 'branch-cuid',
    required: true,
    description: 'ID de sucursal por defecto para puestos nuevos',
  })
  @IsString()
  @IsNotEmpty()
  defaultBranchId: string;
}

export class SyncServiceOrdersResultDto {
  @ApiProperty({ example: 12 })
  syncedCount: number;

  @ApiProperty({ example: 4 })
  createdCount: number;

  @ApiProperty({ example: 8 })
  updatedCount: number;

  @ApiProperty({
    example: ['Portería Principal Los Alpes (OMEGA-2026-001-P1)'],
  })
  syncedItems: string[];
}
