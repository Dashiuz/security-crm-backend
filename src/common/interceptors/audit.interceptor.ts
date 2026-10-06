import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import {
  RequestContextService,
  RequestContext,
} from '../context/request-context.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly contextService: RequestContextService,
    private readonly prisma: PrismaService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;

    return from(this.buildContext(user)).pipe(
      switchMap((ctx) => {
        return new Observable((subscriber) => {
          this.contextService.run(ctx, () => {
            next.handle().subscribe(subscriber);
          });
        });
      }),
    );
  }

  private async buildContext(user: any): Promise<RequestContext> {
    if (!user) {
      return { features: [] };
    }

    // Administrative Tenant Sandbox
    const isSystemTenant =
      user?.tenantId === 'system' || user?.originalTenantId === 'system';
    const isGodlike = isSystemTenant && (user?.roles ?? []).includes('GODLIKE');

    const features = user?.features ?? [];
    const userId = user?.id || user?.sub;
    const permissions: string[] = user?.permissions ?? [];

    let allowedClientIds: string[] | 'ALL' = 'ALL';

    if (
      isGodlike ||
      permissions.includes('client:read_all') ||
      permissions.includes('client:manage')
    ) {
      allowedClientIds = 'ALL';
    } else if (permissions.includes('client:read_assigned')) {
      if (user.tenantId && userId) {
        const assignedClients = await this.prisma.client.findMany({
          where: {
            tenantId: user.tenantId,
            OR: [
              { coordinatorInChargeId: userId },
              { commercialContactId: userId },
            ],
          },
          select: { id: true },
        });
        const ids = assignedClients.map((c) => c.id);
        if (user.clientId && !ids.includes(user.clientId)) {
          ids.push(user.clientId);
        }
        allowedClientIds = ids;
      } else {
        allowedClientIds = [];
      }
    } else if (user.clientId) {
      allowedClientIds = [user.clientId];
    } else {
      allowedClientIds = [];
    }

    return {
      userId,
      tenantId: user?.tenantId,
      clientId: user?.clientId ?? null,
      allowedClientIds,
      isGodlike,
      features,
    };
  }
}
