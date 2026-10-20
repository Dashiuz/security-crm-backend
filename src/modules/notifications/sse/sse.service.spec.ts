import { SseService } from './sse.service';
import { take } from 'rxjs/operators';

describe('SseService', () => {
  let service: SseService;

  beforeEach(() => {
    service = new SseService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should filter and stream user-specific events to the target user', (done) => {
    const stream$ = service.getUserStream('user-1', 'tenant-1');

    stream$.pipe(take(1)).subscribe((message) => {
      expect(message.data).toEqual(
        expect.objectContaining({
          type: 'TEST_USER_EVENT',
          targetUserId: 'user-1',
          customKey: 'abc',
        }),
      );
      done();
    });

    // Event targeting another user (should be filtered out)
    service.emitToUser('user-99', { type: 'IGNORE_ME' });

    // Event targeting user-1
    service.emitToUser('user-1', { type: 'TEST_USER_EVENT', customKey: 'abc' });
  });

  it('should filter and stream tenant-wide events', (done) => {
    const stream$ = service.getUserStream('user-1', 'tenant-1', 'client-1');

    stream$.pipe(take(1)).subscribe((message) => {
      expect(message.data).toEqual(
        expect.objectContaining({
          type: 'TEST_TENANT_EVENT',
          tenantId: 'tenant-1',
          clientId: 'client-1',
        }),
      );
      done();
    });

    // Event for different tenant
    service.emitToTenant('tenant-2', { type: 'IGNORE_TENANT' });

    // Event for same tenant but different client
    service.emitToTenant('tenant-1', { type: 'IGNORE_CLIENT' }, 'client-99');

    // Matching event
    service.emitToTenant('tenant-1', { type: 'TEST_TENANT_EVENT' }, 'client-1');
  });

  it('should match tenant event when event client is not restricted', (done) => {
    const stream$ = service.getUserStream('user-1', 'tenant-1', 'client-1');

    stream$.pipe(take(1)).subscribe((message) => {
      expect(message.data).toEqual(
        expect.objectContaining({
          type: 'GLOBAL_TENANT_EVENT',
          tenantId: 'tenant-1',
        }),
      );
      done();
    });

    service.emitToTenant('tenant-1', { type: 'GLOBAL_TENANT_EVENT' });
  });
});
