import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PqrsPriority, PqrsStatus, PqrsType } from '@prisma/client';

export class QueryPqrsTicketDto {
  @ApiPropertyOptional({
    enum: PqrsStatus,
    description: 'Filtrar por estado del ticket',
  })
  @IsEnum(PqrsStatus)
  @IsOptional()
  status?: PqrsStatus;

  @ApiPropertyOptional({
    enum: PqrsType,
    description: 'Filtrar por tipo de PQRS',
  })
  @IsEnum(PqrsType)
  @IsOptional()
  type?: PqrsType;

  @ApiPropertyOptional({
    enum: PqrsPriority,
    description: 'Filtrar por prioridad',
  })
  @IsEnum(PqrsPriority)
  @IsOptional()
  priority?: PqrsPriority;

  @ApiPropertyOptional({
    description: 'Filtrar por ID del cliente (para vista administrativa)',
  })
  @IsString()
  @IsOptional()
  clientId?: string;

  @ApiPropertyOptional({
    description: 'Búsqueda por código o asunto',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Página actual',
    default: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Cantidad de registros por página',
    default: 10,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 10;
}
