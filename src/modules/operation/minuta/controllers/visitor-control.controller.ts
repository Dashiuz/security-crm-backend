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
import { VisitorControlService } from '../services/visitor-control.service';
import {
  CreateVisitorEntryDto,
  UpdateVisitorEntryDto,
  RegisterVisitorExitDto,
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
  @RequirePermissions('minuta:manage', 'minuta:create')
  @ApiOperation({ summary: 'Create visitor entry control' })
  @ApiBody({ type: CreateVisitorEntryDto })
  create(@Req() req: any, @Body() dto: CreateVisitorEntryDto) {
    return this.service.create(dto, req.user.sub, req.user.tenantId);
  }

  @Get()
  @RequirePermissions('minuta:manage', 'minuta:read')
  @ApiOperation({ summary: 'List visitor entry controls' })
  findAll(@Query('clientId') clientId?: string) {
    return this.service.findAll(clientId);
  }

  @Get(':id')
  @RequirePermissions('minuta:manage', 'minuta:read')
  @ApiOperation({ summary: 'Get visitor entry control by id' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('minuta:manage', 'minuta:update')
  @ApiOperation({
    summary: 'Update visitor entry control (e.g. set exit time)',
  })
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateVisitorEntryDto,
  ) {
    return this.service.update(id, dto, req.user.sub);
  }

  @Patch(':id/exit')
  @RequirePermissions('minuta:manage', 'minuta:update')
  @ApiOperation({ summary: 'Register visitor exit timestamp' })
  @ApiBody({ type: RegisterVisitorExitDto, required: false })
  registerExit(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto?: RegisterVisitorExitDto,
  ) {
    return this.service.registerExit(id, dto, req.user.sub);
  }

  @Patch(':id/void')
  @RequirePermissions('minuta:manage', 'minuta:update')
  @ApiOperation({ summary: 'Void visitor entry control' })
  @ApiBody({ type: VoidRecordDto })
  void(@Req() req: any, @Param('id') id: string, @Body() dto: VoidRecordDto) {
    return this.service.void(id, dto, req.user.sub);
  }

  @Delete(':id')
  @RequirePermissions('minuta:manage', 'minuta:delete')
  @ApiOperation({ summary: 'Soft delete visitor entry control' })
  remove(@Req() req: any, @Param('id') id: string) {
    return this.service.remove(id, req.user.sub);
  }
}
