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

  async importPositionsFromCsv(
    data: Array<Record<string, string>>,
    fileName: string,
    user: any,
  ) {
    const existingPositions = await this.positionRepository.findMany();
    let successRows = 0;
    let errorRows = 0;
    const errors: Array<{ row: number; reason: string }> = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 1;

      try {
        const rawName = row.Nombre || row.name || '';
        if (!rawName.trim()) {
          throw new Error('El campo "Nombre" es obligatorio.');
        }

        const name = rawName.trim().toUpperCase();

        const exists = existingPositions.find(
          (p: any) => p.name.toUpperCase() === name,
        );
        if (exists) {
          throw new Error(`El cargo "${name}" ya existe.`);
        }

        let level = 1;
        const rawLevel = row.Nivel || row.level;
        if (rawLevel) {
          const parsedLevel = parseInt(rawLevel.toString(), 10);
          if (!isNaN(parsedLevel)) {
            level = parsedLevel;
          }
        }

        const rawStatus = row.EstadoActivo || row.isActive || '';
        const isActive = rawStatus ? rawStatus.toString().trim().toUpperCase() === 'SI' : true;

        const newPos = await this.positionRepository.create({
          name,
          level,
          isActive,
          createdBy: user.sub !== 'system' ? user.sub : null,
        } as any);

        existingPositions.push(newPos);
        successRows++;
      } catch (err: any) {
        errorRows++;
        errors.push({
          row: rowNum,
          reason: err.message || 'Error desconocido al crear cargo.',
        });
      }
    }

    return {
      status: 'completed',
      totalRows: data.length,
      successRows,
      errorRows,
      errors,
    };
  }
}
