# SPEC-ADM-002: Gestión Extendida de Clientes, Prospectos y Cargas Masivas

> **Estado**: `EN_REVISIÓN`  
> **Módulo**: `administrative`  
> **Autor(es)**: `Antigravity / SDD Planning`  
> **Fecha de Creación**: `2026-08-21`  
> **Última Actualización**: `2026-08-21`  

---

## 1. Contexto de Negocio e Historias de Usuario

### 1.1 Objetivo
Esta especificación define la actualización mayor al sistema de gestión comercial de Noxia. Permite a las empresas de seguridad gestionar "Prospectos" (clientes potenciales en estudio) separados de los clientes activos con contrato, todo almacenado de manera segura en la misma base de datos pero segregado lógicamente por servicios independientes en el backend. Adicionalmente, expande agresivamente los metadatos de los clientes para almacenar contratos, contactos empresariales (representantes legales, consejos de administración) e infraestructura detallada (cuadrantes, múltiples porterías, canchas, etc.). Finalmente, incorpora un módulo de carga masiva por archivos CSV auditados para clientes y residentes, optimizando el onboarding de nuevos conjuntos residenciales.

### 1.2 Historias de Usuario
- **US-01**: Como **Administrador**, quiero **gestionar prospectos** para hacer seguimiento comercial sin mezclarlos con los clientes activos en la plataforma.
- **US-02**: Como **Administrador**, quiero **convertir un prospecto en cliente** al registrar sus datos de contrato y cerrar la negociación.
- **US-03**: Como **Operador**, quiero **subir un CSV de residentes y clientes** para hacer onboarding masivo ahorrando tiempo de carga manual.
- **US-04**: Como **Auditor**, quiero **ver un registro de las cargas CSV** para entender quién y cuándo inyectó datos masivos al sistema.

---

## 2. Definición de Permisos y Matriz RBAC

### 2.1 Permisos requeridos

| Permiso Code | Nombre Legible | Descripción | Rol por Defecto |
| :--- | :--- | :--- | :--- |
| `prospects:read` | Lectura de Prospectos | Consultar y listar prospectos | Admin, Comercial |
| `prospects:manage` | Admin Prospectos | Crear, editar y convertir prospectos | Admin, Comercial |
| `clients:read` | Lectura de Clientes | (Existente) Listar clientes | Admin, Operador |
| `clients:manage` | Admin Clientes | (Existente) Crear y editar clientes | Admin |
| `import:manage` | Gestión Cargas CSV | Subir y procesar archivos CSV | Admin |

### 2.2 Reglas Multi-Tenant y Seguridad
- **Aislamiento Obligatorio**: Tanto prospectos como clientes y logs de importación filtran por `tenantId` automáticamente a nivel Prisma.
- **Segregación Lógica**: El `ProspectsService` forzará `status = 'PROSPECT'` en todas sus peticiones. El `ClientsService` forzará `status != 'PROSPECT'`.

---

## 3. Modelo de Datos (Prisma Schema Specification)

### 3.1 `enums.prisma`
```prisma
enum ClientStatus {
  PROSPECT // Nuevo estado para identificar prospectos comerciales
  ACTIVE
  INACTIVE
}

enum AdministrationType {
  ENTERPRISE
  INDIVIDUAL
}

enum ResidentialComplexType {
  SINGLE_BUILDING
  BUILDING_CLUSTER
  HOUSE_CLUSTER
  MIXED // Nuevo tipo para Conjuntos Mixtos
  OTHER
}
```

### 3.2 `clients.prisma` (Modificaciones)
```prisma
model Client {
  // ... campos existentes

  clientStatus   ClientStatus   @default(PROSPECT) // Por defecto es prospecto hasta cerrar contrato
  
  // Información Contractual
  renewedContract       Boolean? @default(false)
  contractEndDate       DateTime?
  contractMediaFiles    Json?    @db.JsonB // Referencia IDs de MediaAttachment
  
  // Información Administrativa
  administrationType        AdministrationType?
  administrationCompanyData Json?    @db.JsonB // Zod Schema: Contactos empresa, rep legal, etc.
  councilData               Json?    @db.JsonB // Zod Schema: Presidente, tesorero, consejeros
  
  mediaAttachments MediaAttachment[]

  // ... campos de auditoria existentes
}
```

### 3.3 `client_properties.prisma` (Modificaciones)
```prisma
model ClientProperties {
  // ... campos existentes (hasParking se mantiene para privados)
  
  // Cancha Squash
  hasSquashCourt        Boolean? @default(false)
  squashCourtAmount     Int?     @default(0)
  
  // Parqueadero Invitados
  hasGuestParking       Boolean? @default(false)
  guestParkingAmount    Int?     @default(0)
  
  // Bicicleteros
  hasBicycleRack        Boolean? @default(false)
  bicycleRackAmount     Int?     @default(0)
  
  // Locales Comerciales
  hasCommercialStores   Boolean? @default(false)
  commercialStoresAmount Int?    @default(0)
  
  // Entradas y Accesos
  entriesDescription    Json?    @db.JsonB // Zod: Checkbox múltiples de tipos de entrada
  entriesMediaFiles     Json?    @db.JsonB // Ref a MediaAttachment IDs

  mediaAttachments MediaAttachment[]

  // ...
}
```

