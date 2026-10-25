import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { FollowUpFilterDto } from '../crm/dtos/follow-up.dto';

@Injectable()
export class CommercialCrmRepository {
  private readonly logger = new Logger(CommercialCrmRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.CommercialFollowUpCreateInput) {
    try {
      return await this.prisma.commercialFollowUp.create({
        data,
        include: {
          client: {
            select: { id: true, name: true, nit: true, stratum: true },
          },
          assignedCommercial: {
            select: { id: true, fullName: true, document: true },
          },
        },
      });
    } catch (error: any) {
      this.logger.error(
        `Error al crear registro de bitácora comercial: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findById(tenantId: string, id: string) {
    try {
      return await this.prisma.commercialFollowUp.findFirst({
        where: { id, tenantId },
        include: {
          client: true,
          assignedCommercial: {
            select: { id: true, fullName: true, document: true },
          },
        },
      });
    } catch (error: any) {
      this.logger.error(
        `Error al buscar seguimiento [${id}]: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findByClientId(tenantId: string, clientId: string) {
    try {
      return await this.prisma.commercialFollowUp.findMany({
        where: { tenantId, clientId },
        orderBy: { interactionDate: 'desc' },
        include: {
          assignedCommercial: {
            select: { id: true, fullName: true, document: true },
          },
        },
      });
    } catch (error: any) {
      this.logger.error(
        `Error al listar seguimientos del cliente [${clientId}]: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findPaginated(tenantId: string, filter: FollowUpFilterDto) {
    try {
      const take = filter.take || 20;
      const where: Prisma.CommercialFollowUpWhereInput = { tenantId };

      if (filter.clientId) where.clientId = filter.clientId;
      if (filter.status) where.statusAfterFollowUp = filter.status;
      if (filter.commercialId) where.assignedCommercialId = filter.commercialId;

      const findManyArgs: Prisma.CommercialFollowUpFindManyArgs = {
        where,
        take: take + 1,
        orderBy: { interactionDate: 'desc' },
        include: {
          client: {
            select: { id: true, name: true, nit: true, stratum: true },
          },
          assignedCommercial: {
            select: { id: true, fullName: true, document: true },
          },
        },
      };

      if (filter.cursor) {
        findManyArgs.cursor = { id: filter.cursor };
        findManyArgs.skip = 1;
      }

      const rows = await this.prisma.commercialFollowUp.findMany(findManyArgs);
      let nextCursor: string | null = null;

      if (rows.length > take) {
        const nextItem = rows.pop();
        nextCursor = nextItem ? nextItem.id : null;
      }

      return {
        data: rows,
        meta: { nextCursor, take },
      };
    } catch (error: any) {
      this.logger.error(
        `Error al listar bitácora CRM paginada: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async update(id: string, data: Prisma.CommercialFollowUpUpdateInput) {
    try {
      return await this.prisma.commercialFollowUp.update({
        where: { id },
        data,
      });
    } catch (error: any) {
      this.logger.error(
        `Error al actualizar seguimiento [${id}]: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async delete(tenantId: string, id: string) {
    try {
      return await this.prisma.commercialFollowUp.delete({
        where: { id },
      });
    } catch (error: any) {
      this.logger.error(
        `Error al eliminar seguimiento [${id}]: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findClientsForRecaptation(tenantId: string, now: Date) {
    try {
      return await this.prisma.client.findMany({
        where: {
          tenantId,
          recaptationTargetDate: { lte: now },
          recaptationAlertSent: false,
        },
        select: {
          id: true,
          name: true,
          nit: true,
          stratum: true,
          recaptationTargetDate: true,
        },
      });
    } catch (error: any) {
      this.logger.error(
        `Error al consultar clientes para recaptación a 11 meses: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async markRecaptationSent(clientId: string) {
    try {
      return await this.prisma.client.update({
        where: { id: clientId },
        data: { recaptationAlertSent: true },
      });
    } catch (error: any) {
      this.logger.error(
        `Error al marcar alerta de recaptación para cliente [${clientId}]: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
