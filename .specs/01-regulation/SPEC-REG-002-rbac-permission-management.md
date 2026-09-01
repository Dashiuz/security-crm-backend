# SPEC-REG-002: Control de Acceso Basado en Roles (RBAC) y Permisos

> **Estado**: `COMPLETADO`  
> **Módulo**: `regulation`  
> **Ubicación Backend**: `src/modules/regulation/access-control`, `role`, `permission`  
> **Ubicación Frontend**: `src/app/(protected)/regulation`  
> **Fecha de Especificación**: 2026-07-30  

---

## 1. Contexto de Negocio e Historias de Usuario

### 1.1 Objetivo
Proveer una arquitectura flexible y granular de Control de Acceso Basado en Roles (RBAC), donde cada acción del sistema está vinculada a un permiso específico (`modulo:accion`). Los usuarios se vinculan a roles, los cuales agrupan un conjunto dinámico de permisos.

### 1.2 Historias de Usuario
- **US-REG-04**: Como **Administrador**, quiero crear y personalizar roles (ej: `Supervisor de Noche`, `Operador de Minuta`) asignándoles un subconjunto de permisos.
- **US-REG-05**: Como **Sistema**, quiero denegar automáticamente las peticiones HTTP que no cuenten con el permiso estipulado por el decorador `@RequirePermissions()`.

---

## 2. Estructura de Permisos RBAC

### 2.1 Módulos y Dominio de Permisos
- **Módulo `minuta`**: `minuta:read`, `minuta:create`, `minuta:update`, `minuta:delete`, `minuta:manage`.
- **Módulo `user`**: `user:read`, `user:create`, `user:update`, `user:delete`, `user:manage`.
- **Módulo `role`**: `role:read`, `role:create`, `role:update`, `role:delete`, `role:manage`.
- **Módulo `tenant`**: `tenant:read`, `tenant:create`, `tenant:update`, `tenant:manage`.
- **Módulo `employee`**: `employee:read`, `employee:create`, `employee:update`, `employee:delete`, `employee:manage`.

---

## 3. Modelo de Datos (Prisma Schema Specification)

### 3.1 Modelos (`role.prisma`, `permission.prisma`, `rolePermission.prisma`, `userRole.prisma`)

```prisma
model Role {
  id          String           @id @default(cuid(2))
  tenantId    String?          // Nullable si es rol del sistema
  name        String
  code        String
  description String?
  isSystem    Boolean          @default(false)
  permissions RolePermission[]
  users       UserRole[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([tenantId])
  @@map("role")
}

model Permission {
  id          String           @id @default(cuid(2))
  code        String           @unique // Ej: "minuta:create"
  module      String
  name        String
  description String?
  roles       RolePermission[]

  @@map("permission")
}

model RolePermission {
  roleId       String
  role         Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permissionId String
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@id([roleId, permissionId])
  @@map("role_permission")
}
```

---

## 4. Contrato API REST (NestJS)

- **Guarda de Seguridad**: `PermissionsGuard` (`src/modules/regulation/access-control/permissions.guard.ts`)
- **Decorador**: `@RequirePermissions('minuta:read', 'minuta:create')`
- **Controladores**:
  - `RoleController` (`src/modules/regulation/role/role.controller.ts`)
  - `PermissionController` (`src/modules/regulation/permission/permission.controller.ts`)

---

## 5. Especificación Frontend (Next.js)

- **Ruta**: `src/app/(protected)/regulation/page.tsx`
- **Interfaz**: Matriz de permisos por rol con checkboxes interactivos para asignar/desasignar permisos en tiempo real.
