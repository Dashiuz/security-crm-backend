import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma, ShiftScheduleType, InternalDepartment } from '@prisma/client';

@Injectable()
export class CommercialSettingsRepository {
  private readonly logger = new Logger(CommercialSettingsRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findByTenantId(tenantId: string) {
    return this.prisma.commercialSettings.findFirst({
      where: { tenantId },
      include: {
        tariffPeriods: { orderBy: { startDate: 'desc' } },
        serviceCatalog: { orderBy: { serviceCode: 'asc' } },
        salaryMatrix: { orderBy: { positionTitle: 'asc' } },
        valueAddedCatalog: { orderBy: { name: 'asc' } },
        documentSkin: true,
        distributionRecipients: { orderBy: { department: 'asc' } },
        textSnippets: { orderBy: { key: 'asc' } },
      },
    });
  }

  async createSettings(data: Prisma.CommercialSettingsCreateInput) {
    return this.prisma.commercialSettings.create({
      data,
      include: {
        tariffPeriods: true,
        serviceCatalog: true,
        salaryMatrix: true,
        valueAddedCatalog: true,
        documentSkin: true,
        distributionRecipients: true,
        textSnippets: true,
      },
    });
  }

  async updateSettings(id: string, data: Prisma.CommercialSettingsUpdateInput) {
    return this.prisma.commercialSettings.update({
      where: { id },
      data,
      include: {
        tariffPeriods: { orderBy: { startDate: 'desc' } },
        serviceCatalog: { orderBy: { serviceCode: 'asc' } },
        salaryMatrix: { orderBy: { positionTitle: 'asc' } },
        valueAddedCatalog: { orderBy: { name: 'asc' } },
        documentSkin: true,
        distributionRecipients: { orderBy: { department: 'asc' } },
        textSnippets: { orderBy: { key: 'asc' } },
      },
    });
  }

  // ==========================================
  // Períodos Tarifarios SVSP
  // ==========================================

  async findTariffPeriods(tenantId: string) {
    return this.prisma.tariffPeriodConfig.findMany({
      where: { tenantId },
      orderBy: { startDate: 'desc' },
    });
  }

  async findTariffPeriodById(id: string, tenantId: string) {
    return this.prisma.tariffPeriodConfig.findFirst({
      where: { id, tenantId },
    });
  }

  async createTariffPeriod(data: Prisma.TariffPeriodConfigCreateInput) {
    return this.prisma.tariffPeriodConfig.create({ data });
  }

  async updateTariffPeriod(
    id: string,
    data: Prisma.TariffPeriodConfigUpdateInput,
  ) {
    return this.prisma.tariffPeriodConfig.update({
      where: { id },
      data,
    });
  }

  async deleteTariffPeriod(id: string) {
    return this.prisma.tariffPeriodConfig.delete({
      where: { id },
    });
  }

  // ==========================================
  // Catálogo de Servicios
  // ==========================================

  async findServiceCatalog(tenantId: string) {
    return this.prisma.securityServiceCatalog.findMany({
      where: { tenantId, isActive: true },
      orderBy: { serviceCode: 'asc' },
    });
  }

  async findServiceCatalogItemById(id: string, tenantId: string) {
    return this.prisma.securityServiceCatalog.findFirst({
      where: { id, tenantId },
    });
  }

  async findServiceCatalogItemByCode(serviceCode: number, tenantId: string) {
    return this.prisma.securityServiceCatalog.findFirst({
      where: { serviceCode, tenantId },
    });
  }

  async createServiceCatalogItem(
    data: Prisma.SecurityServiceCatalogCreateInput,
  ) {
    return this.prisma.securityServiceCatalog.create({ data });
  }

  async updateServiceCatalogItem(
    id: string,
    data: Prisma.SecurityServiceCatalogUpdateInput,
  ) {
    return this.prisma.securityServiceCatalog.update({
      where: { id },
      data,
    });
  }

  async deleteServiceCatalogItem(id: string) {
    return this.prisma.securityServiceCatalog.delete({
      where: { id },
    });
  }

  // ==========================================
  // Matriz Salarial de Guardas
  // ==========================================

  async findSalaryMatrix(tenantId: string) {
    return this.prisma.positionSalaryMatrix.findMany({
      where: { tenantId, isActive: true },
      orderBy: { positionTitle: 'asc' },
    });
  }

  async findSalaryMatrixEntry(
    tenantId: string,
    positionTitle: string,
    scheduleType: ShiftScheduleType,
  ) {
    return this.prisma.positionSalaryMatrix.findUnique({
      where: {
        tenantId_positionTitle_scheduleType: {
          tenantId,
          positionTitle,
          scheduleType,
        },
      },
    });
  }

  async upsertSalaryMatrix(
    where: Prisma.PositionSalaryMatrixWhereUniqueInput,
    create: Prisma.PositionSalaryMatrixCreateInput,
    update: Prisma.PositionSalaryMatrixUpdateInput,
  ) {
    return this.prisma.positionSalaryMatrix.upsert({
      where,
      create,
      update,
    });
  }

  async deleteSalaryMatrix(id: string) {
    return this.prisma.positionSalaryMatrix.delete({
      where: { id },
    });
  }

  // ==========================================
  // Valores Agregados
  // ==========================================

  async findValueAddedItems(tenantId: string) {
    return this.prisma.valueAddedCatalogItem.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findValueAddedItemById(id: string, tenantId: string) {
    return this.prisma.valueAddedCatalogItem.findFirst({
      where: { id, tenantId },
    });
  }

  async createValueAddedItem(data: Prisma.ValueAddedCatalogItemCreateInput) {
    return this.prisma.valueAddedCatalogItem.create({ data });
  }

  async updateValueAddedItem(
    id: string,
    data: Prisma.ValueAddedCatalogItemUpdateInput,
  ) {
    return this.prisma.valueAddedCatalogItem.update({
      where: { id },
      data,
    });
  }

  async deleteValueAddedItem(id: string) {
    return this.prisma.valueAddedCatalogItem.delete({
      where: { id },
    });
  }

  // ==========================================
  // Matriz de Distribución de Órdenes de Servicio
  // ==========================================

  async findDistributionRecipients(tenantId: string) {
    return this.prisma.serviceOrderDistributionRecipient.findMany({
      where: { tenantId, isActive: true },
      orderBy: { department: 'asc' },
    });
  }

  async upsertDistributionRecipient(
    tenantId: string,
    commercialSettingsId: string,
    department: InternalDepartment,
    recipientName: string,
    recipientEmail: string,
    userId?: string,
  ) {
    return this.prisma.serviceOrderDistributionRecipient.upsert({
      where: {
        tenantId_department: {
          tenantId,
          department,
        },
      },
      create: {
        tenant: { connect: { id: tenantId } },
        commercialSettings: { connect: { id: commercialSettingsId } },
        department,
        recipientName,
        recipientEmail,
        createdById: userId,
        updatedById: userId,
      },
      update: {
        recipientName,
        recipientEmail,
        isActive: true,
        updatedById: userId,
      },
    });
  }
}
