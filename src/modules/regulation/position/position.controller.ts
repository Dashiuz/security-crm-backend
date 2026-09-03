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
import { PositionService } from './position.service';
import {
  CreatePositionDto,
  UpdatePositionDto,
  PositionResponseDto,
} from './dtos/position.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../access-control/permissions.guard';
import { RequirePermissions } from '../access-control/permissions.decorator';

@ApiTags('Positions')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('position')
export class PositionController {
  constructor(private readonly positionService: PositionService) {}

  @Post()
  @RequirePermissions('position:manage', 'position:create')
  @ApiOperation({ summary: 'Create position' })
  @ApiCreatedResponse({ type: PositionResponseDto })
  create(@Body() dto: CreatePositionDto) {
    return this.positionService.create(dto);
  }

  @Get()
  @RequirePermissions('position:manage', 'position:read')
  @ApiOperation({ summary: 'List positions' })
  @ApiOkResponse({ type: [PositionResponseDto] })
  findAll() {
    return this.positionService.findAll();
  }

  @Get(':id')
  @RequirePermissions('position:manage', 'position:read')
  @ApiOperation({ summary: 'Get position by id' })
  @ApiOkResponse({ type: PositionResponseDto })
  findOne(@Param('id') id: string) {
    return this.positionService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('position:manage', 'position:update')
  @ApiOperation({ summary: 'Update position' })
  @ApiOkResponse({ type: PositionResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdatePositionDto) {
    return this.positionService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('position:manage', 'position:delete')
  @ApiOperation({ summary: 'Delete position' })
  @ApiOkResponse({ type: PositionResponseDto })
  remove(@Param('id') id: string) {
    return this.positionService.remove(id);
  }

  @Post('import/csv')
  @RequirePermissions('position:manage', 'position:create')
  @ApiOperation({ summary: 'Bulk import positions from JSON/CSV payload' })
  importCsv(
    @Body()
    body: {
      data: Array<Record<string, string>>;
      fileName?: string;
    },
    @Request() req,
  ) {
    return this.positionService.importPositionsFromCsv(
      body.data || [],
      body.fileName || 'cargos.csv',
      req.user,
    );
  }
}
