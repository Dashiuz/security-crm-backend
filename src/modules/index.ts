// Auth
export * from './regulation/auth/auth.module';
export * from './regulation/auth/auth.service';

// Access Control
export * from './regulation/access-control/access-control.module';
export * from './regulation/access-control/permissions.guard';
export * from './regulation/access-control/permissions.decorator';
export * from './regulation/access-control/feature.guard';
export * from './regulation/access-control/feature.decorator';

// Employee
export * from './regulation/employee/employee.module';
export * from './regulation/employee/employee.service';

// User
export * from './regulation/user/user.module';
export * from './regulation/user/user.service';
export * from './regulation/user/users-roles.service';

// Role
export * from './regulation/role/role.module';
export * from './regulation/role/role.service';

// Permission
export * from './regulation/permission/permission.module';
export * from './regulation/permission/permission.service';

// Tenant
export * from './regulation/tenant/tenant.module';

// Department
export * from './regulation/department/department.module';
export * from './regulation/department/department.service';

// Position
export * from './regulation/position/position.module';
export * from './regulation/position/position.service';

// Operation: Minuta
export * from './operation/minuta/minuta.module';

// Administrative: Client
export * from './administrative/client/client.module';
export * from './administrative/client/client.service';

// Administrative: Resident
export * from './administrative/resident/resident.module';
export * from './administrative/resident/services/resident.service';

// Administrative: Prospect
export * from './administrative/prospect/prospect.module';
export * from './administrative/prospect/prospect.service';

// Storage (AWS S3 & Media Attachment)
export * from './storage/storage.module';
export * from './storage/services/storage.service';
export * from './storage/services/s3.service';
export * from './storage/dtos/upload-media.dto';

// Administrative: Security Studies & Canvas
export * from './administrative/security-studies/security-studies.module';
export * from './administrative/security-studies/services/security-studies.service';
export * from './administrative/security-studies/controllers/security-studies.controller';

// Administrative: PQRS
export * from './administrative/pqrs/pqrs.module';
export * from './administrative/pqrs/services/pqrs.service';
export * from './administrative/pqrs/controllers/pqrs.controller';

// Notifications & SSE
export * from './notifications/notifications.module';
export * from './notifications/services/notifications.service';
export * from './notifications/controllers/notifications.controller';
export * from './notifications/sse/sse.service';

// Signatures (Noxia Sign & User Profile Signatures - SPEC-CORE-009)
export * from './signatures/signatures.module';
export * from './signatures/services/signature-audit.service';
export * from './signatures/services/signature-generator.service';
export * from './signatures/services/signature-request.service';

// Administrative: Commercial Settings & SVSP Tariff Engine (SPEC-ADM-018)
export * from './administrative/commercial-settings/commercial-settings.module';
export * from './administrative/commercial-settings/services/commercial-settings.service';
export * from './administrative/commercial-settings/services/tariff-calculation.service';
export * from './administrative/commercial-settings/services/guard-salary-calculation.service';
