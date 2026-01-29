import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { RequestContextService } from '../context/request-context.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly contextService: RequestContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;

    const ctx = {
      userId: user?.id || user?.sub,
      tenantId: user?.tenantId,
    };

    return new Observable((subscriber) => {
      this.contextService.run(ctx, () => {
        next.handle().subscribe(subscriber);
      });
    });
  }
}
