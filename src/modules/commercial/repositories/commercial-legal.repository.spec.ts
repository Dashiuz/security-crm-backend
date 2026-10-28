import { CommercialLegalRepository } from './commercial-legal.repository';

describe('CommercialLegalRepository', () => {
  let repository: CommercialLegalRepository;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      clientInsurancePolicy: {
        create: jest.fn().mockResolvedValue({ id: 'pol-1' }),
        findMany: jest.fn().mockResolvedValue([{ id: 'pol-1' }]),
        findFirst: jest.fn().mockResolvedValue({ id: 'pol-1' }),
        update: jest.fn().mockResolvedValue({ id: 'pol-1' }),
        delete: jest.fn().mockResolvedValue({ id: 'pol-1' }),
      },
      contractAddendum: {
        create: jest.fn().mockResolvedValue({ id: 'osi-1' }),
        findMany: jest.fn().mockResolvedValue([{ id: 'osi-1' }]),
        findFirst: jest.fn().mockResolvedValue({ id: 'osi-1' }),
        update: jest.fn().mockResolvedValue({ id: 'osi-1' }),
        delete: jest.fn().mockResolvedValue({ id: 'osi-1' }),
      },
      clientAnsCommitment: {
        create: jest.fn().mockResolvedValue({ id: 'ans-1' }),
        findMany: jest.fn().mockResolvedValue([{ id: 'ans-1' }]),
        findFirst: jest.fn().mockResolvedValue({ id: 'ans-1' }),
        update: jest.fn().mockResolvedValue({ id: 'ans-1' }),
        delete: jest.fn().mockResolvedValue({ id: 'ans-1' }),
      },
    };

    repository = new CommercialLegalRepository(mockPrisma);
  });

  describe('Policies', () => {
    it('createPolicy y findPoliciesByClient', async () => {
      const res = await repository.createPolicy({} as any);
      expect(mockPrisma.clientInsurancePolicy.create).toHaveBeenCalled();
      expect(res.id).toBe('pol-1');

      const list = await repository.findPoliciesByClient('ten-1', 'c-1');
      expect(mockPrisma.clientInsurancePolicy.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'ten-1', clientId: 'c-1' },
        orderBy: { effectiveEndDate: 'asc' },
        include: expect.any(Object),
      });
      expect(list).toHaveLength(1);
    });

    it('findPolicyById, updatePolicy y deletePolicy', async () => {
      await repository.findPolicyById('ten-1', 'pol-1');
      expect(mockPrisma.clientInsurancePolicy.findFirst).toHaveBeenCalled();

      await repository.updatePolicy('pol-1', {});
      expect(mockPrisma.clientInsurancePolicy.update).toHaveBeenCalled();

      await repository.deletePolicy('ten-1', 'pol-1');
      expect(mockPrisma.clientInsurancePolicy.delete).toHaveBeenCalled();
    });

    it('findExpiringPolicies', async () => {
      const now = new Date();
      await repository.findExpiringPolicies('ten-1', now);
      expect(mockPrisma.clientInsurancePolicy.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: 'ten-1',
          effectiveEndDate: { lte: now },
          status: 'ACTIVE',
        },
        include: expect.any(Object),
      });
    });
  });

  describe('Addendums', () => {
    it('createAddendum, findAddendumsByClient, findAddendumById, updateAddendum y deleteAddendum', async () => {
      await repository.createAddendum({} as any);
      expect(mockPrisma.contractAddendum.create).toHaveBeenCalled();

      await repository.findAddendumsByClient('ten-1', 'c-1');
      expect(mockPrisma.contractAddendum.findMany).toHaveBeenCalled();

      await repository.findAddendumById('ten-1', 'osi-1');
      expect(mockPrisma.contractAddendum.findFirst).toHaveBeenCalled();

      await repository.updateAddendum('osi-1', {});
      expect(mockPrisma.contractAddendum.update).toHaveBeenCalled();

      await repository.deleteAddendum('ten-1', 'osi-1');
      expect(mockPrisma.contractAddendum.delete).toHaveBeenCalled();
    });
  });

  describe('ANS Commitments', () => {
    it('createAnsCommitment, findAnsByClient, findAnsById, updateAnsCommitment y deleteAnsCommitment', async () => {
      await repository.createAnsCommitment({} as any);
      expect(mockPrisma.clientAnsCommitment.create).toHaveBeenCalled();

      await repository.findAnsByClient('ten-1', 'c-1');
      expect(mockPrisma.clientAnsCommitment.findMany).toHaveBeenCalled();

      await repository.findAnsById('ten-1', 'ans-1');
      expect(mockPrisma.clientAnsCommitment.findFirst).toHaveBeenCalled();

      await repository.updateAnsCommitment('ans-1', {});
      expect(mockPrisma.clientAnsCommitment.update).toHaveBeenCalled();

      await repository.deleteAnsCommitment('ten-1', 'ans-1');
      expect(mockPrisma.clientAnsCommitment.delete).toHaveBeenCalled();
    });
  });
});
