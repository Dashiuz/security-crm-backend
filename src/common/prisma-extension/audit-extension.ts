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
              'Client',
              'Minuta',
              'VisitorEntryControl',
              'CorrespondenceReceivedControl',
              'ParkingResidentVehicleControl',
            ];
            const multiTenantModels = [
              'User',
              'Employee',
              'Role',
              'Department',
              'Position',
              'Client',
              'ClientProperties',
              'Resident',
              'Tower',
              'Floor',
              'Unit',
              'Minuta',
              'VisitorEntryControl',
              'CorrespondenceReceivedControl',
              'ParkingResidentVehicleControl',
              'MediaAttachment',
              'FileImportLog',
            ];

            const isAuditable = (auditableModels as any[]).includes(model);
            const isMultiTenant = (multiTenantModels as any[]).includes(model);

            if ((model as any) === 'AuditLog') {
              return query(args);
            }

            // --- MULTI-TENANCY LOGIC ---
            const anyArgs = args as any;
            const bypassTenant = anyArgs?.bypassTenant === true;
            if (anyArgs && 'bypassTenant' in anyArgs) {
              delete anyArgs.bypassTenant;
            }

            const clientId = contextService.clientId;
            const multiClientModels = [
              'Minuta',
              'VisitorEntryControl',
              'CorrespondenceReceivedControl',
              'ParkingResidentVehicleControl',
            ];
            const isMultiClient = (multiClientModels as any[]).includes(model);

            if (tenantId && isMultiTenant) {
              if (
                [
                  'findMany',
                  'findFirst',
                  'findUnique',
                  'count',
                  'aggregate',
                  'groupBy',
                  'updateMany',
                  'deleteMany',
                  'update',
                  'delete',
                ].includes(operation)
              ) {
                // For search and targeted updates/deletes, Godlike users bypass the filter
                if (!bypassTenant) {
                  anyArgs.where = { ...(anyArgs.where || {}), tenantId };
                  if (clientId && isMultiClient && !anyArgs.where.clientId) {
                    anyArgs.where.clientId = clientId;
                  }
                }
              } else if (operation === 'create') {
                // For creation, we ALWAYS need a tenantId for multitenant models.
                // We inject it from context if it's not present in data.
                if (!anyArgs.data?.tenantId && !anyArgs.data?.tenant) {
                  anyArgs.data = { ...(anyArgs.data || {}), tenantId };
                }
                if (clientId && isMultiClient && !anyArgs.data?.clientId && !anyArgs.data?.client) {
                  anyArgs.data.client = { connect: { id: clientId } };
                }
              } else if (operation === 'createMany') {
                if (Array.isArray(anyArgs.data)) {
                  anyArgs.data = anyArgs.data.map((item: any) => ({
                    tenantId: item.tenantId || tenantId,
                    ...(clientId && isMultiClient ? { clientId: item.clientId || clientId } : {}),
                    ...item,
                  }));
                }
              } else if (operation === 'upsert') {
                if (!anyArgs.create?.tenantId && !anyArgs.create?.tenant) {
                  anyArgs.create = { ...(anyArgs.create || {}), tenantId };
                }
                if (clientId && isMultiClient && !anyArgs.create?.clientId && !anyArgs.create?.client) {
                  anyArgs.create.client = { connect: { id: clientId } };
                }
                if (!bypassTenant) {
                  anyArgs.where = { ...(anyArgs.where || {}), tenantId };
                  if (clientId && isMultiClient && !anyArgs.where.clientId) {
                    anyArgs.where.clientId = clientId;
                  }
                }
              }
            }

            // 1. Inject createdBy / updatedBy only for models that have them
            if (isAuditable) {
              const relationAuditModels = [
                'Minuta',
                'VisitorEntryControl',
                'CorrespondenceReceivedControl',
                'ParkingResidentVehicleControl',
                'Client',
              ];
              const isRelationAudit = relationAuditModels.includes(model);

              if (operation === 'create') {
                if (isRelationAudit) {
                  const data = (args.data || {}) as any;
                  const newFields: any = {};
                  const isUnchecked = Boolean(
                    data.tenantId || data.createdById || data.clientId || data.updatedById,
                  );
                  if (
                    !data.createdById &&
                    !data.createdBy &&
                    userId &&
                    userId !== 'system'
                  ) {
                    if (isUnchecked) {
                      newFields.createdById = userId;
                    } else {
                      newFields.createdBy = { connect: { id: userId } };
                    }
                  }
                  if (
                    !data.updatedById &&
                    !data.updatedBy &&
                    userId &&
                    userId !== 'system'
                  ) {
                    if (isUnchecked) {
                      newFields.updatedById = userId;
                    } else {
                      newFields.updatedBy = { connect: { id: userId } };
                    }
                  }
                  args.data = { ...data, ...newFields };
                } else {
                  args.data = {
                    ...(args.data as any),
                    createdBy: (args.data as any).createdBy || userId,
                    updatedBy: (args.data as any).updatedBy || userId,
                  };
                }
              } else if (operation === 'update') {
                if (isRelationAudit) {
                  const data = (args.data || {}) as any;
                  const isUnchecked = Boolean(
                    data.tenantId || data.createdById || data.clientId || data.updatedById,
                  );
                  if (
                    !data.updatedById &&
                    !data.updatedBy &&
                    userId &&
                    userId !== 'system'
                  ) {
                    if (isUnchecked) {
                      args.data = {
                        ...data,
                        updatedById: userId,
                      };
                    } else {
                      args.data = {
                        ...data,
                        updatedBy: { connect: { id: userId } },
                      };
                    }
                  }
                } else {
                  args.data = {
                    ...(args.data as any),
                    updatedBy: (args.data as any).updatedBy || userId,
                  };
                }
              } else if (operation === 'upsert') {
                if (isRelationAudit) {
                  const createData = ((args as any).create || {}) as any;
                  const updateData = ((args as any).update || {}) as any;
                  const newCreate: any = {};
                  const newUpdate: any = {};
                  const isUncheckedCreate = Boolean(
                    createData.tenantId || createData.createdById || createData.clientId || createData.updatedById,
                  );
                  const isUncheckedUpdate = Boolean(
                    updateData.tenantId || updateData.createdById || updateData.clientId || updateData.updatedById,
                  );

                  if (
                    !createData.createdById &&
                    !createData.createdBy &&
                    userId &&
                    userId !== 'system'
                  ) {
                    if (isUncheckedCreate) {
                      newCreate.createdById = userId;
                    } else {
                      newCreate.createdBy = { connect: { id: userId } };
                    }
                  }
                  if (
                    !createData.updatedById &&
                    !createData.updatedBy &&
                    userId &&
                    userId !== 'system'
                  ) {
                    if (isUncheckedCreate) {
                      newCreate.updatedById = userId;
                    } else {
                      newCreate.updatedBy = { connect: { id: userId } };
                    }
                  }

                  if (
                    !updateData.updatedById &&
                    !updateData.updatedBy &&
                    userId &&
                    userId !== 'system'
                  ) {
                    if (isUncheckedUpdate) {
                      newUpdate.updatedById = userId;
                    } else {
                      newUpdate.updatedBy = { connect: { id: userId } };
                    }
                  }

                  (args as any).create = { ...createData, ...newCreate };
                  (args as any).update = { ...updateData, ...newUpdate };
                } else {
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
