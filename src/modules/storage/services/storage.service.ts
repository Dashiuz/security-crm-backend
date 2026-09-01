import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { S3Service } from './s3.service';
import { MediaTypeCategory, UploadMediaDto } from '../dtos/upload-media.dto';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
  ) {}

  /**
   * Uploads physical file to AWS S3 and creates MediaAttachment record in database
   */
  async uploadMedia(
    file: Express.Multer.File,
    dto: UploadMediaDto,
    userId: string,
    tenantId: string,
  ) {
    if (!file) {
      throw new BadRequestException('No se ha proporcionado ningún archivo para cargar');
    }

    // 1. Generate S3 Key
    const s3Key = this.s3Service.generateS3Key({
      tenantId,
      entityType: dto.entityType,
      entityId: dto.entityId,
      clientId: dto.clientId,
      subType: dto.subType,
      category: dto.category,
      fileName: file.originalname,
    });

    // 2. Upload file buffer to S3
    const uploadResult = await this.s3Service.uploadFile(file, s3Key);

    // 3. Prepare Prisma MediaAttachment creation payload
    const data: any = {
      tenant: { connect: { id: tenantId } },
      url: uploadResult.url,
      s3Key: uploadResult.s3Key,
      fileName: uploadResult.fileName,
      mimeType: uploadResult.mimeType,
      sizeBytes: uploadResult.sizeBytes,
      uploadedById: userId,
    };

    if (dto.clientId) {
      data.client = { connect: { id: dto.clientId } };
    }

    if (dto.entityType === MediaTypeCategory.MINUTA) {
      data.minuta = { connect: { id: dto.entityId } };
    } else if (dto.entityType === MediaTypeCategory.VISITOR) {
      data.visitorEntry = { connect: { id: dto.entityId } };
    } else if (dto.entityType === MediaTypeCategory.CORRESPONDENCE) {
      data.correspondence = { connect: { id: dto.entityId } };
    } else if (dto.entityType === MediaTypeCategory.PARKING) {
      data.parkingVehicle = { connect: { id: dto.entityId } };
    } else if (dto.entityType === MediaTypeCategory.EMPLOYEE) {
      data.employee = { connect: { id: dto.entityId } };
    } else if (dto.entityType === MediaTypeCategory.CLIENT) {
      data.client = { connect: { id: dto.entityId } };
    }

    // 4. Save to Database
    const mediaAttachment = await (this.prisma as any).mediaAttachment.create({
      data,
    });

    // 5. Generate secure Presigned URL for client immediate render
    const presignedUrl = await this.s3Service.getPresignedUrl(mediaAttachment.s3Key);

    return {
      ...mediaAttachment,
      presignedUrl,
    };
  }

  /**
   * Generates a Presigned URL for a specific MediaAttachment ID scoped to tenant
   */
  async getPresignedUrl(mediaId: string, tenantId: string) {
    const media = await (this.prisma as any).mediaAttachment.findFirst({
      where: {
        id: mediaId,
        tenantId,
      },
    });

    if (!media) {
      throw new NotFoundException(`Archivo adjunto [${mediaId}] no encontrado`);
    }

    const presignedUrl = await this.s3Service.getPresignedUrl(media.s3Key);

    return {
      id: media.id,
      fileName: media.fileName,
      mimeType: media.mimeType,
      sizeBytes: media.sizeBytes,
      s3Key: media.s3Key,
      presignedUrl,
      createdAt: media.createdAt,
    };
  }

  /**
   * Finds all attachments for a specific entity with generated Presigned URLs
   */
  async findByEntity(entityType: MediaTypeCategory, entityId: string, tenantId: string) {
    const where: any = { tenantId };

    if (entityType === MediaTypeCategory.MINUTA) where.minutaId = entityId;
    else if (entityType === MediaTypeCategory.VISITOR) where.visitorEntryId = entityId;
    else if (entityType === MediaTypeCategory.CORRESPONDENCE) where.correspondenceId = entityId;
    else if (entityType === MediaTypeCategory.PARKING) where.parkingVehicleId = entityId;
    else if (entityType === MediaTypeCategory.EMPLOYEE) where.employeeId = entityId;
    else if (entityType === MediaTypeCategory.CLIENT) where.clientId = entityId;

    const items = await (this.prisma as any).mediaAttachment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(
      items.map(async (item: any) => ({
        ...item,
        presignedUrl: await this.s3Service.getPresignedUrl(item.s3Key),
      })),
    );
  }

  /**
   * Deletes a MediaAttachment record and destroys physical S3 object
   */
  async deleteMedia(mediaId: string, tenantId: string) {
    const media = await (this.prisma as any).mediaAttachment.findFirst({
      where: {
        id: mediaId,
        tenantId,
      },
    });

    if (!media) {
      throw new NotFoundException(`Archivo adjunto [${mediaId}] no encontrado`);
    }

    // Physical deletion on S3
    await this.s3Service.deleteFile(media.s3Key);

    // Database deletion
    await (this.prisma as any).mediaAttachment.delete({
      where: { id: mediaId },
    });

    return {
      id: mediaId,
      deleted: true,
      message: 'Archivo eliminado de forma exitosa de AWS S3 y base de datos',
    };
  }
}
