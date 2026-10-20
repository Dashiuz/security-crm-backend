import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CorrespondenceControlService } from './correspondence-control.service';
import { CorrespondenceRepositoryService } from '../../../../common/repository/minuta/correspondence-control/correspondence-control.repository.service';
import { CorrespondenceStatus } from '@prisma/client';

describe('CorrespondenceControlService', () => {
  let service: CorrespondenceControlService;
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
        CorrespondenceControlService,
        {
          provide: CorrespondenceRepositoryService,
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<CorrespondenceControlService>(
      CorrespondenceControlService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create correspondence record with parsed dates and relations', async () => {
      const dto: any = {
        date: '2026-10-20',
        time: '10:00',
        occurredAt: '2026-10-20T10:00:00Z',
        receivedTime: '10:00',
        trackingNumber: 'TRK-12345',
        courierCompany: 'Servientrega',
        destination: 'Apto 402',
        clientId: 'cli-1',
        unitId: 'unit-1',
        recipientResidentId: 'res-1',
        recipientEmployeeId: 'emp-1',
        isInternal: false,
      };

      mockRepo.create.mockResolvedValue({ id: 'corr-1', ...dto });

      const result = await service.create(dto, 'u-1', 'tenant-1');

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          trackingNumber: 'TRK-12345',
          isInternal: false,
          client: { connect: { id: 'cli-1' } },
          unit: { connect: { id: 'unit-1' } },
          recipientResident: { connect: { id: 'res-1' } },
          recipientEmployee: { connect: { id: 'emp-1' } },
        }),
      );
      expect(result.id).toBe('corr-1');
    });
  });

  describe('findAll', () => {
    it('should query non-voided, non-deleted records by default', async () => {
      mockRepo.findMany.mockResolvedValue([{ id: 'c-1' }]);

      const result = await service.findAll();

      expect(mockRepo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          status: { not: CorrespondenceStatus.VOIDED },
          deletedAt: null,
        }),
        expect.any(Object),
      );
      expect(result.data).toHaveLength(1);
    });

    it('should apply filters: search, dates, client, recipient, and return cursor', async () => {
      mockRepo.findMany.mockResolvedValue([{ id: 'c-1' }, { id: 'c-2' }]);

      const query: any = {
        search: 'Servientrega',
        startDate: '2026-10-01',
        endDate: '2026-10-20',
        clientId: 'cli-1',
        recipientEmployeeId: 'emp-1',
        unitId: 'unit-1',
        residentId: 'res-1',
        take: '2',
      };

      const result = await service.findAll(query);

      expect(mockRepo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: 'cli-1',
          recipientEmployeeId: 'emp-1',
          unitId: 'unit-1',
          recipientResidentId: 'res-1',
          OR: expect.arrayContaining([
            {
              courierCompany: { contains: 'Servientrega', mode: 'insensitive' },
            },
          ]),
        }),
        expect.objectContaining({ take: 2 }),
      );
      expect(result.meta.nextCursor).toBe('c-2');
    });
  });

  describe('findOne', () => {
    it('should return record if found and not deleted', async () => {
      mockRepo.findUnique.mockResolvedValue({ id: 'c-1', deletedAt: null });

      const result = await service.findOne('c-1');
      expect(result.id).toBe('c-1');
    });

    it('should throw NotFoundException if deleted or not found', async () => {
      mockRepo.findUnique.mockResolvedValueOnce(null);
      await expect(service.findOne('c-none')).rejects.toThrow(
        NotFoundException,
      );

      mockRepo.findUnique.mockResolvedValueOnce({
        id: 'c-2',
        deletedAt: new Date(),
      });
      await expect(service.findOne('c-2')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update correspondence details and relations', async () => {
      const dto: any = {
        trackingNumber: 'NEW-TRACK',
        unitId: 'unit-9',
        recipientResidentId: null,
      };

      mockRepo.update.mockResolvedValue({ id: 'c-1', ...dto });

      const result = await service.update('c-1', dto, 'u-1');

      expect(mockRepo.update).toHaveBeenCalledWith(
        { id: 'c-1' },
        expect.objectContaining({
          trackingNumber: 'NEW-TRACK',
          unit: { connect: { id: 'unit-9' } },
          recipientResident: { disconnect: true },
          updatedBy: { connect: { id: 'u-1' } },
        }),
      );
      expect(result.id).toBe('c-1');
    });
  });

  describe('deliver', () => {
    it('should update status to DELIVERED with deliveredToName and evidence', async () => {
      mockRepo.findUnique.mockResolvedValue({ id: 'c-1', deletedAt: null });
      mockRepo.update.mockResolvedValue({
        id: 'c-1',
        status: CorrespondenceStatus.DELIVERED,
      });

      const dto: any = {
        deliveredToName: 'Andrea Torres',
        deliveryEvidenceUrl: 'https://s3.aws.com/evidence.jpg',
        deliveryNotes: 'Entregado en mano',
      };

      const result = await service.deliver('c-1', dto, 'u-1');

      expect(mockRepo.update).toHaveBeenCalledWith(
        { id: 'c-1' },
        expect.objectContaining({
          status: CorrespondenceStatus.DELIVERED,
          deliveredToName: 'Andrea Torres',
          deliveryEvidenceUrl: 'https://s3.aws.com/evidence.jpg',
          deliveryNotes: 'Entregado en mano',
          updatedBy: { connect: { id: 'u-1' } },
        }),
      );
      expect(result.id).toBe('c-1');
    });
  });

  describe('void', () => {
    it('should update status to VOIDED with voidReason', async () => {
      mockRepo.update.mockResolvedValue({
        id: 'c-1',
        status: CorrespondenceStatus.VOIDED,
      });

      const result = await service.void(
        'c-1',
        { voidReason: 'Paquete devuelto al remitente' },
        'u-1',
      );

      expect(mockRepo.update).toHaveBeenCalledWith(
        { id: 'c-1' },
        expect.objectContaining({
          status: CorrespondenceStatus.VOIDED,
          voidReason: 'Paquete devuelto al remitente',
          voidedBy: { connect: { id: 'u-1' } },
        }),
      );
      expect(result.status).toBe(CorrespondenceStatus.VOIDED);
    });
  });

  describe('remove', () => {
    it('should set deletedAt and deletedBy', async () => {
      mockRepo.update.mockResolvedValue({ id: 'c-1', deletedAt: new Date() });

      const result = await service.remove('c-1', 'u-1');

      expect(mockRepo.update).toHaveBeenCalledWith(
        { id: 'c-1' },
        expect.objectContaining({
          deletedAt: expect.any(Date),
          deletedBy: { connect: { id: 'u-1' } },
        }),
      );
      expect(result.id).toBe('c-1');
    });
  });
});
