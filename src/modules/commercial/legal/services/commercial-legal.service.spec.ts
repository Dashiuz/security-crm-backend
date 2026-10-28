import { CommercialLegalService } from './commercial-legal.service';
import {
  PolicyType,
  PolicyStatus,
  AnsCommitmentType,
  AnsCommitmentStatus,
} from '@prisma/client';
import { NotFoundException } from '@nestjs/common';

describe('CommercialLegalService', () => {
  let service: CommercialLegalService;
  let mockRepository: any;
  let mockPrisma: any;

  beforeEach(() => {
    mockRepository = {
      createPolicy: jest
        .fn()
        .mockImplementation((data) => ({ id: 'pol-1', ...data })),
      findPoliciesByClient: jest.fn().mockResolvedValue([{ id: 'pol-1' }]),
      findPolicyById: jest.fn().mockResolvedValue({ id: 'pol-1' }),
      updatePolicy: jest.fn().mockResolvedValue({ id: 'pol-1' }),
      deletePolicy: jest.fn().mockResolvedValue({ id: 'pol-1' }),

      createAddendum: jest
        .fn()
        .mockImplementation((data) => ({ id: 'osi-1', ...data })),
      findAddendumsByClient: jest.fn().mockResolvedValue([{ id: 'osi-1' }]),
      findAddendumById: jest.fn().mockResolvedValue({ id: 'osi-1' }),
      updateAddendum: jest.fn().mockResolvedValue({ id: 'osi-1' }),
      deleteAddendum: jest.fn().mockResolvedValue({ id: 'osi-1' }),

      createAnsCommitment: jest
        .fn()
        .mockImplementation((data) => ({ id: 'ans-1', ...data })),
      findAnsByClient: jest.fn().mockResolvedValue([{ id: 'ans-1' }]),
      findAnsById: jest.fn().mockResolvedValue({ id: 'ans-1' }),
      updateAnsCommitment: jest.fn().mockResolvedValue({ id: 'ans-1' }),
      deleteAnsCommitment: jest.fn().mockResolvedValue({ id: 'ans-1' }),
    };

    mockPrisma = {
      client: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'c-1', name: 'Edificio Los Pinos' }),
      },
    };

    service = new CommercialLegalService(mockRepository, mockPrisma);
  });

  describe('Policies', () => {
    it('createPolicy debe registrar póliza', async () => {
      const res = await service.createPolicy('ten-1', {
        clientId: 'c-1',
        policyType: PolicyType.CIVIL_LIABILITY_PLO,
        insuranceCompanyName: 'Seguros del Estado',
        policyCertificateNumber: 'POL-100',
        insuredAmount: 500000000,
        effectiveStartDate: '2026-11-01',
        effectiveEndDate: '2027-10-31',
      });
      expect(mockPrisma.client.findFirst).toHaveBeenCalledWith({
        where: { id: 'c-1', tenantId: 'ten-1' },
      });
      expect(mockRepository.createPolicy).toHaveBeenCalled();
      expect(res.id).toBe('pol-1');
    });

    it('createPolicy debe lanzar NotFoundException si cliente no existe', async () => {
      mockPrisma.client.findFirst.mockResolvedValueOnce(null);
      await expect(
        service.createPolicy('ten-1', { clientId: 'c-99' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('getPoliciesByClient, getPolicyById, updatePolicy y deletePolicy', async () => {
      const list = await service.getPoliciesByClient('ten-1', 'c-1');
      expect(list).toHaveLength(1);

      const pol = await service.getPolicyById('ten-1', 'pol-1');
      expect(pol.id).toBe('pol-1');

      await service.updatePolicy('ten-1', 'pol-1', {
        insuranceCompanyName: 'Bolivar',
      } as any);
      expect(mockRepository.updatePolicy).toHaveBeenCalled();

      await service.deletePolicy('ten-1', 'pol-1');
      expect(mockRepository.deletePolicy).toHaveBeenCalledWith(
        'ten-1',
        'pol-1',
      );
    });
  });

  describe('Addendums', () => {
    it('createAddendum debe registrar otrosí', async () => {
      const res = await service.createAddendum('ten-1', {
        clientId: 'c-1',
        addendumNumber: 'OSI-001',
        title: 'Adición cámaras',
        effectiveStartDate: '2026-11-01',
        effectiveEndDate: '2027-10-31',
      });
      expect(mockRepository.createAddendum).toHaveBeenCalled();
      expect(res.id).toBe('osi-1');
    });

    it('getAddendumsByClient, getAddendumById, updateAddendum y deleteAddendum', async () => {
      await service.getAddendumsByClient('ten-1', 'c-1');
      expect(mockRepository.findAddendumsByClient).toHaveBeenCalled();

      await service.getAddendumById('ten-1', 'osi-1');
      expect(mockRepository.findAddendumById).toHaveBeenCalled();

      await service.updateAddendum('ten-1', 'osi-1', {
        title: 'Nuevo Título',
      } as any);
      expect(mockRepository.updateAddendum).toHaveBeenCalled();

      await service.deleteAddendum('ten-1', 'osi-1');
      expect(mockRepository.deleteAddendum).toHaveBeenCalledWith(
        'ten-1',
        'osi-1',
      );
    });
  });

  describe('ANS Commitments', () => {
    it('createAnsCommitment debe registrar compromiso', async () => {
      const res = await service.createAnsCommitment('ten-1', {
        clientId: 'c-1',
        commitmentType: AnsCommitmentType.SECURITY_STUDY_DELIVERY,
        title: 'Estudio de seguridad',
        dueDate: '2026-11-15',
      });
      expect(mockRepository.createAnsCommitment).toHaveBeenCalled();
      expect(res.id).toBe('ans-1');
    });

    it('getAnsByClient, getAnsById, updateAnsCommitment y deleteAnsCommitment', async () => {
      await service.getAnsByClient('ten-1', 'c-1');
      expect(mockRepository.findAnsByClient).toHaveBeenCalled();

      await service.getAnsById('ten-1', 'ans-1');
      expect(mockRepository.findAnsById).toHaveBeenCalled();

      await service.updateAnsCommitment('ten-1', 'ans-1', {
        status: AnsCommitmentStatus.FULFILLED,
      } as any);
      expect(mockRepository.updateAnsCommitment).toHaveBeenCalled();

      await service.deleteAnsCommitment('ten-1', 'ans-1');
      expect(mockRepository.deleteAnsCommitment).toHaveBeenCalledWith(
        'ten-1',
        'ans-1',
      );
    });
  });
});
