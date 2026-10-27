import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PolicyStatus, Prisma } from '@prisma/client';
import { CommercialLegalRepository } from '../../repositories/commercial-legal.repository';
import {
  CreateInsurancePolicyDto,
  UpdateInsurancePolicyDto,
  CreateContractAddendumDto,
  UpdateContractAddendumDto,
  CreateAnsCommitmentDto,
  UpdateAnsCommitmentDto,
} from '../dtos/legal.dto';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class CommercialLegalService {
  private readonly logger = new Logger(CommercialLegalService.name);

  constructor(
    private readonly repository: CommercialLegalRepository,
    private readonly prisma: PrismaService,
  ) {}

  // ==========================================
  // Pólizas de Seguro
  // ==========================================

  async createPolicy(tenantId: string, dto: CreateInsurancePolicyDto) {
    try {
      const client = await this.prisma.client.findFirst({
        where: { id: dto.clientId, tenantId },
      });
      if (!client) {
        throw new NotFoundException(`Cliente [${dto.clientId}] no encontrado`);
      }

      const createData: Prisma.ClientInsurancePolicyCreateInput = {
        tenant: { connect: { id: tenantId } },
        client: { connect: { id: dto.clientId } },
        policyType: dto.policyType,
        insuranceCompanyName: dto.insuranceCompanyName,
        policyCertificateNumber: dto.policyCertificateNumber,
        insuredAmount: dto.insuredAmount,
        effectiveStartDate: new Date(dto.effectiveStartDate),
        effectiveEndDate: new Date(dto.effectiveEndDate),
        status: dto.status || PolicyStatus.ACTIVE,
        mediaAttachment: dto.mediaAttachmentId
          ? { connect: { id: dto.mediaAttachmentId } }
          : undefined,
      };

      const created = await this.repository.createPolicy(createData);
      this.logger.log(
        `Póliza ${created.policyCertificateNumber} registrada para cliente [${client.name}]`,
      );
      return created;
    } catch (error: any) {
      this.logger.error(
        `Error al crear póliza contractual: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getPoliciesByClient(tenantId: string, clientId: string) {
    try {
      return await this.repository.findPoliciesByClient(tenantId, clientId);
    } catch (error: any) {
      this.logger.error(
        `Error al listar pólizas del cliente [${clientId}]: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getPolicyById(tenantId: string, id: string) {
    try {
      const policy = await this.repository.findPolicyById(tenantId, id);
      if (!policy) {
        throw new NotFoundException(`Póliza [${id}] no encontrada`);
      }
      return policy;
    } catch (error: any) {
      this.logger.error(
        `Error al buscar póliza [${id}]: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async updatePolicy(
    tenantId: string,
    id: string,
    dto: UpdateInsurancePolicyDto,
  ) {
    try {
      const existing = await this.repository.findPolicyById(tenantId, id);
      if (!existing) {
        throw new NotFoundException(`Póliza [${id}] no encontrada`);
      }

      const updateData: Prisma.ClientInsurancePolicyUpdateInput = {
        policyType: dto.policyType,
        insuranceCompanyName: dto.insuranceCompanyName,
        policyCertificateNumber: dto.policyCertificateNumber,
        insuredAmount: dto.insuredAmount,
        effectiveStartDate: dto.effectiveStartDate
          ? new Date(dto.effectiveStartDate)
          : undefined,
        effectiveEndDate: dto.effectiveEndDate
          ? new Date(dto.effectiveEndDate)
          : undefined,
        status: dto.status,
      };

      return await this.repository.updatePolicy(id, updateData);
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
      const existing = await this.repository.findPolicyById(tenantId, id);
      if (!existing) {
        throw new NotFoundException(`Póliza [${id}] no encontrada`);
      }
      return await this.repository.deletePolicy(tenantId, id);
    } catch (error: any) {
      this.logger.error(
        `Error al eliminar póliza [${id}]: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // ==========================================
  // Otrosíes y Adiciones Contractuales (OSI)
  // ==========================================

  async createAddendum(tenantId: string, dto: CreateContractAddendumDto) {
    try {
      const client = await this.prisma.client.findFirst({
        where: { id: dto.clientId, tenantId },
      });
      if (!client) {
        throw new NotFoundException(`Cliente [${dto.clientId}] no encontrado`);
      }

      const createData: Prisma.ContractAddendumCreateInput = {
        tenant: { connect: { id: tenantId } },
        client: { connect: { id: dto.clientId } },
        addendumNumber: dto.addendumNumber,
        title: dto.title,
        effectiveStartDate: new Date(dto.effectiveStartDate),
        effectiveEndDate: new Date(dto.effectiveEndDate),
        durationYears: dto.durationYears ?? 1,
        reinvestmentAmountPact: dto.reinvestmentAmountPact ?? 0,
        disbursedAmount: dto.disbursedAmount ?? 0,
        disbursementDate: dto.disbursementDate
          ? new Date(dto.disbursementDate)
          : undefined,
        description: dto.description,
        mediaAttachment: dto.mediaAttachmentId
          ? { connect: { id: dto.mediaAttachmentId } }
          : undefined,
      };

      const created = await this.repository.createAddendum(createData);
      this.logger.log(
        `Otrosí ${created.addendumNumber} registrado para cliente [${client.name}]`,
      );
      return created;
    } catch (error: any) {
      this.logger.error(
        `Error al crear otrosí contractual: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getAddendumsByClient(tenantId: string, clientId: string) {
    try {
      return await this.repository.findAddendumsByClient(tenantId, clientId);
    } catch (error: any) {
      this.logger.error(
        `Error al listar otrosíes del cliente [${clientId}]: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getAddendumById(tenantId: string, id: string) {
    try {
      const addendum = await this.repository.findAddendumById(tenantId, id);
      if (!addendum) {
        throw new NotFoundException(`Otrosí [${id}] no encontrado`);
      }
      return addendum;
    } catch (error: any) {
      this.logger.error(
        `Error al buscar otrosí [${id}]: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async updateAddendum(
    tenantId: string,
    id: string,
    dto: UpdateContractAddendumDto,
  ) {
    try {
      const existing = await this.repository.findAddendumById(tenantId, id);
      if (!existing) {
        throw new NotFoundException(`Otrosí [${id}] no encontrado`);
      }

      const updateData: Prisma.ContractAddendumUpdateInput = {
        addendumNumber: dto.addendumNumber,
        title: dto.title,
        effectiveStartDate: dto.effectiveStartDate
          ? new Date(dto.effectiveStartDate)
          : undefined,
        effectiveEndDate: dto.effectiveEndDate
          ? new Date(dto.effectiveEndDate)
          : undefined,
        durationYears: dto.durationYears,
        reinvestmentAmountPact: dto.reinvestmentAmountPact,
        disbursedAmount: dto.disbursedAmount,
        disbursementDate: dto.disbursementDate
          ? new Date(dto.disbursementDate)
          : undefined,
        description: dto.description,
      };

      return await this.repository.updateAddendum(id, updateData);
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
      const existing = await this.repository.findAddendumById(tenantId, id);
      if (!existing) {
        throw new NotFoundException(`Otrosí [${id}] no encontrado`);
      }
      return await this.repository.deleteAddendum(tenantId, id);
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

  async createAnsCommitment(tenantId: string, dto: CreateAnsCommitmentDto) {
    try {
      const client = await this.prisma.client.findFirst({
        where: { id: dto.clientId, tenantId },
      });
      if (!client) {
        throw new NotFoundException(`Cliente [${dto.clientId}] no encontrado`);
      }

      const createData: Prisma.ClientAnsCommitmentCreateInput = {
        tenant: { connect: { id: tenantId } },
        client: { connect: { id: dto.clientId } },
        commitmentType: dto.commitmentType,
        title: dto.title,
        dueDate: new Date(dto.dueDate),
        deliveredDate: dto.deliveredDate
          ? new Date(dto.deliveredDate)
          : undefined,
        status: dto.status,
        evidenceNotes: dto.evidenceNotes,
      };

      const created = await this.repository.createAnsCommitment(createData);
      this.logger.log(
        `Compromiso ANS [${created.title}] creado para cliente [${client.name}]`,
      );
      return created;
    } catch (error: any) {
      this.logger.error(
        `Error al registrar compromiso ANS: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getAnsByClient(tenantId: string, clientId: string) {
    try {
      return await this.repository.findAnsByClient(tenantId, clientId);
    } catch (error: any) {
      this.logger.error(
        `Error al listar compromisos ANS del cliente [${clientId}]: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getAnsById(tenantId: string, id: string) {
    try {
      const ans = await this.repository.findAnsById(tenantId, id);
      if (!ans) {
        throw new NotFoundException(`Compromiso ANS [${id}] no encontrado`);
      }
      return ans;
    } catch (error: any) {
      this.logger.error(
        `Error al consultar compromiso ANS [${id}]: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async updateAnsCommitment(
    tenantId: string,
    id: string,
    dto: UpdateAnsCommitmentDto,
  ) {
    try {
      const existing = await this.repository.findAnsById(tenantId, id);
      if (!existing) {
        throw new NotFoundException(`Compromiso ANS [${id}] no encontrado`);
      }

      const updateData: Prisma.ClientAnsCommitmentUpdateInput = {
        commitmentType: dto.commitmentType,
        title: dto.title,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        deliveredDate: dto.deliveredDate
          ? new Date(dto.deliveredDate)
          : undefined,
        status: dto.status,
        evidenceNotes: dto.evidenceNotes,
      };

      return await this.repository.updateAnsCommitment(id, updateData);
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
      const existing = await this.repository.findAnsById(tenantId, id);
      if (!existing) {
        throw new NotFoundException(`Compromiso ANS [${id}] no encontrado`);
      }
      return await this.repository.deleteAnsCommitment(tenantId, id);
    } catch (error: any) {
      this.logger.error(
        `Error al eliminar compromiso ANS [${id}]: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
