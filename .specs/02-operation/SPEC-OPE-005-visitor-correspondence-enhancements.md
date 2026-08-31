# SPEC-OPE-005: Mejoras en Minutas - Vinculación de Unidades/Residentes, Registro de Salidas y Entregas con Evidencia Fotográfica

> **Estado**: `EN_REVISIÓN`  
> **Módulo**: `operation`  
> **Submódulo**: `minuta` (`visitor-control`, `correspondence-control`)  
> **Ubicación Backend**: `src/modules/operation/minuta`  
> **Ubicación Frontend**: `src/app/(protected)/operation/visitor`, `src/app/(protected)/operation/correspondence`  
> **Fecha de Especificación**: 2026-08-29  
> **Autor(es)**: `Antigravity / SDD Planning`  

---

## 1. Contexto de Negocio e Historias de Usuario

### 1.1 Objetivo
Esta especificación define la evolución de dos componentes críticos de la operación de seguridad en conjuntos residenciales:
1. **Control de Visitantes**: Establecer la vinculación relacional directa entre cada registro de visita y la unidad residencial (apartamento/casa/oficina) y el residente al que visita. Habilitar además el registro ágil de salida de visitantes desde la tabla de operaciones en tiempo real.
2. **Control de Correspondencia y Domicilios**: Vincular cada encomienda/domicilio a la unidad y residente destinatario. Permitir que el guardia de turno marque la entrega efectiva del paquete mediante una acción en tabla que abre un flujo de confirmación con captura/simulación de evidencia fotográfica (mockup preparatorio para la futura integración con Amazon S3).

### 1.2 Historias de Usuario
- **US-OPE-10**: Como **Guarda de Seguridad**, al registrar un visitante, quiero seleccionar la unidad/apartamento y residente de destino para que la visita quede formalmente vinculada en la base de datos y sea auditable por copropiedad.
- **US-OPE-11**: Como **Guarda de Seguridad**, quiero marcar la salida de un visitante directamente desde la tabla con un solo clic, registrando automáticamente la fecha y hora exacta de salida.
- **US-OPE-12**: Como **Guarda de Seguridad**, al registrar una correspondencia o domicilio, quiero asociarlo a la unidad habitacional a la que pertenece.
- **US-OPE-13**: Como **Guarda de Seguridad**, cuando el residente reclame su paquete en recepción, quiero pulsar una acción en la tabla para marcarlo como entregado, tomando una fotografía de evidencia (mockup visual) y especificando quién lo recibió.

---

## 2. Definición de Permisos y Matriz RBAC

| Permiso Code | Nombre Legible | Descripción | Asignación por Defecto |
| :--- | :--- | :--- | :--- |
| `minuta:read` | Consultar Minutas | Lectura de registros de visitantes y correspondencia | GUARD, SUPERVISOR, ADMIN |
| `minuta:create` | Crear Registros | Ingreso de visitantes y recepción de paquetes | GUARD, SUPERVISOR |
| `minuta:update` | Actualizar Registros | Marcar salida de visitante y entrega de paquete | GUARD, SUPERVISOR, ADMIN |
| `minuta:manage` | Administración Total | Control total sobre minutas de operación | ADMIN, GODLIKE |

---

## 3. Modelo de Datos (Prisma Schema Specification)

### 3.1 Actualización: `VisitorEntryControl` (`prisma/schema/visitor_entry_control.prisma`)
Se añaden las relaciones foráneas directas hacia `Unit` y opcionalmente hacia `Resident`:

