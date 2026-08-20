# SPEC-ADM-001: Ecosistema de Estructura Residencial y Gestión de Residentes

> **Estado**: `EN_REVISIÓN`  
> **Módulo**: `administrative`  
> **Autor(es)**: `Arquitectura Noxia / SDD`  
> **Fecha de Creación**: `2026-08-13`  
> **Última Actualización**: `2026-08-13`  

---

## 1. Contexto de Negocio e Historias de Usuario

### 1.1 Objetivo
Integrar un motor completo de modelado de propiedades residenciales (Edificios Simples, Conjuntos de Torres, Conjuntos de Casas) al módulo de Clientes (Conjuntos Residenciales) en **Noxia**. Este ecosistema permite mapear jerárquicamente las propiedades físicas de un cliente (Torres -> Pisos -> Unidades/Apartamentos) y vincular residentes a sus respectivas viviendas con control estricto de roles (`OWNER`, `TENANT`, `FAMILY_MEMBER`, `OTHER`), trazabilidad multitenant y rendimiento garantizado en transacciones masivas.

### 1.2 Historias de Usuario (User Stories)
- **US-01 (Administrador)**: Como **Administrador de la Empresa de Seguridad**, quiero registrar la estructura física de un conjunto residencial (tipo de complejo, cantidad de torres, pisos y apartamentos o casas) durante la creación del cliente, para generar automáticamente el catálogo de unidades del inmueble.
- **US-02 (Supervisor / Administrador)**: Como **Administrador / Supervisor**, quiero consultar el detalle del cliente en una vista dedicada con pestañas (Tabs) de Información General y Residentes, para actualizar datos de contacto o gestionar el censo de viviendas.
- **US-03 (Administrador)**: Como **Administrador de Seguridad**, quiero asociar residentes a unidades específicas, garantizando que **solo exista un Propietario (`OWNER`) activo por unidad** y permitiendo registrar inquilinos y familiares.
- **US-04 (Operador)**: Como **Operador de Seguridad**, quiero filtrar el censo de residentes dinámicamente por torre, piso, unidad o nombre, para agilizar la verificación de identidad en los accesos.

---

## 2. Definición de Permisos y Matriz RBAC

### 2.1 Permisos requeridos
Se agregarán los siguientes permisos al catálogo global (`seed-features.ts`) y se protegerán mediante `@RequirePermissions(...)`:

| Permiso Code | Nombre Legible | Descripción | Rol por Defecto |
| :--- | :--- | :--- | :--- |
| `resident:read` | Lectura de Residentes | Consultar residentes de un cliente/unidad | Guardia, Supervisor, Admin |
| `resident:create` | Creación de Residentes | Vincular nuevos residentes a unidades | Supervisor, Admin |
| `resident:update` | Edición de Residentes | Modificar información de residentes existentes | Supervisor, Admin |
| `resident:delete` | Baja de Residentes | Inhabilitar/desvincular residentes (soft-delete) | Admin, Godlike |
| `resident:manage` | Control Total de Residentes | Control completo sobre la gestión de residentes | SuperAdmin, Godlike |

### 2.2 Reglas Multi-Tenant y Seguridad
- [x] **Aislamiento Obligatorio**: Todas las consultas a `ClientProperties`, `Tower`, `Floor`, `Unit` y `Resident` heredan automáticamente el filtro por `tenantId` a través de `audit-extension.ts` y `RequestContextService`.
- [x] **Regla de Propietario Único (`OWNER`)**: Un intento de crear o actualizar un residente con tipo `OWNER` sobre una unidad que ya cuenta con un `OWNER` activo (`deletedAt: null`) rechazará la solicitud con un HTTP `400 Bad Request`.
- [x] **Cascada Segura y Soft-Delete**: La desactivación/baja de un residente marca `deletedAt` y `deletedById`, permitiendo reasignar la unidad a un nuevo residente sin perder el historial auditado.

---

## 3. Modelo de Datos (Prisma Schema Specification)

### 3.1 Correcciones Arquitectónicas de Tipos ID
Se eliminan las anotaciones erróneas `@db.Uuid` en las claves foráneas de `client_properties.prisma`, `tower.prisma`, `floor.prisma`, `unit.prisma` y `resident.prisma`, estandarizándolas a `String` (compatible con los CUID2 de `Tenant` y `Client`).

