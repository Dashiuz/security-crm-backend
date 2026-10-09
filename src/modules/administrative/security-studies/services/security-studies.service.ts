import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Service } from '../../../storage/services/s3.service';
import { RequestContextService } from '../../../../common/context/request-context.service';
import { MediaTypeCategory } from '../../../storage/dtos/upload-media.dto';
import { GenerateBaseMapDto } from '../dtos/generate-base-map.dto';
import { CreateSecurityStudyDto } from '../dtos/create-security-study.dto';
import { UpdateSecurityStudyDto } from '../dtos/update-security-study.dto';
import { UpdateCanvasDto } from '../dtos/update-canvas.dto';
import { UpdateFileCanvasDto } from '../dtos/update-file-canvas.dto';
import { ApprovePerimeterDto } from '../dtos/approve-perimeter.dto';
import { DiscontinueStudyDto } from '../dtos/discontinue-study.dto';
import { MapboxMathUtil } from '../utils/mapbox-math.util';
import { SecurityStudiesRepository } from '../repositories/security-studies.repository';
import * as crypto from 'crypto';

@Injectable()
export class SecurityStudiesService {
  private readonly logger = new Logger(SecurityStudiesService.name);

  constructor(
    private readonly repository: SecurityStudiesRepository,
    private readonly s3Service: S3Service,
    private readonly configService: ConfigService,
    private readonly contextService: RequestContextService,
  ) {}

  /**
   * Generates a high-resolution static satellite image from Mapbox Static API,
   * computes its exact Web Mercator Bounding Box, and uploads the image to AWS S3.
   */
  async generateBaseMap(dto: GenerateBaseMapDto) {
    const tenantId = this.contextService.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required');
    }

    // Verify client exists
    const client = await this.repository.findClientById(dto.clientId);
    if (!client) {
      throw new NotFoundException(
        `Cliente con ID ${dto.clientId} no encontrado.`,
      );
    }

    const token =
      this.configService.get<string>('MAPBOX_ACCESS_TOKEN') ||
      process.env.MAPBOX_ACCESS_TOKEN;
    if (!token) {
      throw new BadRequestException(
        'MAPBOX_ACCESS_TOKEN no configurado en el servidor.',
      );
    }

    const mapboxW = Math.min(1280, dto.width || 1280);
    const mapboxH = Math.min(1280, dto.height || 720);

    const mapboxUrl = `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/${dto.lng},${dto.lat},${dto.zoom},0/${mapboxW}x${mapboxH}@2x?access_token=${token}`;

