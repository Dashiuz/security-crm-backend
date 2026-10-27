import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CursorPaginationDto } from '../../../../common/dto/cursor-pagination.dto';
import { PnlHealthStatus, ProposalStatus } from '@prisma/client';

export class ProposalFilterDto extends CursorPaginationDto {
  @ApiPropertyOptional({
    example: 'client_cuid_123',
    description: 'Filtrar por ID de cliente',
  })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({ enum: ProposalStatus, example: ProposalStatus.DRAFT })
  @IsOptional()
  @IsEnum(ProposalStatus)
  status?: ProposalStatus;

  @ApiPropertyOptional({
    enum: PnlHealthStatus,
    example: PnlHealthStatus.PROFITABLE,
  })
  @IsOptional()
  @IsEnum(PnlHealthStatus)
  pnlStatus?: PnlHealthStatus;

  @ApiPropertyOptional({
    example: 'COT-2026',
    description: 'Término de búsqueda por folio o nombre de cliente',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
