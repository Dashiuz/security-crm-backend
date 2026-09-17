# SPEC-REG-009: Expansión Arquitectónica del Perfil de Tenant (B2B SaaS)

> **Estado**: `COMPLETADO`  
> **Módulo**: `regulation` / `tenant`  
> **Autor(es)**: AI / User  
> **Fecha de Creación**: 2026-09-16  
> **Última Actualización**: 2026-09-17  

---

## 1. Contexto de Negocio e Historias de Usuario

### 1.1 Objetivo
Actualmente, el modelo de datos `Tenant` es muy escueto, abarcando únicamente identificación básica (slug, nombre) y configuraciones visuales (branding). Dado que el sistema funciona bajo un esquema SaaS B2B, es imperativo recolectar información robusta del cliente directo (la empresa administradora o de seguridad). Esto permitirá en el futuro automatizar facturación, controlar capacidades (quotas), configurar políticas de seguridad y parametrizar la zona horaria del cliente. 

Siguiendo principios de Clean Architecture y normalización, no se sobrecargará la tabla principal `Tenant`. En su lugar, se crearán entidades complementarias en relación 1 a 1: `TenantProfile` (Datos Legales y Contacto), `TenantSubscription` (Facturación y Límites), y `TenantSettings` (Configuración Operativa y Seguridad).

### 1.2 Historias de Usuario (User Stories)
- **US-01**: Como **SuperAdmin (GODLIKE)**, quiero poder registrar la razón social, NIT y datos de contacto de las empresas de seguridad al crear su Tenant, para **tener el registro legal formal de mis clientes**.
- **US-02**: Como **SuperAdmin (GODLIKE)**, quiero poder definir qué tipo de suscripción tiene el Tenant (Basic, Pro, Enterprise) y sus límites máximos (ej. 50 conjuntos), para **monitorear o bloquear el consumo excesivo**.
- **US-03**: Como **Administrador de la Empresa (Tenant)**, quiero tener asignada una Zona Horaria específica (`timezone`), para que **toda la auditoría y bitácoras (minutas) queden registradas con la hora exacta local del país/ciudad donde opero**.
- **US-04**: Como **Administrador de la Empresa (Tenant)**, quiero poder configurar parámetros de seguridad (ej. `sessionTimeoutMinutes`) y personalización avanzada (favicon, página de inicio de sesión) para **dar una experiencia de marca blanca integral a mis empleados y clientes**.

---

## 2. Definición de Permisos y Matriz RBAC / Seguridad Multi-Tenant

### 2.1 Permisos requeridos
- `godlike:manage`: Requerido para crear Tenants y modificar la suscripción (`TenantSubscription`).
- `tenant:manage`: (Nuevo o existente) Para que el Administrador local modifique su `TenantProfile` y `TenantSettings`.
- `tenant:read`: Para visualizar el propio perfil.

### 2.2 Reglas Multi-Tenant y Seguridad
- **Aislamiento 1 a 1**: Los nuevos modelos tienen relación `@unique` con el `tenantId`.
- **Escalamiento de Privilegios**: Los administradores locales del tenant **NO** pueden modificar su propia suscripción o límites (`TenantSubscription`). Esta tabla será de solo lectura para el Tenant y de escritura exclusiva para roles `GODLIKE`.

---

## 3. Modelo de Datos (Prisma) y DTOs

### 3.1 Cambios en Esquema Prisma (`prisma/schema/tenant.prisma`)

