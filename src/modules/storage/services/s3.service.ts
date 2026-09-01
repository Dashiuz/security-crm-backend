import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as crypto from 'crypto';
import { MediaTypeCategory } from '../dtos/upload-media.dto';

export interface GeneratedS3KeyParams {
  tenantId: string;
  entityType: MediaTypeCategory;
  entityId: string;
  clientId?: string;
  subType?: string;
  category?: string;
  fileName: string;
}

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly region: string;

  constructor(private readonly configService: ConfigService) {
    this.region =
      this.configService.get<string>('AWS_REGION') ||
      process.env.AWS_REGION ||
      'us-east-1';
    this.bucketName =
      this.configService.get<string>('AWS_S3_BUCKET_NAME') ||
      process.env.AWS_S3_BUCKET_NAME ||
      '';

    const accessKeyId =
      this.configService.get<string>('AWS_ACCESS_KEY_ID') ||
      process.env.AWS_ACCESS_KEY_ID ||
      '';
    const secretAccessKey =
      this.configService.get<string>('AWS_SECRET_ACCESS_KEY') ||
      process.env.AWS_SECRET_ACCESS_KEY ||
      '';

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    this.logger.log(
      `S3Service initialized for region [${this.region}] and bucket [${this.bucketName}]`,
    );
  }

  /**
   * Generates a structured multi-tenant S3 key based on architectural specs (SPEC-OPE-006)
   */
  generateS3Key(params: GeneratedS3KeyParams): string {
    const {
      tenantId,
      entityType,
      entityId,
      clientId,
      subType,
      category,
      fileName,
    } = params;

    const cleanFileName = fileName
      .toLowerCase()
      .replace(/[^a-z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_');
    const uniqueSuffix = `${crypto.randomUUID().slice(0, 8)}-${cleanFileName}`;

    // 1. Minutas (General, Visitor, Correspondence, Parking)
    if (
      [
        MediaTypeCategory.MINUTA,
        MediaTypeCategory.VISITOR,
        MediaTypeCategory.CORRESPONDENCE,
        MediaTypeCategory.PARKING,
      ].includes(entityType)
    ) {
      let minutaType = 'general';
      if (entityType === MediaTypeCategory.VISITOR) minutaType = 'visitor';
      else if (entityType === MediaTypeCategory.CORRESPONDENCE)
        minutaType = 'correspondence';
      else if (entityType === MediaTypeCategory.PARKING) minutaType = 'parking';
      else if (subType) minutaType = subType.toLowerCase();

      if (clientId) {
        return `tenants/${tenantId}/clients/${clientId}/minutas/${minutaType}/${entityId}/${uniqueSuffix}`;
      }
      return `tenants/${tenantId}/minutas/${minutaType}/${entityId}/${uniqueSuffix}`;
    }

    // 2. Employees (Avatar)
    if (entityType === MediaTypeCategory.EMPLOYEE) {
      return `tenants/${tenantId}/employees/${entityId}/avatar/${uniqueSuffix}`;
    }

    // 3. Clients (Documents)
    if (entityType === MediaTypeCategory.CLIENT) {
      return `tenants/${tenantId}/clients/${entityId}/documents/${uniqueSuffix}`;
    }

    // 4. Inventories
    if (entityType === MediaTypeCategory.INVENTORY) {
      return `tenants/${tenantId}/inventories/${entityId}/${uniqueSuffix}`;
    }

    // 5. Generic / Misc Documents
    const docCategory = category || 'misc';
    return `tenants/${tenantId}/documents/${docCategory}/${uniqueSuffix}`;
  }

  /**
   * Uploads a file buffer directly to AWS S3
   */
  async uploadFile(
    file: Express.Multer.File,
    s3Key: string,
  ): Promise<{
    url: string;
    s3Key: string;
    sizeBytes: number;
    mimeType: string;
    fileName: string;
  }> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    await this.s3Client.send(command);

    const directUrl = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${s3Key}`;

    return {
      url: directUrl,
      s3Key,
      sizeBytes: file.size,
      mimeType: file.mimetype,
      fileName: file.originalname,
    };
  }

  /**
   * Deletes an object physically from AWS S3
   */
  async deleteFile(s3Key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
      });

      await this.s3Client.send(command);
      this.logger.log(`Deleted S3 object: ${s3Key}`);
    } catch (error) {
      this.logger.error(`Failed to delete S3 object [${s3Key}]:`, error);
      throw error;
    }
  }

  /**
   * Generates a temporary Presigned URL for private S3 objects (valid for 15 minutes by default)
   */
  async getPresignedUrl(s3Key: string, expiresIn = 900): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }
}
