import { Injectable, NotFoundException } from '@nestjs/common';
import { PositionRepositoryService } from '../../../common/repository/position/position.repository.service';
import {
  CreatePositionDto,
  UpdatePositionDto,
  PositionResponseDto,
} from './dtos/position.dto';

@Injectable()
export class PositionService {
  constructor(private readonly positionRepository: PositionRepositoryService) {}

  async create(dto: CreatePositionDto): Promise<PositionResponseDto> {
    return this.positionRepository.create(
      dto as any,
    ) as Promise<PositionResponseDto>;
  }

  async findAll(): Promise<PositionResponseDto[]> {
    return this.positionRepository.findMany() as Promise<PositionResponseDto[]>;
  }

  async findOne(id: string): Promise<PositionResponseDto> {
    const pos = await this.positionRepository.findOne(id);
    if (!pos) throw new NotFoundException('Position not found');
    return pos as PositionResponseDto;
  }

  async update(
    id: string,
    dto: UpdatePositionDto,
  ): Promise<PositionResponseDto> {
    return this.positionRepository.update(
      id,
      dto as any,
    ) as Promise<PositionResponseDto>;
  }

  async remove(id: string): Promise<PositionResponseDto> {
    return this.positionRepository.remove(id) as Promise<PositionResponseDto>;
  }
}
