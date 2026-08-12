import { Injectable, NotFoundException } from '@nestjs/common';
import { PositionRepositoryService } from '../../../common/repository/position/position.repository.service';
import { UserRepositoryService } from '../../../common/repository/user/user.repository.service';
import {
  CreatePositionDto,
  UpdatePositionDto,
  PositionResponseDto,
} from './dtos/position.dto';

@Injectable()
export class PositionService {
  constructor(
    private readonly positionRepository: PositionRepositoryService,
    private readonly userRepository: UserRepositoryService,
  ) {}

  async create(dto: CreatePositionDto): Promise<PositionResponseDto> {
    const name = dto.name?.trim().toUpperCase();
    return this.positionRepository.create(
      { ...dto, name } as any,
    ) as Promise<PositionResponseDto>;
  }

  async findAll(): Promise<any[]> {
    const positions = await this.positionRepository.findMany();
    const createdByIds = positions.map((p: any) => p.createdBy).filter(Boolean);
    const userMap = await this.userRepository.findNamesByIds(createdByIds);

    return positions.map((p: any) => ({
      ...p,
      createdBy: p.createdBy === 'system' ? 'Sistema' : (userMap.get(p.createdBy) || p.createdBy || 'Sistema'),
    }));
  }

  async findOne(id: string): Promise<any> {
    const pos = (await this.positionRepository.findOne(id)) as any;
    if (!pos) throw new NotFoundException('Position not found');
    const userMap = await this.userRepository.findNamesByIds(
      pos.createdBy ? [pos.createdBy] : [],
    );
    return {
      ...pos,
      createdBy: pos.createdBy === 'system' ? 'Sistema' : (userMap.get(pos.createdBy) || pos.createdBy || 'Sistema'),
    };
  }

  async update(
    id: string,
    dto: UpdatePositionDto,
  ): Promise<PositionResponseDto> {
    const payload = { ...dto };
    if (payload.name) {
      payload.name = payload.name.trim().toUpperCase();
    }
    return this.positionRepository.update(
      id,
      payload as any,
    ) as Promise<PositionResponseDto>;
  }

  async remove(id: string): Promise<PositionResponseDto> {
    return this.positionRepository.remove(id) as Promise<PositionResponseDto>;
  }
}