### 3.2 Esquemas Ajustados

#### `prisma/schema/client_properties.prisma`
```prisma
model ClientProperties {
    id       String @id @default(cuid(2))
    tenantId String
    tenant   Tenant @relation(fields: [tenantId], references: [id])
    clientId String @unique
    client   Client @relation(fields: [clientId], references: [id], onDelete: Cascade)

    structureType         ResidentialComplexType @default(BUILDING_CLUSTER)
    towersAmount          Int?                   @default(0)
    unitsAmount           Int?                   @default(0)
    hasSocialRoom         Boolean?               @default(false)
    socialRoomAmount      Int?                   @default(0)
    hasGym                Boolean?               @default(false)
    gymAmount             Int?                   @default(0)
    hasPool               Boolean?               @default(false)
    poolAmount            Int?                   @default(0)
    hasTennisCourt        Boolean?               @default(false)
    tennisCourtAmount     Int?                   @default(0)
    hasBasketballCourt    Boolean?               @default(false)
    basketballCourtAmount Int?                   @default(0)
    hasFootballCourt      Boolean?               @default(false)
    footballCourtAmount   Int?                   @default(0)
    hasVolleyballCourt    Boolean?               @default(false)
    volleyballCourtAmount Int?                   @default(0)
    hasPlayground         Boolean?               @default(false)
    playgroundAmount      Int?                   @default(0)
    hasParking            Boolean?               @default(false)
    parkingAmount         Int?                   @default(0)
    hasStorageRoom        Boolean?               @default(false)
    storageRoomAmount     Int?                   @default(0)

    createdAt DateTime  @default(now())
    updatedAt DateTime  @updatedAt
    deletedAt DateTime?
    createdBy String?
    updatedBy String?
    deletedBy String?

    @@index([tenantId])
    @@index([clientId])
    @@map("client_properties")
}
```

#### `prisma/schema/tower.prisma`
```prisma
model Tower {
    id       String @id @default(cuid(2))
    tenantId String
    tenant   Tenant @relation(fields: [tenantId], references: [id])
    clientId String
    client   Client @relation(fields: [clientId], references: [id], onDelete: Cascade)

    towerName    String @db.VarChar(50)
    floorsAmount Int    @default(0)

    createdAt DateTime  @default(now())
    updatedAt DateTime  @updatedAt
    deletedAt DateTime?
    createdBy String?
    updatedBy String?
    deletedBy String?

    units  Unit[]
    floors Floor[]

    @@index([tenantId])
    @@index([clientId])
    @@map("towers")
}
```

#### `prisma/schema/floor.prisma`
```prisma
model Floor {
    id       String @id @default(cuid(2))
    tenantId String
    tenant   Tenant @relation(fields: [tenantId], references: [id])
    clientId String
    client   Client @relation(fields: [clientId], references: [id], onDelete: Cascade)
    towerId  String?
    tower    Tower? @relation(fields: [towerId], references: [id], onDelete: Cascade)

    floorNumber Int @default(0)

    createdAt DateTime  @default(now())
    updatedAt DateTime  @updatedAt
    deletedAt DateTime?
    createdBy String?
    updatedBy String?
    deletedBy String?

    units Unit[]

    @@index([tenantId])
    @@index([clientId])
    @@index([towerId])
    @@map("floors")
}
```

#### `prisma/schema/unit.prisma`
```prisma
model Unit {
    id       String @id @default(cuid(2))
    tenantId String
    tenant   Tenant @relation(fields: [tenantId], references: [id])
    clientId String
    client   Client @relation(fields: [clientId], references: [id], onDelete: Cascade)
    towerId  String?
    tower    Tower? @relation(fields: [towerId], references: [id], onDelete: Cascade)
    floorId  String?
    floor    Floor? @relation(fields: [floorId], references: [id], onDelete: Cascade)

    unitName String   @db.VarChar(50)
    unitType UnitType @default(APARTMENT)

    createdAt DateTime  @default(now())
    updatedAt DateTime  @updatedAt
    deletedAt DateTime?
    createdBy String?
    updatedBy String?
    deletedBy String?

    residents Resident[]

    @@index([tenantId])
    @@index([clientId])
    @@index([towerId])
    @@index([floorId])
    @@map("units")
}
```

