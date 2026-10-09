import { AuditInterceptor } from './audit.interceptor';
import { RequestContextService } from '../context/request-context.service';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';

describe('AuditInterceptor', () => {
  let interceptor: AuditInterceptor;
  let contextService: RequestContextService;
  let prismaMock: any;

  beforeEach(() => {
    contextService = new RequestContextService();
    prismaMock = {
      client: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: 'cli-1' }, { id: 'cli-2' }]),
      },
    };
    interceptor = new AuditInterceptor(contextService, prismaMock);
  });

  it('should set allowedClientIds = "ALL" for user with client:read_all', (done) => {
    const req = {
      user: {
        id: 'user-1',
        tenantId: 'tenant-1',
        permissions: ['client:read_all'],
      },
    };

    const executionContext = {
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    } as ExecutionContext;

    const callHandler: CallHandler = {
      handle: () => {
        expect(contextService.allowedClientIds).toBe('ALL');
        return of('result');
      },
    };

    interceptor.intercept(executionContext, callHandler).subscribe({
      next: (val) => {
        expect(val).toBe('result');
        done();
      },
      error: done,
    });
  });

  it('should set allowedClientIds = ["cli-1", "cli-2"] for user with client:read_assigned', (done) => {
    const req = {
      user: {
        id: 'coord-1',
        tenantId: 'tenant-1',
        permissions: ['client:read_assigned'],
      },
    };

    const executionContext = {
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    } as ExecutionContext;

    const callHandler: CallHandler = {
      handle: () => {
        expect(contextService.allowedClientIds).toEqual(['cli-1', 'cli-2']);
        return of('result');
      },
    };

    interceptor.intercept(executionContext, callHandler).subscribe({
      next: (val) => {
        expect(val).toBe('result');
        done();
      },
      error: done,
    });
  });

  it('should set allowedClientIds = [user.clientId] for residence manager with fixed clientId', (done) => {
    const req = {
      user: {
        id: 'res-mgr-1',
        tenantId: 'tenant-1',
        clientId: 'cli-residence',
        permissions: ['client:read_workplace'],
      },
    };

    const executionContext = {
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    } as ExecutionContext;

    const callHandler: CallHandler = {
      handle: () => {
        expect(contextService.allowedClientIds).toEqual(['cli-residence']);
        return of('result');
      },
    };

    interceptor.intercept(executionContext, callHandler).subscribe({
      next: (val) => {
        expect(val).toBe('result');
        done();
      },
      error: done,
    });
  });
});
