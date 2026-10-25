import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
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
import { CommercialLegalService } from '../services/commercial-legal.service';
import {
  CreateInsurancePolicyDto,
  UpdateInsurancePolicyDto,
  CreateContractAddendumDto,
  UpdateContractAddendumDto,
  CreateAnsCommitmentDto,
  UpdateAnsCommitmentDto,
} from '../dtos/legal.dto';
import { JwtAuthGuard } from '../../../regulation/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../regulation/access-control/permissions.guard';
import { RequirePermissions } from '../../../regulation/access-control/permissions.decorator';
import { FeatureGuard } from '../../../regulation/access-control/feature.guard';
import { RequireFeature } from '../../../regulation/access-control/feature.decorator';

@ApiTags('Commercial Client Legal Portfolio')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGuard)
@RequireFeature('commercial')
@Controller('commercial/legal')
export class CommercialLegalController {
  constructor(private readonly legalService: CommercialLegalService) {}

  // ==========================================
  // Pólizas de Seguro
  // ==========================================

  @Post('policies')
  @RequirePermissions('commercial:legal:manage', 'commercial:legal:create')
  @ApiOperation({ summary: 'Registrar póliza de seguro contractual' })
  @ApiCreatedResponse({ description: 'Póliza registrada exitosamente' })
  async createPolicy(@Request() req: any, @Body() dto: CreateInsurancePolicyDto) {
    return this.legalService.createPolicy(req.user.tenantId, dto);
  }

  @Get('policies/client/:clientId')
  @RequirePermissions('commercial:legal:manage', 'commercial:legal:read')
  @ApiOperation({ summary: 'Listar pólizas contractuales de un cliente' })
  @ApiOkResponse({ description: 'Lista de pólizas' })
  async getPoliciesByClient(@Request() req: any, @Param('clientId') clientId: string) {
    return this.legalService.getPoliciesByClient(req.user.tenantId, clientId);
  }

  @Get('policies/:id')
  @RequirePermissions('commercial:legal:manage', 'commercial:legal:read')
  @ApiOperation({ summary: 'Obtener detalle de póliza por ID' })
  @ApiOkResponse({ description: 'Detalle de la póliza' })
  async getPolicyById(@Request() req: any, @Param('id') id: string) {
    return this.legalService.getPolicyById(req.user.tenantId, id);
  }

  @Patch('policies/:id')
  @RequirePermissions('commercial:legal:manage', 'commercial:legal:update')
  @ApiOperation({ summary: 'Actualizar póliza contractual' })
  @ApiOkResponse({ description: 'Póliza actualizada' })
  async updatePolicy(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateInsurancePolicyDto,
  ) {
    return this.legalService.updatePolicy(req.user.tenantId, id, dto);
  }

  @Delete('policies/:id')
  @RequirePermissions('commercial:legal:manage', 'commercial:legal:delete')
  @ApiOperation({ summary: 'Eliminar póliza contractual' })
  @ApiOkResponse({ description: 'Póliza eliminada' })
  async deletePolicy(@Request() req: any, @Param('id') id: string) {
    return this.legalService.deletePolicy(req.user.tenantId, id);
  }

  // ==========================================
  // Otrosíes y Adiciones Contractuales (OSI)
  // ==========================================

  @Post('addendums')
  @RequirePermissions('commercial:legal:manage', 'commercial:legal:create')
  @ApiOperation({ summary: 'Registrar otrosí contractual (OSI)' })
  @ApiCreatedResponse({ description: 'Otrosí registrado exitosamente' })
  async createAddendum(@Request() req: any, @Body() dto: CreateContractAddendumDto) {
    return this.legalService.createAddendum(req.user.tenantId, dto);
  }

  @Get('addendums/client/:clientId')
  @RequirePermissions('commercial:legal:manage', 'commercial:legal:read')
  @ApiOperation({ summary: 'Listar otrosíes de un cliente' })
  @ApiOkResponse({ description: 'Lista de otrosíes' })
  async getAddendumsByClient(@Request() req: any, @Param('clientId') clientId: string) {
    return this.legalService.getAddendumsByClient(req.user.tenantId, clientId);
  }

  @Get('addendums/:id')
  @RequirePermissions('commercial:legal:manage', 'commercial:legal:read')
  @ApiOperation({ summary: 'Obtener detalle de otrosí por ID' })
  @ApiOkResponse({ description: 'Detalle del otrosí' })
  async getAddendumById(@Request() req: any, @Param('id') id: string) {
    return this.legalService.getAddendumById(req.user.tenantId, id);
  }

  @Patch('addendums/:id')
  @RequirePermissions('commercial:legal:manage', 'commercial:legal:update')
  @ApiOperation({ summary: 'Actualizar otrosí contractual' })
  @ApiOkResponse({ description: 'Otrosí actualizado' })
  async updateAddendum(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateContractAddendumDto,
  ) {
    return this.legalService.updateAddendum(req.user.tenantId, id, dto);
  }

  @Delete('addendums/:id')
  @RequirePermissions('commercial:legal:manage', 'commercial:legal:delete')
  @ApiOperation({ summary: 'Eliminar otrosí contractual' })
  @ApiOkResponse({ description: 'Otrosí eliminado' })
  async deleteAddendum(@Request() req: any, @Param('id') id: string) {
    return this.legalService.deleteAddendum(req.user.tenantId, id);
  }

  // ==========================================
  // Compromisos ANS
  // ==========================================

  @Post('ans')
  @RequirePermissions('commercial:legal:manage', 'commercial:legal:create')
  @ApiOperation({ summary: 'Registrar compromiso de nivel de servicio (ANS)' })
  @ApiCreatedResponse({ description: 'Compromiso ANS registrado exitosamente' })
  async createAnsCommitment(@Request() req: any, @Body() dto: CreateAnsCommitmentDto) {
    return this.legalService.createAnsCommitment(req.user.tenantId, dto);
  }

  @Get('ans/client/:clientId')
  @RequirePermissions('commercial:legal:manage', 'commercial:legal:read')
  @ApiOperation({ summary: 'Listar compromisos ANS de un cliente' })
  @ApiOkResponse({ description: 'Lista de compromisos ANS' })
  async getAnsByClient(@Request() req: any, @Param('clientId') clientId: string) {
    return this.legalService.getAnsByClient(req.user.tenantId, clientId);
  }

  @Get('ans/:id')
  @RequirePermissions('commercial:legal:manage', 'commercial:legal:read')
  @ApiOperation({ summary: 'Obtener compromiso ANS por ID' })
  @ApiOkResponse({ description: 'Detalle del compromiso ANS' })
  async getAnsById(@Request() req: any, @Param('id') id: string) {
    return this.legalService.getAnsById(req.user.tenantId, id);
  }

  @Patch('ans/:id')
  @RequirePermissions('commercial:legal:manage', 'commercial:legal:update')
  @ApiOperation({ summary: 'Actualizar estado o notas de compromiso ANS' })
  @ApiOkResponse({ description: 'Compromiso ANS actualizado' })
  async updateAnsCommitment(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateAnsCommitmentDto,
  ) {
    return this.legalService.updateAnsCommitment(req.user.tenantId, id, dto);
  }

  @Delete('ans/:id')
  @RequirePermissions('commercial:legal:manage', 'commercial:legal:delete')
  @ApiOperation({ summary: 'Eliminar compromiso ANS' })
  @ApiOkResponse({ description: 'Compromiso ANS eliminado' })
  async deleteAnsCommitment(@Request() req: any, @Param('id') id: string) {
    return this.legalService.deleteAnsCommitment(req.user.tenantId, id);
  }
}