#### `prisma/schema/resident.prisma`
```prisma
model Resident {
    id              String       @id @default(cuid(2))
    tenantId        String
    tenant          Tenant       @relation(fields: [tenantId], references: [id])
    clientId        String
    client          Client       @relation(fields: [clientId], references: [id], onDelete: Cascade)
    unitId          String
    unit            Unit         @relation(fields: [unitId], references: [id], onDelete: Cascade)
    residentType    ResidentType
    idType          IdType?
    firstName       String
    lastName        String
    document        String
    phoneNumber     String
    email           String?
    gender          String?      @db.VarChar(1)
    birthdate       DateTime?
    residentSince   DateTime
    accessStartDate DateTime?
    accessEndDate   DateTime?

    createdAt   DateTime @default(now())
    createdById String?
    createdBy   User?    @relation("ResidentCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)

    updatedAt   DateTime @updatedAt
    updatedById String?
    updatedBy   User?    @relation("ResidentUpdatedBy", fields: [updatedById], references: [id], onDelete: SetNull)

    deletedAt   DateTime?
    deletedById String?
    deletedBy   User?    @relation("ResidentDeletedBy", fields: [deletedById], references: [id], onDelete: SetNull)

    @@unique([tenantId, clientId, document])
    @@index([tenantId])
    @@index([clientId])
    @@index([unitId])
    @@map("resident")
}
```

---

## 4. Contrato de API REST & Backend Specification (NestJS)

### 4.1 Ubicación en Backend
- **Módulo**: `src/modules/administrative/client` y `src/modules/administrative/resident`
- **Controladores**:
  - `src/modules/administrative/client/controllers/client.controller.ts`
  - `src/modules/administrative/resident/controllers/resident.controller.ts`
- **Servicios**:
  - `src/modules/administrative/client/services/client.service.ts`
  - `src/modules/administrative/client/services/client-structure-generator.service.ts`
  - `src/modules/administrative/resident/services/resident.service.ts`

### 4.2 Algoritmo Optimizado de Generación Masiva (`ClientStructureGeneratorService`)
Para evitar bloqueos o sobrecarga al procesar estructuras complejas (e.g. 5 torres x 20 pisos x 5 aptos = 500 unidades):
1. **Fórmula de Nomenclatura**:
   - `SINGLE_BUILDING`: `"Piso {F} - Apto {N}"` o `"Apto {F0N}"` (e.g. `"Piso 4 - Apto 404"`).
   - `BUILDING_CLUSTER`: `"{NombreTorre} - {F0N}"` (e.g. `"Torre 1 - 404"`, `"Torre Sur - 2002"`).
   - `HOUSE_CLUSTER`: `"Casa {N}"` o `"Manzana {M} - Casa {N}"`.
2. **Inserción en Lote Transaccional (`$transaction` + `createMany`)**:
   - Las torres se crean e insertan reteniendo IDs.
   - Los pisos se insertan en lote mediante `prisma.floor.createMany()`.
   - Las unidades se insertan en lote mediante `prisma.unit.createMany()`.
   - Todo envuelto en un único `$transaction` atómico.

### 4.3 Endpoints REST

#### `POST /api/v1/administrative/clients/with-structure`
- **Permiso**: `@RequirePermissions('client:create')`
- **Payload**: Datos generales de `Client` + configuración de `ClientProperties` + estructura de torres/pisos/unidades.

#### `GET /api/v1/administrative/clients/:id`
- **Permiso**: `@RequirePermissions('client:read')`
- **Respuesta**: Datos del cliente incluyendo `clientProperties`, conteo de estructuras y metadatos de auditoría (`createdBy`).

#### `GET /api/v1/administrative/residents/by-client/:clientId`
- **Permiso**: `@RequirePermissions('resident:read')`
- **Query Params**: `search`, `towerId`, `floorId`, `unitId`, `residentType`, `page`, `limit`.

