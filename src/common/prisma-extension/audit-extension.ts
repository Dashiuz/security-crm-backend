import { Prisma } from '@prisma/client';
import { ForbiddenException } from '@nestjs/common';
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
              'Resident',
              'Tower',
              'Floor',
              'Unit',
              'ClientProperties',
              'SecurityStudy',
              'PqrsTicket',
              'PqrsMessage',
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
              'SecurityStudy',
              'PqrsTicket',
              'PqrsMessage',
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
            const allowedClientIds = contextService.allowedClientIds;
            const multiClientModels = [
              'Minuta',
              'VisitorEntryControl',
              'CorrespondenceReceivedControl',
              'ParkingResidentVehicleControl',
              'Resident',
              'Tower',
              'Floor',
              'Unit',
              'ClientProperties',
              'SecurityStudy',
              'PqrsTicket',
              'PqrsMessage',
              'Employee',
            ];
            const isMultiClient = (multiClientModels as any[]).includes(model);

            // 1. Validate permissions/scope for single-record targeted operations (update, delete, findUnique)
            if (
              ['update', 'delete', 'findUnique'].includes(operation) &&
              Array.isArray(allowedClientIds) &&
              !bypassTenant &&
              tenantId
            ) {
              const isTargetModel = model === 'Client' || isMultiClient;
              if (isTargetModel && anyArgs?.where) {
                const recordId = anyArgs.where.id;
                if (recordId) {
                  const scopeWhere: any = { id: recordId, tenantId };
                  if (model === 'Client') {
                    scopeWhere.id = { in: allowedClientIds };
                  } else {
                    scopeWhere.clientId = { in: allowedClientIds };
                  }

                  const existing = await (client as any)[model].findFirst({
                    where: scopeWhere,
                    select: { id: true },
                  });

                  if (!existing) {
                    if (operation === 'findUnique') {
                      return null;
                    }
                    throw new ForbiddenException(
                      `No tiene permisos para acceder o modificar este registro (${model}) fuera de sus clientes asignados.`,
                    );
                  }
                }
              }
            }

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
                  if (
                    clientId &&
                    isMultiClient &&
                    !anyArgs.where.clientId &&
                    anyArgs.where.isInternal !== true &&
                    !['update', 'delete', 'findUnique'].includes(operation)
                  ) {
                    anyArgs.where.clientId = clientId;
                  }

                  // Multi-client scope filter injection using AND
                  if (
                    Array.isArray(allowedClientIds) &&
                    [
                      'findMany',
                      'findFirst',
                      'count',
                      'aggregate',
                      'groupBy',
                      'updateMany',
                      'deleteMany',
                    ].includes(operation)
                  ) {
                    const scopeCondition =
                      model === 'Client'
                        ? { id: { in: allowedClientIds } }
                        : isMultiClient
                        ? { clientId: { in: allowedClientIds } }
                        : null;

                    if (scopeCondition) {
                      if (!anyArgs.where) anyArgs.where = {};

                      if (anyArgs.where.AND) {
                        if (Array.isArray(anyArgs.where.AND)) {
                          anyArgs.where.AND.push(scopeCondition);
                        } else {
                          anyArgs.where.AND = [
                            anyArgs.where.AND,
                            scopeCondition,
                          ];
                        }
                      } else {
                        anyArgs.where.AND = [scopeCondition];
                      }
                    }
                  }
                }
              } else if (operation === 'create') {
                // For creation, we ALWAYS need a tenantId for multitenant models.
                if (!anyArgs.data?.tenantId && !anyArgs.data?.tenant) {
                  anyArgs.data = { ...(anyArgs.data || {}), tenantId };
                }
                if (
                  clientId &&
                  isMultiClient &&
                  !anyArgs.data?.clientId &&
                  !anyArgs.data?.client &&
                  anyArgs.data?.isInternal !== true
                ) {
                  anyArgs.data.client = { connect: { id: clientId } };
                }

                // Scope validation / auto-injection for create
                if (Array.isArray(allowedClientIds) && isMultiClient && !bypassTenant) {
                  const targetClientId =
                    anyArgs.data?.clientId ||
                    anyArgs.data?.client?.connect?.id;
                  if (targetClientId) {
                    if (!allowedClientIds.includes(targetClientId)) {
                      throw new ForbiddenException(
                        `No tiene permisos para crear o asociar registros al cliente especificado.`,
                      );
                    }
                  } else if (allowedClientIds.length === 1) {
                    anyArgs.data = anyArgs.data || {};
                    anyArgs.data.clientId = allowedClientIds[0];
                  } else if (allowedClientIds.length === 0) {
                    throw new ForbiddenException(
                      'No tiene ningún cliente asignado para realizar esta creación.',
                    );
                  }
                }
              } else if (operation === 'createMany') {
                if (Array.isArray(anyArgs.data)) {
                  anyArgs.data = anyArgs.data.map((item: any) => {
                    if (
                      Array.isArray(allowedClientIds) &&
                      isMultiClient &&
                      !bypassTenant
                    ) {
                      if (
                        item.clientId &&
                        !allowedClientIds.includes(item.clientId)
                      ) {
                        throw new ForbiddenException(
                          `No tiene permisos para crear registros para el cliente ${item.clientId}.`,
                        );
                      } else if (!item.clientId && allowedClientIds.length === 1) {
                        item.clientId = allowedClientIds[0];
                      }
                    }

                    return {
                      tenantId: item.tenantId || tenantId,
                      ...(clientId && isMultiClient && item.isInternal !== true
                        ? { clientId: item.clientId || clientId }
                        : {}),
                      ...item,
                    };
                  });
                }
              } else if (operation === 'upsert') {
                if (!anyArgs.create?.tenantId && !anyArgs.create?.tenant) {
                  anyArgs.create = { ...(anyArgs.create || {}), tenantId };
                }
                if (
                  clientId &&
                  isMultiClient &&
                  !anyArgs.create?.clientId &&
                  !anyArgs.create?.client &&
                  anyArgs.create?.isInternal !== true
                ) {
                  anyArgs.create.client = { connect: { id: clientId } };
                }
                if (!bypassTenant) {
                  anyArgs.where = { ...(anyArgs.where || {}), tenantId };
                  if (
                    clientId &&
                    isMultiClient &&
                    !anyArgs.where.clientId &&
                    anyArgs.where.isInternal !== true
                  ) {
                    anyArgs.where.clientId = clientId;
                  }
                }
              }
            }

            // 1. Inject createdBy / updatedBy only for models that have them
            if (isAuditable) {
              const isGodlike = contextService.isGodlike;
              const auditActor = isGodlike ? 'system' : userId;

              const relationAuditModels = [
                'Minuta',
                'VisitorEntryControl',
                'CorrespondenceReceivedControl',
                'ParkingResidentVehicleControl',
                'Client',
                'Resident',
                'SecurityStudy',
                'PqrsTicket',
                'PqrsMessage',
              ];
              const isRelationAudit = relationAuditModels.includes(model);

              if (operation === 'create') {
                if (isRelationAudit) {
                  const data = (args.data || {}) as any;
                  const newFields: any = {};
                  const isUnchecked = Boolean(
                    data.tenantId ||
                    data.createdById ||
                    data.clientId ||
                    data.updatedById ||
                    Object.keys(data).some(
                      (key) => key.endsWith('Id') && key !== 'id',
                    ),
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
                    createdBy: (args.data as any).createdBy || auditActor,
                    updatedBy: (args.data as any).updatedBy || auditActor,
                  };
                }
              } else if (operation === 'update') {
                if (isRelationAudit) {
                  const data = (args.data || {}) as any;
                  const isUnchecked = Boolean(
                    data.tenantId ||
                    data.createdById ||
                    data.clientId ||
                    data.updatedById ||
                    Object.keys(data).some(
                      (key) => key.endsWith('Id') && key !== 'id',
                    ),
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
                    updatedBy: (args.data as any).updatedBy || auditActor,
                  };
                }
              } else if (operation === 'upsert') {
                if (isRelationAudit) {
                  const createData = (args as any).create || {};
                  const updateData = (args as any).update || {};
                  const newCreate: any = {};
                  const newUpdate: any = {};
                  const isUncheckedCreate = Boolean(
                    createData.tenantId ||
                    createData.createdById ||
                    createData.clientId ||
                    createData.updatedById ||
                    Object.keys(createData).some(
                      (key) => key.endsWith('Id') && key !== 'id',
                    ),
                  );
                  const isUncheckedUpdate = Boolean(
                    updateData.tenantId ||
                    updateData.createdById ||
                    updateData.clientId ||
                    updateData.updatedById ||
                    Object.keys(updateData).some(
                      (key) => key.endsWith('Id') && key !== 'id',
                    ),
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
                    createdBy: (args as any).create?.createdBy || auditActor,
                    updatedBy: (args as any).create?.updatedBy || auditActor,
                  };
                  (args as any).update = {
                    ...((args as any).update || {}),
                    updatedBy: (args as any).update?.updatedBy || auditActor,
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