```prisma
enum PlanTier {
  BASIC
  PRO
  ENTERPRISE
}

enum SubscriptionStatus {
  TRIAL
  ACTIVE
  PAST_DUE
  CANCELED
}

enum PasswordPolicy {
  LOW
  MEDIUM
  STRICT
}

// Actualizar modelo Tenant para incluir relaciones
model Tenant {
  // ... campos actuales ...
  
  profile        TenantProfile?
  subscription   TenantSubscription?
  settings       TenantSettings?
}

model TenantProfile {
  id                String  @id @default(cuid(2))
  tenantId          String  @unique
  tenant            Tenant  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  legalName         String  @db.VarChar(150)
  taxId             String  @db.VarChar(50) // NIT/RUT
  contactEmail      String  @db.VarChar(100)
  contactPhone      String? @db.VarChar(50)
  address           String? @db.VarChar(200)
  city              String? @db.VarChar(100)
  country           String? @db.VarChar(100)
  legalRepresentative String? @db.VarChar(150)

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  @@map("tenant_profiles")
}

model TenantSubscription {
  id                String             @id @default(cuid(2))
  tenantId          String             @unique
  tenant            Tenant             @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  planTier          PlanTier           @default(BASIC)
  status            SubscriptionStatus @default(TRIAL)
  
  maxClients        Int                @default(5)
  maxUsers          Int                @default(50)
  maxEmployees      Int                @default(50)
  
  subscriptionEndsAt DateTime?
  paymentGatewayId   String?           @db.VarChar(100)

  createdAt         DateTime           @default(now())
  updatedAt         DateTime           @updatedAt
  
  @@map("tenant_subscriptions")
}

model TenantSettings {
  id                String          @id @default(cuid(2))
  tenantId          String          @unique
  tenant            Tenant          @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  // Operativa
  timezone          String          @default("America/Bogota") @db.VarChar(50)
  currency          String          @default("COP") @db.VarChar(10)
  dateFormat        String          @default("DD/MM/YYYY") @db.VarChar(20)
  
  // Seguridad
  mfaRequired       Boolean         @default(false)
  sessionTimeoutMinutes Int         @default(60)
  passwordPolicy    PasswordPolicy  @default(MEDIUM)
  
  // White-labeling avanzado
  faviconUrl        String?         @db.VarChar(255)
  loginBackgroundUrl String?        @db.VarChar(255)
  supportEmail      String?         @db.VarChar(100)
  supportPhone      String?         @db.VarChar(50)

  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt
  
  @@map("tenant_settings")
}
```

---

## 4. Arquitectura y Endpoints

### 4.1 Modificaciones a `TenantService` y `TenantController`
Se actualizará el módulo `tenant` (probablemente `src/modules/regulation/tenant`) para manejar los nuevos modelos satélites. 

1. **`POST /tenant` (Creación de Tenant por GODLIKE)**
   - El DTO de creación de Tenant debe aceptar opcionalmente un bloque `profile`, `subscription`, y `settings`.
   - El `TenantService` creará el Tenant y paralelamente `TenantProfile`, `TenantSubscription`, `TenantSettings` mediante `prisma.$transaction`.
   - Se establecerán valores por defecto si no son provistos.

2. **`GET /tenant/:id`**
   - El response incluirá `profile`, `subscription` y `settings`.

3. **`PATCH /tenant/:id` (Actualización por GODLIKE)**
   - Permitirá actualizar todos los modelos adjuntos, en especial la suscripción.

4. **NUEVO: `PATCH /tenant/me/profile` y `PATCH /tenant/me/settings`**
   - Endpoints diseñados para que el Administrador de la empresa (sin rol GODLIKE) pueda actualizar **sus propios** datos legales y configuraciones, aislando la lógica para que jamás puedan manipular el modelo `TenantSubscription`.

### 4.2 Restricciones de DTOs y Seguridad
- El `UpdateTenantSubscriptionDto` solo será expuesto a nivel de controlador para rutas protegidas exclusivamente por `godlike:manage`.

---

## 5. Criterios de Aceptación y Plan de Pruebas

### 5.1 Criterios de Aceptación
- [x] Prisma Schema actualizado, formateado y migrado (`prisma generate`, `prisma migrate dev` o db push para desarrollo).
- [x] DTOs actualizados en el módulo de Tenants utilizando `class-validator` y reflejando correcta documentación en Swagger.
- [x] Creación de Tenant automatizada inyecta registros por defecto en `TenantProfile`, `TenantSubscription` y `TenantSettings`.
- [x] El script de Seed (`prisma/seed.ts`) no se rompe y asigna configuración por defecto al tenant `system` y al tenant `p1vk4imb6ugp1z0flglw86pk`.
- [x] Usuario con rol `GODLIKE` puede leer/actualizar todo.
- [x] Usuario con rol local `ADMIN` puede leer/actualizar perfil y configuraciones de su propio tenant, pero no modificar su suscripción.

### 5.2 Plan de Pruebas Técnicas
1. **Compilación y TypeScript**: Verificar que no existen errores tipográficos.
2. **Swagger Docs**: Revisar que los nuevos campos anidados se muestren adecuadamente en la documentación.
3. **Petición Local**:
   - Crear un Tenant completo.
   - Tratar de inyectar una modificación en `subscription` con un token que no es GODLIKE (debe ignorarse o dar error).

---

## 6. Siguientes Pasos (Next Steps)
1. Revisión de este spec por parte del equipo de Arquitectura.
2. Ejecutar modificaciones en Prisma (`tenant.prisma`).
3. Refactorizar DTOs y lógica del `TenantService`.
4. Probar endpoints.
