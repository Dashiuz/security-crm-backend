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
import { ParkingControlService } from '../services/parking-control.service';
import {
  CreateParkingControlDto,
  UpdateParkingControlDto,
} from '../dtos/parking-control.dto';
import { VoidRecordDto } from '../dtos/minuta-general.dto';
import { JwtAuthGuard } from '../../../regulation/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../regulation/access-control/permissions.guard';
import { RequirePermissions } from '../../../regulation/access-control/permissions.decorator';

@ApiTags('Minuta: Parking Control')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('operation/minuta/parking')
export class ParkingControlController {
  constructor(private readonly service: ParkingControlService) {}

  @Post()
  @RequirePermissions('minuta:manage', 'minuta:create')
  @ApiOperation({ summary: 'Create parking control entry' })
  @ApiBody({ type: CreateParkingControlDto })
  create(@Req() req: any, @Body() dto: CreateParkingControlDto) {
    return this.service.create(dto, req.user.sub, req.user.tenantId);
  }

  @Get()
  @RequirePermissions('minuta:manage', 'minuta:read')
  @ApiOperation({ summary: 'List parking control entries' })
  findAll(@Query('clientId') clientId?: string) {
    return this.service.findAll(clientId);
  }

  @Get(':id')
  @RequirePermissions('minuta:manage', 'minuta:read')
  @ApiOperation({ summary: 'Get parking control entry by id' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('minuta:manage', 'minuta:update')
  @ApiOperation({
    summary: 'Update parking control entry (e.g. set exit time)',
  })
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateParkingControlDto,
  ) {
    return this.service.update(id, dto, req.user.sub);
  }

  @Patch(':id/void')
  @RequirePermissions('minuta:manage', 'minuta:update')
  @ApiOperation({ summary: 'Void parking control entry' })
  @ApiBody({ type: VoidRecordDto })
  void(@Req() req: any, @Param('id') id: string, @Body() dto: VoidRecordDto) {
    return this.service.void(id, dto, req.user.sub);
  }

  @Delete(':id')
  @RequirePermissions('minuta:manage', 'minuta:delete')
  @ApiOperation({ summary: 'Soft delete parking control entry' })
  remove(@Req() req: any, @Param('id') id: string) {
    return this.service.remove(id, req.user.sub);
  }
}