#### `POST /api/v1/administrative/residents`
- **Permiso**: `@RequirePermissions('resident:create')`
- **Validación**: Verifica si ya existe un `OWNER` activo en `unitId`.

#### `PATCH /api/v1/administrative/residents/:id`
- **Permiso**: `@RequirePermissions('resident:update')`

#### `DELETE /api/v1/administrative/residents/:id`
- **Permiso**: `@RequirePermissions('resident:delete')`
- **Efecto**: Soft-delete (`deletedAt = now()`).

---

## 5. Especificación Frontend (Next.js App Router)

### 5.1 Reestructuración de Navegación (`Navbar.tsx`)
En el menú lateral / panel administrativo se configuran dos subpaneles acoplados:
1. **"Mis Recursos"**:
   - Empleados (`/administrative/employees`)
   - Usuarios (`/administrative/users`)
   - Departamentos (`/administrative/departments`)
   - Posiciones (`/administrative/positions`)
   - Control de Roles (`/regulation/roles`)
2. **"Mis Compradores"**:
   - Clientes / Conjuntos Residenciales (`/administrative/clients`)

### 5.2 Flujo de Vistas y Pantallas

1. **Tabla de Clientes (`/administrative/clients`)**:
   - Mantiene filtros y listado.
   - El botón **"Crear Nuevo"** redirige a `/administrative/clients/new`.
   - La columna de acciones contiene únicamente el icono de ojo **"Ver Detalles"**, redirigiendo a `/administrative/clients/[id]`.

2. **Pantalla Completa de Creación (`/administrative/clients/new`)**:
   - Formulario por pasos (Stepper / Accordion) de alta estética UI/UX Pro Max:
     - **Paso 1: Información Legal y Comercial** (NIT, Nombre, Dirección, Contratos, Contactos).
     - **Paso 2: Configuración del Inmueble** (Dropdown de Sector -> Tipo de Complejo: `SINGLE_BUILDING`, `BUILDING_CLUSTER`, `HOUSE_CLUSTER`, `OTHER`).
     - **Paso 3: Constructor de Estructura Física** (Configurador dinámico de torres, pisos y apartamentos por piso, con soporte para variaciones por piso).
   - Botón de guardado con feedback en tiempo real. Al finalizar, redirige a la tabla de clientes.

3. **Pantalla Completa de Detalle (`/administrative/clients/[id]`)**:
   - **Tab 1: "Información del Cliente"**:
     - Vista con inputs en estado readonly por defecto y botón de lápiz al extremo derecho.
     - Detección de cambios ("dirty state"): El botón flotante o superior **"Guardar Cambios"** aparece dinámicamente solo si hay modificaciones.
     - Al guardar, solicita confirmación con diálogo antes de despachar el patch al backend.
   - **Tab 2: "Residentes del Conjunto"**:
     - Tabla dinámica con filtros por Torre, Piso, Unidad, Nombre de Residente, Documento y Tipo.
     - Acciones por residente: Editar (Modal de edición) y Dar de Baja (Diálogo de confirmación exacto).
     - Botón **"Registrar Residente"**: Abre formulario modal con selector de unidad y validación de `OWNER`.

---

## 6. Criterios de Aceptación y Matriz de Verificación

- [ ] **Esquema Prisma**: Corrección ejecutada en `prisma/schema/*`, libre de errores `@db.Uuid` y sincronizada en Postgres.
- [ ] **Generador Estructural Transaccional**: Verificación de creación masiva de 500+ unidades en menos de 200ms mediante batching `$transaction`.
- [ ] **Regla OWNER Único**: Intento de registrar 2 propietarios activos en la misma unidad arroja error HTTP 400.
- [ ] **Navegación Navbar**: Sub-paneles "Mis Recursos" y "Mis Compradores" desplegables e intuitivos.
- [ ] **Vistas Redirigidas**: "Crear Nuevo" y "Ver Detalle" cargan en páginas dedicadas de pantalla completa.
- [ ] **Dirty State & Confirmation**: Tab de información del cliente solo muestra "Guardar Cambios" cuando hay edición y exige confirmación.
- [ ] **OpenAPI / Swagger**: Todos los endpoints expuestos adecuadamente en `/api/docs`.