    const response = await fetch(mapboxUrl);
    if (!response.ok) {
      const errText = await response.text();
      this.logger.error(`Mapbox API error: ${response.status} - ${errText}`);
      throw new BadRequestException(
        `Error al obtener la imagen satelital de Mapbox: ${response.statusText}`,
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    // Compute exact Web Mercator Bounding Box
    const bbox = MapboxMathUtil.calculateWebMercatorBbox(
      dto.lat,
      dto.lng,
      dto.zoom,
      1920,
      1080,
    );

    // Generate S3 key and upload image buffer
    const s3Key = this.s3Service.generateS3Key({
      tenantId: tenantId,
      entityType: MediaTypeCategory.SECURITY_STUDY,
      entityId: `base_map_${Date.now()}`,
      clientId: dto.clientId,
      fileName: 'satellite_base_1920x1080.jpg',
    });

    await this.s3Service.uploadBuffer(imageBuffer, s3Key, 'image/jpeg');

    const presignedUrl = await this.s3Service.getPresignedUrl(s3Key);

    return {
      baseImageS3Key: s3Key,
      presignedUrl,
      center: { lat: dto.lat, lng: dto.lng },
      zoom: dto.zoom,
      bbox,
      width: 1920,
      height: 1080,
    };
  }

  /**
   * Retrieves image stream directly from S3 to serve with proper CORS headers
   */
  async getImageStream(id: string) {
    const study = await this.repository.getStudyStreamKey(id);

    if (!study) {
      throw new NotFoundException(
        `Estudio de seguridad con ID ${id} no encontrado.`,
      );
    }

    const key = study.baseImageS3Key || study.client?.mapboxBaseImageS3Key;
    if (!key) {
      throw new NotFoundException('No base image associated with this study.');
    }

    return this.s3Service.getObjectStream(key);
  }

  /**
   * Creates a new Security Study. If a previous CURRENT study exists for this client,
   * it archives it to DISCONTINUED and increments the version counter.
   * Automatically inherits base map and geofence from the Client entity (SSOT).
   */
  async create(dto: CreateSecurityStudyDto) {
    const tenantId = this.contextService.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required');
    }

    const client = await this.repository.findClientById(dto.clientId);
    if (!client) {
      throw new NotFoundException(
        `Cliente con ID ${dto.clientId} no encontrado.`,
      );
    }

    // Determine version number
    const latestStudy = await this.repository.findLatestStudyVersion(
      dto.clientId,
    );
    const nextVersion = (latestStudy?.version || 0) + 1;

    // Transition previous CURRENT studies to DISCONTINUED
    await this.repository.discontinueCurrentStudies(dto.clientId);

    // Base map fields inherited from Client if not explicitly provided
    const baseImageS3Key =
      dto.baseImageS3Key || client.mapboxBaseImageS3Key || null;
    const mapboxCenterLat =
      dto.mapboxCenterLat ?? client.mapboxCenterLat ?? null;
    const mapboxCenterLng =
      dto.mapboxCenterLng ?? client.mapboxCenterLng ?? null;
    const mapboxZoom = dto.mapboxZoom ?? client.mapboxZoom ?? null;
    const mapboxBboxMinLat =
      dto.mapboxBboxMinLat ?? client.mapboxBboxMinLat ?? null;
    const mapboxBboxMinLng =
      dto.mapboxBboxMinLng ?? client.mapboxBboxMinLng ?? null;
    const mapboxBboxMaxLat =
      dto.mapboxBboxMaxLat ?? client.mapboxBboxMaxLat ?? null;
    const mapboxBboxMaxLng =
      dto.mapboxBboxMaxLng ?? client.mapboxBboxMaxLng ?? null;

    // Default canvas state: embed client geofence if present
    let canvasState = dto.canvasState || null;
    if (!canvasState && (baseImageS3Key || client.geofence)) {
      canvasState = {
        version: '1.0',
        geofencePolygon: client.geofence || null,
        facilities: [],
        devices: [],
      };
    }

    const study = await this.repository.createStudy({
      tenantId: tenantId,
      clientId: dto.clientId,
      name: dto.name,
      description: dto.description || null,
      baseImageS3Key,
      mapboxCenterLat,
      mapboxCenterLng,
      mapboxZoom,
      mapboxBboxMinLat,
      mapboxBboxMinLng,
      mapboxBboxMaxLat,
      mapboxBboxMaxLng,
      canvasState,
      files: dto.files || [],
      status: 'CURRENT',
      version: nextVersion,
    });

    const presignedUrl = study.baseImageS3Key
      ? await this.s3Service.getPresignedUrl(study.baseImageS3Key)
      : null;

    return {
      ...study,
      baseImageUrl: presignedUrl,
    };
  }

  /**
   * Retrieves all security studies for a client.
   */
  async findByClient(clientId: string) {
    const [studies, client] =
      await this.repository.findStudiesByClient(clientId);

    // Resolve presigned URLs for each study and its attached files
    const enriched = await Promise.all(
      studies.map(async (study: any) => {
        let baseImageUrl = '';
        const imageKey = study.baseImageS3Key || client?.mapboxBaseImageS3Key;
        if (imageKey) {
          try {
            baseImageUrl = await this.s3Service.getPresignedUrl(imageKey);
          } catch (e) {
            this.logger.warn(
              `Could not sign URL for study image [${imageKey}]: ${e}`,
            );
          }
        }
        const files = await this.enrichFiles(study.files);
        return {
          ...study,
          baseImageUrl,
          files,
        };
      }),
    );

    return {
      client,
      studies: enriched,
    };
  }

