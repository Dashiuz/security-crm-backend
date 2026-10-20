import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { VisitorControlService } from './visitor-control.service';
import { VisitorControlRepositoryService } from '../../../../common/repository/minuta/visitor-control/visitor-control.repository.service';
import { RecordStatus } from '@prisma/client';

describe('VisitorControlService', () => {
  let service: VisitorControlService;
  let mockRepo: any;

  beforeEach(async () => {
    mockRepo = {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VisitorControlService,
        {
          provide: VisitorControlRepositoryService,
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<VisitorControlService>(VisitorControlService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create visitor entry record with relations and parsed dates', async () => {
      const dto: any = {
        date: '2026-10-20',
        time: '14:30',
        occurredAt: '2026-10-20T14:30:00Z',
        entryTime: '14:30:00',
        visitorFullName: 'Juan Perez',
        visitorIdNumber: '10203040',
        clientId: 'cli-1',
        unitId: 'unit-1',
        residentId: 'res-1',
        employeeId: 'emp-1',
        isInternal: false,
      };

      mockRepo.create.mockResolvedValue({ id: 'vis-1', ...dto });

      const result = await service.create(dto, 'u-1', 'tenant-1');

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          visitorFullName: 'Juan Perez',
          isInternal: false,
          client: { connect: { id: 'cli-1' } },
          unit: { connect: { id: 'unit-1' } },
          resident: { connect: { id: 'res-1' } },
          employee: { connect: { id: 'emp-1' } },
        }),
      );
      expect(result.id).toBe('vis-1');
    });
  });

  describe('findAll', () => {
    it('should query visitors with default filters and return cursor pagination envelope', async () => {
      const records = [{ id: 'vis-1' }, { id: 'vis-2' }];
      mockRepo.findMany.mockResolvedValue(records);

      const result = await service.findAll();

      expect(mockRepo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          status: { not: RecordStatus.VOIDED },
          deletedAt: null,
        }),
        expect.any(Object),
      );
      expect(result.data).toEqual(records);
      expect(result.meta.nextCursor).toBeNull();
    });

    it('should query with complex filters: search, date range, client, internal, and pagination', async () => {
      mockRepo.findMany.mockResolvedValue([{ id: 'vis-1' }]);

      const query: any = {
        search: 'Juan',
        startDate: '2026-10-01',
        endDate: '2026-10-31',
        isInternal: 'true',
        clientId: 'cli-1',
        employeeId: 'emp-1',
        unitId: 'unit-1',
        residentId: 'res-1',
        take: '1',
      };

      const result = await service.findAll(query);

      expect(mockRepo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          isInternal: true,
          clientId: 'cli-1',
          employeeId: 'emp-1',
          unitId: 'unit-1',
          residentId: 'res-1',
          OR: expect.arrayContaining([
            { visitorFullName: { contains: 'Juan', mode: 'insensitive' } },
          ]),
        }),
        expect.objectContaining({ take: 1 }),
      );
      expect(result.meta.nextCursor).toBe('vis-1');
    });
  });

  describe('findOne', () => {
    it('should return visitor record if exists and not deleted', async () => {
      mockRepo.findUnique.mockResolvedValue({ id: 'vis-1', deletedAt: null });

      const result = await service.findOne('vis-1');
      expect(result.id).toBe('vis-1');
    });

    it('should throw NotFoundException if record does not exist or is deleted', async () => {
      mockRepo.findUnique.mockResolvedValueOnce(null);
      await expect(service.findOne('vis-none')).rejects.toThrow(
        NotFoundException,
      );

      mockRepo.findUnique.mockResolvedValueOnce({
        id: 'vis-2',
        deletedAt: new Date(),
      });
      await expect(service.findOne('vis-2')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update visitor entry and connect/disconnect relations', async () => {
      const dto: any = {
        visitorFullName: 'Juan Carlos Perez',
        unitId: 'unit-2',
        residentId: null,
        isInternal: true,
      };

      mockRepo.update.mockResolvedValue({ id: 'vis-1', ...dto });

      const result = await service.update('vis-1', dto, 'u-1');

      expect(mockRepo.update).toHaveBeenCalledWith(
        { id: 'vis-1' },
        expect.objectContaining({
          visitorFullName: 'Juan Carlos Perez',
          isInternal: true,
          unit: { connect: { id: 'unit-2' } },
          resident: { disconnect: true },
          updatedBy: { connect: { id: 'u-1' } },
        }),
      );
      expect(result.id).toBe('vis-1');
    });
  });

  describe('registerExit', () => {
    it('should update exitAt, exitTime, and observations', async () => {
      mockRepo.findUnique.mockResolvedValue({ id: 'vis-1', deletedAt: null });
      mockRepo.update.mockResolvedValue({ id: 'vis-1', exitAt: new Date() });

      const dto: any = {
        exitAt: '2026-10-20T18:00:00Z',
        exitTime: '18:00',
        observations: 'Salida sin novedades',
      };

      const result = await service.registerExit('vis-1', dto, 'u-1');

      expect(mockRepo.update).toHaveBeenCalledWith(
        { id: 'vis-1' },
        expect.objectContaining({
          observations: 'Salida sin novedades',
          updatedBy: { connect: { id: 'u-1' } },
        }),
      );
      expect(result.id).toBe('vis-1');
    });
  });

  describe('void', () => {
    it('should update status to VOIDED with voidReason', async () => {
      mockRepo.update.mockResolvedValue({
        id: 'vis-1',
        status: RecordStatus.VOIDED,
      });

      const result = await service.void(
        'vis-1',
        { voidReason: 'Duplicado' },
        'u-1',
      );

      expect(mockRepo.update).toHaveBeenCalledWith(
        { id: 'vis-1' },
        expect.objectContaining({
          status: RecordStatus.VOIDED,
          voidReason: 'Duplicado',
          voidedBy: { connect: { id: 'u-1' } },
        }),
      );
      expect(result.status).toBe(RecordStatus.VOIDED);
    });
  });

  describe('remove', () => {
    it('should set deletedAt and deletedBy', async () => {
      mockRepo.update.mockResolvedValue({ id: 'vis-1', deletedAt: new Date() });

      const result = await service.remove('vis-1', 'u-1');

      expect(mockRepo.update).toHaveBeenCalledWith(
        { id: 'vis-1' },
        expect.objectContaining({
          deletedAt: expect.any(Date),
          deletedBy: { connect: { id: 'u-1' } },
        }),
      );
      expect(result.id).toBe('vis-1');
    });
  });
});
