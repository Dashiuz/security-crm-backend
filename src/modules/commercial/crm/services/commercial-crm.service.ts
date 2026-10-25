import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  FollowUpMilestoneStatus,
  Prisma,
} from '@prisma/client';
import { CommercialCrmRepository } from '../../repositories/commercial-crm.repository';
import { CreateFollowUpDto, UpdateFollowUpDto, FollowUpFilterDto } from '../dtos/follow-up.dto';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class CommercialCrmService {
  private readonly logger = new Logger(CommercialCrmService.name);

  constructor(
    private readonly repository: CommercialCrmRepository,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Registra una interacción en la bitácora comercial
   */
  async createFollowUp(
    tenantId: string,
    commercialUserId: string,
    dto: CreateFollowUpDto,
  ) {
    try {
      const client = await this.prisma.client.findFirst({
        where: { id: dto.clientId, tenantId },
      });
      if (!client) {
        throw new NotFoundException(`Cliente [${dto.clientId}] no encontrado`);
      }

      // Si la oportunidad se marcó como perdida (LOST)
      if (dto.statusAfterFollowUp === FollowUpMilestoneStatus.LOST) {
        if (!dto.lossReasonCategory) {
          throw new BadRequestException(
            'Para marcar una oportunidad como PERDIDA (LOST), es obligatorio indicar la categoría del motivo de pérdida.',
          );
        }

        // Programar Alerta de Recaptación a los 11 meses (335 días)
        const interactionDate = dto.interactionDate
          ? new Date(dto.interactionDate)
          : new Date();
        const recaptationDate = new Date(interactionDate);
        recaptationDate.setDate(recaptationDate.getDate() + 335);

        await this.prisma.client.update({
          where: { id: dto.clientId },
          data: {
            recaptationTargetDate: recaptationDate,
            recaptationAlertSent: false,
          },
        });
      }

      const createData: Prisma.CommercialFollowUpCreateInput = {
        tenant: { connect: { id: tenantId } },
        client: { connect: { id: dto.clientId } },
        interactionDate: dto.interactionDate
          ? new Date(dto.interactionDate)
          : new Date(),
        contactChannel: dto.contactChannel,
        contactPersonName: dto.contactPersonName,
        contactPersonRole: dto.contactPersonRole,
        managementSummary: dto.managementSummary,
        nextContactDate: dto.nextContactDate
          ? new Date(dto.nextContactDate)
          : undefined,
        statusAfterFollowUp: dto.statusAfterFollowUp || FollowUpMilestoneStatus.PENDING,
        lossReasonCategory: dto.lossReasonCategory,
        lossReasonDescription: dto.lossReasonDescription,
        winningCompetitorName: dto.winningCompetitorName,
        competitorPriceQuoted: dto.competitorPriceQuoted,
        competitorGuardsSalary: dto.competitorGuardsSalary,
        assignedCommercial: { connect: { id: commercialUserId } },
      };

      const created = await this.repository.create(createData);
      this.logger.log(
        `Seguimiento CRM registrado para cliente [${client.name}] por comercial [${commercialUserId}]`,
      );
      return created;
    } catch (error: any) {
      this.logger.error(
        `Error al crear seguimiento CRM: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getFollowUpsByClient(tenantId: string, clientId: string) {
    try {
      return await this.repository.findByClientId(tenantId, clientId);
    } catch (error: any) {
      this.logger.error(
        `Error al consultar bitácora CRM del cliente [${clientId}]: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getFollowUpsPaginated(tenantId: string, filter: FollowUpFilterDto) {
    try {
      return await this.repository.findPaginated(tenantId, filter);
    } catch (error: any) {
      this.logger.error(
        `Error al consultar seguimientos CRM paginados: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getFollowUpById(tenantId: string, id: string) {
    try {
      const followUp = await this.repository.findById(tenantId, id);
      if (!followUp) {
        throw new NotFoundException(`Seguimiento [${id}] no encontrado`);
      }
      return followUp;
    } catch (error: any) {
      this.logger.error(
        `Error al consultar seguimiento CRM [${id}]: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async updateFollowUp(
    tenantId: string,
    id: string,
    dto: UpdateFollowUpDto,
  ) {
    try {
      const existing = await this.repository.findById(tenantId, id);
      if (!existing) {
        throw new NotFoundException(`Seguimiento [${id}] no encontrado`);
      }

      const updateData: Prisma.CommercialFollowUpUpdateInput = {
        contactChannel: dto.contactChannel,
        contactPersonName: dto.contactPersonName,
        contactPersonRole: dto.contactPersonRole,
        managementSummary: dto.managementSummary,
        nextContactDate: dto.nextContactDate
          ? new Date(dto.nextContactDate)
          : undefined,
        statusAfterFollowUp: dto.statusAfterFollowUp,
        lossReasonCategory: dto.lossReasonCategory,
        lossReasonDescription: dto.lossReasonDescription,
        winningCompetitorName: dto.winningCompetitorName,
        competitorPriceQuoted: dto.competitorPriceQuoted,
        competitorGuardsSalary: dto.competitorGuardsSalary,
      };

      return await this.repository.update(id, updateData);
    } catch (error: any) {
      this.logger.error(
        `Error al actualizar seguimiento CRM [${id}]: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async deleteFollowUp(tenantId: string, id: string) {
    try {
      const existing = await this.repository.findById(tenantId, id);
      if (!existing) {
        throw new NotFoundException(`Seguimiento [${id}] no encontrado`);
      }
      return await this.repository.delete(tenantId, id);
    } catch (error: any) {
      this.logger.error(
        `Error al eliminar seguimiento CRM [${id}]: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Consulta las alertas de recaptación pendientes (clientes perdidos hace 11 meses)
   */
  async getRecaptationAlerts(tenantId: string) {
    try {
      const now = new Date();
      return await this.repository.findClientsForRecaptation(tenantId, now);
    } catch (error: any) {
      this.logger.error(
        `Error al obtener alertas de recaptación: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
