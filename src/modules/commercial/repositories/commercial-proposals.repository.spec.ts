import { CommercialProposalsRepository } from './commercial-proposals.repository';
import { ProposalStatus, PnlHealthStatus } from '@prisma/client';

describe('CommercialProposalsRepository', () => {
  let repository: CommercialProposalsRepository;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      commercialProposal: {
        findFirst: jest.fn().mockResolvedValue({ id: 'prop-1' }),
        findUnique: jest.fn().mockResolvedValue({ id: 'prop-1' }),
        findMany: jest.fn().mockResolvedValue([{ id: 'prop-1' }]),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({ id: 'prop-1' }),
        update: jest.fn().mockResolvedValue({ id: 'prop-1' }),
        delete: jest.fn().mockResolvedValue({ id: 'prop-1' }),
      },
      proposalServiceItem: {
        deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      proposalValueAddedItem: {
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      $transaction: jest.fn().mockImplementation(async (callback) => {
        if (typeof callback === 'function') {
          return await callback(mockPrisma);
        }
        return callback;
      }),
    };

    repository = new CommercialProposalsRepository(mockPrisma);
  });

  describe('getNextFolioCode', () => {
    it('debe generar COT-YYYY-0001 si count es 0', async () => {
      mockPrisma.commercialProposal.count.mockResolvedValueOnce(0);

      const folio = await repository.getNextFolioCode('ten-1', 2026);
      expect(folio).toBe('COT-2026-0001');
      expect(mockPrisma.commercialProposal.count).toHaveBeenCalledWith({
        where: {
          tenantId: 'ten-1',
          proposalFolioCode: { startsWith: 'COT-2026-' },
        },
      });
    });

    it('debe incrementar según la cantidad existente', async () => {
      mockPrisma.commercialProposal.count.mockResolvedValueOnce(42);

      const folio = await repository.getNextFolioCode('ten-1', 2026);
      expect(folio).toBe('COT-2026-0043');
    });
  });

  describe('findById', () => {
    it('debe retornar propuesta con relaciones', async () => {
      const res = await repository.findById('ten-1', 'prop-1');
      expect(mockPrisma.commercialProposal.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'prop-1', tenantId: 'ten-1' },
          include: expect.any(Object),
        }),
      );
      expect(res).toEqual({ id: 'prop-1' });
    });
  });

  describe('findPaginated', () => {
    it('debe consultar propuestas paginadas con cursor y filtros', async () => {
      const res = await repository.findPaginated('ten-1', {
        clientId: 'client-1',
        status: ProposalStatus.DRAFT,
        pnlStatus: PnlHealthStatus.PROFITABLE,
        search: 'COT-2026',
        cursor: 'prop-0',
        take: 10,
      });

      expect(mockPrisma.commercialProposal.findMany).toHaveBeenCalled();
      expect(res.data).toHaveLength(1);
      expect(res.meta.take).toBe(10);
    });
  });

  describe('create', () => {
    it('debe crear propuesta comercial', async () => {
      const createData: any = { proposalFolioCode: 'COT-2026-0001' };
      const res = await repository.create(createData);
      expect(mockPrisma.commercialProposal.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: createData,
        }),
      );
      expect(res).toEqual({ id: 'prop-1' });
    });
  });

  describe('update', () => {
    it('debe actualizar campos sin recrear items si no se pasan', async () => {
      const updateData: any = { contractDurationMonths: 24 };
      const res = await repository.update('prop-1', updateData);
      expect(mockPrisma.commercialProposal.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'prop-1' },
          data: updateData,
        }),
      );
      expect(res).toEqual({ id: 'prop-1' });
    });

    it('debe ejecutar transacción al reemplazar items de servicio y VAG', async () => {
      const newItems: any[] = [
        {
          tenant: { connect: { id: 'ten-1' } },
          positionTitle: 'Guarda 12H',
          quantity: 1,
          scheduleType: 'TWELVE_HOURS_DAY',
          weaponModality: 'WITHOUT_WEAPON',
          tariffCategory: 'COMMERCIAL',
          unitMonthlyBilledPrice: 5000000,
          totalMonthlyBilledPrice: 5000000,
          unitMonthlyRealCost: 4000000,
          totalMonthlyRealCost: 4000000,
          sortOrder: 0,
        },
      ];
      const newVag: any[] = [
        {
          tenant: { connect: { id: 'ten-1' } },
          itemName: 'Radio',
          quantity: 1,
          periodicity: 'MONTHLY_RECURRING',
          itemInternalCost: 50000,
          totalInternalCost: 50000,
        },
      ];

      await repository.update('prop-1', { status: ProposalStatus.DRAFT }, newItems, newVag);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.proposalServiceItem.deleteMany).toHaveBeenCalledWith({
        where: { proposalId: 'prop-1' },
      });
      expect(mockPrisma.proposalValueAddedItem.deleteMany).toHaveBeenCalledWith({
        where: { proposalId: 'prop-1' },
      });
    });
  });

  describe('updateStatus', () => {
    it('debe actualizar estado y updatedBy', async () => {
      const res = await repository.updateStatus(
        'ten-1',
        'prop-1',
        ProposalStatus.APPROVED_INTERNAL,
        'usr-1',
      );
      expect(mockPrisma.commercialProposal.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'prop-1' },
          data: expect.objectContaining({
            status: ProposalStatus.APPROVED_INTERNAL,
            updatedBy: { connect: { id: 'usr-1' } },
          }),
        }),
      );
      expect(res).toEqual({ id: 'prop-1' });
    });
  });

  describe('delete', () => {
    it('debe eliminar la propuesta por id', async () => {
      const res = await repository.delete('ten-1', 'prop-1');
      expect(mockPrisma.commercialProposal.delete).toHaveBeenCalledWith({
        where: { id: 'prop-1' },
      });
      expect(res).toEqual({ id: 'prop-1' });
    });
  });
});
