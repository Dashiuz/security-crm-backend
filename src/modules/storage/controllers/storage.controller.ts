import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Req,
  ParseFilePipe,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiOkResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../regulation/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../regulation/access-control/permissions.guard';
import { StorageService } from '../services/storage.service';
import { MediaTypeCategory, UploadMediaDto } from '../dtos/upload-media.dto';

@ApiTags('Storage & Media')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload')
  @ApiOperation({
    summary: 'Upload a media file (image/document) and attach to an entity',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        entityType: { type: 'string', enum: Object.values(MediaTypeCategory) },
        entityId: { type: 'string' },
        clientId: { type: 'string', nullable: true },
        subType: { type: 'string', nullable: true },
        category: { type: 'string', nullable: true },
      },
      required: ['file', 'entityType', 'entityId'],
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(
    @Req() req: any,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 15 * 1024 * 1024 }), // Max 15MB
        ],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
    @Body() dto: UploadMediaDto,
  ) {
    return this.storageService.uploadMedia(
      file,
      dto,
      req.user.sub || req.user.userId,
      req.user.tenantId,
    );
  }

  @Get(':id/presigned-url')
  @ApiOperation({
    summary: 'Generate a secure temporary presigned download/view URL',
  })
  @ApiOkResponse({ description: 'Presigned URL generated successfully' })
  @ApiNotFoundResponse({ description: 'Media not found' })
  getPresignedUrl(@Req() req: any, @Param('id') id: string) {
    return this.storageService.getPresignedUrl(id, req.user.tenantId);
  }

  @Get('by-entity/:entityType/:entityId')
  @ApiOperation({
    summary: 'Get all media attachments for a given entity with Presigned URLs',
  })
  findByEntity(
    @Req() req: any,
    @Param('entityType') entityType: MediaTypeCategory,
    @Param('entityId') entityId: string,
  ) {
    return this.storageService.findByEntity(
      entityType,
      entityId,
      req.user.tenantId,
    );
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete media attachment and permanently destroy physical S3 file',
  })
  @ApiOkResponse({ description: 'Media attachment deleted successfully' })
  @ApiNotFoundResponse({ description: 'Media not found' })
  deleteMedia(@Req() req: any, @Param('id') id: string) {
    return this.storageService.deleteMedia(id, req.user.tenantId);
  }
}