### 3.4 `tower.prisma` (Modificaciones)
```prisma
model Tower {
  // ...
  elevators Int @default(0)
  // ...
}
```

### 3.5 `media_attachments.prisma` (NUEVO)
Ubicación: `prisma/schema/media_attachment.prisma`
```prisma
model MediaAttachment {
  id          String   @id @default(cuid(2))   
  tenantId    String 
  tenant      Tenant   @relation(fields: [tenantId], references: [id])
 
  url         String   @db.Text
  s3Key       String   @unique 
  fileName    String            
  mimeType    String            
  sizeBytes   Int               
  
  // Relaciones Foráneas Nativas (Reemplazo de originalModelId genérico)
  clientId             String?
  client               Client?           @relation(fields: [clientId], references: [id], onDelete: Cascade)
  clientPropertiesId   String?
  clientProperties     ClientProperties? @relation(fields: [clientPropertiesId], references: [id], onDelete: Cascade)
  
  // NOTA: Se expandirán a Minuta, Residentes, etc., según aplique.

  uploadedById String  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([tenantId])
  @@index([clientId])
  @@map("media_attachments")
}
```

### 3.6 `file_import_logs.prisma` (NUEVO)
Ubicación: `prisma/schema/file_import_log.prisma`
```prisma
model FileImportLog {
  id          String   @id @default(cuid(2))   
  tenantId    String 
  tenant      Tenant   @relation(fields: [tenantId], references: [id])
  
  entityType  String   // "CLIENT", "RESIDENT"
  fileName    String
  status      String   // "SUCCESS", "PARTIAL", "FAILED"
  totalRows   Int
  successRows Int
  errorRows   Int
  errorDetails Json?   @db.JsonB

  uploadedBy  String   // userId
  createdAt   DateTime @default(now())

  @@index([tenantId])
  @@map("file_import_logs")
}
```

---

## 4. Contrato de API REST & Backend Specification (NestJS)

### 4.1 Modificaciones a `ClientsService` y DTOs
- **DTOs**: Hacer dinámicos (opcionales) los campos JSONB, validándolos con esquemas estrictos Zod en caso de venir con datos. Solo nombre, NIT, dirección y teléfono son `IsNotEmpty()`.
- **Lógica `findAll`**: Injectar `where: { clientStatus: { not: 'PROSPECT' } }`.

### 4.2 Nuevo Módulo: `Prospects`
- **Controlador**: `ProspectsController` bajo `/api/v1/administrative/prospects`.
- **Servicio**: `ProspectsService` reciclando `PrismaService` en el modelo `Client`, pero inyectando obligatoriamente `where: { clientStatus: 'PROSPECT' }`.
- **Conversión**: Endpoint `POST /:id/convert` para cambiar de Prospecto a Cliente (`clientStatus = 'ACTIVE'`).

### 4.3 Endpoints CSV
- `POST /api/v1/administrative/clients/import/csv`
- `POST /api/v1/administrative/resident/import/csv` (Módulo existente de residentes).
- Retornarán un array de datos (preview) o confirmarán el procesamiento usando `FileImportLog`.

---

## 5. Especificación Frontend (Next.js App Router)

### 5.1 Modificaciones del Navbar
- Renombrar "Mis Compradores" a "Mis Clientes".
- Submenús: Prospectos, Estudios de Seguridad, Proyectos de Tecnología, Clientes (Listado, Cargar Existentes).
- "Mis Recursos" -> Añadir "Dotaciones" e "Inventario".

### 5.2 Vistas de Prospectos y Clientes (MUI)
- `/administrative/prospects`: Tabla similar a clientes.
- `/administrative/prospects/create`: Wizard MUI de 2 pasos (Ubicación, Estructura).
- `/administrative/clients/create`: Wizard MUI de 5 pasos.

### 5.3 Módulo CSV
- UI Modal con Drag & Drop (`react-dropzone` si es posible, o input file nativo).
- Previsualización en `@mui/x-data-grid` (máximo 100 rows).
- Estados de UI: Cargando, Éxito, Error (con log detallado).

---

## 6. Criterios de Aceptación

- [ ] Las migraciones de Prisma se ejecutan sin error (generando los nuevos campos y modelos, respetando datos anteriores).
- [ ] La inserción masiva por CSV queda rastreada en `FileImportLog` sin saturar la DB y los registros individuales quedan en `AuditLog`.
- [ ] `ProspectsService` jamás devuelve un cliente que ya cerró contrato.
- [ ] La UI frontend respeta el sistema de validación de NestJS para los campos JSONB de contratos y asamblea.
- [ ] Next.js Navbar actualizado y las redirecciones funcionan a los paths indicados.
