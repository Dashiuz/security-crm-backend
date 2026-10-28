import { AuthGuard } from '@nestjs/passport';
import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err || !user) {
      if (err) {
        this.logger.error(
          `Error en autenticación JWT: ${err.message}`,
          err.stack,
        );
      } else if (info?.name === 'TokenExpiredError') {
        this.logger.warn(`Token JWT expirado: ${info.message}`);
      } else if (info) {
        this.logger.warn(`Acceso no autenticado: ${info.message || info}`);
      }
      throw err || new UnauthorizedException(info?.message ?? 'Unauthorized');
    }
    return user;
  }
}
