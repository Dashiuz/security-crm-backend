import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ParkingControlService } from './parking-control.service';
import { ParkingControlRepositoryService } from '../../../../common/repository/minuta/parking-control/parking-control.repository.service';
import { RecordStatus } from '@prisma/client';

describe('ParkingControlService', () => {
  let service: ParkingControlService;
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
        ParkingControlService,
        {
          provide: ParkingControlRepositoryService,
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<ParkingControlService>(ParkingControlService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create parking record with parsed dates and relations', async () => {
      const dto: any = {
        date: '2026-10-20',
        time: '08:00',
        occurredAt: '2026-10-20T08:00:00Z',
        entryTime: '08:00',
        plate: 'XYZ-123',
        parkingNumber: 'P-10',
        clientId: 'cli-1',
        unitId: 'unit-1',
        residentId: 'res-1',
        employeeId: 'emp-1',
        isInternal: false,
      };

      mockRepo.create.mockResolvedValue({ id: 'park-1', ...dto });

      const result = await service.create(dto, 'u-1', 'tenant-1');

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          plate: 'XYZ-123',
          isInternal: false,
          client: { connect: { id: 'cli-1' } },
          unit: { connect: { id: 'unit-1' } },
          resident: { connect: { id: 'res-1' } },
          employee: { connect: { id: 'emp-1' } },
        }),
      );
      expect(result.id).toBe('park-1');
    });
  });

  describe('findAll', () => {
    it('should return records with default where filters', async () => {
      mockRepo.findMany.mockResolvedValue([{ id: 'p-1' }]);

      const result = await service.findAll();

      expect(mockRepo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          status: { not: RecordStatus.VOIDED },
          deletedAt: null,
        }),
        expect.any(Object),
      );
      expect(result.data).toHaveLength(1);
    });

    it('should filter by plate/parkingNumber search, date range, client, and return nextCursor', async () => {
      mockRepo.findMany.mockResolvedValue([{ id: 'p-1' }, { id: 'p-2' }]);

      const query: any = {
        search: 'XYZ',
        startDate: '2026-10-01',
        endDate: '2026-10-20',
        clientId: 'cli-1',
        isInternal: 'false',
        take: '2',
      };

      const result = await service.findAll(query);

      expect(mockRepo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: 'cli-1',
          isInternal: false,
          OR: expect.arrayContaining([
            { plate: { contains: 'XYZ', mode: 'insensitive' } },
          ]),
        }),
        expect.objectContaining({ take: 2 }),
      );
      expect(result.meta.nextCursor).toBe('p-2');
    });
  });

  describe('findOne', () => {
    it('should return parking record if found and not deleted', async () => {
      mockRepo.findUnique.mockResolvedValue({ id: 'p-1', deletedAt: null });

      const result = await service.findOne('p-1');
      expect(result.id).toBe('p-1');
    });

    it('should throw NotFoundException if deleted or not found', async () => {
      mockRepo.findUnique.mockResolvedValueOnce(null);
      await expect(service.findOne('p-none')).rejects.toThrow(
        NotFoundException,
      );

      mockRepo.findUnique.mockResolvedValueOnce({
        id: 'p-2',
        deletedAt: new Date(),
      });
      await expect(service.findOne('p-2')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update parking record and connect/disconnect relations', async () => {
      const dto: any = {
        plate: 'NEW-999',
        unitId: 'unit-5',
        residentId: null,
      };

      mockRepo.update.mockResolvedValue({ id: 'p-1', ...dto });

      const result = await service.update('p-1', dto, 'u-1');

      expect(mockRepo.update).toHaveBeenCalledWith(
        { id: 'p-1' },
        expect.objectContaining({
          plate: 'NEW-999',
          unit: { connect: { id: 'unit-5' } },
          resident: { disconnect: true },
          updatedBy: { connect: { id: 'u-1' } },
        }),
      );
      expect(result.id).toBe('p-1');
    });
  });

  describe('registerExit', () => {
    it('should update exit time and observations', async () => {
      mockRepo.findUnique.mockResolvedValue({ id: 'p-1', deletedAt: null });
      mockRepo.update.mockResolvedValue({ id: 'p-1', exitAt: new Date() });

      const dto: any = {
        exitAt: '2026-10-20T17:00:00Z',
        exitTime: '17:00',
        observations: 'Salida vehículo residente',
      };

      const result = await service.registerExit('p-1', dto, 'u-1');

      expect(mockRepo.update).toHaveBeenCalledWith(
        { id: 'p-1' },
        expect.objectContaining({
          observations: 'Salida vehículo residente',
          updatedBy: { connect: { id: 'u-1' } },
        }),
      );
      expect(result.id).toBe('p-1');
    });
  });

  describe('void', () => {
    it('should update status to VOIDED with voidReason', async () => {
      mockRepo.update.mockResolvedValue({
        id: 'p-1',
        status: RecordStatus.VOIDED,
      });

      const result = await service.void(
        'p-1',
        { voidReason: 'Placa digitada incorrectamente' },
        'u-1',
      );

      expect(mockRepo.update).toHaveBeenCalledWith(
        { id: 'p-1' },
        expect.objectContaining({
          status: RecordStatus.VOIDED,
          voidReason: 'Placa digitada incorrectamente',
          voidedBy: { connect: { id: 'u-1' } },
        }),
      );
      expect(result.status).toBe(RecordStatus.VOIDED);
    });
  });

  describe('remove', () => {
    it('should soft-delete parking entry', async () => {
      mockRepo.update.mockResolvedValue({ id: 'p-1', deletedAt: new Date() });

      const result = await service.remove('p-1', 'u-1');

      expect(mockRepo.update).toHaveBeenCalledWith(
        { id: 'p-1' },
        expect.objectContaining({
          deletedAt: expect.any(Date),
          deletedBy: { connect: { id: 'u-1' } },
        }),
      );
      expect(result.id).toBe('p-1');
    });
  });
});