  /**
   * Helper to enrich files array with fresh presigned S3 URLs
   */
  private async enrichFiles(files: any): Promise<any[]> {
    if (!Array.isArray(files)) return [];
    return Promise.all(
      files.map(async (file) => {
        if (file.s3Key) {
          try {
            const url = await this.s3Service.getPresignedUrl(file.s3Key);
            return { ...file, url };
          } catch (err) {
            this.logger.warn(
              `Could not sign URL for attached file [${file.s3Key}]: ${err}`,
            );
            return file;
          }
        }
        return file;
      }),
    );
  }

  /**
   * Retrieves a single study by ID with fresh presigned image URL.
   */
  async findOne(id: string) {
    const study = await this.repository.findStudyById(id);

    if (!study) {
      throw new NotFoundException(
        `Estudio de seguridad con ID ${id} no encontrado.`,
      );
    }

    const imageKey = study.baseImageS3Key || study.client?.mapboxBaseImageS3Key;
    let baseImageUrl: string | null = null;
    if (imageKey) {
      try {
        baseImageUrl = await this.s3Service.getPresignedUrl(imageKey);
      } catch (e) {
        this.logger.warn(
          `Could not sign URL for study image [${imageKey}]: ${e}`,
        );
      }
    }
    const files = await this.enrichFiles(study.files);

    return {
      ...study,
      baseImageUrl,
      files,
    };
  }

  /**
   * Updates basic metadata (name, description) of a security study.
   */
  async update(id: string, dto: UpdateSecurityStudyDto) {
    const study = await this.repository.findStudyBasic(id);

    if (!study) {
      throw new NotFoundException(
        `Estudio de seguridad con ID ${id} no encontrado.`,
      );
    }

    const dataToUpdate: any = {};
    if (dto.name !== undefined) {
      if (!dto.name.trim()) {
        throw new BadRequestException(
          'El nombre del estudio no puede estar vacío.',
        );
      }
      dataToUpdate.name = dto.name.trim();
    }
    if (dto.description !== undefined) {
      dataToUpdate.description = dto.description
        ? dto.description.trim()
        : null;
    }

    const updated = await this.repository.updateStudy(id, dataToUpdate);

    const presignedUrl = updated.baseImageS3Key
      ? await this.s3Service.getPresignedUrl(updated.baseImageS3Key)
      : null;

    return {
      ...updated,
      baseImageUrl: presignedUrl,
    };
  }

  /**
   * Updates the Konva canvas vector state (Debounce Autosaver).
   */
  async updateCanvas(id: string, dto: UpdateCanvasDto) {
    const study = await this.repository.findStudyBasic(id);

    if (!study) {
      throw new NotFoundException(
        `Estudio de seguridad con ID ${id} no encontrado.`,
      );
    }

    if (study.status === 'DISCONTINUED') {
      throw new BadRequestException(
        'No se pueden realizar modificaciones en un estudio de seguridad descontinuado.',
      );
    }

    const updated = await this.repository.updateCanvasState(
      id,
      dto.canvasState,
    );

    return updated;
  }

  /**
   * Discontinues an active study. Requires exact confirmation: "acepto".
   */
  async discontinue(id: string, dto: DiscontinueStudyDto) {
    if (dto.confirmation?.trim().toLowerCase() !== 'acepto') {
      throw new BadRequestException(
        'Debe escribir exactamente la palabra "acepto" para descontinuar el estudio.',
      );
    }

    const study = await this.repository.findStudyBasic(id);

    if (!study) {
      throw new NotFoundException(
        `Estudio de seguridad con ID ${id} no encontrado.`,
      );
    }

    if (study.status === 'DISCONTINUED') {
      return study;
    }

    const discontinued = await this.repository.discontinueStudy(id);

    return discontinued;
  }

