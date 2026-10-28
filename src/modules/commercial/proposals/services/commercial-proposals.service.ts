import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ProposalStatus, PnlHealthStatus, Prisma } from '@prisma/client';
import { CommercialProposalsRepository } from '../../repositories/commercial-proposals.repository';
import { PnlCalculatorService } from './pnl-calculator.service';
import { CreateProposalDto } from '../dtos/create-proposal.dto';
import { UpdateProposalDto } from '../dtos/update-proposal.dto';
import { ProposalFilterDto } from '../dtos/proposal-filter.dto';
import { CalculatePnlDto } from '../dtos/pnl-calculation.dto';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class CommercialProposalsService {
  private readonly logger = new Logger(CommercialProposalsService.name);

  constructor(
    private readonly repository: CommercialProposalsRepository,
    private readonly pnlCalculator: PnlCalculatorService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Simula el cálculo de P&L en vivo sin persistir cambios en base de datos
   */
  async calculatePnlLive(dto: CalculatePnlDto, tenantId?: string) {
    try {
      let aiuRate = dto.aiuRate;
      let ivaOnAiuRate = dto.ivaOnAiuRate;

      if (tenantId && (aiuRate === undefined || ivaOnAiuRate === undefined)) {
        const settings = await this.prisma.commercialSettings.findUnique({
          where: { tenantId },
        });
        if (settings) {
          if (aiuRate === undefined) aiuRate = Number(settings.defaultAiuRate);
          if (ivaOnAiuRate === undefined)
            ivaOnAiuRate = Number(settings.defaultIvaOnAiuRate);
        }
      }

      return this.pnlCalculator.computePnl({
        ...dto,
        aiuRate,
        ivaOnAiuRate,
      });
    } catch (error: any) {
      this.logger.error(
        `Error en simulación en vivo de P&L: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Crea una nueva propuesta comercial con sus puestos cotizados y valores agregados
   */
  async createProposal(
    tenantId: string,
    userId: string,
    dto: CreateProposalDto,
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

      // 2. Validar vigencia tarifaria
      const tariffPeriod = await this.prisma.tariffPeriodConfig.findFirst({
        where: { id: dto.tariffPeriodId, tenantId },
      });
      if (!tariffPeriod) {
        throw new NotFoundException(
          `Vigencia tarifaria [${dto.tariffPeriodId}] no encontrada`,
        );
      }

      // 3. Consultar configuración tributaria del tenant desde la base de datos
      const settings = await this.prisma.commercialSettings.findUnique({
        where: { tenantId },
      });
      const aiuRate = settings ? Number(settings.defaultAiuRate) : 0.1;
      const ivaOnAiuRate = settings
        ? Number(settings.defaultIvaOnAiuRate)
        : 0.19;

      // 4. Computar P&L y semáforo financiero
      const pnl = this.pnlCalculator.computePnl({
        contractDurationMonths: dto.contractDurationMonths || 12,
        promptPaymentDiscPercent: dto.promptPaymentDiscPercent || 0,
        items: dto.items,
        valueAddedItems: dto.valueAddedItems || [],
        aiuRate,
        ivaOnAiuRate,
      });

      // 4. Generar folio consecutivo para el año de la vigencia
      const folioCode = await this.repository.getNextFolioCode(
        tenantId,
        tariffPeriod.year,
      );

      // 5. Determinar estado inicial
      let status: ProposalStatus = ProposalStatus.DRAFT;
      if (pnl.pnlStatus === PnlHealthStatus.WARNING_LOW_MARGIN) {
        status = ProposalStatus.UNDER_REVIEW;
      }

      // 6. Construir payload relacional
      const createData: Prisma.CommercialProposalCreateInput = {
        tenant: { connect: { id: tenantId } },
        client: { connect: { id: dto.clientId } },
        tariffPeriod: { connect: { id: dto.tariffPeriodId } },
        proposalFolioCode: folioCode,
        versionNumber: 1,
        status,
        contractType: dto.contractType || 'NEW_CONTRACT',
        contractDurationMonths: dto.contractDurationMonths || 12,
        includePresentation: dto.includePresentation ?? true,
        includeTechSecurityStudy: dto.includeTechSecurityStudy ?? true,
        includeEconomicQuote: dto.includeEconomicQuote ?? true,
        includeValuesAdded: dto.includeValuesAdded ?? true,
        includeHseqAnnexes: dto.includeHseqAnnexes ?? false,

        // Valores Financieros Calculados
        subtotalMonthlyPreDisc: pnl.subtotalMonthlyPreDisc,
        promptPaymentDiscPercent: pnl.promptPaymentDiscPercent,
        promptPaymentDiscAmount: pnl.promptPaymentDiscAmount,
        promptPaymentDays: dto.promptPaymentDays ?? 10,
        subtotalMonthlyAfterDisc: pnl.subtotalMonthlyAfterDisc,
        aiuBaseAmount: pnl.aiuBaseAmount,
        ivaAmount: pnl.ivaAmount,
        totalMonthlyWithTax: pnl.totalMonthlyWithTax,
        totalAnnualContractValue: pnl.totalAnnualContractValue,
        estimatedMonthlyRealCost: pnl.estimatedMonthlyRealCost,
        monthlyVagAmortization: pnl.monthlyVagAmortization,
        totalMonthlyOperatingCost: pnl.totalMonthlyOperatingCost,
        netMonthlyMarginAmount: pnl.netMonthlyMarginAmount,
        netMarginPercentage: pnl.netMarginPercentage,
        pnlStatus: pnl.pnlStatus,

        // Snapshot JSON para modo borrador (Zero-Bloat S3)
        draftSnapshotJson: dto.draftSnapshotJson
          ? (dto.draftSnapshotJson as Prisma.InputJsonValue)
          : Prisma.JsonNull,

        // Auditoría de Creación y Edición
        ...(userId
          ? {
              createdBy: { connect: { id: userId } },
              updatedBy: { connect: { id: userId } },
            }
          : {}),

        // Líneas Hijas de Puestos
        items: {
          create: dto.items.map((item, index) => ({
            tenant: { connect: { id: tenantId } },
            serviceCatalog: item.serviceCatalogId
              ? { connect: { id: item.serviceCatalogId } }
              : undefined,
            positionTitle: item.positionTitle,
            quantity: item.quantity,
            scheduleType: item.scheduleType,
            weaponModality: item.weaponModality,
            tariffCategory: item.tariffCategory,
            unitMonthlyBilledPrice: item.unitMonthlyBilledPrice,
            totalMonthlyBilledPrice:
              item.unitMonthlyBilledPrice * item.quantity,
            unitMonthlyRealCost: item.unitMonthlyRealCost,
            totalMonthlyRealCost: item.unitMonthlyRealCost * item.quantity,
            sortOrder: item.sortOrder ?? index,
          })),
        },

        // Líneas Hijas de Valores Agregados
        valueAddedItems:
          dto.valueAddedItems && dto.valueAddedItems.length > 0
            ? {
                create: dto.valueAddedItems.map((vag) => ({
                  tenant: { connect: { id: tenantId } },
                  valueAddedCatalogItem: vag.valueAddedCatalogItemId
                    ? { connect: { id: vag.valueAddedCatalogItemId } }
                    : undefined,
                  itemName: vag.itemName,
                  quantity: vag.quantity,
                  periodicity: vag.periodicity,
                  itemInternalCost: vag.itemInternalCost,
                  totalInternalCost: vag.itemInternalCost * vag.quantity,
                  notes: vag.notes,
                })),
              }
            : undefined,
      };

      const created = await this.repository.create(createData);
      this.logger.log(
        `Propuesta comercial creada con éxito: ${created.proposalFolioCode} [${created.id}]`,
      );
      return created;
    } catch (error: any) {
      this.logger.error(
        `Error al crear propuesta comercial: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Actualiza una propuesta en borrador o revisión
   */
  async updateProposal(
    tenantId: string,
    userId: string,
    id: string,
    dto: UpdateProposalDto,
  ) {
    try {
      const existing = await this.repository.findById(tenantId, id);
      if (!existing) {
        throw new NotFoundException(
          `Propuesta comercial [${id}] no encontrada`,
        );
      }

      // Proteger inmutabilidad si ya fue emitida o finalizada
      const immutableStatuses: ProposalStatus[] = [
        ProposalStatus.SENT_TO_CLIENT,
        ProposalStatus.WON,
        ProposalStatus.LOST,
        ProposalStatus.VOIDED,
      ];
      if (immutableStatuses.includes(existing.status)) {
        throw new BadRequestException(
          `No se puede modificar una propuesta en estado ${existing.status}. Genere una nueva versión.`,
        );
      }

      // Re-computar P&L si se actualizaron líneas, duración o descuento
      const contractMonths =
        dto.contractDurationMonths ?? existing.contractDurationMonths;
      const discountPercent =
        dto.promptPaymentDiscPercent ??
        Number(existing.promptPaymentDiscPercent);

      const itemsToCompute = dto.items
        ? dto.items
        : existing.items.map((i) => ({
            serviceCatalogId: i.serviceCatalogId || undefined,
            positionTitle: i.positionTitle,
            quantity: i.quantity,
            scheduleType: i.scheduleType,
            weaponModality: i.weaponModality,
            tariffCategory: i.tariffCategory,
            unitMonthlyBilledPrice: Number(i.unitMonthlyBilledPrice),
            unitMonthlyRealCost: Number(i.unitMonthlyRealCost),
            sortOrder: i.sortOrder,
          }));

      const vagToCompute = dto.valueAddedItems
        ? dto.valueAddedItems
        : existing.valueAddedItems.map((v) => ({
            valueAddedCatalogItemId: v.valueAddedCatalogItemId || undefined,
            itemName: v.itemName,
            quantity: v.quantity,
            periodicity: v.periodicity,
            itemInternalCost: Number(v.itemInternalCost),
            notes: v.notes || undefined,
          }));

      const pnl = this.pnlCalculator.computePnl({
        contractDurationMonths: contractMonths,
        promptPaymentDiscPercent: discountPercent,
        items: itemsToCompute,
        valueAddedItems: vagToCompute,
      });

      // Si el P&L cae en alerta ámbar y estaba en DRAFT, pasa a UNDER_REVIEW
      let status = existing.status;
      if (pnl.pnlStatus === PnlHealthStatus.WARNING_LOW_MARGIN) {
        status = ProposalStatus.UNDER_REVIEW;
      } else if (
        status === ProposalStatus.UNDER_REVIEW &&
        pnl.pnlStatus === PnlHealthStatus.PROFITABLE
      ) {
        status = ProposalStatus.DRAFT;
      }

      const updateData: Prisma.CommercialProposalUpdateInput = {
        contractDurationMonths: contractMonths,
        promptPaymentDiscPercent: discountPercent,
        contractType: dto.contractType,
        includePresentation: dto.includePresentation,
        includeTechSecurityStudy: dto.includeTechSecurityStudy,
        includeEconomicQuote: dto.includeEconomicQuote,
        includeValuesAdded: dto.includeValuesAdded,
        includeHseqAnnexes: dto.includeHseqAnnexes,
        status,

        // Actualización de Métricas P&L
        subtotalMonthlyPreDisc: pnl.subtotalMonthlyPreDisc,
        promptPaymentDiscAmount: pnl.promptPaymentDiscAmount,
        subtotalMonthlyAfterDisc: pnl.subtotalMonthlyAfterDisc,
        aiuBaseAmount: pnl.aiuBaseAmount,
        ivaAmount: pnl.ivaAmount,
        totalMonthlyWithTax: pnl.totalMonthlyWithTax,
        totalAnnualContractValue: pnl.totalAnnualContractValue,
        estimatedMonthlyRealCost: pnl.estimatedMonthlyRealCost,
        monthlyVagAmortization: pnl.monthlyVagAmortization,
        totalMonthlyOperatingCost: pnl.totalMonthlyOperatingCost,
        netMonthlyMarginAmount: pnl.netMonthlyMarginAmount,
        netMarginPercentage: pnl.netMarginPercentage,
        pnlStatus: pnl.pnlStatus,

        draftSnapshotJson: dto.draftSnapshotJson
          ? (dto.draftSnapshotJson as Prisma.InputJsonValue)
          : undefined,
        ...(userId ? { updatedBy: { connect: { id: userId } } } : {}),
      };

      // Si se enviaron nuevos items, mapear para reemplazo
      const newItems = dto.items
        ? dto.items.map((item, index) => ({
            tenant: { connect: { id: tenantId } },
            serviceCatalog: item.serviceCatalogId
              ? { connect: { id: item.serviceCatalogId } }
              : undefined,
            positionTitle: item.positionTitle,
            quantity: item.quantity,
            scheduleType: item.scheduleType,
            weaponModality: item.weaponModality,
            tariffCategory: item.tariffCategory,
            unitMonthlyBilledPrice: item.unitMonthlyBilledPrice,
            totalMonthlyBilledPrice:
              item.unitMonthlyBilledPrice * item.quantity,
            unitMonthlyRealCost: item.unitMonthlyRealCost,
            totalMonthlyRealCost: item.unitMonthlyRealCost * item.quantity,
            sortOrder: item.sortOrder ?? index,
          }))
        : undefined;

      const newValueAdded = dto.valueAddedItems
        ? dto.valueAddedItems.map((vag) => ({
            tenant: { connect: { id: tenantId } },
            valueAddedCatalogItem: vag.valueAddedCatalogItemId
              ? { connect: { id: vag.valueAddedCatalogItemId } }
              : undefined,
            itemName: vag.itemName,
            quantity: vag.quantity,
            periodicity: vag.periodicity,
            itemInternalCost: vag.itemInternalCost,
            totalInternalCost: vag.itemInternalCost * vag.quantity,
            notes: vag.notes,
          }))
        : undefined;

      return await this.repository.update(
        id,
        updateData,
        newItems,
        newValueAdded,
      );
    } catch (error: any) {
      this.logger.error(
        `Error al actualizar propuesta comercial [${id}]: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Obtiene el detalle 360° de la propuesta por ID
   */
  async getProposalById(tenantId: string, id: string) {
    try {
      const proposal = await this.repository.findById(tenantId, id);
      if (!proposal) {
        throw new NotFoundException(
          `Propuesta comercial [${id}] no encontrada`,
        );
      }
      return proposal;
    } catch (error: any) {
      this.logger.error(
        `Error al consultar propuesta [${id}]: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Listado paginado con filtros
   */
  async getProposalsPaginated(tenantId: string, filter: ProposalFilterDto) {
    try {
      return await this.repository.findPaginated(tenantId, filter);
    } catch (error: any) {
      this.logger.error(
        `Error al consultar listado de propuestas: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Aprobación interna del P&L cuando está en semáforo ámbar (UNDER_REVIEW)
   */
  async approvePnl(tenantId: string, userId: string, id: string) {
    try {
      const proposal = await this.repository.findById(tenantId, id);
      if (!proposal) {
        throw new NotFoundException(
          `Propuesta comercial [${id}] no encontrada`,
        );
      }

      if (proposal.pnlStatus === PnlHealthStatus.DEFICIT_BLOCKED) {
        throw new BadRequestException(
          'No es posible aprobar una propuesta con margen deficitario (rojo < 8%). Debe renegociar costos o precios.',
        );
      }

      return await this.repository.updateStatus(
        tenantId,
        id,
        ProposalStatus.APPROVED_INTERNAL,
        userId,
      );
    } catch (error: any) {
      this.logger.error(
        `Error al aprobar P&L de la propuesta [${id}]: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Emisión oficial de la propuesta hacia el cliente
   */
  async issueProposal(tenantId: string, userId: string, id: string) {
    try {
      const proposal = await this.repository.findById(tenantId, id);
      if (!proposal) {
        throw new NotFoundException(
          `Propuesta comercial [${id}] no encontrada`,
        );
      }

      if (proposal.pnlStatus === PnlHealthStatus.DEFICIT_BLOCKED) {
        throw new BadRequestException(
          'Bloqueo Institucional: No se puede emitir una oferta económica con margen deficitario (menor al 8.0%).',
        );
      }

      if (
        proposal.pnlStatus === PnlHealthStatus.WARNING_LOW_MARGIN &&
        proposal.status !== ProposalStatus.APPROVED_INTERNAL
      ) {
        throw new BadRequestException(
          'La propuesta tiene margen en semáforo ámbar (8% - 14.99%) y requiere aprobación formal previa de Dirección Comercial.',
        );
      }

      return await this.repository.updateStatus(
        tenantId,
        id,
        ProposalStatus.SENT_TO_CLIENT,
        userId,
      );
    } catch (error: any) {
      this.logger.error(
        `Error al emitir formalmente propuesta [${id}]: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Transición de estado manual (ej: WON, LOST, VOIDED)
   */
  async updateStatus(
    tenantId: string,
    userId: string,
    id: string,
    newStatus: ProposalStatus,
  ) {
    try {
      const proposal = await this.repository.findById(tenantId, id);
      if (!proposal) {
        throw new NotFoundException(
          `Propuesta comercial [${id}] no encontrada`,
        );
      }

      return await this.repository.updateStatus(
        tenantId,
        id,
        newStatus,
        userId,
      );
    } catch (error: any) {
      this.logger.error(
        `Error al cambiar estado de propuesta [${id} a ${newStatus}]: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Eliminación de propuesta (solo si está en DRAFT)
   */
  async deleteProposal(tenantId: string, id: string) {
    try {
      const proposal = await this.repository.findById(tenantId, id);
      if (!proposal) {
        throw new NotFoundException(
          `Propuesta comercial [${id}] no encontrada`,
        );
      }

      if (proposal.status !== ProposalStatus.DRAFT) {
        throw new BadRequestException(
          `Solo se pueden eliminar propuestas en estado BORRADOR (DRAFT). Estado actual: ${proposal.status}`,
        );
      }

      return await this.repository.delete(tenantId, id);
    } catch (error: any) {
      this.logger.error(
        `Error al eliminar propuesta [${id}]: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
