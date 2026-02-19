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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiBody,
} from '@nestjs/swagger';
import { VisitorControlService } from '../services/visitor-control.service';
import {
  CreateVisitorEntryDto,
  UpdateVisitorEntryDto,
} from '../dtos/visitor-control.dto';
import { VoidRecordDto } from '../dtos/minuta-general.dto';
import { JwtAuthGuard } from '../../../regulation/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../regulation/access-control/permissions.guard';
import { RequirePermissions } from '../../../regulation/access-control/permissions.decorator';

@ApiTags('Minuta: Visitor Control')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('operation/minuta/visitor')
export class VisitorControlController {
  constructor(private readonly service: VisitorControlService) {}

  @Post()
  @RequirePermissions('visitor:manage', 'visitor:create')
  @ApiOperation({ summary: 'Create visitor entry control' })
  @ApiBody({ type: CreateVisitorEntryDto })
  create(@Req() req: any, @Body() dto: CreateVisitorEntryDto) {
    return this.service.create(dto, req.user.id);
  }

  @Get()
  @RequirePermissions('visitor:manage', 'visitor:read')
  @ApiOperation({ summary: 'List visitor entry controls' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @RequirePermissions('visitor:manage', 'visitor:read')
  @ApiOperation({ summary: 'Get visitor entry control by id' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('visitor:manage', 'visitor:update')
  @ApiOperation({
    summary: 'Update visitor entry control (e.g. set exit time)',
  })
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateVisitorEntryDto,
  ) {
    return this.service.update(id, dto, req.user.id);
  }

  @Patch(':id/void')
  @RequirePermissions('visitor:manage', 'visitor:update')
  @ApiOperation({ summary: 'Void visitor entry control' })
  @ApiBody({ type: VoidRecordDto })
  void(@Req() req: any, @Param('id') id: string, @Body() dto: VoidRecordDto) {
    return this.service.void(id, dto, req.user.id);
  }

  @Delete(':id')
  @RequirePermissions('visitor:manage', 'visitor:delete')
  @ApiOperation({ summary: 'Soft delete visitor entry control' })
  remove(@Req() req: any, @Param('id') id: string) {
    return this.service.remove(id, req.user.id);
  }
}
