# SPEC-OPE-004: Control de Parqueaderos y Vehículos de Residentes / Visitantes

> **Estado**: `COMPLETADO`  
> **Módulo**: `operation`  
> **Ubicación Backend**: `src/modules/operation/minuta`  
> **Ubicación Frontend**: `src/app/(protected)/operation/parking`  
> **Fecha de Especificación**: 2026-07-30  

---

## 1. Contexto de Negocio e Historias de Usuario

### 1.1 Objetivo
Controlar la asignación de celdas de parqueadero de visitantes o residentes, ingreso/salida de vehículos, estado físico/inventario del vehículo al ingresar (espejos, antenas, radio, llanta de repuesto, rayones) y verificación de tickets o fichas de parqueadero.

### 1.2 Historias de Usuario
- **US-OPE-10**: Como **Guardia de Seguridad**, quiero registrar el ingreso de un vehículo asignándole un número de parqueadero, ticket y lista de inventario físico del vehículo para prevenir reclamos.
- **US-OPE-11**: Como **Guardia de Seguridad**, quiero registrar la salida del vehículo liberando la celda de parqueadero asignada.
- **US-OPE-12**: Como **Supervisor**, quiero consultar la ocupación actual de los parqueaderos y detectar vehículos que hayan superado el tiempo máximo permitido.

---

## 2. Definición de Permisos y Matriz RBAC

| Permiso Code | Nombre Legible | Descripción | Asignación por Defecto |
| :--- | :--- | :--- | :--- |
| `minuta:read` | Consultar Parqueaderos | Ver ocupación y registros | GUARD, SUPERVISOR, ADMIN |
| `minuta:create` | Registrar Ingreso Vehicular| Registro de ingreso y celda | GUARD, SUPERVISOR |
| `minuta:update` | Registrar Salida Vehicular| Marcar salida de parqueadero | GUARD, SUPERVISOR, ADMIN |
| `minuta:delete` | Eliminar Registro | Soft delete de registros | ADMIN, GODLIKE |
| `minuta:manage` | Control Total Parqueadero | Gestión completa de celdas | ADMIN, GODLIKE |

---

## 3. Modelo de Datos (Prisma Schema Specification)

### 3.1 Modelo: `ParkingResidentVehicleControl` (`prisma/schema/parking_resident_vehicle_control.prisma`)

```prisma
model ParkingResidentVehicleControl {
  id       String @id @default(cuid(2))
  tenantId String
  tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Restrict)

  // Core
  date       DateTime @db.Date
  time       DateTime @db.Time
  occurredAt DateTime

  // Datos Vehículo y Parqueadero
  entryTime     String
  parkingNumber String
  ticketNumber  String?
  interior      String?
  apartment     String?
  plate         String
  brand         String?
  color         String?

  // Inventario y Estado del Vehículo
  mirrors          Boolean?
  antenna          Boolean?
  radio            Boolean?
  spareTire        Boolean?
  hubcaps          Boolean?
  vehicleChecklist Json?
  condition        VehicleCondition @default(GOOD) // GOOD, REGULAR, DAMAGED

  // Salida
  exitTime String?
  exitAt   DateTime?

  observations String?
  status       RecordStatus @default(ACTIVE)

  source      RecordSource @default(WEB)
  externalRef String?

  createdAt   DateTime @default(now())
  createdById String?
  createdBy   User?    @relation("ParkingCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)

  updatedAt   DateTime @updatedAt
  updatedById String?
  updatedBy   User?    @relation("ParkingUpdatedBy", fields: [updatedById], references: [id], onDelete: SetNull)

  deletedAt   DateTime?
  deletedById String?
  deletedBy   User?    @relation("ParkingDeletedBy", fields: [deletedById], references: [id], onDelete: SetNull)

  @@index([tenantId])
  @@index([tenantId, plate])
  @@index([tenantId, parkingNumber])
  @@map("parking_resident_vehicle_control")
}
```

---

## 4. Contrato API REST (NestJS)

- **Controlador**: `ParkingControlController` (`src/modules/operation/minuta/controllers/parking-control.controller.ts`)
- **Servicio**: `ParkingControlService` (`src/modules/operation/minuta/services/parking-control.service.ts`)
- **Ruta Base**: `/api/v1/operation/minuta/parking-control`

### Endpoints
1. `POST /`: Registrar ingreso vehicular y asignación de parqueadero. DTO: `CreateParkingControlDto`. Permiso: `minuta:create` / `minuta:manage`.
2. `GET /`: Listar registros de parqueadero. Permiso: `minuta:read` / `minuta:manage`.
3. `GET /:id`: Obtener registro de parqueadero por ID. Permiso: `minuta:read` / `minuta:manage`.
4. `PATCH /:id`: Registrar salida de vehículo (`exitTime`, `exitAt`, `observations`, `condition`). DTO: `UpdateParkingControlDto`. Permiso: `minuta:update` / `minuta:manage`.
5. `DELETE /:id`: Soft delete. Permiso: `minuta:delete` / `minuta:manage`.

---

## 5. Especificación Frontend (Next.js)

- **Ruta**: `src/app/(protected)/operation/parking/page.tsx`
- **Interfaz**:
  - Grid/Tabla de ocupación de parqueaderos activos (placa, celda, tiempo transcurrido).
  - Formulario con switches/checkboxes para el checklist de inventario vehicular (espejos, repuesto, antena).
  - Botón de liberación rápida de celda de parqueadero al salir.