  /**
   * Duplicates an existing study to save work.
   * If there is already a CURRENT study for the client, duplication is blocked
   * until the active one is discontinued.
   */
  async duplicate(id: string) {
    const study = await this.repository.findStudyBasic(id);

    if (!study) {
      throw new NotFoundException(
        `Estudio de seguridad con ID ${id} no encontrado.`,
      );
    }

    // Check if an active CURRENT study exists for this client
    const currentStudy = await this.repository.findActiveCurrentStudy(
      study.clientId,
    );

    if (currentStudy) {
      throw new BadRequestException(
        'No se puede duplicar un estudio mientras exista un estudio vigente en estado CURRENT. Descontinúe el estudio actual primero.',
      );
    }

    const latestStudy = await this.repository.findLatestStudyVersion(
      study.clientId,
    );
    const nextVersion = (latestStudy?.version || 0) + 1;

    const duplicated = await this.repository.createStudy({
      tenantId: study.tenantId,
      clientId: study.clientId,
      name: `${study.name} (Copia v${nextVersion})`,
      description: study.description,
      baseImageS3Key: study.baseImageS3Key,
      mapboxCenterLat: study.mapboxCenterLat,
      mapboxCenterLng: study.mapboxCenterLng,
      mapboxZoom: study.mapboxZoom,
      mapboxBboxMinLat: study.mapboxBboxMinLat,
      mapboxBboxMinLng: study.mapboxBboxMinLng,
      mapboxBboxMaxLat: study.mapboxBboxMaxLat,
      mapboxBboxMaxLng: study.mapboxBboxMaxLng,
      canvasState: study.canvasState as any,
      files: study.files as any,
      status: 'CURRENT',
      version: nextVersion,
    });

    const baseImageUrl = duplicated.baseImageS3Key
      ? await this.s3Service.getPresignedUrl(duplicated.baseImageS3Key)
      : null;

    return {
      ...duplicated,
      baseImageUrl,
    };
  }

  /**
   * Approves the perimeter from the study and synchronizes it to the Client as SSOT geofence.
   */
  async approvePerimeter(id: string, dto: ApprovePerimeterDto) {
    const tenantId = this.contextService.tenantId;
    const study = await this.repository.findStudyBasic(id);

    if (!study) {
      throw new NotFoundException(
        `Estudio de seguridad con ID ${id} no encontrado.`,
      );
    }

    // Determine perimeter GeoJSON
    let perimeterGeoJson = dto.perimeterGeoJson;
    if (!perimeterGeoJson) {
      // Extract from canvasState if available
      const canvas = study.canvasState as any;
      if (canvas?.geofencePolygon) {
        perimeterGeoJson = canvas.geofencePolygon;
      } else if (
        canvas?.layers?.geofence &&
        Array.isArray(canvas.layers.geofence)
      ) {
        // Build GeoJSON from points
        const points = canvas.layers.geofence;
        if (points.length >= 3) {
          const coords = points.map((p: any) => [p.lng, p.lat]);
          // Close loop if not closed
          if (
            coords[0][0] !== coords[coords.length - 1][0] ||
            coords[0][1] !== coords[coords.length - 1][1]
          ) {
            coords.push([coords[0][0], coords[0][1]]);
          }
          perimeterGeoJson = {
            type: 'Polygon',
            coordinates: [coords],
          };
        }
      }
    }

    if (!perimeterGeoJson || !perimeterGeoJson.coordinates) {
      throw new BadRequestException(
        'No se encontró un polígono perimetral válido para aprobar. Dibuje el perímetro en el canva primero.',
      );
    }

    // Update Client SSOT geofence via Repository
    await this.repository.updateClientGeofence(
      study.clientId,
      perimeterGeoJson,
      tenantId,
    );

    return {
      message:
        'Perímetro perimetral aprobado y geofencing sincronizado exitosamente.',
      clientId: study.clientId,
      geofence: perimeterGeoJson,
    };
  }

