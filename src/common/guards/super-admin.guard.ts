import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user;

    const roles = user?.roles ?? [];
    const isGodlike = roles.includes('GODLIKE');

    if (!isGodlike) {
      throw new ForbiddenException(
        'Only GODLIKE users can access this resource',
      );
    }

    return true;
  }
}
