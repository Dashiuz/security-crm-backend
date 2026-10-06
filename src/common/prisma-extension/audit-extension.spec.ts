import { auditExtension } from './audit-extension';
import { RequestContextService } from '../context/request-context.service';
import { ForbiddenException } from '@nestjs/common';

describe('auditExtension - Multi Client Scope', () => {
  let contextService: RequestContextService;
  let extension: any;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    contextService = new RequestContextService();
    mockQuery = jest.fn().mockResolvedValue({ id: 'rec-1' });

    // Mock client object passed to extension
    const dummyClient = {
      $extends: (config: any) => config,
      auditLog: {
        create: jest.fn().mockResolvedValue({}),
      },
    };

    const extFactory = auditExtension(contextService);
    extension = extFactory(dummyClient as any);
  });

  it('should inject AND clientId IN scope for multi-client models when allowedClientIds is an array', async () => {
    const ctx = {
      userId: 'coord-1',
      tenantId: 'tenant-1',
      allowedClientIds: ['cli-100', 'cli-200'],
      features: [],
    };

    await contextService.run(ctx, async () => {
      const allOps = extension.query.$allModels.$allOperations;
      const args: any = { where: { status: 'OPEN' } };

      await allOps({
        model: 'PqrsTicket',
        operation: 'findMany',
        args,
        query: mockQuery,
      });

      expect(args.where.tenantId).toBe('tenant-1');
      expect(args.where.AND).toEqual([
        { clientId: { in: ['cli-100', 'cli-200'] } },
      ]);
      expect(mockQuery).toHaveBeenCalledWith(args);
    });
  });

  it('should inject AND id IN scope for Client model when allowedClientIds is an array', async () => {
    const ctx = {
      userId: 'coord-1',
      tenantId: 'tenant-1',
      allowedClientIds: ['cli-100'],
      features: [],
    };

    await contextService.run(ctx, async () => {
      const allOps = extension.query.$allModels.$allOperations;
      const args: any = { where: {} };

      await allOps({
        model: 'Client',
        operation: 'findMany',
        args,
        query: mockQuery,
      });

      expect(args.where.tenantId).toBe('tenant-1');
      expect(args.where.AND).toEqual([{ id: { in: ['cli-100'] } }]);
    });
  });

  it('should throw ForbiddenException if user tries to create record for unauthorized clientId', async () => {
    const ctx = {
      userId: 'coord-1',
      tenantId: 'tenant-1',
      allowedClientIds: ['cli-100'],
      features: [],
    };

    await contextService.run(ctx, async () => {
      const allOps = extension.query.$allModels.$allOperations;
      const args: any = {
        data: {
          clientId: 'cli-999', // Unauthorized!
          subject: 'Test PQRS',
        },
      };

      await expect(
        allOps({
          model: 'PqrsTicket',
          operation: 'create',
          args,
          query: mockQuery,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  it('should auto-assign clientId when allowedClientIds has length 1 and data has no clientId', async () => {
    const ctx = {
      userId: 'coord-1',
      tenantId: 'tenant-1',
      allowedClientIds: ['cli-100'],
      features: [],
    };

    await contextService.run(ctx, async () => {
      const allOps = extension.query.$allModels.$allOperations;
      const args: any = {
        data: {
          subject: 'Test PQRS',
        },
      };

      await allOps({
        model: 'PqrsTicket',
        operation: 'create',
        args,
        query: mockQuery,
      });

      expect(args.data.clientId).toBe('cli-100');
    });
  });
});
