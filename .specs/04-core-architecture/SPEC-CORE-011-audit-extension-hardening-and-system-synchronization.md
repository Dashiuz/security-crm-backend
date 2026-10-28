# SPEC-CORE-011: Blindaje de Extensión de Auditoría Prisma, Sincronización Multi-Cliente y Calibración de Integridad

> **Estado**: `IMPLEMENTADO Y VALIDADO`
> **Fecha**: 2026-10-28
> **Ámbito**: Backend Core (`security-crm-backend`) & Frontend UI Alignment
> **Autores**: Senior Software Architect & Lead Security Engineer

---

## 1. Resumen Ejecutivo y Motivación

Durante la auditoría integral de integridad previa a nuevas implementaciones en Noxia CRM, se detectaron discrepancias fundamentales entre la capa de esquemas de Prisma (`prisma/schema/*.prisma`) y el interceptor automatizado de persistencia en `src/common/prisma-extension/audit-extension.ts`:

1. **Inyección Indebida de Argumentos de Auditoría**: Modelos comerciales secundarios y líneas de detalle (`ProposalServiceItem`, `ProposalValueAddedItem`, `ServiceOrder`, `ServiceOrderPosition`, `ServiceOrderEquipmentItem`, `ServiceOrderDispatchLog`, `CommercialFollowUp`, `ClientInsurancePolicy`, `ContractAddendum`, `ClientAnsCommitment`) están incluidos en `auditableModels`, pero **no poseen** campos `createdBy` ni `updatedBy` en la base de datos. Al caer en la rama por defecto, la extensión intentaba inyectar `args.data.createdBy = ...`, provocando un fallo de validación en tiempo de ejecución (`PrismaClientValidationError: Unknown argument createdBy`).
1. **Omisión de `AuthorizedSigner`**: Modelo comercial con campos `tenantId`, `createdById` y `updatedById` que no fue incorporado en las listas `multiTenantModels`, `auditableModels` ni `commercialAuditModels`.
1. **Falta de Cobertura en Alcance Multi-Cliente**: Modelos que contienen `clientId` (`CommercialProposal`, `ServiceOrder`, `CommercialFollowUp`, `ClientInsurancePolicy`, `ContractAddendum`, `ClientAnsCommitment`) no estaban registrados en `multiClientModels` de la extensión, omitiendo el filtrado automático por `allowedClientIds`.
1. **Ruido en Pruebas Unitarias de Empleados**: La suite `employee.service.spec.ts` carecía del mock para `userRepository.softDeleteUser` y `userRepository.revokeAllSessionsForUser`, generando errores en consola al probar el retiro y eliminación suave de empleados.

---

## 2. Especificación Técnica de Cambios

### 2.1. Arquitectura de Segmentación de Modelos en `audit-extension.ts`

Se clasificaron los modelos según su capacidad estructural de auditoría para evitar inyecciones de campos inexistentes:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CLASIFICACIÓN DE AUDITORÍA                      │
├───────────────────┬───────────────────┬────────────────────────────────┤
│  RELATION AUDIT   │ SCALAR ID AUDIT   │      SCALAR STRING AUDIT       │
│  (createdBy/User) │(createdById/UUID) │  (createdBy: string = userId)  │
│  Minuta, Client,  │ CommercialSettings│  User, Employee, Role, Dept,   │
│  PqrsTicket, etc. │ AuthorizedSigner  │  Position, Tenant, Unit, Tower │
├───────────────────┴───────────────────┴────────────────────────────────┤
│                       AUDIT LOG ONLY (NO MUTATION)                     │
│  ProposalServiceItem, ServiceOrder, CommercialFollowUp, Policies, etc. │
│  (Solo se genera registro en AuditLog, sin alterar args.data)          │
└────────────────────────────────────────────────────────────────────────┘
```

#### A. Nuevos Grupos Específicos

- [x] **`commercialAuditModels`**: Modelos con `createdById: String?` y `updatedById: String?`. Se incorporó `AuthorizedSigner`.
- [x] **`scalarAuditStringModels`**: Modelos con `createdBy: String?` y `updatedBy: String?` nativos:
  `['User', 'Employee', 'Role', 'Department', 'Position', 'Tenant', 'ClientProperties', 'Tower', 'Floor', 'Unit']`.
- [x] **Comportamiento Pasivo**: Si un modelo está en `auditableModels` pero no pertenece a `relationAuditModels`, `commercialAuditModels` ni `scalarAuditStringModels`, **no se muta `args.data`** con campos de auditoría, previniendo excepciones de Prisma. El registro de auditoría (`AuditLog`) continúa generándose normalmente.

#### B. Expansión de `multiTenantModels`

- [x] Incorporar `AuthorizedSigner`.

#### C. Expansión de `multiClientModels`

- [x] Incorporar:
  - `CommercialProposal`
  - `ServiceOrder`
  - `CommercialFollowUp`
  - `ClientInsurancePolicy`
  - `ContractAddendum`
  - `ClientAnsCommitment`

---

### 2.2. Corrección de Suite de Pruebas `employee.service.spec.ts`

En `beforeEach`:

```typescript
mockUserRepository = {
  findByDocument: jest.fn().mockResolvedValue({ id: 'user-1', clientId: null }),
  updateUser: jest.fn().mockResolvedValue({ id: 'user-1' }),
  softDeleteUser: jest.fn().mockResolvedValue({ id: 'user-1' }),
  revokeAllSessionsForUser: jest.fn().mockResolvedValue(undefined),
  checkTenantActive: jest.fn().mockResolvedValue(true),
};
```

---

### 2.3. Pruebas Unitarias Automatizadas en `audit-extension.spec.ts`

- [x] Inyección de `tenantId`, `createdById` y `updatedById` en `AuthorizedSigner`.
- [x] Preservación intacta de `args.data` sin inyecciones de `createdBy`/`updatedBy` para `ServiceOrder` y `ProposalServiceItem`.
- [x] Filtrado reactivo de `clientId IN (...)` en `findMany` para `CommercialProposal` y `ServiceOrder` cuando `allowedClientIds` está activo.

---

## 3. Plan de Verificación Ejecutado

5. [x] `npx.cmd tsc --noEmit` -> 0 errores.
6. [x] `npm.cmd run lint` -> 0 errores.
7. [x] `npm.cmd test` -> 84/84 suites en verde (874/874 tests aprobados, erradicando los errores no mockeados en consola).
8. [x] Actualización formal de `ai-decisions.log`.
