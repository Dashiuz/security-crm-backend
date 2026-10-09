import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ClientService } from './client.service';
import {
  CreateClientDto,
  UpdateClientDto,
  UpdateClientGeneralDto,
  UpdateClientLegalDto,
  ClientResponseDto,
} from './dtos/client.dto';
import {
  CreateClientWithStructureDto,
  UpdateClientWithStructureDto,
  UpdateClientOperationsDto,
} from './dtos/client-structure.dto';
import { JwtAuthGuard } from '../../regulation/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../regulation/access-control/permissions.guard';
import { RequirePermissions } from '../../regulation/access-control/permissions.decorator';
import { FeatureGuard } from '../../regulation/access-control/feature.guard';
import { RequireFeature } from '../../regulation/access-control/feature.decorator';
import { CursorPaginationDto } from '../../../common/dto/cursor-pagination.dto';

@ApiTags('Clients')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGuard)
@RequireFeature('client')
@Controller('client')
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  @Post()
  @RequirePermissions('client:manage', 'client:create')
  @ApiOperation({ summary: 'Create client' })
  @ApiCreatedResponse({ type: ClientResponseDto })
  create(@Body() dto: CreateClientDto, @Request() req) {
    return this.clientService.create(dto, req.user);
  }

  @Post('with-structure')
  @RequirePermissions('client:manage', 'client:create')
  @ApiOperation({ summary: 'Create client with residential complex structure' })
  @ApiCreatedResponse({ type: ClientResponseDto })
  createWithStructure(
    @Body() dto: CreateClientWithStructureDto,
    @Request() req,
  ) {
    return this.clientService.create(dto, req.user);
  }

  @Get()
  @RequirePermissions(
    'client:manage',
    'client:read_all',
    'client:read_general',
    'client:read_assigned',
    'client:read_workplace',
  )
  @ApiOperation({ summary: 'List clients' })
  @ApiOkResponse({ type: [ClientResponseDto] })
  findAll(@Request() req, @Query() pagination?: CursorPaginationDto) {
    return this.clientService.findAll(req.user, pagination);
  }

  @Get('search/autocomplete')
  @RequirePermissions(
    'client:manage',
    'client:read_all',
    'client:read_general',
    'client:read_assigned',
    'client:read_workplace',
    'minuta:manage',
    'minuta:create',
    'minuta:read',
  )
  @ApiOperation({ summary: 'Search active clients with autocomplete' })
  autocomplete(
    @Query('query') query: string,
    @Query('limit') limit: string,
    @Request() req,
  ) {
    return this.clientService.autocomplete(
      query,
      req.user,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get(':id/units/autocomplete')
  @RequirePermissions(
    'client:manage',
    'client:read_all',
    'client:read_general',
    'client:read_operations',
    'client:read_assigned',
    'client:read_workplace',
    'minuta:manage',
    'minuta:create',
    'minuta:read',
    'resident:manage',
    'resident:read',
  )
  @ApiOperation({ summary: 'Search units with autocomplete for a client' })
  autocompleteUnits(
    @Param('id') clientId: string,
    @Query('query') query: string,
    @Query('limit') limit: string,
    @Request() req,
  ) {
    return this.clientService.autocompleteUnits(
      clientId,
      query,
      req.user,
      limit ? parseInt(limit, 10) : 15,
    );
  }

  @Get(':id')
  @RequirePermissions(
    'client:manage',
    'client:read_all',
    'client:read_general',
    'client:read_operations',
    'client:read_legal',
    'client:read_residents',
    'client:read_assigned',
    'client:read_workplace',
    'minuta:manage',
    'minuta:create',
    'resident:manage',
    'resident:read',
  )
  @ApiOperation({ summary: 'Get client by id' })
  @ApiOkResponse({ type: ClientResponseDto })
  findOne(@Param('id') id: string, @Request() req) {
    return this.clientService.findOne(id, req.user);
  }

  @Patch(':id/general')
  @RequirePermissions('client:manage', 'client:update_general')
  @ApiOperation({ summary: 'Update client general information' })
  @ApiOkResponse({ type: ClientResponseDto })
  updateGeneral(
    @Param('id') id: string,
    @Body() dto: UpdateClientGeneralDto,
    @Request() req,
  ) {
    return this.clientService.updateGeneral(id, dto, req.user);
  }

  @Patch(':id/operations')
  @RequirePermissions('client:manage', 'client:update_operations')
  @ApiOperation({ summary: 'Update client operations and physical structure' })
  @ApiOkResponse({ type: ClientResponseDto })
  updateOperations(
    @Param('id') id: string,
    @Body() dto: UpdateClientOperationsDto,
    @Request() req,
  ) {
    return this.clientService.updateOperations(id, dto, req.user);
  }

  @Patch(':id/legal')
  @RequirePermissions('client:manage', 'client:update_legal')
  @ApiOperation({ summary: 'Update client legal and contractual information' })
  @ApiOkResponse({ type: ClientResponseDto })
  updateLegal(
    @Param('id') id: string,
    @Body() dto: UpdateClientLegalDto,
    @Request() req,
  ) {
    return this.clientService.updateLegal(id, dto, req.user);
  }

  @Patch(':id')
  @RequirePermissions('client:manage', 'client:update')
  @ApiOperation({ summary: 'Update client' })
  @ApiOkResponse({ type: ClientResponseDto })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateClientWithStructureDto,
    @Request() req,
  ) {
    return this.clientService.update(id, dto, req.user);
  }

  @Delete(':id')
  @RequirePermissions('client:manage', 'client:delete')
  @ApiOperation({ summary: 'Delete client' })
  @ApiOkResponse({ type: ClientResponseDto })
  remove(@Param('id') id: string, @Request() req) {
    return this.clientService.remove(id, req.user);
  }

  @Patch(':id/reactivate')
  @RequirePermissions('client:manage', 'client:update')
  @ApiOperation({ summary: 'Reactivate client' })
  @ApiOkResponse({ type: ClientResponseDto })
  reactivate(@Param('id') id: string, @Request() req) {
    return this.clientService.reactivate(id, req.user);
  }

  @Post('import/csv')
  @RequirePermissions('client:manage', 'client:create')
  @ApiOperation({ summary: 'Bulk import clients from JSON/CSV payload' })
  importCsv(
    @Body() body: { data: Array<Record<string, string>>; fileName?: string },
    @Request() req,
  ) {
    return this.clientService.importClientsFromCsv(
      body.data || [],
      body.fileName || 'clientes.csv',
      req.user,
    );
  }
}
