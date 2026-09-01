# SPEC-OPE-002: Control de Visitantes e Ingresos

> **Estado**: `COMPLETADO`  
> **Módulo**: `operation`  
> **Ubicación Backend**: `src/modules/operation/minuta`  
> **Ubicación Frontend**: `src/app/(protected)/operation/visitor`  
> **Fecha de Especificación**: 2026-07-30  

---

## 1. Contexto de Negocio e Historias de Usuario

### 1.1 Objetivo
Gestionar de manera rigurosa y auditable el ingreso, permanencia y salida de visitantes (peatonales o vehiculares), contratistas y personal externo en las sedes o copropiedades atendidas por la empresa de seguridad.

### 1.2 Historias de Usuario
- **US-OPE-04**: Como **Guardia de Seguridad**, quiero registrar la entrada de un visitante especificando su documento de identidad, nombre, número de personas, persona/unidad de destino y ficha/ficha entregada.
- **US-OPE-05**: Como **Guardia de Seguridad**, quiero registrar la salida del visitante especificando la hora de salida para cerrar el ciclo del registro.
- **US-OPE-06**: Como **Supervisor**, quiero consultar en tiempo real qué visitantes se encuentran actualmente dentro del predio.

---

## 2. Definición de Permisos y Matriz RBAC

| Permiso Code | Nombre Legible | Descripción | Asignación por Defecto |
| :--- | :--- | :--- | :--- |
| `minuta:read` | Consultar Visitantes | Lectura de registros de visitantes | GUARD, SUPERVISOR, ADMIN |
| `minuta:create` | Registrar Visitante | Creación de nuevos ingresos | GUARD, SUPERVISOR |
| `minuta:update` | Registrar Salida/Edición | Actualización de salida u observaciones | GUARD, SUPERVISOR, ADMIN |
| `minuta:delete` | Eliminar Registro | Soft delete de registros | ADMIN, GODLIKE |
| `minuta:manage` | Control Total Visitantes | Administración global | ADMIN, GODLIKE |

---

## 3. Modelo de Datos (Prisma Schema Specification)

### 3.1 Modelo: `VisitorEntryControl` (`prisma/schema/visitor_entry_control.prisma`)

```prisma
model VisitorEntryControl {
  id       String @id @default(cuid(2))
  tenantId String
  tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Restrict)

  // Core
  date       DateTime @db.Date
  time       DateTime @db.Time
  occurredAt DateTime

  // Datos del Visitante
  visitorFullName String
  visitorIdNumber String
  visitorIdType   String? @default("CC")
  entryTime       String
  exitTime        String?
  exitAt          DateTime?

  // Autorización y Destino
  authorizedByFullName String?
  peopleCount          Int?         @default(1)
  mode                 VisitorMode  @default(PEDESTRIAN) // PEDESTRIAN, VEHICLE
  destination          String?
  block                String?
  apartment            String?
  ticketNumber         String?

  // Datos Vehiculares (si aplica)
  brand String?
  plate String?

  // Observaciones y Auditoría
  observations String?
  status       RecordStatus @default(ACTIVE)

  source      RecordSource @default(WEB)
  externalRef String?

  createdAt   DateTime @default(now())
  createdById String?
  createdBy   User?    @relation("VisitorCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)

  updatedAt   DateTime @updatedAt
  updatedById String?
  updatedBy   User?    @relation("VisitorUpdatedBy", fields: [updatedById], references: [id], onDelete: SetNull)

  deletedAt   DateTime?
  deletedById String?
  deletedBy   User?    @relation("VisitorDeletedBy", fields: [deletedById], references: [id], onDelete: SetNull)

  @@index([tenantId])
  @@index([tenantId, date])
  @@index([tenantId, visitorIdNumber])
  @@map("visitor_entry_control")
}
```

---

## 4. Contrato API REST (NestJS)

- **Controlador**: `VisitorControlController` (`src/modules/operation/minuta/controllers/visitor-control.controller.ts`)
- **Servicio**: `VisitorControlService` (`src/modules/operation/minuta/services/visitor-control.service.ts`)
- **Ruta Base**: `/api/v1/operation/minuta/visitor-control`

### Endpoints
1. `POST /`: Registrar ingreso de visitante. DTO: `CreateVisitorEntryDto`. Permiso: `minuta:create` / `minuta:manage`.
2. `GET /`: Listar ingresos de visitantes del tenant. Permiso: `minuta:read` / `minuta:manage`.
3. `GET /:id`: Obtener registro por ID. Permiso: `minuta:read` / `minuta:manage`.
4. `PATCH /:id`: Registrar salida de visitante (`exitTime`, `exitAt`, `observations`). DTO: `UpdateVisitorEntryDto`. Permiso: `minuta:update` / `minuta:manage`.
5. `DELETE /:id`: Soft delete. Permiso: `minuta:delete` / `minuta:manage`.

---

## 5. Especificación Frontend (Next.js)

- **Ruta**: `src/app/(protected)/operation/visitor/page.tsx`
- **Interfaz**:
  - Vista de visitantes activos dentro del predio (sin marca de salida) y consulta de historial.
  - Formulario de entrada peatonal/vehicular con autocompletado y validación de campos obligatorios.
  - Botón de un solo clic para "Marcar Salida".
