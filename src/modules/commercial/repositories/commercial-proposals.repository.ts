import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma, ProposalStatus, PnlHealthStatus } from '@prisma/client';
import { ProposalFilterDto } from '../proposals/dtos/proposal-filter.dto';

@Injectable()
export class CommercialProposalsRepository {
  private readonly logger = new Logger(CommercialProposalsRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Genera el siguiente código de folio determinista para el año en curso (ej: COT-2026-0001)
   */
  async getNextFolioCode(tenantId: string, year: number): Promise<string> {
    try {
      const prefix = `COT-${year}-`;
      const count = await this.prisma.commercialProposal.count({
        where: {
          tenantId,
          proposalFolioCode: { startsWith: prefix },
        },
      });
      const sequenceNumber = (count + 1).toString().padStart(4, '0');
      return `${prefix}${sequenceNumber}`;
    } catch (error: any) {
      this.logger.error(
        `Error al generar secuencia de folio comercial: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Busca propuesta por ID con todas sus relaciones operativas
   */
  async findById(tenantId: string, id: string) {
    try {
      return await this.prisma.commercialProposal.findFirst({
        where: { id, tenantId },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              nit: true,
              address: true,
              city: true,
              stratum: true,
              sector: true,
              email: true,
              phone: true,
            },
          },
          tariffPeriod: true,
          items: {
            orderBy: { sortOrder: 'asc' },
            include: { serviceCatalog: true },
          },
          valueAddedItems: {
            include: { valueAddedCatalogItem: true },
          },
          mediaAttachment: true,
          serviceOrder: {
            select: {
              id: true,
              orderFolioCode: true,
              omegaCode: true,
              status: true,
            },
          },
          createdBy: {
            select: { id: true, fullName: true, document: true },
          },
          updatedBy: {
            select: { id: true, fullName: true, document: true },
          },
        },
      });
    } catch (error: any) {
      this.logger.error(
        `Error al buscar propuesta por ID [${id}]: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Busca propuesta por código de folio y versión
   */
  async findByFolio(
    tenantId: string,
    proposalFolioCode: string,
    versionNumber: number = 1,
  ) {
    try {
      return await this.prisma.commercialProposal.findFirst({
        where: {
          tenantId,
          proposalFolioCode,
          versionNumber,
        },
        include: {
          items: true,
          valueAddedItems: true,
          client: true,
        },
      });
    } catch (error: any) {
      this.logger.error(
        `Error al buscar propuesta por folio [${proposalFolioCode} v${versionNumber}]: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Listado paginado con filtros por estado, cliente, P&L y búsqueda textual
   */
  async findPaginated(tenantId: string, filter: ProposalFilterDto) {
    try {
      const take = filter.take || 20;
      const where: Prisma.CommercialProposalWhereInput = { tenantId };

      if (filter.clientId) {
        where.clientId = filter.clientId;
      }

      if (filter.status) {
        where.status = filter.status;
      }

      if (filter.pnlStatus) {
        where.pnlStatus = filter.pnlStatus;
      }

      if (filter.search && filter.search.trim()) {
        const query = filter.search.trim();
        where.OR = [
          { proposalFolioCode: { contains: query, mode: 'insensitive' } },
          { client: { name: { contains: query, mode: 'insensitive' } } },
          { client: { nit: { contains: query, mode: 'insensitive' } } },
        ];
      }

      const findManyArgs: Prisma.CommercialProposalFindManyArgs = {
        where,
        take: take + 1, // 1 adicional para detectar si hay siguiente página
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
          items: {
            select: {
              id: true,
              positionTitle: true,
              quantity: true,
              totalMonthlyBilledPrice: true,
            },
          },
          valueAddedItems: {
            select: {
              id: true,
              itemName: true,
              quantity: true,
              totalInternalCost: true,
            },
          },
        },
      };

      if (filter.cursor) {
        findManyArgs.cursor = { id: filter.cursor };
        findManyArgs.skip = 1;
      }

      const rows = await this.prisma.commercialProposal.findMany(findManyArgs);
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
        `Error al consultar propuestas paginadas: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Crea una propuesta completa con sus puestos cotizados y valores agregados en una transacción
   */
  async create(data: Prisma.CommercialProposalCreateInput) {
    try {
      return await this.prisma.commercialProposal.create({
        data,
        include: {
          items: true,
          valueAddedItems: true,
          client: true,
          tariffPeriod: true,
        },
      });
    } catch (error: any) {
      this.logger.error(
        `Error al crear propuesta comercial en base de datos: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Actualiza cabecera, reemplaza líneas de puestos y valores agregados si vienen definidos
   */
  async update(
    id: string,
    data: Prisma.CommercialProposalUpdateInput,
    newItems?: Prisma.ProposalServiceItemCreateWithoutProposalInput[],
    newValueAdded?: Prisma.ProposalValueAddedItemCreateWithoutProposalInput[],
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        if (newItems) {
          await tx.proposalServiceItem.deleteMany({
            where: { proposalId: id },
          });
          data.items = {
            create: newItems,
          };
        }

        if (newValueAdded) {
          await tx.proposalValueAddedItem.deleteMany({
            where: { proposalId: id },
          });
          data.valueAddedItems = {
            create: newValueAdded,
          };
        }

        return await tx.commercialProposal.update({
          where: { id },
          data,
          include: {
            items: true,
            valueAddedItems: true,
            client: true,
            tariffPeriod: true,
          },
        });
      });
    } catch (error: any) {
      this.logger.error(
        `Error al actualizar propuesta comercial [${id}]: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Actualiza el estado del ciclo de vida de la propuesta
   */
  async updateStatus(
    tenantId: string,
    id: string,
    status: ProposalStatus,
    updatedById?: string,
    extraData?: Partial<Prisma.CommercialProposalUpdateInput>,
  ) {
    try {
      return await this.prisma.commercialProposal.update({
        where: { id },
        data: {
          status,
          ...(updatedById
            ? { updatedBy: { connect: { id: updatedById } } }
            : {}),
          ...extraData,
        },
      });
    } catch (error: any) {
      this.logger.error(
        `Error al actualizar estado de la propuesta [${id} a ${status}]: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Elimina propuesta (solo permitido en estado DRAFT)
   */
  async delete(tenantId: string, id: string) {
    try {
      return await this.prisma.commercialProposal.delete({
        where: { id },
      });
    } catch (error: any) {
      this.logger.error(
        `Error al eliminar propuesta [${id}]: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
