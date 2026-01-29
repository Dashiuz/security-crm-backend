import { Prisma } from '@prisma/client';
import { RequestContextService } from '../context/request-context.service';

export const auditExtension = (contextService: RequestContextService) => {
  return Prisma.defineExtension((client) => {
    return client.$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            const userId = contextService.userId || 'system';
            const tenantId = contextService.tenantId;

            const auditableModels = [
              'User',
              'Employee',
              'Role',
              'Department',
              'Position',
              'Tenant',
            ];
            const multiTenantModels = [
              'User',
              'Employee',
              'Role',
              'Department',
              'Position',
              'UserRole',
              'RolePermission',
              'UserSession',
            ];

            const isAuditable = (auditableModels as any[]).includes(model);
            const isMultiTenant = (multiTenantModels as any[]).includes(model);

            if ((model as any) === 'AuditLog') {
              return query(args);
            }

            // --- MULTI-TENANCY LOGIC ---
            // If tenantId is present in context and model is multitenant, and not bypassed
            const anyArgs = args as any;
            if (tenantId && isMultiTenant && !anyArgs?.bypassTenant) {
              if (
                [
                  'findMany',
                  'findFirst',
                  'findUnique',
                  'count',
                  'aggregate',
                  'groupBy',
                ].includes(operation)
              ) {
                anyArgs.where = { ...(anyArgs.where || {}), tenantId };
              } else if (
                ['updateMany', 'deleteMany', 'update', 'delete'].includes(
                  operation,
                )
              ) {
                anyArgs.where = { ...(anyArgs.where || {}), tenantId };
              } else if (operation === 'create') {
                anyArgs.data = { ...(anyArgs.data || {}), tenantId };
              } else if (operation === 'createMany') {
                if (Array.isArray(anyArgs.data)) {
                  anyArgs.data = anyArgs.data.map((item: any) => ({
                    ...item,
                    tenantId,
                  }));
                }
              } else if (operation === 'upsert') {
                anyArgs.create = { ...(anyArgs.create || {}), tenantId };
                anyArgs.where = { ...(anyArgs.where || {}), tenantId };
              }
            }

            // 1. Inject createdBy / updatedBy only for models that have them
            if (isAuditable) {
              if (operation === 'create') {
                args.data = {
                  ...(args.data as any),
                  createdBy: (args.data as any).createdBy || userId,
                  updatedBy: (args.data as any).updatedBy || userId,
                };
              } else if (operation === 'update') {
                args.data = {
                  ...(args.data as any),
                  updatedBy: (args.data as any).updatedBy || userId,
                };
              } else if (operation === 'upsert') {
                (args as any).create = {
                  ...((args as any).create || {}),
                  createdBy: (args as any).create?.createdBy || userId,
                  updatedBy: (args as any).create?.updatedBy || userId,
                };
                (args as any).update = {
                  ...((args as any).update || {}),
                  updatedBy: (args as any).update?.updatedBy || userId,
                };
              }
            }

            // 2. Execute query
            const result = await query(args);

            // 3. Simple Audit Logging for write operations
            const auditOperations = ['create', 'update', 'delete', 'upsert'];
            if (auditOperations.includes(operation)) {
              const entityId = (result as any)?.id || 'unknown';

              const auditLogData: any = {
                entity: model,
                entityId: String(entityId),
                action: operation.toUpperCase(),
                userId: userId === 'system' ? null : userId,
                tenantId,
              };

              if (operation === 'create' || operation === 'update') {
                // Remove passwordHash from audit logs for security
                const logValue: any = {
                  ...(args.data ||
                    (args as any).create ||
                    (args as any).update ||
                    {}),
                };
                if (logValue.passwordHash) logValue.passwordHash = '[REDACTED]';
                auditLogData.newValue = logValue;
              }

              // Use the internal client to avoid extension recursion
              (client as any).auditLog
                .create({ data: auditLogData })
                .catch((err: any) => {
                  console.error('Failed to create audit log:', err);
                });
            }

            return result;
          },
        },
      },
    });
  });
};
