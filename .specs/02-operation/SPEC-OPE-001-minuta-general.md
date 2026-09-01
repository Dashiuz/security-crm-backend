# SPEC-OPE-001: Minuta General (Bitácora General de Novedades)

> **Estado**: `COMPLETADO`  
> **Módulo**: `operation`  
> **Ubicación Backend**: `src/modules/operation/minuta`  
> **Ubicación Frontend**: `src/app/(protected)/operation/minuta-general`  
> **Fecha de Especificación**: 2026-07-30  

---

## 1. Contexto de Negocio e Historias de Usuario

### 1.1 Objetivo
Permitir el registro cronológico y auditable de todas las anotaciones, novedades y eventos generales que suceden durante el turno en una sede/tenant de seguridad. La Minuta General constituye la bitácora legal del puesto de control.

### 1.2 Historias de Usuario
- **US-OPE-01**: Como **Guardia de Seguridad**, quiero registrar una anotación general indicando la fecha, hora, categoría y detalle del evento para llevar la bitácora del turno.
- **US-OPE-02**: Como **Supervisor de Seguridad**, quiero consultar el historial de la minuta general con filtros por fecha, etiqueta y categoría para auditar el cumplimiento del puesto.
- **US-OPE-03**: Como **Administrador**, quiero anular una anotación errónea dejando constancia explícita del motivo de la anulación para preservar la integridad del registro sin borrar información física.

---

## 2. Definición de Permisos y Matriz RBAC

### 2.1 Permisos Registrados (`prisma/seed-features.ts`)

| Permiso Code | Nombre Legible | Descripción | Asignación por Defecto |
| :--- | :--- | :--- | :--- |
| `minuta:read` | Consultar Minuta | Lectura de las anotaciones de la minuta | GUARD, SUPERVISOR, ADMIN |
| `minuta:create` | Registrar en Minuta | Creación de nuevas entradas | GUARD, SUPERVISOR |
| `minuta:update` | Editar/Anular Minuta | Modificación o anulación de anotaciones | SUPERVISOR, ADMIN |
| `minuta:delete` | Soft Delete Minuta | Eliminación lógica de registros | ADMIN, GODLIKE |
| `minuta:manage` | Control Total Minuta | Gestión global del submódulo | ADMIN, GODLIKE |

### 2.2 Reglas Multi-Tenant y Seguridad
- **Aislamiento Nativo**: Todo registro requiere `tenantId` estricto expuesto a través de `RequestContextService`.
- **Auditoría Transversal**: Rastreo automático de `createdById`, `updatedById`, `voidedById` y `deletedById`.
- **Sandbox Impersonation (`GODLIKE`)**: Si un SuperAdmin opera con token impersonado, la consulta responde exclusivamente dentro del sandbox del `tenantId` impersonado.

---

## 3. Modelo de Datos (Prisma Schema Specification)

### 3.1 Modelo: `Minuta` (`prisma/schema/minuta.prisma`)

```prisma
model Minuta {
  id       String @id @default(cuid(2))
  tenantId String
  tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Restrict)

  // Core
  date       DateTime @db.Date
  time       DateTime @db.Time
  occurredAt DateTime
  annotation String

  // Opcionales / Clasificación
  category       String?
  priority       Int?     // Rango 1..5
  tags           String[] @default([])
  isConfidential Boolean  @default(false)

  // Estado y Anulación
  status     RecordStatus @default(ACTIVE) // ACTIVE, VOIDED, INACTIVE
  voidReason String?
  voidedAt   DateTime?
  voidedById String?
  voidedBy   User?        @relation("MinutaVoidedBy", fields: [voidedById], references: [id], onDelete: SetNull)

  // Trazabilidad
  source      RecordSource @default(WEB) // WEB, MOBILE, SYSTEM
  externalRef String?

  createdAt   DateTime @default(now())
  createdById String?
  createdBy   User?    @relation("MinutaCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)

  updatedAt   DateTime @updatedAt
  updatedById String?
  updatedBy   User?    @relation("MinutaUpdatedBy", fields: [updatedById], references: [id], onDelete: SetNull)

  deletedAt   DateTime?
  deletedById String?
  deletedBy   User?    @relation("MinutaDeletedBy", fields: [deletedById], references: [id], onDelete: SetNull)

  @@index([tenantId])
  @@index([tenantId, date])
  @@index([tenantId, occurredAt])
  @@index([createdById])
  @@map("minuta")
}
```

---

## 4. Contrato API REST (NestJS)

- **Controlador**: `MinutaGeneralController` (`src/modules/operation/minuta/controllers/minuta-general.controller.ts`)
- **Servicio**: `MinutaGeneralService` (`src/modules/operation/minuta/services/minuta-general.service.ts`)
- **Ruta Base**: `/api/v1/operation/minuta/general`

### Endpoints
1. `POST /`: Crear entrada general. Permiso: `minuta:create` o `minuta:manage`. DTO: `CreateMinutaDto`.
2. `GET /`: Listar entradas del tenant. Permiso: `minuta:read` o `minuta:manage`.
3. `GET /:id`: Obtener entrada por ID. Permiso: `minuta:read` o `minuta:manage`.
4. `PATCH /:id`: Actualizar detalles. Permiso: `minuta:update` o `minuta:manage`. DTO: `UpdateMinutaDto`.
5. `PATCH /:id/void`: Anular anotación. Permiso: `minuta:update` o `minuta:manage`. DTO: `VoidRecordDto`.
6. `DELETE /:id`: Soft delete. Permiso: `minuta:delete` o `minuta:manage`.

---

## 5. Especificación Frontend (Next.js)

- **Ruta**: `src/app/(protected)/operation/minuta-general/page.tsx`
- **Interfaz**:
  - Tabla de registros de minuta con paginación, indicador de estado (`ACTIVE`, `VOIDED`), prioridad (1..5) y tags.
  - Modal de registro rápido con fecha, hora, categoría y descripción de la novedad.
  - Modal de anulación para requerir motivo de anulación.
