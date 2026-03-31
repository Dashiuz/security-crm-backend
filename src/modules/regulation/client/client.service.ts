import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ClientRepositoryService } from '../../../common/repository/client/client.repository.service';
import {
  CreateClientDto,
  UpdateClientDto,
  ClientResponseDto,
} from './dtos/client.dto';
import { UserContext } from '../../../common/interfaces/user-context.interface';
import { toDateOnlyIso } from '../../../common/utils/convertDate';

@Injectable()
export class ClientService {
  constructor(private readonly clientRepository: ClientRepositoryService) {}

  private mapClientToResponse(row: any): ClientResponseDto {
    return {
      ...row,
      contractDate: toDateOnlyIso(row.contractDate),
      lastContractDate: toDateOnlyIso(row.lastContractDate),
    };
  }

  async create(
    dto: CreateClientDto,
    user: UserContext,
  ): Promise<ClientResponseDto> {
    const data = {
      ...dto,
      tenant: { connect: { id: user.tenantId } },
    } as any;

    if (dto.coordinatorInChargeId) {
      data.coordinatorInCharge = { connect: { id: dto.coordinatorInChargeId } };
      delete data.coordinatorInChargeId;
    }

    if (dto.commercialContactId) {
      data.commercialContact = { connect: { id: dto.commercialContactId } };
      delete data.commercialContactId;
    }

    // Date parsing
    const contractDate = new Date(dto.contractDate);
    const lastContractDate = new Date(dto.lastContractDate);

    if (
      Number.isNaN(contractDate.getTime()) ||
      Number.isNaN(lastContractDate.getTime())
    ) {
      throw new BadRequestException(
        'Invalid contractDate or lastContractDate.',
      );
    }

    data.contractDate = contractDate;
    data.lastContractDate = lastContractDate;

    const res = await this.clientRepository.create(data);
    return this.mapClientToResponse(res);
  }

  async findAll(user: UserContext): Promise<ClientResponseDto[]> {
    return this.clientRepository
      .findMany({
        where: { tenantId: user.tenantId },
        include: {
          coordinatorInCharge: true,
          commercialContact: true,
        },
      })
      .then((rows) => rows.map((r) => this.mapClientToResponse(r))) as any;
  }

  async findOne(id: string, user: UserContext): Promise<ClientResponseDto> {
    const client = await this.clientRepository.findOne(id, {
      coordinatorInCharge: true,
      commercialContact: true,
    });
    if (!client || client.tenantId !== user.tenantId) {
      throw new NotFoundException('Client not found');
    }
    return this.mapClientToResponse(client);
  }

  async update(
    id: string,
    dto: UpdateClientDto,
    user: UserContext,
  ): Promise<ClientResponseDto> {
    await this.findOne(id, user);

    const data = { ...dto } as any;

    if (dto.coordinatorInChargeId) {
      data.coordinatorInCharge = { connect: { id: dto.coordinatorInChargeId } };
      delete data.coordinatorInChargeId;
    } else if (dto.coordinatorInChargeId === null) {
      data.coordinatorInCharge = { disconnect: true };
      delete data.coordinatorInChargeId;
    }

    if (dto.commercialContactId) {
      data.commercialContact = { connect: { id: dto.commercialContactId } };
      delete data.commercialContactId;
    } else if (dto.commercialContactId === null) {
      data.commercialContact = { disconnect: true };
      delete data.commercialContactId;
    }

    // Date parsing for updates
    if (dto.contractDate) {
      const d = new Date(dto.contractDate);
      if (Number.isNaN(d.getTime()))
        throw new BadRequestException('Invalid contractDate.');
      data.contractDate = d;
    }

    if (dto.lastContractDate) {
      const d = new Date(dto.lastContractDate);
      if (Number.isNaN(d.getTime()))
        throw new BadRequestException('Invalid lastContractDate.');
      data.lastContractDate = d;
    }

    const res = await this.clientRepository.update(id, data);
    return this.mapClientToResponse(res);
  }

  async remove(id: string, user: UserContext): Promise<ClientResponseDto> {
    await this.findOne(id, user);
    const res = await this.clientRepository.remove(id);
    return this.mapClientToResponse(res);
  }
}