  /**
   * Uploads attached documents/photos to an active (CURRENT) security study.
   */
  async uploadAttachment(
    id: string,
    file: Express.Multer.File,
    fileType: 'document' | 'image' = 'document',
  ) {
    const tenantId = this.contextService.tenantId;
    const study = await this.repository.findStudyBasic(id);

    if (!study) {
      throw new NotFoundException(
        `Estudio de seguridad con ID ${id} no encontrado.`,
      );
    }

    if (study.status === 'DISCONTINUED') {
      throw new BadRequestException(
        'No se pueden adjuntar archivos a un estudio de seguridad descontinuado.',
      );
    }

    const uniqueSuffix = `${Date.now()}_${file.originalname}`;
    const s3Key = this.s3Service.generateS3Key({
      tenantId: tenantId!,
      entityType: MediaTypeCategory.SECURITY_STUDY,
      entityId: study.id,
      clientId: study.clientId,
      fileName: uniqueSuffix,
    });

    const uploadRes = await this.s3Service.uploadFile(file, s3Key);

    const currentFiles = Array.isArray(study.files)
      ? (study.files as any[])
      : [];
    const newFileEntry = {
      id: crypto.randomUUID(),
      name: file.originalname,
      s3Key: uploadRes.s3Key,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      fileType,
      uploadedAt: new Date().toISOString(),
    };

    const updated = await this.repository.updateStudyFiles(id, [
      ...currentFiles,
      newFileEntry,
    ]);

    const presignedUrl = await this.s3Service.getPresignedUrl(uploadRes.s3Key);

    return {
      file: {
        ...newFileEntry,
        url: presignedUrl,
      },
      study: updated,
    };
  }

  /**
   * Returns a fresh presigned URL for the base image.
   */
  async getImageUrl(id: string) {
    const study = await this.repository.getStudyStreamKey(id);

    if (!study) {
      throw new NotFoundException(
        `Estudio de seguridad con ID ${id} no encontrado.`,
      );
    }

    const key = study.baseImageS3Key || study.client?.mapboxBaseImageS3Key;
    if (!key) {
      throw new NotFoundException('No base image associated with this study.');
    }

    const presignedUrl = await this.s3Service.getPresignedUrl(key);

    return {
      id: study.id,
      baseImageS3Key: key,
      url: presignedUrl,
    };
  }

  /**
   * Deletes an attached document/photo from a security study.
   */
  async deleteAttachment(id: string, fileId: string) {
    const study = await this.repository.findStudyBasic(id);

    if (!study) {
      throw new NotFoundException(
        `Estudio de seguridad con ID ${id} no encontrado.`,
      );
    }

    if (study.status === 'DISCONTINUED') {
      throw new BadRequestException(
        'No se pueden eliminar archivos de un estudio de seguridad descontinuado.',
      );
    }

    const currentFiles = Array.isArray(study.files)
      ? (study.files as any[])
      : [];
    const targetFile = currentFiles.find((f) => f.id === fileId);

    if (targetFile?.s3Key) {
      try {
        await this.s3Service.deleteFile(targetFile.s3Key);
      } catch (err) {
        this.logger.warn(
          `Could not delete S3 object [${targetFile.s3Key}]: ${err}`,
        );
      }
    }

    const updatedFiles = currentFiles.filter((f) => f.id !== fileId);

    const updated = await this.repository.updateStudyFiles(id, updatedFiles);

    return {
      message: 'Archivo eliminado con éxito',
      study: {
        ...updated,
        files: await this.enrichFiles(updated.files),
      },
    };
  }