```prisma
model VisitorEntryControl {
  id       String @id @default(cuid(2))
  tenantId String
  tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Restrict)

  clientId String?
  client   Client? @relation(fields: [clientId], references: [id], onDelete: SetNull)

  // Relaciones hacia el Inmueble y Residente visitado
  unitId   String?
  unit     Unit?   @relation(fields: [unitId], references: [id], onDelete: SetNull)

  residentId String?
  resident   Resident? @relation(fields: [residentId], references: [id], onDelete: SetNull)

  // Base
  date       DateTime @db.Date
  time       DateTime @db.Time
  occurredAt DateTime

  visitorFullName String
  visitorIdNumber String
  visitorIdType   String?

  entryTime DateTime  @db.Time
  exitTime  DateTime? @db.Time
  exitAt    DateTime?

  authorizedByFullName String?
  peopleCount          Int     @default(1)

  mode VisitorMode

  // Destino legacy / snapshot
  destination String?
  block       String?
  apartment   String?
  ticketNumber String?

  brand        String?
  plate        String?
  observations String?

  guardId           String?
  guard             User?   @relation("VisitorEntryGuard", fields: [guardId], references: [id], onDelete: SetNull)
  guardNameSnapshot String?

  status     RecordStatus @default(ACTIVE)
  voidReason String?
  voidedAt   DateTime?
  voidedById String?
  voidedBy   User?        @relation("VisitorEntryVoidedBy", fields: [voidedById], references: [id], onDelete: SetNull)

  source      RecordSource @default(WEB)
  externalRef String?

  createdAt   DateTime @default(now())
  createdById String?
  createdBy   User?    @relation("VisitorEntryCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)

  updatedAt   DateTime @updatedAt
  updatedById String?
  updatedBy   User?    @relation("VisitorEntryUpdatedBy", fields: [updatedById], references: [id], onDelete: SetNull)

  deletedAt   DateTime?
  deletedById String?
  deletedBy   User?     @relation("VisitorEntryDeletedBy", fields: [deletedById], references: [id], onDelete: SetNull)

  mediaAttachments MediaAttachment[]

  @@index([tenantId])
  @@index([clientId])
  @@index([unitId])
  @@index([residentId])
  @@index([tenantId, date])
  @@index([guardId])
  @@map("visitor_entry_control")
}
```

### 3.2 Actualización: `CorrespondenceReceivedControl` (`prisma/schema/correspondence_received_control.prisma`)
Se añaden las relaciones hacia `Unit` y `Resident`, y los campos para la evidencia de entrega:

```prisma
model CorrespondenceReceivedControl {
  id       String @id @default(cuid(2))
  tenantId String
  tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Restrict)

  clientId String?
  client   Client? @relation(fields: [clientId], references: [id], onDelete: SetNull)

  // Relaciones hacia el Inmueble y Residente destinatario
  unitId   String?
  unit     Unit?   @relation(fields: [unitId], references: [id], onDelete: SetNull)

  recipientResidentId String?
  recipientResident   Resident? @relation(fields: [recipientResidentId], references: [id], onDelete: SetNull)

  date       DateTime @db.Date
  time       DateTime @db.Time
  occurredAt DateTime

  receivedTime DateTime @db.Time

  destination    String // Destino texto libre / snapshot (ej. "Torre 1 - Apto 302")
  sender         String?
  courierCompany String?
  trackingNumber String?

  guardOnDutyId           String?
  guardOnDuty             User?   @relation("CorrespondenceGuardOnDuty", fields: [guardOnDutyId], references: [id], onDelete: SetNull)
  guardNameSnapshot String?

  receivedByName String?

  correspondenceType CorrespondenceType
  status             CorrespondenceStatus @default(RECEIVED)

  // Entrega y Evidencia
  deliveredAt       DateTime?
  deliveredToName   String?
  deliveryEvidenceUrl String? // Mockup URL / Futura integración S3
  deliveryNotes     String?

  observations String?

  voidReason String?
  voidedAt   DateTime?
  voidedById String?
  voidedBy   User?     @relation("CorrespondenceVoidedBy", fields: [voidedById], references: [id], onDelete: SetNull)

  source      RecordSource @default(WEB)
  externalRef String?

  createdAt   DateTime @default(now())
  createdById String?
  createdBy   User?    @relation("CorrespondenceCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)

  updatedAt   DateTime @updatedAt
  updatedById String?
  updatedBy   User?    @relation("CorrespondenceUpdatedBy", fields: [updatedById], references: [id], onDelete: SetNull)

  deletedAt   DateTime?
  deletedById String?
  deletedBy   User?     @relation("CorrespondenceDeletedBy", fields: [deletedById], references: [id], onDelete: SetNull)

  mediaAttachments MediaAttachment[]

  @@index([tenantId])
  @@index([clientId])
  @@index([unitId])
  @@index([recipientResidentId])
  @@index([tenantId, status])
  @@map("correspondence_received_control")
}
```

### 3.3 Relaciones inversas en `Unit` y `Resident`
- En `unit.prisma`:
  ```prisma
  visitorEntries  VisitorEntryControl[]
  correspondences CorrespondenceReceivedControl[]
  ```
- En `resident.prisma`:
  ```prisma
  visitorEntries  VisitorEntryControl[]
  correspondences CorrespondenceReceivedControl[]
  ```

