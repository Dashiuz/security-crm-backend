import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiBody,
} from '@nestjs/swagger';
import { MinutaGeneralService } from '../services/minuta-general.service';
import {
  CreateMinutaDto,
  UpdateMinutaDto,
  VoidRecordDto,
} from '../dtos/minuta-general.dto';
import { JwtAuthGuard } from '../../../regulation/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../regulation/access-control/permissions.guard';
import { RequirePermissions } from '../../../regulation/access-control/permissions.decorator';

@ApiTags('Minuta: General')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('operation/minuta/general')
export class MinutaGeneralController {
  constructor(private readonly service: MinutaGeneralService) {}

  @Post()
  @RequirePermissions('minuta:manage', 'minuta:create')
  @ApiOperation({ summary: 'Create general logbook entry' })
  @ApiBody({ type: CreateMinutaDto })
  create(@Req() req: any, @Body() dto: CreateMinutaDto) {
    return this.service.create(dto, req.user.sub, req.user.tenantId);
  }

  @Get()
  @RequirePermissions('minuta:manage', 'minuta:read')
  @ApiOperation({ summary: 'List general logbook entries' })
  findAll(@Query('clientId') clientId?: string) {
    return this.service.findAll(clientId);
  }

  @Get(':id')
  @RequirePermissions('minuta:manage', 'minuta:read')
  @ApiOperation({ summary: 'Get general logbook entry by id' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('minuta:manage', 'minuta:update')
  @ApiOperation({ summary: 'Update general logbook entry' })
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateMinutaDto,
  ) {
    return this.service.update(id, dto, req.user.sub);
  }

  @Patch(':id/void')
  @RequirePermissions('minuta:manage', 'minuta:update')
  @ApiOperation({ summary: 'Void general logbook entry' })
  @ApiBody({ type: VoidRecordDto })
  void(@Req() req: any, @Param('id') id: string, @Body() dto: VoidRecordDto) {
    return this.service.void(id, dto, req.user.sub);
  }

  @Delete(':id')
  @RequirePermissions('minuta:manage', 'minuta:delete')
  @ApiOperation({ summary: 'Soft delete general logbook entry' })
  remove(@Req() req: any, @Param('id') id: string) {
    return this.service.remove(id, req.user.sub);
  }
}
