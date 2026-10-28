import { IsOptional, IsString, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceOrderStatus } from '@prisma/client';

export class ServiceOrderFilterDto {
  @ApiPropertyOptional({ description: 'Filtrar por cliente' })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({
    enum: ServiceOrderStatus,
    description: 'Filtrar por estado',
  })
  @IsOptional()
  @IsEnum(ServiceOrderStatus)
  status?: ServiceOrderStatus;

  @ApiPropertyOptional({
    description:
      'Búsqueda por código de orden (OS-), código OMEGA (OMG-) o nombre de cliente',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Cursor ID para paginación' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    default: 20,
    description: 'Límite de registros por página',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  take?: number = 20;
}
