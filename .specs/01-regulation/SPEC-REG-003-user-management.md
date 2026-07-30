# SPEC-REG-003: Administración de Usuarios y Cuentas de Acceso

> **Estado**: `COMPLETADO`  
> **Módulo**: `regulation`  
> **Ubicación Backend**: `src/modules/regulation/user`  
> **Ubicación Frontend**: `src/app/(protected)/regulation`  
> **Fecha de Especificación**: 2026-07-30  

---

## 1. Contexto de Negocio e Historias de Usuario

### 1.1 Objetivo
Permitir la creación, edición, inhabilitación y gestión de credenciales de usuarios del sistema asociados a los distintos tenants del cliente, asegurando la asignación adecuada de roles y vínculos con empleados.

### 1.2 Historias de Usuario
- **US-REG-06**: Como **Administrador del Tenant**, quiero crear usuarios especificando email, nombre, contraseña y asignar uno o varios roles para habilitar su acceso al sistema.
- **US-REG-07**: Como **Administrador**, quiero inhabilitar una cuenta de usuario sin borrar su historial de anotaciones de minuta.

---

## 2. Definición de Permisos y Matriz RBAC

| Permiso Code | Nombre Legible | Descripción | Asignación por Defecto |
| :--- | :--- | :--- | :--- |
| `user:read` | Consultar Usuarios | Lectura de cuentas | ADMIN, SUPERVISOR |
| `user:create` | Crear Usuario | Registro de nuevas cuentas | ADMIN |
| `user:update` | Editar Usuario | Modificar datos/roles de usuario | ADMIN |
| `user:delete` | Inhabilitar/Soft Delete| Desactivación de cuentas | ADMIN, GODLIKE |
| `user:manage` | Control Total Usuarios | Gestión completa de usuarios | ADMIN, GODLIKE |

---

## 3. Modelo de Datos (Prisma Schema Specification)

### 3.1 Modelo: `User` (`prisma/schema/user.prisma`)

```prisma
model User {
  id           String     @id @default(cuid(2))
  tenantId     String
  tenant       Tenant     @relation(fields: [tenantId], references: [id], onDelete: Restrict)
  email        String     @unique
  passwordHash String
  firstName    String
  lastName     String
  isActive     Boolean    @default(true)
  employeeId   String?    @unique
  employee     Employee?  @relation(fields: [employeeId], references: [id], onDelete: SetNull)

  userRoles    UserRole[]
  sessions     UserSession[]

  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  @@index([tenantId])
  @@map("user")
}
```

---

## 4. Contrato API REST (NestJS)

- **Controlador**: `UserController` (`src/modules/regulation/user/user.controller.ts`) y `UsersRolesController` (`src/modules/regulation/user/users-roles.controller.ts`)
- **Servicio**: `UserService` (`src/modules/regulation/user/user.service.ts`)
- **Ruta Base**: `/api/v1/regulation/user`

---

## 5. Especificación Frontend (Next.js)

- **Ruta**: `src/app/(protected)/regulation`
- **Interfaz**: Vista de gestión de usuarios con tabla de estado activo/inactivo, asignación de roles mediante modales y vinculación con la hoja de vida del empleado.