---

## 4. Contratos de API REST (NestJS)

### 4.1 Endpoints para Visitantes (`VisitorControlController`)
- **`POST /api/operation/minuta/visitor`**:
  - DTO extendido con `unitId?: string` y `residentId?: string`.
- **`PATCH /api/operation/minuta/visitor/:id/exit`**:
  - Marca la salida del visitante de forma atómica.
  - Body opcional: `{ exitTime?: string; observations?: string }`.
  - Comportamiento: Asigna `exitAt = new Date()` y `exitTime = new Date()` (hora local formateada).

### 4.2 Endpoints para Correspondencia (`CorrespondenceControlController`)
- **`POST /api/operation/minuta/correspondence`**:
  - DTO extendido con `unitId?: string` y `recipientResidentId?: string`.
- **`PATCH /api/operation/minuta/correspondence/:id/deliver`**:
  - Registra la entrega del paquete/domicilio al residente.
  - Body:
    ```typescript
    {
      deliveredToName: string;
      deliveryEvidenceUrl?: string; // URL dummy o base64
      deliveryNotes?: string;
    }
    ```
  - Comportamiento: Establece `status = 'DELIVERED'`, `deliveredAt = new Date()`, `deliveredToName`, `deliveryEvidenceUrl` y `deliveryNotes`.

### 4.3 Endpoint de consulta de Unidades y Residentes por Cliente
- Se reutiliza `GET /api/resident/by-client/:clientId` y se expone `GET /api/client/:id` (que ya incluye todas las `units` ordenadas) para que el frontend disponga del catálogo de apartamentos y residentes activos de la copropiedad.

---

## 5. Especificación Frontend (Next.js)

### 5.1 Pantalla de Visitantes (`operation/visitor/page.tsx`)
1. **Tabla de Datos (DataGrid)**:
   - Nueva columna: **"Unidad / Apto"** (`row.unit?.unitName || row.destinationApartment || 'N/A'`).
   - Nueva columna: **"Residente / Anfitrión"** (`row.resident ? (row.resident.firstName + ' ' + row.resident.lastName) : row.hostName || 'N/A'`).
   - Columna **"Salida" / "Acciones"**:
     - Si el visitante **no tiene hora de salida**: botón estilizado `Marcar Salida` (color `warning` o `info`, icono `ExitToApp`).
     - Al hacer clic: confirmación interactiva y llamado a `PATCH /operation/minuta/visitor/:id/exit`. Notificación de éxito y recarga de tabla.
     - Si ya tiene salida: Chip verde `Salida: HH:mm`.
2. **Formulario de Registro**:
   - Selector dinámico de **Unidad / Apartamento** (cargado según el cliente seleccionado).
   - Selector de **Residente** asociado a dicha unidad (filtrado reactivamente).
   - Autocompleta automáticamente los campos `destinationApartment`, `destinationInterior` y `hostName`.

### 5.2 Pantalla de Correspondencia (`operation/correspondence/page.tsx`)
1. **Tabla de Datos (DataGrid)**:
   - Nueva columna: **"Unidad / Destino"** (`row.unit?.unitName || row.destination`).
   - Columna de **"Estado / Acción"**:
     - Si `status !== 'DELIVERED'`: botón de acción `Entregar al Residente` (color `success`, icono `CheckCircle` o `LocalShipping`).
     - Si ya está entregado: Chip verde `Entregado` con tooltip de fecha/hora de entrega. Si existe foto de evidencia dummy, botón para visualizarla.
2. **Modal de Entrega con Evidencia Fotográfica (Mockup S3)**:
   - Al pulsar `Entregar al Residente` se abre un diálogo modal:
     - **Resumen**: Guía, mensajería, unidad y tipo.
     - **Nombre de quien retira**: Campo editable con el nombre del residente destinatario por defecto.
     - **Módulo de Evidencia Fotográfica (Mockup Dummy)**:
       - Área interactiva que simula la captura con cámara web o carga de imagen desde dispositivo.
       - Genera previsualización de la imagen capturada con marco estilizado y badge *"Evidencia lista para Amazon S3 (Mockup)"*.
       - Botón para reintentar/cambiar fotografía.
     - **Notas adicionales** (opcional).
     - Botón `Confirmar Entrega` que envía la petición a `PATCH /operation/minuta/correspondence/:id/deliver`.
