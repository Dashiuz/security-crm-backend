import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FEATURE_KEY } from './feature.decorator';
import { RequestContextService } from '../../../common/context/request-context.service';

@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Optional() private readonly context?: RequestContextService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[] | string>(
      FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required || (Array.isArray(required) && required.length === 0)) {
      return true;
    }

    const req = context.switchToHttp().getRequest();
    const user = req?.user as
      | {
          roles?: string[];
          features?: string[];
          tenantId?: string;
          originalTenantId?: string;
        }
      | undefined;

    // SuperAdmins (GODLIKE) have access to everything
    const isSystemTenant =
      user?.tenantId === 'system' || user?.originalTenantId === 'system';
    if (
      (isSystemTenant && (user?.roles ?? []).includes('GODLIKE')) ||
      this.context?.isGodlike
    ) {
      return true;
    }

    const enabledFeatures = user?.features ?? this.context?.features ?? [];
    const requiredList = Array.isArray(required) ? required : [required];

    const ok = requiredList.some((f) => enabledFeatures.includes(f));

    if (!ok) {
      throw new ForbiddenException(
        `Feature '${requiredList.join(', ')}' is not enabled for this tenant`,
      );
    }

    return true;
  }
}

