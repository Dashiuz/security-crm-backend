import {
  Injectable,
  OnModuleInit,
  OnApplicationShutdown,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { auditExtension } from '../common/prisma-extension/audit-extension';
import { RequestContextService } from '../common/context/request-context.service';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnApplicationShutdown
{
  private readonly logger = new Logger(PrismaService.name);
  private _extendedClient: any;

  constructor(private readonly contextService: RequestContextService) {
    const isProd = process.env.NODE_ENV === 'production';
    const databaseUrl = isProd
      ? process.env.DATABASE_URL_PROD || process.env.DATABASE_URL
      : process.env.DATABASE_URL_DEV || process.env.DATABASE_URL;

    super({
      datasources: databaseUrl
        ? {
            db: {
              url: databaseUrl,
            },
          }
        : undefined,
    });
    this._extendedClient = this.$extends(auditExtension(this.contextService));

    // Return a proxy that prioritizes the extended client for all calls (like .user, .employee, etc.)
    return new Proxy(this, {
      get: (target, prop) => {
        // Return the extended client's property if it exists (all models and prisma methods)
        if (prop in target._extendedClient) {
          const value = target._extendedClient[prop];
          return typeof value === 'function'
            ? value.bind(target._extendedClient)
            : value;
        }
        // Fallback to original PrismaService (e.g., onModuleInit, etc.)
        const value = (target as any)[prop];
        return typeof value === 'function' ? value.bind(target) : value;
      },
    }) as any;
  }

  async onModuleInit() {
    const isProd = process.env.NODE_ENV === 'production';
    const targetDb = isProd ? 'Supabase (Production)' : 'Local PostgreSQL (Development)';
    this.logger.log(`Conectando a base de datos: ${targetDb}`);
    await this.$connect();
  }

  async onApplicationShutdown(signal?: string) {
    await this.$disconnect();
  }
}
