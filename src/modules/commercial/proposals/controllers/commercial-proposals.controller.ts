import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CommercialProposalsService } from '../services/commercial-proposals.service';
import { CreateProposalDto } from '../dtos/create-proposal.dto';
import { UpdateProposalDto } from '../dtos/update-proposal.dto';
import { ProposalFilterDto } from '../dtos/proposal-filter.dto';
import { CalculatePnlDto } from '../dtos/pnl-calculation.dto';
import { JwtAuthGuard } from '../../../regulation/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../regulation/access-control/permissions.guard';
import { RequirePermissions } from '../../../regulation/access-control/permissions.decorator';
import { FeatureGuard } from '../../../regulation/access-control/feature.guard';
import { RequireFeature } from '../../../regulation/access-control/feature.decorator';
import { ProposalStatus } from '@prisma/client';

@ApiTags('Commercial Proposals')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGuard)
@RequireFeature('commercial')
@Controller('commercial/proposals')
export class CommercialProposalsController {
  constructor(
    private readonly proposalsService: CommercialProposalsService,
  ) {}

  @Post()
  @RequirePermissions('commercial:proposals:manage', 'commercial:proposals:create')
  @ApiOperation({
    summary: 'Crear nueva propuesta comercial',
    description:
      'Registra una propuesta en estado BORRADOR (o UNDER_REVIEW si margen es ámbar) y calcula P&L en vivo.',
  })
  @ApiCreatedResponse({ description: 'Propuesta creada exitosamente' })
  async createProposal(@Request() req: any, @Body() dto: CreateProposalDto) {
    return this.proposalsService.createProposal(
      req.user.tenantId,
      req.user.userId,
      dto,
    );
  }

  @Get()
  @RequirePermissions('commercial:proposals:manage', 'commercial:proposals:read')
  @ApiOperation({
    summary: 'Listar propuestas comerciales paginadas',
    description:
      'Obtiene listado de propuestas con filtros por cliente, estado, semáforo P&L y búsqueda textual.',
  })
  @ApiOkResponse({ description: 'Lista paginada de propuestas comerciales' })
  async getProposals(
    @Request() req: any,
    @Query() filter: ProposalFilterDto,
  ) {
    return this.proposalsService.getProposalsPaginated(
      req.user.tenantId,
      filter,
    );
  }

  @Post('simulate-pnl')
  @RequirePermissions('commercial:proposals:manage', 'commercial:proposals:read')
  @ApiOperation({
    summary: 'Simular P&L en tiempo real',
    description:
      'Calcula en memoria el margen bruto, costos directos, amortización de VAG, AIU, IVA y semáforo financiero sin persistir.',
  })
  @ApiOkResponse({ description: 'Resultado de viabilidad y P&L calculado en vivo' })
  simulatePnl(@Body() dto: CalculatePnlDto) {
    return this.proposalsService.calculatePnlLive(dto);
  }

  @Get(':id')
  @RequirePermissions('commercial:proposals:manage', 'commercial:proposals:read')
  @ApiOperation({
    summary: 'Obtener detalle 360° de propuesta por ID',
    description:
      'Devuelve el dossier completo de la cotización, puestos, valores agregados y estado financiero.',
  })
  @ApiOkResponse({ description: 'Dossier comercial de la propuesta' })
  async getProposalById(@Request() req: any, @Param('id') id: string) {
    return this.proposalsService.getProposalById(req.user.tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('commercial:proposals:manage', 'commercial:proposals:update')
  @ApiOperation({
    summary: 'Actualizar propuesta comercial',
    description:
      'Actualiza líneas de cotización, valores agregados, switches del dossier y recalcula P&L.',
  })
  @ApiOkResponse({ description: 'Propuesta comercial actualizada' })
  async updateProposal(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateProposalDto,
  ) {
    return this.proposalsService.updateProposal(
      req.user.tenantId,
      req.user.userId,
      id,
      dto,
    );
  }

  @Post(':id/approve-pnl')
  @RequirePermissions('commercial:proposals:manage', 'commercial:proposals:approve_pnl')
  @ApiOperation({
    summary: 'Aprobación gerencial de P&L en semáforo ámbar',
    description:
      'Permite a Dirección Comercial autorizar formalmente propuestas con margen bajo (8% a 14.99%).',
  })
  @ApiOkResponse({ description: 'Propuesta aprobada para emisión comercial' })
  async approvePnl(@Request() req: any, @Param('id') id: string) {
    return this.proposalsService.approvePnl(
      req.user.tenantId,
      req.user.userId,
      id,
    );
  }

  @Post(':id/issue-and-send')
  @RequirePermissions('commercial:proposals:manage', 'commercial:proposals:issue')
  @ApiOperation({
    summary: 'Emitir oficialmente y enviar al cliente',
    description:
      'Valida que el P&L esté aprobado o verde, congela la versión y transiciona el estado a SENT_TO_CLIENT.',
  })
  @ApiOkResponse({ description: 'Propuesta emitida formalmente' })
  async issueProposal(@Request() req: any, @Param('id') id: string) {
    return this.proposalsService.issueProposal(
      req.user.tenantId,
      req.user.userId,
      id,
    );
  }

  @Patch(':id/status')
  @RequirePermissions('commercial:proposals:manage', 'commercial:proposals:update')
  @ApiOperation({
    summary: 'Cambiar estado de la propuesta comercial',
    description: 'Permite transicionar a WON, LOST, VOIDED o REJECTED_BY_CLIENT.',
  })
  @ApiOkResponse({ description: 'Estado actualizado' })
  async updateStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body('status') status: ProposalStatus,
  ) {
    return this.proposalsService.updateStatus(
      req.user.tenantId,
      req.user.userId,
      id,
      status,
    );
  }

  @Delete(':id')
  @RequirePermissions('commercial:proposals:manage', 'commercial:proposals:delete')
  @ApiOperation({
    summary: 'Eliminar propuesta en borrador',
    description: 'Elimina definitivamente una cotización que aún no ha sido emitida.',
  })
  @ApiOkResponse({ description: 'Propuesta eliminada' })
  async deleteProposal(@Request() req: any, @Param('id') id: string) {
    return this.proposalsService.deleteProposal(req.user.tenantId, id);
  }
}
