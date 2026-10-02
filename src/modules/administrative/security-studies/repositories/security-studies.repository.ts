import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class SecurityStudiesRepository {
  private readonly logger = new Logger(SecurityStudiesRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Consulta un cliente por ID si no está eliminado
   */
  async findClientById(clientId: string) {
    return this.prisma.client.findFirst({
      where: { id: clientId, deletedAt: null },
    });
  }

  /**
   * Obtiene la clave de imagen satelital del estudio o de su cliente
   */
  async getStudyStreamKey(id: string) {
    return this.prisma.securityStudy.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        baseImageS3Key: true,
        client: { select: { mapboxBaseImageS3Key: true } },
      },
    });
  }

  /**
   * Obtiene la versión más reciente de un estudio para un cliente
   */
  async findLatestStudyVersion(clientId: string) {
    return this.prisma.securityStudy.findFirst({
      where: { clientId, deletedAt: null },
      orderBy: { version: 'desc' },
    });
  }

  /**
   * Pasa a DISCONTINUED los estudios activos anteriores del cliente
   */
  async discontinueCurrentStudies(clientId: string) {
    return this.prisma.securityStudy.updateMany({
      where: { clientId, status: 'CURRENT' },
      data: { status: 'DISCONTINUED' },
    });
  }

  /**
   * Crea un nuevo registro de Estudio de Seguridad
   */
  async createStudy(data: any) {
    return this.prisma.securityStudy.create({
      data,
      include: {
        createdBy: {
          select: { id: true, fullName: true, document: true },
        },
      },
    });
  }

  /**
   * Obtiene todos los estudios de un cliente junto con la información geográfica del cliente
   */
  async findStudiesByClient(clientId: string) {
    return Promise.all([
      this.prisma.securityStudy.findMany({
        where: { clientId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: {
            select: { id: true, fullName: true, document: true },
          },
        },
      }),
      this.prisma.client.findFirst({
        where: { id: clientId, deletedAt: null },
        select: {
          id: true,
          name: true,
          address: true,
          geofence: true,
          mapboxBaseImageS3Key: true,
          mapboxCenterLat: true,
          mapboxCenterLng: true,
          mapboxZoom: true,
          mapboxBboxMinLat: true,
          mapboxBboxMinLng: true,
          mapboxBboxMaxLat: true,
          mapboxBboxMaxLng: true,
        },
      }),
    ]);
  }

  /**
   * Consulta un estudio por ID con relaciones de auditoría y cliente
   */
  async findStudyById(id: string) {
    return this.prisma.securityStudy.findFirst({
      where: { id, deletedAt: null },
      include: {
        createdBy: {
          select: { id: true, fullName: true, document: true },
        },
        client: {
          select: {
            id: true,
            name: true,
            address: true,
            geofence: true,
            mapboxBaseImageS3Key: true,
            mapboxCenterLat: true,
            mapboxCenterLng: true,
            mapboxZoom: true,
            mapboxBboxMinLat: true,
            mapboxBboxMinLng: true,
            mapboxBboxMaxLat: true,
            mapboxBboxMaxLng: true,
          },
        },
      },
    });
  }

  /**
   * Consulta básica de estudio por ID
   */
  async findStudyBasic(id: string) {
    return this.prisma.securityStudy.findFirst({
      where: { id, deletedAt: null },
    });
  }

  /**
   * Actualiza metadatos de un estudio
   */
  async updateStudy(id: string, data: any) {
    return this.prisma.securityStudy.update({
      where: { id },
      data,
      include: {
        createdBy: {
          select: { id: true, fullName: true, document: true },
        },
      },
    });
  }

  /**
   * Actualiza el estado vectorial del canva
   */
  async updateCanvasState(id: string, canvasState: any) {
    return this.prisma.securityStudy.update({
      where: { id },
      data: { canvasState },
    });
  }

  /**
   * Descontinúa formalmente un estudio de seguridad
   */
  async discontinueStudy(id: string) {
    return this.prisma.securityStudy.update({
      where: { id },
      data: { status: 'DISCONTINUED' },
    });
  }

  /**
   * Verifica si existe un estudio CURRENT activo para un cliente
   */
  async findActiveCurrentStudy(clientId: string) {
    return this.prisma.securityStudy.findFirst({
      where: {
        clientId,
        status: 'CURRENT',
        deletedAt: null,
      },
    });
  }

  /**
   * Actualiza la geocerca SSOT en el cliente y opcionalmente sincroniza PostGIS
   */
  async updateClientGeofence(clientId: string, geofence: any, tenantId?: string) {
    const updated = await this.prisma.client.update({
      where: { id: clientId },
      data: { geofence },
      select: {
        id: true,
        name: true,
        geofence: true,
        mapboxBaseImageS3Key: true,
      },
    });

    if (tenantId) {
      try {
        const geoJsonStr = JSON.stringify(geofence);
        await this.prisma.$executeRawUnsafe(
          `UPDATE client SET boundary = ST_SetSRID(ST_GeomFromGeoJSON($1), 4326) WHERE id = $2 AND "tenantId" = $3`,
          geoJsonStr,
          clientId,
          tenantId,
        );
      } catch (err: any) {
        this.logger.warn(`PostGIS boundary update skipped: ${err.message}`);
      }
    } else {
      try {
        const geoJsonStr = JSON.stringify(geofence);
        await this.prisma.$executeRawUnsafe(
          `UPDATE client SET boundary = ST_SetSRID(ST_GeomFromGeoJSON($1), 4326) WHERE id = $2`,
          geoJsonStr,
          clientId,
        );
      } catch {
        // PostGIS opcional
      }
    }

    return updated;
  }

  /**
   * Actualiza el arreglo de archivos adjuntos del estudio
   */
  async updateStudyFiles(id: string, files: any[]) {
    return this.prisma.securityStudy.update({
      where: { id },
      data: { files },
    });
  }

  /**
   * Consulta información de geocerca del cliente
   */
  async getClientGeofence(clientId: string) {
    return this.prisma.client.findFirst({
      where: { id: clientId, deletedAt: null },
      select: {
        id: true,
        name: true,
        address: true,
        geofence: true,
        mapboxBaseImageS3Key: true,
        mapboxCenterLat: true,
        mapboxCenterLng: true,
        mapboxZoom: true,
        mapboxBboxMinLat: true,
        mapboxBboxMinLng: true,
        mapboxBboxMaxLat: true,
        mapboxBboxMaxLng: true,
      },
    });
  }

  /**
   * Obtiene la clave de imagen satelital del cliente
   */
  async getClientBaseImageKey(clientId: string) {
    return this.prisma.client.findFirst({
      where: { id: clientId, deletedAt: null },
      select: { id: true, mapboxBaseImageS3Key: true },
    });
  }
}
