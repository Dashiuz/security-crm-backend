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
import { ResidentService } from '../services/resident.service';
import {
  CreateResidentDto,
  UpdateResidentDto,
  ResidentResponseDto,
} from '../dtos/resident.dto';
import { JwtAuthGuard } from '../../../regulation/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../regulation/access-control/permissions.guard';
import { RequirePermissions } from '../../../regulation/access-control/permissions.decorator';
import { FeatureGuard } from '../../../regulation/access-control/feature.guard';
import { RequireFeature } from '../../../regulation/access-control/feature.decorator';

@ApiTags('Residents')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGuard)
@RequireFeature('resident')
@Controller('resident')
export class ResidentController {
  constructor(private readonly residentService: ResidentService) {}

  @Post()
  @RequirePermissions('resident:manage', 'resident:create')
  @ApiOperation({ summary: 'Create resident' })
  @ApiCreatedResponse({ type: ResidentResponseDto })
  create(@Body() dto: CreateResidentDto, @Request() req) {
    return this.residentService.create(dto, req.user);
  }

  @Get('by-client/:clientId')
  @RequirePermissions(
    'resident:manage',
    'resident:read',
    'minuta:manage',
    'minuta:create',
  )
  @ApiOperation({ summary: 'List residents by client' })
  @ApiOkResponse({ type: [ResidentResponseDto] })
  findByClient(@Param('clientId') clientId: string, @Request() req) {
    return this.residentService.findByClient(clientId, req.user);
  }

  @Get('autocomplete')
  @RequirePermissions(
    'resident:manage',
    'resident:read',
    'minuta:manage',
    'minuta:create',
    'minuta:read',
  )
  @ApiOperation({ summary: 'Search residents with autocomplete' })
  @ApiOkResponse({ type: [ResidentResponseDto] })
  autocomplete(
    @Query('clientId') clientId: string,
    @Query('query') query: string,
    @Query('unitId') unitId: string,
    @Query('limit') limit: string,
    @Request() req,
  ) {
    return this.residentService.autocomplete(
      clientId,
      query,
      unitId,
      req.user,
      limit ? parseInt(limit, 10) : 15,
    );
  }

  @Get(':id')
  @RequirePermissions('resident:manage', 'resident:read')
  @ApiOperation({ summary: 'Get resident by id' })
  @ApiOkResponse({ type: ResidentResponseDto })
  findOne(@Param('id') id: string, @Request() req) {
    return this.residentService.findOne(id, req.user);
  }

  @Patch(':id')
  @RequirePermissions('resident:manage', 'resident:update')
  @ApiOperation({ summary: 'Update resident' })
  @ApiOkResponse({ type: ResidentResponseDto })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateResidentDto,
    @Request() req,
  ) {
    return this.residentService.update(id, dto, req.user);
  }

  @Delete(':id')
  @RequirePermissions('resident:manage', 'resident:delete')
  @ApiOperation({ summary: 'Soft delete resident' })
  @ApiOkResponse({ description: 'Resident deleted' })
  remove(@Param('id') id: string, @Request() req) {
    return this.residentService.remove(id, req.user);
  }

  @Post('import/csv')
  @RequirePermissions('resident:manage', 'resident:create')
  @ApiOperation({ summary: 'Bulk import residents from JSON/CSV payload' })
  importCsv(
    @Body()
    body: {
      clientId: string;
      data: Array<Record<string, string>>;
      fileName?: string;
    },
    @Request() req,
  ) {
    return this.residentService.importResidentsFromCsv(
      body.clientId,
      body.data || [],
      body.fileName || 'residentes.csv',
      req.user,
    );
  }
}
