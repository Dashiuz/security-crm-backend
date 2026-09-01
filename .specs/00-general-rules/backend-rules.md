# Context — NestJS

MUST READ: Read this file completely before any coding task in this directory.
MUST READ: Read `/prisma/schema/*.*` before defining any DTO, Prisma query, or TypeScript type related to the database. If you skip this step you will hallucinate field names.

## What is this app

Noxia's centralized NestJS API serves as the core backend engine for the Security CRM & Virtual Logbook Ecosystem. Built on a Modular Monolith architecture, it centralizes real-time security operations (general logbooks, visitor entry control, correspondence received, and parking management), regulatory administration (identity, multi-tenant isolation, RBAC access control, and employee records), and commercial/financial management. The system enforces hard multi-tenant data isolation, automated audit logging via Prisma extensions, and secure GODLIKE impersonation sandboxing.

## Stack

- **Framework:** NestJS (TypeScript, modular architecture)
- **ORM:** Prisma — MUST READ `/prisma/schema/*.*` before any query or DTO.
- **Validation:** `class-validator` + `class-transformer`
- **API Documentation:** Swagger (auto-generated at `/api/docs`)
- **Authentication:** JWT - self developed
- **Authorization:** RBAC - self developed
- **Images:** `sharp` (compression before storage)
- **Push Notifications:** `firebase-admin` (FCM)
- **Deploy:** Railway or Render (Docker container, 24/7, no cold starts)

## TypeScript Guidelines

- Always strict TypeScript (`"strict": true` in `tsconfig.json`).
- **NEVER** use `any`. If you don't know the type, use `unknown` with an explicit type-guard.
- **USE** interfaces for domain objects and types for unions and utilities.
- **NEVER** use type assertions (`as Type`) except in tests or parsing explicitly validated external data. Fix the upstream type instead.

## Database Rules

- **NEVER** guess the DB structure. Read `/prisma/schema/*.*` before writing queries, types, or DTOs related to the database.
- Do not execute destructive operations (`DROP`, `DELETE` without `WHERE`) without explicit confirmation from the user.

## Anti-Over-Engineering

- **NEVER** build features, abstractions, helper functions, or utilities that were not explicitly requested in the current plan or task.
- Do **NOT** create generic helpers "for future use".
- Do **NOT** add optional parameters or config flags that aren't currently needed.
- Do **NOT** refactor surrounding code that isn't directly related to the task.
- Do **NOT** add logging, monitoring, or error handling beyond what was specified.
- Do **NOT** anticipate future requirements.
- If you believe something "might be useful later", **STOP** and ask the user first.

**The Rule**: Implement exactly what was asked. Nothing more, nothing less.

## Module Architecture

```
src/
├── modules/
│   ├── regulation/        → Identity, Authentication, RBAC, Tenants & Organizational Structure
│   │   ├── auth/          → JWT Authentication, Refresh Tokens, GODLIKE Impersonation Sandbox
│   │   ├── access-control/ → PermissionsGuard, @RequirePermissions() decorator
│   │   ├── user/          → System user management & role assignment
│   │   ├── role/          → System & custom roles management
│   │   ├── permission/    → System permissions catalog
│   │   ├── tenant/        → Tenant (Site) provisioning & Features mapping
│   │   ├── client/        → Enterprise client companies management
│   │   ├── employee/      → Security personnel HR records & profiles
│   │   ├── position/      → Organizational positions / job titles
│   │   └── department/    → Organizational departments
│   ├── operation/         → Security Operations & Virtual Logbooks (Minuta)
│   │   └── minuta/        → General Logbook, Visitor Control, Correspondence, Parking Control
│   └── administrative/    → Commercial, Financial & Operational Management (Security Resources)
├── common/
│   ├── context/           → RequestContextService (AsyncLocalStorage for tenant & user context)
│   ├── guards/            → JwtAuthGuard, PermissionsGuard, RolesGuard
│   ├── decorators/        → @RequirePermissions(), @RequireRoles(), @CurrentUser()
│   ├── repository/        → Shared Industrial Repository Layer (Prisma ORM)
│   └── prisma-extension/  → Automated Multi-Tenant Isolation Sandbox & AuditLog Extension
└── main.ts                → NestJS Bootstrap with Swagger (/api/docs), global ValidationPipe
```

