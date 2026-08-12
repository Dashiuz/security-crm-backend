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
  ClientResponseDto,
} from './dtos/client.dto';
import { JwtAuthGuard } from '../../regulation/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../regulation/access-control/permissions.guard';
import { RequirePermissions } from '../../regulation/access-control/permissions.decorator';

@ApiTags('Clients')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
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

  @Get()
  @RequirePermissions('client:manage', 'client:read')
  @ApiOperation({ summary: 'List clients' })
  @ApiOkResponse({ type: [ClientResponseDto] })
  findAll(@Request() req) {
    return this.clientService.findAll(req.user);
  }

  @Get(':id')
  @RequirePermissions('client:manage', 'client:read')
  @ApiOperation({ summary: 'Get client by id' })
  @ApiOkResponse({ type: ClientResponseDto })
  findOne(@Param('id') id: string, @Request() req) {
    return this.clientService.findOne(id, req.user);
  }

  @Patch(':id')
  @RequirePermissions('client:manage', 'client:update')
  @ApiOperation({ summary: 'Update client' })
  @ApiOkResponse({ type: ClientResponseDto })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
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
}
