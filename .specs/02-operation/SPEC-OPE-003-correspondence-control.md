# SPEC-OPE-003: Control de Correspondencia y Paquetería Recibida

> **Estado**: `COMPLETADO`  
> **Módulo**: `operation`  
> **Ubicación Backend**: `src/modules/operation/minuta`  
> **Ubicación Frontend**: `src/app/(protected)/operation/correspondence`  
> **Fecha de Especificación**: 2026-07-30  

---

## 1. Contexto de Negocio e Historias de Usuario

### 1.1 Objetivo
Controlar la recepción, almacenamiento temporal y entrega efectiva de correspondencia, encomiendas, recibos y paquetes entregados por empresas de mensajería para residentes, empleados u oficinas de la sede.

### 1.2 Historias de Usuario
- **US-OPE-07**: Como **Guardia de Seguridad**, quiero registrar un paquete/correspondencia recibida indicando la empresa transportadora, destinatario (unidad/apto), tipo de correspondencia y código de rastreo.
- **US-OPE-08**: Como **Guardia de Seguridad**, quiero registrar la entrega efectiva del paquete al destinatario indicando la fecha/hora de entrega y el nombre de quien reclama.
- **US-OPE-09**: Como **Supervisor**, quiero consultar la lista de correspondencia pendiente por entregar.

---

## 2. Definición de Permisos y Matriz RBAC

| Permiso Code | Nombre Legible | Descripción | Asignación por Defecto |
| :--- | :--- | :--- | :--- |
| `minuta:read` | Consultar Correspondencia | Lectura de correspondencia | GUARD, SUPERVISOR, ADMIN |
| `minuta:create` | Recepcionar Paquete | Registro de nueva correspondencia | GUARD, SUPERVISOR |
| `minuta:update` | Marcar Entregado | Actualizar estado a entregado | GUARD, SUPERVISOR, ADMIN |
| `minuta:delete` | Eliminar Registro | Soft delete de registros | ADMIN, GODLIKE |
| `minuta:manage` | Control Total Paquetería | Administración completa | ADMIN, GODLIKE |

---

## 3. Modelo de Datos (Prisma Schema Specification)

### 3.1 Modelo: `CorrespondenceReceivedControl` (`prisma/schema/correspondence_received_control.prisma`)

```prisma
model CorrespondenceReceivedControl {
  id       String @id @default(cuid(2))
  tenantId String
  tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Restrict)

  // Core
  date       DateTime @db.Date
  time       DateTime @db.Time
  occurredAt DateTime

  // Recepción
  receivedTime   String
  destination    String
  sender         String?
  courierCompany String?
  trackingNumber String?
  receivedByName String?

  correspondenceType CorrespondenceType @default(PACKAGE) // LETTER, PACKAGE, BILLING, OTHER

  // Entrega
  status          CorrespondenceStatus @default(PENDING) // PENDING, DELIVERED, RETURNED, VOIDED
  deliveredAt     DateTime?
  deliveredToName String?

  observations String?

  source      RecordSource @default(WEB)
  externalRef String?

  createdAt   DateTime @default(now())
  createdById String?
  createdBy   User?    @relation("CorrCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)

  updatedAt   DateTime @updatedAt
  updatedById String?
  updatedBy   User?    @relation("CorrUpdatedBy", fields: [updatedById], references: [id], onDelete: SetNull)

  deletedAt   DateTime?
  deletedById String?
  deletedBy   User?    @relation("CorrDeletedBy", fields: [deletedById], references: [id], onDelete: SetNull)

  @@index([tenantId])
  @@index([tenantId, destination])
  @@index([tenantId, status])
  @@map("correspondence_received_control")
}
```

---

## 4. Contrato API REST (NestJS)

- **Controlador**: `CorrespondenceControlController` (`src/modules/operation/minuta/controllers/correspondence-control.controller.ts`)
- **Servicio**: `CorrespondenceControlService` (`src/modules/operation/minuta/services/correspondence-control.service.ts`)
- **Ruta Base**: `/api/v1/operation/minuta/correspondence-control`

### Endpoints
1. `POST /`: Registrar correspondencia recibida. DTO: `CreateCorrespondenceDto`. Permiso: `minuta:create` / `minuta:manage`.
2. `GET /`: Listar correspondencias. Permiso: `minuta:read` / `minuta:manage`.
3. `GET /:id`: Obtener correspondencia por ID. Permiso: `minuta:read` / `minuta:manage`.
4. `PATCH /:id`: Registrar entrega o cambio de estado (`status`, `deliveredAt`, `deliveredToName`). DTO: `UpdateCorrespondenceDto`. Permiso: `minuta:update` / `minuta:manage`.
5. `DELETE /:id`: Soft delete. Permiso: `minuta:delete` / `minuta:manage`.

---

## 5. Especificación Frontend (Next.js)

- **Ruta**: `src/app/(protected)/operation/correspondence/page.tsx`
- **Interfaz**:
  - Filtro rápido por estado: "Pendientes por Entrega" vs "Entregados".
  - Formulario de ingreso con selección de transportadora y tipo de correspondencia.
  - Modal de confirmación de entrega al residente/destinatario final.
