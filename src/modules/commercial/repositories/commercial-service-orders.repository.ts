import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma, ServiceOrderStatus } from '@prisma/client';
import { ServiceOrderFilterDto } from '../service-orders/dtos/service-order-filter.dto';

@Injectable()
export class CommercialServiceOrdersRepository {
  private readonly logger = new Logger(CommercialServiceOrdersRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Genera el consecutivo anual para órdenes de servicio (ej: OS-2026-0001)
   */
  async getNextOrderFolioCode(tenantId: string, year: number): Promise<string> {
    try {
      const prefix = `OS-${year}-`;
      const count = await this.prisma.serviceOrder.count({
        where: {
          tenantId,
          orderFolioCode: { startsWith: prefix },
        },
      });
      const sequenceNumber = (count + 1).toString().padStart(4, '0');
      return `${prefix}${sequenceNumber}`;
    } catch (error: any) {
      this.logger.error(
        `Error al generar consecutivo de orden de servicio: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Genera el correlativo único de código OMEGA (ej: OMG-001)
   */
  async getNextOmegaCode(tenantId: string): Promise<string> {
    try {
      const prefix = 'OMG-';
      const count = await this.prisma.serviceOrder.count({
        where: {
          tenantId,
          omegaCode: { startsWith: prefix },
        },
      });
      const sequenceNumber = (count + 1).toString().padStart(3, '0');
      return `${prefix}${sequenceNumber}`;
    } catch (error: any) {
      this.logger.error(
        `Error al generar código OMEGA: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Busca orden de servicio por ID con detalle completo de puestos y dotación
   */
  async findById(tenantId: string, id: string) {
    try {
      return await this.prisma.serviceOrder.findFirst({
        where: { id, tenantId },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              nit: true,
              internalCode: true,
              address: true,
              city: true,
              stratum: true,
              sector: true,
              clientStatus: true,
            },
          },
          proposal: {
            select: {
              id: true,
              proposalFolioCode: true,
              versionNumber: true,
              status: true,
              pnlStatus: true,
            },
          },
          positions: true,
          equipment: true,
          dispatchLogs: {
            orderBy: { dispatchedAt: 'desc' },
          },
          commercialUser: {
            select: {
              id: true,
              fullName: true,
              document: true,
              position: true,
            },
          },
          mediaAttachment: true,
        },
      });
    } catch (error: any) {
      this.logger.error(
        `Error al buscar orden de servicio [${id}]: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Listado paginado con filtros por estado, cliente y búsqueda
   */
  async findPaginated(tenantId: string, filter: ServiceOrderFilterDto) {
    try {
      const take = filter.take || 20;
      const where: Prisma.ServiceOrderWhereInput = { tenantId };

      if (filter.clientId) {
        where.clientId = filter.clientId;
      }

      if (filter.status) {
        where.status = filter.status;
      }

      if (filter.search && filter.search.trim()) {
        const query = filter.search.trim();
        where.OR = [
          { orderFolioCode: { contains: query, mode: 'insensitive' } },
          { omegaCode: { contains: query, mode: 'insensitive' } },
          { client: { name: { contains: query, mode: 'insensitive' } } },
          { client: { nit: { contains: query, mode: 'insensitive' } } },
        ];
      }

      const findManyArgs: Prisma.ServiceOrderFindManyArgs = {
        where,
        take: take + 1,
        orderBy: { createdAt: 'desc' },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              nit: true,
              stratum: true,
              sector: true,
            },
          },
          positions: {
            select: {
              id: true,
              positionTitle: true,
              quantityGuards: true,
              scheduleType: true,
            },
          },
          equipment: {
            select: {
              id: true,
              itemName: true,
              quantity: true,
              deliveryStatus: true,
            },
          },
        },
      };

      if (filter.cursor) {
        findManyArgs.cursor = { id: filter.cursor };
        findManyArgs.skip = 1;
      }

      const rows = await this.prisma.serviceOrder.findMany(findManyArgs);
      let nextCursor: string | null = null;

      if (rows.length > take) {
        const nextItem = rows.pop();
        nextCursor = nextItem ? nextItem.id : null;
      }

      return {
        data: rows,
        meta: {
          nextCursor,
          take,
        },
      };
    } catch (error: any) {
      this.logger.error(
        `Error al listar órdenes de servicio paginadas: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Crea una nueva orden de servicio
   */
  async create(data: Prisma.ServiceOrderCreateInput) {
    try {
      return await this.prisma.serviceOrder.create({
        data,
        include: {
          positions: true,
          equipment: true,
          client: true,
        },
      });
    } catch (error: any) {
      this.logger.error(
        `Error al crear orden de servicio: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Actualiza una orden de servicio reemplazando en transacción sus puestos y dotación si aplican
   */
  async update(
    id: string,
    data: Prisma.ServiceOrderUpdateInput,
    newPositions?: Prisma.ServiceOrderPositionCreateManyServiceOrderInput[],
    newEquipment?: Prisma.ServiceOrderEquipmentItemCreateManyServiceOrderInput[],
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        if (newPositions && newPositions.length > 0) {
          await tx.serviceOrderPosition.deleteMany({
            where: { serviceOrderId: id },
          });
          await tx.serviceOrderPosition.createMany({
            data: newPositions.map((p) => ({ ...p, serviceOrderId: id })),
          });
        }

        if (newEquipment && newEquipment.length > 0) {
          await tx.serviceOrderEquipmentItem.deleteMany({
            where: { serviceOrderId: id },
          });
          await tx.serviceOrderEquipmentItem.createMany({
            data: newEquipment.map((e) => ({ ...e, serviceOrderId: id })),
          });
        }

        return await tx.serviceOrder.update({
          where: { id },
          data,
          include: {
            positions: true,
            equipment: true,
          },
        });
      });
    } catch (error: any) {
      this.logger.error(
        `Error al actualizar orden de servicio [${id}]: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Actualiza el estado de la orden de servicio
   */
  async updateStatus(tenantId: string, id: string, status: ServiceOrderStatus) {
    try {
      return await this.prisma.serviceOrder.update({
        where: { id },
        data: { status },
      });
    } catch (error: any) {
      this.logger.error(
        `Error al actualizar estado de orden [${id} a ${status}]: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Registra los logs de despacho departamentales
   */
  async createDispatchLogs(
    logs: Prisma.ServiceOrderDispatchLogCreateManyInput[],
  ) {
    try {
      return await this.prisma.serviceOrderDispatchLog.createMany({
        data: logs,
      });
    } catch (error: any) {
      this.logger.error(
        `Error al registrar logs de despacho: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Elimina la orden de servicio si está en DRAFT_CONFIGURING
   */
  async delete(tenantId: string, id: string) {
    try {
      return await this.prisma.serviceOrder.delete({
        where: { id },
      });
    } catch (error: any) {
      this.logger.error(
        `Error al eliminar orden de servicio [${id}]: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
