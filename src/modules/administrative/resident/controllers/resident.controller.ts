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
import { ResidentService } from '../services/resident.service';
import {
  CreateResidentDto,
  UpdateResidentDto,
  ResidentResponseDto,
} from '../dtos/resident.dto';
import { JwtAuthGuard } from '../../../regulation/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../regulation/access-control/permissions.guard';
import { RequirePermissions } from '../../../regulation/access-control/permissions.decorator';

@ApiTags('Residents')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
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
  @RequirePermissions('resident:manage', 'resident:read')
  @ApiOperation({ summary: 'List residents by client' })
  @ApiOkResponse({ type: [ResidentResponseDto] })
  findByClient(@Param('clientId') clientId: string, @Request() req) {
    return this.residentService.findByClient(clientId, req.user);
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
}
