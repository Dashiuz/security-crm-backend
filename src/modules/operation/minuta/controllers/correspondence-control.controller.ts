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
import { CorrespondenceControlService } from '../services/correspondence-control.service';
import {
  CreateCorrespondenceDto,
  UpdateCorrespondenceDto,
} from '../dtos/correspondence-control.dto';
import { VoidRecordDto } from '../dtos/minuta-general.dto';
import { JwtAuthGuard } from '../../../regulation/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../regulation/access-control/permissions.guard';
import { RequirePermissions } from '../../../regulation/access-control/permissions.decorator';

@ApiTags('Minuta: Correspondence Control')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('operation/minuta/correspondence')
export class CorrespondenceControlController {
  constructor(private readonly service: CorrespondenceControlService) {}

  @Post()
  @RequirePermissions('correspondence:manage', 'correspondence:create')
  @ApiOperation({ summary: 'Create correspondence received control' })
  @ApiBody({ type: CreateCorrespondenceDto })
  create(@Req() req: any, @Body() dto: CreateCorrespondenceDto) {
    return this.service.create(dto, req.user.id);
  }

  @Get()
  @RequirePermissions('correspondence:manage', 'correspondence:read')
  @ApiOperation({ summary: 'List correspondence records' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @RequirePermissions('correspondence:manage', 'correspondence:read')
  @ApiOperation({ summary: 'Get correspondence record by id' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('correspondence:manage', 'correspondence:update')
  @ApiOperation({
    summary: 'Update correspondence record (e.g. set delivered)',
  })
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateCorrespondenceDto,
  ) {
    return this.service.update(id, dto, req.user.id);
  }

  @Patch(':id/void')
  @RequirePermissions('correspondence:manage', 'correspondence:update')
  @ApiOperation({ summary: 'Void correspondence record' })
  @ApiBody({ type: VoidRecordDto })
  void(@Req() req: any, @Param('id') id: string, @Body() dto: VoidRecordDto) {
    return this.service.void(id, dto, req.user.id);
  }

  @Delete(':id')
  @RequirePermissions('correspondence:manage', 'correspondence:delete')
  @ApiOperation({ summary: 'Soft delete correspondence record' })
  remove(@Req() req: any, @Param('id') id: string) {
    return this.service.remove(id, req.user.id);
  }
}
