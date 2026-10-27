import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  ServiceOrderStatus,
  ServiceOrderType,
  InternalDepartment,
  ProposalStatus,
  ClientStatus,
  Prisma,
} from '@prisma/client';
import { CommercialServiceOrdersRepository } from '../../repositories/commercial-service-orders.repository';
import { CreateServiceOrderDto } from '../dtos/create-service-order.dto';
import { UpdateServiceOrderDto } from '../dtos/update-service-order.dto';
import { ServiceOrderFilterDto } from '../dtos/service-order-filter.dto';
import { DispatchServiceOrderDto } from '../dtos/dispatch-service-order.dto';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class CommercialServiceOrdersService {
  private readonly logger = new Logger(CommercialServiceOrdersService.name);

  constructor(
    private readonly repository: CommercialServiceOrdersRepository,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Crea una nueva orden de servicio e instalación operativa
   */
  async createServiceOrder(
    tenantId: string,
    commercialUserId: string,
    dto: CreateServiceOrderDto,
  ) {
    try {
      // 1. Validar existencia del cliente
      const client = await this.prisma.client.findFirst({
        where: { id: dto.clientId, tenantId },
      });
      if (!client) {
        throw new NotFoundException(
          `Cliente con id [${dto.clientId}] no encontrado`,
        );
      }

      // 2. Si viene asociada a una propuesta, validar y transicionar a WON
      if (dto.proposalId) {
        const proposal = await this.prisma.commercialProposal.findFirst({
          where: { id: dto.proposalId, tenantId },
        });
        if (!proposal) {
          throw new NotFoundException(
            `Propuesta comercial [${dto.proposalId}] no encontrada`,
          );
        }

        // Marcar propuesta como WON si aún no lo estaba
        if (proposal.status !== ProposalStatus.WON) {
          await this.prisma.commercialProposal.update({
            where: { id: dto.proposalId },
            data: {
              status: ProposalStatus.WON,
              updatedById: commercialUserId,
            },
          });
        }
      }

      // 3. Generar Consecutivos Automáticos
      const year =
        new Date(dto.installationDate).getFullYear() ||
        new Date().getFullYear();
      const orderFolioCode = await this.repository.getNextOrderFolioCode(
        tenantId,
        year,
      );
      const omegaCode = await this.repository.getNextOmegaCode(tenantId);

      // 4. Preparar payload de creación
      const createData: Prisma.ServiceOrderCreateInput = {
        tenant: { connect: { id: tenantId } },
        client: { connect: { id: dto.clientId } },
        proposal: dto.proposalId
          ? { connect: { id: dto.proposalId } }
          : undefined,
        orderFolioCode,
        omegaCode,
        orderType: dto.orderType || ServiceOrderType.NEW_SITE,
        status: ServiceOrderStatus.DRAFT_CONFIGURING,
        installationDate: new Date(dto.installationDate),
        contractEndDate: new Date(dto.contractEndDate),
        empalmeDaysPrior: dto.empalmeDaysPrior ?? 3,

        siteAddress: dto.siteAddress,
        siteCity: dto.siteCity,
        sitePhone: dto.sitePhone,
        legalRepName: dto.legalRepName,
        legalRepPhone: dto.legalRepPhone,
        administratorName: dto.administratorName,
        administratorPhone: dto.administratorPhone,
        administratorEmail: dto.administratorEmail,

        assignedCoordinatorId: dto.assignedCoordinatorId,
        assignedCoordinatorName: dto.assignedCoordinatorName,
        commercialUser: { connect: { id: commercialUserId } },

        totalMonthlyBeforeTax: dto.totalMonthlyBeforeTax,
        totalMonthlyWithTax: dto.totalMonthlyWithTax,
        operationalNotes: dto.operationalNotes,

        positions: {
          create: dto.positions.map((pos) => ({
            tenant: { connect: { id: tenantId } },
            positionTitle: pos.positionTitle,
            quantityGuards: pos.quantityGuards || 1,
            scheduleType: pos.scheduleType,
            weaponModality: pos.weaponModality,
            netMonthlySalaryToPay: pos.netMonthlySalaryToPay,
            minYearsExperiencePh: pos.minYearsExperiencePh ?? 1,
            preferredGender: pos.preferredGender,
            requiresCurrentCourse: pos.requiresCurrentCourse ?? true,
            requiresGalaUniform: pos.requiresGalaUniform ?? false,
            specificProfileTraits: pos.specificProfileTraits
              ? (pos.specificProfileTraits as Prisma.InputJsonValue)
              : Prisma.JsonNull,
          })),
        },

        equipment:
          dto.equipment && dto.equipment.length > 0
            ? {
                create: dto.equipment.map((eq) => ({
                  tenant: { connect: { id: tenantId } },
                  itemName: eq.itemName,
                  quantity: eq.quantity || 1,
                  isMandatoryOnSite: eq.isMandatoryOnSite ?? true,
                  serialNumbers: eq.serialNumbers,
                  notes: eq.notes,
                })),
              }
            : undefined,
      };

      const created = await this.repository.create(createData);

      // 5. Sincronizar Ficha 360° del Cliente (Activar y registrar código OMEGA)
      const clientUpdate: Prisma.ClientUpdateInput = {
        internalCode: client.internalCode || omegaCode,
        contractDate: new Date(dto.installationDate),
        contractEndDate: new Date(dto.contractEndDate),
      };
      if (client.clientStatus === ClientStatus.PROSPECT) {
        clientUpdate.clientStatus = ClientStatus.ACTIVE;
      }

      await this.prisma.client.update({
        where: { id: dto.clientId },
        data: clientUpdate,
      });

      this.logger.log(
        `Orden de servicio creada con éxito: ${created.orderFolioCode} [OMEGA: ${omegaCode}]`,
      );
      return created;
    } catch (error: any) {
      this.logger.error(
        `Error al crear orden de servicio: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Obtiene el detalle completo de una orden de servicio por ID
   */
  async getServiceOrderById(tenantId: string, id: string) {
    try {
      const order = await this.repository.findById(tenantId, id);
      if (!order) {
        throw new NotFoundException(`Orden de servicio [${id}] no encontrada`);
      }
      return order;
    } catch (error: any) {
      this.logger.error(
        `Error al consultar orden de servicio [${id}]: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Listado paginado con filtros
   */
  async getServiceOrdersPaginated(
    tenantId: string,
    filter: ServiceOrderFilterDto,
  ) {
    try {
      return await this.repository.findPaginated(tenantId, filter);
    } catch (error: any) {
      this.logger.error(
        `Error al listar órdenes de servicio paginadas: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Actualiza los datos de la orden de servicio
   */
  async updateServiceOrder(
    tenantId: string,
    id: string,
    dto: UpdateServiceOrderDto,
  ) {
    try {
      const existing = await this.repository.findById(tenantId, id);
      if (!existing) {
        throw new NotFoundException(`Orden de servicio [${id}] no encontrada`);
      }

      if (
        existing.status === ServiceOrderStatus.IN_OPERATION ||
        existing.status === ServiceOrderStatus.CANCELLED
      ) {
        throw new BadRequestException(
          `No se puede editar una orden en estado ${existing.status}.`,
        );
      }

      const updateData: Prisma.ServiceOrderUpdateInput = {
        orderType: dto.orderType,
        status: dto.status,
        installationDate: dto.installationDate
          ? new Date(dto.installationDate)
          : undefined,
        contractEndDate: dto.contractEndDate
          ? new Date(dto.contractEndDate)
          : undefined,
        empalmeDaysPrior: dto.empalmeDaysPrior,
        siteAddress: dto.siteAddress,
        siteCity: dto.siteCity,
        sitePhone: dto.sitePhone,
        legalRepName: dto.legalRepName,
        legalRepPhone: dto.legalRepPhone,
        administratorName: dto.administratorName,
        administratorPhone: dto.administratorPhone,
        administratorEmail: dto.administratorEmail,
        assignedCoordinatorId: dto.assignedCoordinatorId,
        assignedCoordinatorName: dto.assignedCoordinatorName,
        totalMonthlyBeforeTax: dto.totalMonthlyBeforeTax,
        totalMonthlyWithTax: dto.totalMonthlyWithTax,
        operationalNotes: dto.operationalNotes,
      };

      const newPositions = dto.positions
        ? dto.positions.map((pos) => ({
            tenantId,
            positionTitle: pos.positionTitle,
            quantityGuards: pos.quantityGuards || 1,
            scheduleType: pos.scheduleType,
            weaponModality: pos.weaponModality,
            netMonthlySalaryToPay: pos.netMonthlySalaryToPay,
            minYearsExperiencePh: pos.minYearsExperiencePh ?? 1,
            preferredGender: pos.preferredGender,
            requiresCurrentCourse: pos.requiresCurrentCourse ?? true,
            requiresGalaUniform: pos.requiresGalaUniform ?? false,
            specificProfileTraits: pos.specificProfileTraits
              ? (pos.specificProfileTraits as Prisma.InputJsonValue)
              : Prisma.JsonNull,
          }))
        : undefined;

      const newEquipment = dto.equipment
        ? dto.equipment.map((eq) => ({
            tenantId,
            itemName: eq.itemName,
            quantity: eq.quantity || 1,
            isMandatoryOnSite: eq.isMandatoryOnSite ?? true,
            serialNumbers: eq.serialNumbers,
            notes: eq.notes,
          }))
        : undefined;

      return await this.repository.update(
        id,
        updateData,
        newPositions as any,
        newEquipment as any,
      );
    } catch (error: any) {
      this.logger.error(
        `Error al actualizar orden de servicio [${id}]: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Despacha formalmente la orden a los 9 departamentos internos
   */
  async dispatchOrder(
    tenantId: string,
    id: string,
    dto?: DispatchServiceOrderDto,
  ) {
    try {
      const order = await this.repository.findById(tenantId, id);
      if (!order) {
        throw new NotFoundException(`Orden de servicio [${id}] no encontrada`);
      }

      if (order.status === ServiceOrderStatus.CANCELLED) {
        throw new BadRequestException(
          'No se puede despachar una orden de servicio cancelada.',
        );
      }

      // 1. Obtener los 9 departamentos destinatarios configurados en la matriz
      const recipients =
        await this.prisma.serviceOrderDistributionRecipient.findMany({
          where: { tenantId },
        });

      const allDepartments: InternalDepartment[] = [
        InternalDepartment.CONTRACTS,
        InternalDepartment.OPERATIONS,
        InternalDepartment.WAREHOUSE,
        InternalDepartment.MONITORING_CENTER,
        InternalDepartment.CUSTOMER_SERVICE,
        InternalDepartment.HUMAN_RESOURCES,
        InternalDepartment.QUALITY_ASSURANCE,
        InternalDepartment.ACCOUNTING,
        InternalDepartment.TREASURY,
      ];

      const dispatchLogs: Prisma.ServiceOrderDispatchLogCreateManyInput[] = [];

      for (const dept of allDepartments) {
        // Verificar si hay override en el DTO
        const override = dto?.departmentOverrides?.find(
          (o) => o.department === dept,
        );
        const configured = recipients.find((r) => r.department === dept);

        const email =
          override?.email ||
          configured?.recipientEmail ||
          `${dept.toLowerCase().replace(/_/g, '.')}@noxia-security.com`;

        dispatchLogs.push({
          tenantId,
          serviceOrderId: id,
          department: dept,
          recipientEmail: email,
          wasEmailSuccess: true,
          deliveryNotes:
            dto?.dispatchNotes ||
            'Despacho automatizado multidepartamental de orden de servicio.',
        });
      }

      // 2. Registrar los logs de despacho
      await this.repository.createDispatchLogs(dispatchLogs);

      // 3. Actualizar estado de la orden a ISSUED_DISPATCHED
      const updated = await this.repository.updateStatus(
        tenantId,
        id,
        ServiceOrderStatus.ISSUED_DISPATCHED,
      );

      this.logger.log(
        `Orden de servicio [${order.orderFolioCode}] despachada exitosamente a los 9 departamentos.`,
      );

      return {
        order: updated,
        dispatchedDepartmentsCount: dispatchLogs.length,
        dispatches: dispatchLogs,
      };
    } catch (error: any) {
      this.logger.error(
        `Error al despachar orden de servicio [${id}]: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Cambia el estado de la orden (ej: a IN_OPERATION o CANCELLED)
   */
  async updateStatus(tenantId: string, id: string, status: ServiceOrderStatus) {
    try {
      const order = await this.repository.findById(tenantId, id);
      if (!order) {
        throw new NotFoundException(`Orden de servicio [${id}] no encontrada`);
      }

      return await this.repository.updateStatus(tenantId, id, status);
    } catch (error: any) {
      this.logger.error(
        `Error al cambiar estado de orden [${id} a ${status}]: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Elimina la orden de servicio si está en DRAFT_CONFIGURING
   */
  async deleteServiceOrder(tenantId: string, id: string) {
    try {
      const order = await this.repository.findById(tenantId, id);
      if (!order) {
        throw new NotFoundException(`Orden de servicio [${id}] no encontrada`);
      }

      if (order.status !== ServiceOrderStatus.DRAFT_CONFIGURING) {
        throw new BadRequestException(
          `Solo se pueden eliminar órdenes en estado DRAFT_CONFIGURING. Estado actual: ${order.status}`,
        );
      }

      return await this.repository.delete(tenantId, id);
    } catch (error: any) {
      this.logger.error(
        `Error al eliminar orden de servicio [${id}]: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
