import { Injectable, NotFoundException } from '@nestjs/common';
import { PositionRepositoryService } from '../../../common/repository/position/position.repository.service';
import { UserRepositoryService } from '../../../common/repository/user/user.repository.service';
import {
  CreatePositionDto,
  UpdatePositionDto,
  PositionResponseDto,
  OperationalCategory,
} from './dtos/position.dto';

@Injectable()
export class PositionService {
  constructor(
    private readonly positionRepository: PositionRepositoryService,
    private readonly userRepository: UserRepositoryService,
  ) {}

  deriveOperationalCategory(name = '', categoryStr = ''): OperationalCategory {
    const rawCat = categoryStr.trim().toUpperCase();
    if (Object.values(OperationalCategory).includes(rawCat as any)) {
      return rawCat as OperationalCategory;
    }
    const lower = name.toLowerCase();
    if (lower.includes('direct') || lower.includes('geren'))
      return OperationalCategory.DIRECTOR;
    if (lower.includes('coord')) return OperationalCategory.COORDINATOR;
    if (lower.includes('superv')) return OperationalCategory.SUPERVISOR;
    if (
      lower.includes('cctv') ||
      lower.includes('medio') ||
      lower.includes('operad') ||
      lower.includes('consola')
    )
      return OperationalCategory.OPERATOR;
    if (
      lower.includes('admin') ||
      lower.includes('comercial') ||
      lower.includes('rrhh') ||
      lower.includes('talento')
    )
      return OperationalCategory.ADMINISTRATIVE;
    return OperationalCategory.GUARD;
  }

  async create(dto: CreatePositionDto): Promise<PositionResponseDto> {
    const name = dto.name?.trim().toUpperCase();
    const operationalCategory =
      dto.operationalCategory || this.deriveOperationalCategory(name);
    return this.positionRepository.create({
      ...dto,
      name,
      operationalCategory,
    } as any) as Promise<PositionResponseDto>;
  }

  private parseBoolean(val: any, defaultValue = true): boolean {
    if (val === undefined || val === null || val === '') return defaultValue;
    if (typeof val === 'boolean') return val;
    const str = String(val).trim().toLowerCase();
    if (
      ['true', '1', 'si', 'sí', 'yes', 'activo', 'activa', 'active'].includes(
        str,
      )
    )
      return true;
    if (['false', '0', 'no', 'inactivo', 'inactiva', 'inactive'].includes(str))
      return false;
    return defaultValue;
  }

  async findAll(): Promise<any[]> {
    const positions = await this.positionRepository.findMany();
    const createdByIds = positions
      .map((p: any) => p.createdBy)
      .filter((id: any) => Boolean(id) && id !== 'system');
    const userMap = await this.userRepository.findNamesByIds(createdByIds);

    return positions.map((p: any) => ({
      ...p,
      createdBy:
        p.createdBy && p.createdBy !== 'system' && userMap.get(p.createdBy)
          ? userMap.get(p.createdBy)
          : 'system',
    }));
  }

  async findOne(id: string): Promise<any> {
    const pos = (await this.positionRepository.findOne(id)) as any;
    if (!pos) throw new NotFoundException('Position not found');
    const userMap = await this.userRepository.findNamesByIds(
      pos.createdBy && pos.createdBy !== 'system' ? [pos.createdBy] : [],
    );
    return {
      ...pos,
      createdBy:
        pos.createdBy &&
        pos.createdBy !== 'system' &&
        userMap.get(pos.createdBy)
          ? userMap.get(pos.createdBy)
          : 'system',
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

        const rawStatus =
          row.EstadoActivo ??
          row.estadoActivo ??
          row.isActive ??
          row.Activo ??
          row.activo;
        const isActive = this.parseBoolean(rawStatus, true);

        const isGodlike =
          user?.roles?.includes('GODLIKE') ||
          user?.tenantId === 'system' ||
          user?.sub === 'system';
        const rawCategory =
          row.CategoriaOperativa ??
          row.categoriaOperativa ??
          row.operationalCategory ??
          row.Category ??
          row.category;
        const operationalCategory = this.deriveOperationalCategory(
          name,
          rawCategory,
        );
        const createdBy = isGodlike ? 'system' : user?.sub;

        const newPos = await this.positionRepository.create({
          name,
          level,
          operationalCategory,
          isActive,
          createdBy,
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
