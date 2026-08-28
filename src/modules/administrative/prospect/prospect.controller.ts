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
import { ProspectService } from './prospect.service';
import {
  CreateProspectDto,
  CreateProspectWithStructureDto,
  UpdateProspectDto,
  ConvertProspectDto,
  ProspectResponseDto,
} from './dtos/prospect.dto';
import { JwtAuthGuard } from '../../regulation/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../regulation/access-control/permissions.guard';
import { RequirePermissions } from '../../regulation/access-control/permissions.decorator';

@ApiTags('Prospects')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('prospect')
export class ProspectController {
  constructor(private readonly prospectService: ProspectService) {}

  @Post()
  @RequirePermissions('client:manage', 'client:create')
  @ApiOperation({ summary: 'Create prospect' })
  @ApiCreatedResponse({ type: ProspectResponseDto })
  create(@Body() dto: CreateProspectDto, @Request() req) {
    return this.prospectService.create(dto, req.user);
  }

  @Post('with-structure')
  @RequirePermissions('client:manage', 'client:create')
  @ApiOperation({ summary: 'Create prospect with residential structure' })
  @ApiCreatedResponse({ type: ProspectResponseDto })
  createWithStructure(@Body() dto: CreateProspectWithStructureDto, @Request() req) {
    return this.prospectService.create(dto, req.user);
  }

  @Get()
  @RequirePermissions('client:manage', 'client:read')
  @ApiOperation({ summary: 'List prospects' })
  @ApiOkResponse({ type: [ProspectResponseDto] })
  findAll(@Request() req) {
    return this.prospectService.findAll(req.user);
  }

  @Get(':id')
  @RequirePermissions('client:manage', 'client:read')
  @ApiOperation({ summary: 'Get prospect by id' })
  @ApiOkResponse({ type: ProspectResponseDto })
  findOne(@Param('id') id: string, @Request() req) {
    return this.prospectService.findOne(id, req.user);
  }

  @Patch(':id')
  @RequirePermissions('client:manage', 'client:update')
  @ApiOperation({ summary: 'Update prospect' })
  @ApiOkResponse({ type: ProspectResponseDto })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProspectDto,
    @Request() req,
  ) {
    return this.prospectService.update(id, dto, req.user);
  }

  @Delete(':id')
  @RequirePermissions('client:manage', 'client:delete')
  @ApiOperation({ summary: 'Delete prospect' })
  @ApiOkResponse({ description: 'Prospect deleted' })
  remove(@Param('id') id: string, @Request() req) {
    return this.prospectService.remove(id, req.user);
  }

  @Post(':id/convert')
  @RequirePermissions('client:manage', 'client:update')
  @ApiOperation({ summary: 'Convert prospect into active client' })
  @ApiOkResponse({ description: 'Prospect converted to client' })
  convert(
    @Param('id') id: string,
    @Body() dto: ConvertProspectDto,
    @Request() req,
  ) {
    return this.prospectService.convertToClient(id, dto, req.user);
  }
}
