import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class CommercialLegalRepository {
  private readonly logger = new Logger(CommercialLegalRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // Pólizas de Seguro
  // ==========================================

  async createPolicy(data: Prisma.ClientInsurancePolicyCreateInput) {
    try {
      return await this.prisma.clientInsurancePolicy.create({
        data,
        include: { mediaAttachment: true },
      });
    } catch (error: any) {
      this.logger.error(
        `Error al crear póliza de seguro: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findPoliciesByClient(tenantId: string, clientId: string) {
    try {
      return await this.prisma.clientInsurancePolicy.findMany({
        where: { tenantId, clientId },
        orderBy: { effectiveEndDate: 'asc' },
        include: { mediaAttachment: true },
      });
    } catch (error: any) {
      this.logger.error(
        `Error al listar pólizas del cliente [${clientId}]: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findPolicyById(tenantId: string, id: string) {
    try {
      return await this.prisma.clientInsurancePolicy.findFirst({
        where: { id, tenantId },
        include: { mediaAttachment: true, client: true },
      });
    } catch (error: any) {
      this.logger.error(
        `Error al buscar póliza [${id}]: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async updatePolicy(id: string, data: Prisma.ClientInsurancePolicyUpdateInput) {
    try {
      return await this.prisma.clientInsurancePolicy.update({
        where: { id },
        data,
      });
    } catch (error: any) {
      this.logger.error(
        `Error al actualizar póliza [${id}]: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async deletePolicy(tenantId: string, id: string) {
    try {
      return await this.prisma.clientInsurancePolicy.delete({
        where: { id },
      });
    } catch (error: any) {
      this.logger.error(
        `Error al eliminar póliza [${id}]: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findExpiringPolicies(tenantId: string, targetDate: Date) {
    try {
      return await this.prisma.clientInsurancePolicy.findMany({
        where: {
          tenantId,
          effectiveEndDate: { lte: targetDate },
          status: 'ACTIVE',
        },
        include: { client: true },
      });
    } catch (error: any) {
      this.logger.error(
        `Error al consultar pólizas próximas a vencer: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // ==========================================
  // Otrosíes y Adiciones Contractuales (OSI)
  // ==========================================

  async createAddendum(data: Prisma.ContractAddendumCreateInput) {
    try {
      return await this.prisma.contractAddendum.create({
        data,
        include: { mediaAttachment: true },
      });
    } catch (error: any) {
      this.logger.error(
        `Error al registrar otrosí contractual: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findAddendumsByClient(tenantId: string, clientId: string) {
    try {
      return await this.prisma.contractAddendum.findMany({
        where: { tenantId, clientId },
        orderBy: { effectiveStartDate: 'desc' },
        include: { mediaAttachment: true },
      });
    } catch (error: any) {
      this.logger.error(
        `Error al listar otrosíes del cliente [${clientId}]: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findAddendumById(tenantId: string, id: string) {
    try {
      return await this.prisma.contractAddendum.findFirst({
        where: { id, tenantId },
        include: { mediaAttachment: true, client: true },
      });
    } catch (error: any) {
      this.logger.error(
        `Error al buscar otrosí [${id}]: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async updateAddendum(id: string, data: Prisma.ContractAddendumUpdateInput) {
    try {
      return await this.prisma.contractAddendum.update({
        where: { id },
        data,
      });
    } catch (error: any) {
      this.logger.error(
        `Error al actualizar otrosí [${id}]: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async deleteAddendum(tenantId: string, id: string) {
    try {
      return await this.prisma.contractAddendum.delete({
        where: { id },
      });
    } catch (error: any) {
      this.logger.error(
        `Error al eliminar otrosí [${id}]: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // ==========================================
  // Compromisos de Niveles de Servicio (ANS)
  // ==========================================

  async createAnsCommitment(data: Prisma.ClientAnsCommitmentCreateInput) {
    try {
      return await this.prisma.clientAnsCommitment.create({
        data,
      });
    } catch (error: any) {
      this.logger.error(
        `Error al crear compromiso ANS: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findAnsByClient(tenantId: string, clientId: string) {
    try {
      return await this.prisma.clientAnsCommitment.findMany({
        where: { tenantId, clientId },
        orderBy: { dueDate: 'asc' },
      });
    } catch (error: any) {
      this.logger.error(
        `Error al listar compromisos ANS del cliente [${clientId}]: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findAnsById(tenantId: string, id: string) {
    try {
      return await this.prisma.clientAnsCommitment.findFirst({
        where: { id, tenantId },
      });
    } catch (error: any) {
      this.logger.error(
        `Error al buscar compromiso ANS [${id}]: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async updateAnsCommitment(id: string, data: Prisma.ClientAnsCommitmentUpdateInput) {
    try {
      return await this.prisma.clientAnsCommitment.update({
        where: { id },
        data,
      });
    } catch (error: any) {
      this.logger.error(
        `Error al actualizar compromiso ANS [${id}]: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async deleteAnsCommitment(tenantId: string, id: string) {
    try {
      return await this.prisma.clientAnsCommitment.delete({
        where: { id },
      });
    } catch (error: any) {
      this.logger.error(
        `Error al eliminar compromiso ANS [${id}]: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
