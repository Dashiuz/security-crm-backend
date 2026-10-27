import { CommercialProposalsController } from './commercial-proposals.controller';
import { ProposalStatus } from '@prisma/client';

describe('CommercialProposalsController', () => {
  let controller: CommercialProposalsController;
  let mockService: any;

  beforeEach(() => {
    mockService = {
      createProposal: jest.fn().mockResolvedValue({ id: 'prop-1' }),
      getProposalsPaginated: jest
        .fn()
        .mockResolvedValue({ data: [], meta: {} }),
      calculatePnlLive: jest.fn().mockReturnValue({ netMarginPercentage: 20 }),
      getProposalById: jest.fn().mockResolvedValue({ id: 'prop-1' }),
      updateProposal: jest.fn().mockResolvedValue({ id: 'prop-1' }),
      approvePnl: jest.fn().mockResolvedValue({
        id: 'prop-1',
        status: ProposalStatus.APPROVED_INTERNAL,
      }),
      issueProposal: jest.fn().mockResolvedValue({
        id: 'prop-1',
        status: ProposalStatus.SENT_TO_CLIENT,
      }),
      updateStatus: jest
        .fn()
        .mockResolvedValue({ id: 'prop-1', status: ProposalStatus.WON }),
      deleteProposal: jest.fn().mockResolvedValue({ id: 'prop-1' }),
    };

    controller = new CommercialProposalsController(mockService);
  });

  const mockReq = {
    user: { tenantId: 'ten-1', userId: 'usr-1' },
  };

  it('createProposal debe delegar al servicio con tenantId y userId', async () => {
    const dto: any = { clientId: 'c-1' };
    const res = await controller.createProposal(mockReq, dto);
    expect(mockService.createProposal).toHaveBeenCalledWith(
      'ten-1',
      'usr-1',
      dto,
    );
    expect(res).toEqual({ id: 'prop-1' });
  });

  it('getProposals debe delegar al servicio con filtros', async () => {
    const filter: any = { take: 10 };
    const res = await controller.getProposals(mockReq, filter);
    expect(mockService.getProposalsPaginated).toHaveBeenCalledWith(
      'ten-1',
      filter,
    );
    expect(res.data).toBeDefined();
  });

  it('simulatePnl debe delegar al cálculo en vivo', () => {
    const dto: any = { items: [] };
    const res = controller.simulatePnl(dto);
    expect(mockService.calculatePnlLive).toHaveBeenCalledWith(dto);
    expect(res.netMarginPercentage).toBe(20);
  });

  it('getProposalById debe delegar al servicio', async () => {
    const res = await controller.getProposalById(mockReq, 'prop-1');
    expect(mockService.getProposalById).toHaveBeenCalledWith('ten-1', 'prop-1');
    expect(res).toEqual({ id: 'prop-1' });
  });

  it('updateProposal debe delegar al servicio', async () => {
    const dto: any = { contractDurationMonths: 24 };
    const res = await controller.updateProposal(mockReq, 'prop-1', dto);
    expect(mockService.updateProposal).toHaveBeenCalledWith(
      'ten-1',
      'usr-1',
      'prop-1',
      dto,
    );
    expect(res).toEqual({ id: 'prop-1' });
  });

  it('approvePnl debe delegar al servicio', async () => {
    const res = await controller.approvePnl(mockReq, 'prop-1');
    expect(mockService.approvePnl).toHaveBeenCalledWith(
      'ten-1',
      'usr-1',
      'prop-1',
    );
    expect(res.status).toBe(ProposalStatus.APPROVED_INTERNAL);
  });

  it('issueProposal debe delegar al servicio', async () => {
    const res = await controller.issueProposal(mockReq, 'prop-1');
    expect(mockService.issueProposal).toHaveBeenCalledWith(
      'ten-1',
      'usr-1',
      'prop-1',
    );
    expect(res.status).toBe(ProposalStatus.SENT_TO_CLIENT);
  });

  it('updateStatus debe delegar al servicio', async () => {
    const res = await controller.updateStatus(
      mockReq,
      'prop-1',
      ProposalStatus.WON,
    );
    expect(mockService.updateStatus).toHaveBeenCalledWith(
      'ten-1',
      'usr-1',
      'prop-1',
      ProposalStatus.WON,
    );
    expect(res.status).toBe(ProposalStatus.WON);
  });

  it('deleteProposal debe delegar al servicio', async () => {
    const res = await controller.deleteProposal(mockReq, 'prop-1');
    expect(mockService.deleteProposal).toHaveBeenCalledWith('ten-1', 'prop-1');
    expect(res).toEqual({ id: 'prop-1' });
  });
});
