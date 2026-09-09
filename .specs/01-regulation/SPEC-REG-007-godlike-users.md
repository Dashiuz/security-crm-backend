# SPEC-REG-007: Gestión y Aislamiento de Usuarios GODLIKE (Sistema)

> **Estado**: `COMPLETADO`  
> **Módulo**: `regulation`  
> **Autor(es)**: AI / User  
> **Fecha de Creación**: 2026-09-03  
> **Última Actualización**: 2026-09-03  

---

## 1. Contexto de Negocio e Historias de Usuario

### 1.1 Objetivo
Adaptar el flujo de gestión de usuarios y la interfaz de navegación para el Tenant Administrativo Central (`system`). En Noxia, los usuarios GODLIKE administran el sistema a nivel global. A diferencia de un tenant comercial regular, no es práctico ni necesario que los administradores del sistema (SuperAdmin) deban ser registrados previamente como "Empleados" de seguridad. Además, su menú de navegación (Sidebar) debe ser especializado y libre de distracciones operativas (como minutas o correspondencia).

### 1.2 Historias de Usuario (User Stories)
- **US-01**: Como **Usuario GODLIKE**, quiero **ver solo las opciones de "Empresas" y "Usuarios" en mi menú lateral** para **tener un acceso directo a las herramientas administrativas del sistema**.
- **US-02**: Como **Usuario GODLIKE**, quiero **poder crear a otros usuarios GODLIKE directamente sin crear un empleado previo** para **agilizar el alta de administradores del sistema**.
- **US-03**: Como **Propietario del Sistema**, quiero **que exista un bloqueo para evitar que se elimine el último usuario GODLIKE activo del sistema** para **no perder acceso total al backend**.

---

## 2. Definición de Permisos y Matriz RBAC

### 2.1 Permisos requeridos
No se requieren nuevos permisos. La lógica dependerá de:
- El contexto del `tenantId` inyectado (si `tenantId === 'system'`).
- El rol `GODLIKE` o el permiso global `godlike:manage`.

### 2.2 Reglas Multi-Tenant y Seguridad
- [x] **Aislamiento Obligatorio**: Al crear usuarios en el tenant `system`, se aplicará automáticamente el `tenantId` correcto por el contexto, pero se evadirá la restricción de vinculación con la tabla `Employee`.
- [x] **Regla del Último Administrador**: Si se intenta desactivar o aplicar soft-delete a un usuario del tenant `system`, se verificará el recuento total de usuarios activos del sistema para evitar dejar el tenant huérfano.

---

## 3. Modelo de Datos (Prisma Schema Specification)

No hay cambios estructurales en los esquemas de Prisma. La tabla `User` (definida en `user.prisma`) ya es independiente de `Employee` en términos de claves foráneas restrictivas y permite registrar usuarios de forma autónoma con los campos copiados de nombre y cargo.

---

## 4. Contrato de API REST & Backend Specification (NestJS)

### 4.1 Cambios en DTOs
**Archivo:** `src/modules/regulation/user/dtos/create-user.dto.ts`
- Agregar campos opcionales:
  - `fullName?: string`
  - `department?: string`
  - `position?: string`

### 4.2 Lógica de Negocio (Service)
**Archivo:** `src/modules/regulation/user/user.service.ts`
- **Creación (`createUser`)**:
  - Si el contexto es el tenant `system`, el backend NO buscará al empleado. Usará el `fullName` enviado en el DTO.
  - Para `department` y `position`, validaremos si vienen en el payload, y en el caso del tenant `system` forzaremos por seguridad que siempre se guarden como "system" y "system manager".
- **Eliminación / Desactivación (`softDelete` y similares)**:
  - Si el usuario que se está borrando pertenece al tenant `system`, contar cuántos quedan activos. Si solo queda 1, lanzar excepción HTTP 400 (`BadRequestException`).

---

## 5. Especificación Frontend (Next.js App Router)

### 5.1 Modificación del Navbar (Sidebar)
**Archivo:** `src/components/layout/Sidebar.tsx`
- Condicionar el renderizado usando `tenant?.slug === 'system'`.
- Si es `system`, la jerarquía del menú será únicamente:
  - **Dashboard**
  - **Empresas** (Tenants)
  - **Usuarios** (Desacoplado de la categoría "Mis Recursos" original y subido a nivel raíz).
- Se ocultarán las secciones operativas y comerciales.

### 5.2 Formulario de Creación de Usuarios (Modal)
**Archivo:** Vista o componente donde se renderiza el modal de `Create User` (ej. `UsersPage.tsx` o un componente dedicado a User Form).
- Al detectar que estamos en el tenant `system` (`tenant?.slug === 'system'`), el modal de creación mutará para incluir:
  - **Documento** (Input de texto, habilitado). En lugar de "(debe existir)", el label será normal.
  - **Nombre Completo** (Input de texto, habilitado y requerido - *Nuevo para GODLIKE*).
  - **Contraseña** (Input de password).
  - **Asignar Roles** (Select dropdown).
  - **Departamento** (Input de texto, *deshabilitado y hardcoded* con el valor "system").
  - **Cargo** (Input de texto, *deshabilitado y hardcoded* con el valor "system manager").
- En tenants regulares, se mantiene el modal tradicional de 3 inputs.

---

## 6. Criterios de Aceptación y Matriz de Verificación

- [x] Un usuario ingresa al tenant `system` y corrobora que el Sidebar está simplificado.
- [x] En el tenant `system`, al intentar crear un usuario, el formulario muestra los campos adicionales de Nombre, Departamento y Cargo (estos dos últimos inamovibles).
- [x] La creación del usuario GODLIKE es exitosa en base de datos sin existencia de empleado.
- [x] Si existe solo 1 usuario en el tenant `system`, intentar eliminarlo produce un error de la API (mostrando un toast en el frontend).
- [x] En un tenant comercial regular, el flujo sigue requiriendo al Empleado y mostrando el menú completo y el modal tradicional.
