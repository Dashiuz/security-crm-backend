import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FEATURE_KEY } from './feature.decorator';
import { RequestContextService } from '../../../common/context/request-context.service';

@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly context: RequestContextService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredFeature = this.reflector.getAllAndOverride<string>(
      FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredFeature) return true;

    // SuperAdmins (GODLIKE) have access to everything
    if (this.context.isGodlike) return true;

    const enabledFeatures = this.context.features;
    const ok = enabledFeatures.includes(requiredFeature);

    if (!ok) {
      throw new ForbiddenException(
        `Feature '${requiredFeature}' is not enabled for this tenant`,
      );
    }

    return true;
  }
}