## Authentication and Multi-Tenancy

- The `JwtAuthGuard` validates the JWT bearer token on every protected request.
- The `PermissionsGuard` checks required RBAC permissions (`@RequirePermissions('minuta:read', 'minuta:create')`).
- The `tenantId` is extracted automatically via `RequestContextService` (AsyncLocalStorage) and applied to Prisma queries via ORM extensions.
- **NEVER** accept `tenantId` from the request body — always from the validated token context.

```typescript
// ✅ CORRECT — controller uses JwtAuthGuard + PermissionsGuard, delegates to service
@ApiTags('Minuta: General')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('operation/minuta/general')
export class MinutaGeneralController {
  constructor(private readonly service: MinutaGeneralService) {}

  @Post()
  @RequirePermissions('minuta:manage', 'minuta:create')
  @ApiOperation({ summary: 'Create general logbook entry' })
  create(@Req() req: any, @Body() dto: CreateMinutaDto) {
    return this.service.create(dto, req.user.sub, req.user.tenantId);
  }
}
```

## Module Structure Example

```
src/modules/operation/minuta/
├── minuta.module.ts
├── controllers/
│   ├── minuta-general.controller.ts
│   ├── visitor-control.controller.ts
│   ├── correspondence-control.controller.ts
│   └── parking-control.controller.ts
├── services/
│   ├── minuta-general.service.ts
│   ├── visitor-control.service.ts
│   ├── correspondence-control.service.ts
│   └── parking-control.service.ts
└── dtos/
    ├── minuta-general.dto.ts
    ├── visitor-control.dto.ts
    ├── correspondence-control.dto.ts
    └── parking-control.dto.ts
```

## Swagger Documentation

MUST IMPLEMENT: Every controller and endpoint MUST include the following Swagger decorators to maintain API documentation:

```typescript
@ApiTags('Minuta: General')
@ApiBearerAuth('access-token')
@Controller('operation/minuta/general')
export class MinutaGeneralController {
  @Get()
  @RequirePermissions('minuta:manage', 'minuta:read')
  @ApiOperation({ summary: 'List general logbook entries' })
  @ApiOkResponse({ description: 'List of logbook entries' })
  findAll() {
    return this.service.findAll();
  }
}
```

## Commits and Version Control

- `feat:` brief feature description
- `fix:` description of corrected bug
- `docs:` documentation change
- `refactor:` change without new functionality or bug fix
- `test:` add or modify tests
- `contract:` shared schemas, types or interfaces

Before creating any commit, you MUST complete ALL of the following checks in order:

1. Run `npm run type-check` — fix every TypeScript error before proceeding.
2. Run `npm run lint` — fix every warning before proceeding.
3. Verify that ONLY files directly related to the current task are staged.
4. **NEVER** commit without completing all three checks above.

## Closure and Memory (Context Rot Prevention)

A task is **NOT** complete until the relevant documentation has been updated.

After completing any implementation task, you MUST update the context files that reflect what changed:

- If you changed a technical decision (library, pattern), you MUST update `.specs\ai-decisions.log`.
- If you changed a plan step, you MUST mark the step `[x]` in `SPEC-XXX-000-name.md`.

## Critical Anti-Patterns (MUST NEVER DO)

- MUST NEVER put business logic in controllers — goes in services only.
- MUST NEVER return raw Prisma entities when custom DTOs are expected.
- MUST NEVER execute Prisma queries bypassing `tenantId` isolation unless explicitly authorized under GODLIKE impersonation.
- MUST NEVER accept `tenantId` in request DTO payloads from the client.
- MUST NEVER define DTO fields without reading `/prisma/schema/*` first.
