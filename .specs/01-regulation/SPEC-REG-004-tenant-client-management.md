# SPEC-REG-004: Gestión Multi-Tenant y Aprovisionamiento de Clientes / Sedes

> **Estado**: `COMPLETADO`  
> **Módulo**: `regulation`  
> **Ubicación Backend**: `src/modules/regulation/tenant`, `client`  
> **Ubicación Frontend**: `src/app/(protected)/regulation`  
> **Fecha de Especificación**: 2026-07-30  

---

## 1. Contexto de Negocio e Historias de Usuario

### 1.1 Objetivo
Permitir la creación y administración de Clientes (Empresas de seguridad o Copropiedades) y sus respectivas sedes/tenants. Cada tenant opera como una frontera de seguridad aislada donde residen sus minutas, empleados, usuarios y configuraciones.

### 1.2 Historias de Usuario
- **US-REG-08**: Como **SuperAdmin (`GODLIKE`)**, quiero crear un nuevo cliente empresarial y aprovisionar sus sedes/tenants asignando las características (`features`) contratadas.
- **US-REG-09**: Como **Sistema**, quiero aplicar de manera automática los filtros de tenant en todas las consultas de base de datos para prevenir fugas cruzadas de información.

---

## 2. Modelo de Datos (Prisma Schema Specification)

### 2.1 Modelos (`tenant.prisma`, `clients.prisma`, `feature.prisma`)

```prisma
model Client {
  id        String   @id @default(cuid(2))
  name      String
  code      String   @unique
  nit       String?
  tenants   Tenant[]
  createdAt DateTime @default(now())

  @@map("client")
}

model Tenant {
  id        String   @id @default(cuid(2))
  clientId  String
  client    Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)
  name      String
  code      String   @unique // Ej: "comercial_01", "system"
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())

  users     User[]
  minutas   Minuta[]

  @@map("tenant")
}
```

---

## 3. Contrato API REST (NestJS)

- **Controlador**: `TenantController` (`src/modules/regulation/tenant/tenant.controller.ts`) y `FeatureController` (`src/modules/regulation/tenant/feature.controller.ts`)
- **Servicio**: `TenantService` (`src/modules/regulation/tenant/tenant.service.ts`)
- **Ruta Base**: `/api/v1/regulation/tenant`