  /**
   * Updates the Konva canvas vector state for a specific attached image file.
   */
  async updateFileCanvas(id: string, fileId: string, dto: UpdateFileCanvasDto) {
    const study = await this.repository.findStudyBasic(id);

    if (!study) {
      throw new NotFoundException(
        `Estudio de seguridad con ID ${id} no encontrado.`,
      );
    }

    if (study.status === 'DISCONTINUED') {
      throw new BadRequestException(
        'No se pueden realizar modificaciones en un estudio de seguridad descontinuado.',
      );
    }

    const currentFiles = Array.isArray(study.files)
      ? (study.files as any[])
      : [];
    const targetFileIndex = currentFiles.findIndex((f) => f.id === fileId);

    if (targetFileIndex === -1) {
      throw new NotFoundException(
        `Archivo adjunto con ID ${fileId} no encontrado en el estudio.`,
      );
    }

    const updatedFiles = [...currentFiles];
    updatedFiles[targetFileIndex] = {
      ...updatedFiles[targetFileIndex],
      canvasState: dto.canvasState,
      canvasUpdatedAt: new Date().toISOString(),
    };

    const updated = await this.repository.updateStudyFiles(id, updatedFiles);

    const enrichedFiles = await this.enrichFiles(updated.files);
    const updatedTargetFile = enrichedFiles.find((f: any) => f.id === fileId);

    return {
      message: 'Estado de anotaciones guardado con éxito',
      file: updatedTargetFile,
    };
  }

  /**
   * Retrieves the SSOT geofence and map data directly from the Client entity.
   */
  async getClientGeofence(clientId: string) {
    const client = await this.repository.getClientGeofence(clientId);

    if (!client) {
      throw new NotFoundException(`Cliente con ID ${clientId} no encontrado.`);
    }

    let baseImageUrl: string | null = null;
    if (client.mapboxBaseImageS3Key) {
      try {
        baseImageUrl = await this.s3Service.getPresignedUrl(
          client.mapboxBaseImageS3Key,
        );
      } catch (e) {
        this.logger.warn(`Could not sign URL for client base image: ${e}`);
      }
    }

    return {
      clientId: client.id,
      name: client.name,
      hasGeofence: Boolean(client.geofence),
      hasBaseImage: Boolean(client.mapboxBaseImageS3Key),
      baseImageS3Key: client.mapboxBaseImageS3Key,
      baseImageUrl,
      center:
        client.mapboxCenterLat != null && client.mapboxCenterLng != null
          ? { lat: client.mapboxCenterLat, lng: client.mapboxCenterLng }
          : null,
      zoom: client.mapboxZoom,
      bbox:
        client.mapboxBboxMinLat != null
          ? {
              minLat: client.mapboxBboxMinLat,
              minLng: client.mapboxBboxMinLng,
              maxLat: client.mapboxBboxMaxLat,
              maxLng: client.mapboxBboxMaxLng,
            }
          : null,
      geofence: client.geofence,
    };
  }

  /**
   * Saves or updates the SSOT Geofence polygon directly on the Client entity.
   */
  async saveClientGeofence(clientId: string, geofencePolygon: any) {
    const client = await this.repository.findClientById(clientId);
    if (!client) {
      throw new NotFoundException(`Cliente con ID ${clientId} no encontrado.`);
    }

    if (!geofencePolygon) {
      throw new BadRequestException('El polígono de geocerca es requerido.');
    }

    // Format to standard GeoJSON Polygon if points array is sent
    let polygon = geofencePolygon;
    if (polygon.points && Array.isArray(polygon.points)) {
      const coords = polygon.points.map((p: any) => [p.lng, p.lat]);
      if (coords.length >= 3) {
        if (
          coords[0][0] !== coords[coords.length - 1][0] ||
          coords[0][1] !== coords[coords.length - 1][1]
        ) {
          coords.push([coords[0][0], coords[0][1]]);
        }
        polygon = {
          type: 'Polygon',
          coordinates: [coords],
        };
      }
    }

    const updated = await this.repository.updateClientGeofence(
      clientId,
      polygon,
    );

    return updated;
  }

  /**
   * Retrieves client's base image stream directly from S3 for CORS-safe canvas rendering.
   */
  async getClientImageStream(clientId: string) {
    const client = await this.repository.getClientBaseImageKey(clientId);

    if (!client) {
      throw new NotFoundException(`Cliente con ID ${clientId} no encontrado.`);
    }

    if (!client.mapboxBaseImageS3Key) {
      throw new NotFoundException(
        'El cliente no tiene una imagen base configurada.',
      );
    }

    return this.s3Service.getObjectStream(client.mapboxBaseImageS3Key);
  }
}
