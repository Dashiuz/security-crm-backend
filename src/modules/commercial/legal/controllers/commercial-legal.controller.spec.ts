import { CommercialLegalController } from './commercial-legal.controller';

describe('CommercialLegalController', () => {
  let controller: CommercialLegalController;
  let mockService: any;

  beforeEach(() => {
    mockService = {
      createPolicy: jest.fn().mockResolvedValue({ id: 'pol-1' }),
      getPoliciesByClient: jest.fn().mockResolvedValue([{ id: 'pol-1' }]),
      getPolicyById: jest.fn().mockResolvedValue({ id: 'pol-1' }),
      updatePolicy: jest.fn().mockResolvedValue({ id: 'pol-1' }),
      deletePolicy: jest.fn().mockResolvedValue({ id: 'pol-1' }),

      createAddendum: jest.fn().mockResolvedValue({ id: 'osi-1' }),
      getAddendumsByClient: jest.fn().mockResolvedValue([{ id: 'osi-1' }]),
      getAddendumById: jest.fn().mockResolvedValue({ id: 'osi-1' }),
      updateAddendum: jest.fn().mockResolvedValue({ id: 'osi-1' }),
      deleteAddendum: jest.fn().mockResolvedValue({ id: 'osi-1' }),

      createAnsCommitment: jest.fn().mockResolvedValue({ id: 'ans-1' }),
      getAnsByClient: jest.fn().mockResolvedValue([{ id: 'ans-1' }]),
      getAnsById: jest.fn().mockResolvedValue({ id: 'ans-1' }),
      updateAnsCommitment: jest.fn().mockResolvedValue({ id: 'ans-1' }),
      deleteAnsCommitment: jest.fn().mockResolvedValue({ id: 'ans-1' }),
    };

    controller = new CommercialLegalController(mockService);
  });

  const mockReq = { user: { tenantId: 'ten-1', userId: 'usr-1' } };

  describe('Policies', () => {
    it('createPolicy, getPoliciesByClient, getPolicyById, updatePolicy y deletePolicy', async () => {
      await controller.createPolicy(mockReq, {} as any);
      expect(mockService.createPolicy).toHaveBeenCalledWith('ten-1', {});

      await controller.getPoliciesByClient(mockReq, 'c-1');
      expect(mockService.getPoliciesByClient).toHaveBeenCalledWith(
        'ten-1',
        'c-1',
      );

      await controller.getPolicyById(mockReq, 'pol-1');
      expect(mockService.getPolicyById).toHaveBeenCalledWith('ten-1', 'pol-1');

      await controller.updatePolicy(mockReq, 'pol-1', {} as any);
      expect(mockService.updatePolicy).toHaveBeenCalledWith(
        'ten-1',
        'pol-1',
        {},
      );

      await controller.deletePolicy(mockReq, 'pol-1');
      expect(mockService.deletePolicy).toHaveBeenCalledWith('ten-1', 'pol-1');
    });
  });

  describe('Addendums', () => {
    it('createAddendum, getAddendumsByClient, getAddendumById, updateAddendum y deleteAddendum', async () => {
      await controller.createAddendum(mockReq, {} as any);
      expect(mockService.createAddendum).toHaveBeenCalledWith('ten-1', {});

      await controller.getAddendumsByClient(mockReq, 'c-1');
      expect(mockService.getAddendumsByClient).toHaveBeenCalledWith(
        'ten-1',
        'c-1',
      );

      await controller.getAddendumById(mockReq, 'osi-1');
      expect(mockService.getAddendumById).toHaveBeenCalledWith(
        'ten-1',
        'osi-1',
      );

      await controller.updateAddendum(mockReq, 'osi-1', {} as any);
      expect(mockService.updateAddendum).toHaveBeenCalledWith(
        'ten-1',
        'osi-1',
        {},
      );

      await controller.deleteAddendum(mockReq, 'osi-1');
      expect(mockService.deleteAddendum).toHaveBeenCalledWith('ten-1', 'osi-1');
    });
  });

  describe('ANS Commitments', () => {
    it('createAnsCommitment, getAnsByClient, getAnsById, updateAnsCommitment y deleteAnsCommitment', async () => {
      await controller.createAnsCommitment(mockReq, {} as any);
      expect(mockService.createAnsCommitment).toHaveBeenCalledWith('ten-1', {});

      await controller.getAnsByClient(mockReq, 'c-1');
      expect(mockService.getAnsByClient).toHaveBeenCalledWith('ten-1', 'c-1');

      await controller.getAnsById(mockReq, 'ans-1');
      expect(mockService.getAnsById).toHaveBeenCalledWith('ten-1', 'ans-1');

      await controller.updateAnsCommitment(mockReq, 'ans-1', {} as any);
      expect(mockService.updateAnsCommitment).toHaveBeenCalledWith(
        'ten-1',
        'ans-1',
        {},
      );

      await controller.deleteAnsCommitment(mockReq, 'ans-1');
      expect(mockService.deleteAnsCommitment).toHaveBeenCalledWith(
        'ten-1',
        'ans-1',
      );
    });
  });
});
