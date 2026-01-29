import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
  userId?: string;
  tenantId?: string;
}

@Injectable()
export class RequestContextService {
  private static readonly als = new AsyncLocalStorage<RequestContext>();

  run(context: RequestContext, callback: () => any) {
    return RequestContextService.als.run(context, callback);
  }

  get userId(): string | undefined {
    return RequestContextService.als.getStore()?.userId;
  }

  get tenantId(): string | undefined {
    return RequestContextService.als.getStore()?.tenantId;
  }
}
