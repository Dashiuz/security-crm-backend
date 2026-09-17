# SPEC-ADM-004: Residence Managers

## 1. Objetivo General
Habilitar la creación de un nuevo tipo de usuario, "Administrador de Conjunto Residencial" (`Residence Manager`). Este usuario no tendrá la obligatoriedad de contar con un registro previo en la tabla de empleados, y contará con acceso exclusivo al módulo de residentes correspondiente al conjunto (Cliente) al que se le asigne, sin posibilidad de alterar sus propios permisos.

## 2. Requerimientos Técnicos

### 2.1 Backend: Prisma Schema
- Añadir un Enum `UserType` con los valores `EMPLOYEE` y `RESIDENCE_MANAGER`.
- Añadir en el modelo `User` la propiedad `userType UserType @default(EMPLOYEE)`.

### 2.2 Backend: Flujo de Creación de Usuarios (UserService)
- Al crear un usuario (endpoint `POST /user`), verificar la propiedad `userType`.
- **Validación del Documento**: El número de documento (`document`) seguirá siendo obligatorio para todos. Sin embargo, si `userType === 'RESIDENCE_MANAGER'`, se **omitirá** la validación que exige que dicho documento exista previamente en la tabla `Employee`.
- **Asignación Automática de Departamento y Cargo**: Si el usuario es de tipo `RESIDENCE_MANAGER`, el sistema asignará internamente los valores `ADMINISTRACION CLIENTE` para `department` y `ADMINISTRADOR CLIENTE` para `position`. Si estos no existen en las tablas `Department` y `Position`, el backend los creará automáticamente de manera transparente al guardar o asociar el registro.
- **Asociación de Cliente**: Requerir que el payload de creación contenga un `clientId` válido.
- **Rol Automático e Inmutable**: 
  - Al crear este usuario, el backend deberá garantizar la existencia del rol `residence-manager` en el `tenant`. De no existir, lo creará asignándole permisos limitados y específicos (e.g., `resident:read`, `resident:create`, `resident:update`, `resident:delete`).
  - Dicho rol será asignado de inmediato al usuario, descartando cualquier array de `roles` enviado en la petición.
- **Bloqueo de Modificación de Roles**: En cualquier endpoint que permita la modificación de roles de usuarios, se lanzará un error tipo `ForbiddenException` si el usuario objetivo es `RESIDENCE_MANAGER`. Ni siquiera un administrador `GODLIKE` podrá alterar sus permisos para evitar brechas de seguridad.

### 2.3 Backend: Scope (ABAC) en Residentes
- En `ResidentService`, modificar todos los métodos de consulta e interacción (create, findAll, findOne, update, delete) para inyectar obligatoriamente un filtro `where: { clientId: user.clientId }` **solamente** si el usuario autenticado tiene `userType === 'RESIDENCE_MANAGER'`. Esto asegurará que sus acciones queden estrictamente limitadas a su conjunto asignado.

### 2.4 Frontend: Interfaz y Formularios
- **Formulario de Usuarios**: Añadir un selector (`Dropdown`/`Select`) para definir si el usuario a crear es de tipo "Empleado" o "Administrador de Conjunto".
- Dependiendo de la selección, la interfaz variará:
  - **Administrador de Conjunto**: Muestra el `ClientAutocomplete` (obligatorio), oculta la validación visual dependiente del empleado y permite rellenar nombre y cédula directamente.
- **Barra de Navegación (Sidebar)**: Mostrar un nuevo módulo "Residentes de <<Nombre del Conjunto>>" (o similar). Solo será visible para usuarios con rol `residence-manager` o `userType === 'RESIDENCE_MANAGER'`.
- **Nueva Vista de Residentes**: Crear la ruta `/administrative/my-residents`. Esta funcionará como un clon exacto del tab de residentes disponible dentro de los detalles del cliente, permitiendo el CRUD completo y la carga mediante archivos `.csv`, pero enrutando las peticiones con los permisos restringidos del administrador logueado.

## 3. Plan de Acción (Fase de Implementación Futura)
1. Modificar `schema.prisma` y generar la migración respectiva.
2. Actualizar DTOs (`create-user.dto.ts` y `update-user.dto.ts`).
3. Modificar `UserService` para condicionar creación de departamento/cargo y la omisión de `Employee`.
4. Restringir la edición de roles en `user.controller.ts` y `user.service.ts`.
5. Modificar los endpoints de `ResidentService` para inyectar el aislamiento por `clientId`.
6. Actualizar las vistas de `UserForm` en el frontend, condicionalizando los campos según el `UserType`.
7. Crear la nueva ruta `/administrative/my-residents` y enlazarla en el `Sidebar`.

*(Nota: Este documento es únicamente de especificación técnica, pendiente a aprobación para inicio de implementación)*
