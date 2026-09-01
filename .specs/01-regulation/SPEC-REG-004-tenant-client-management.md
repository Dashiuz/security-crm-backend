# SPEC-REG-004: Gestión Multi-Tenant y Aprovisionamiento de Clientes / Conjuntos Residenciales

> **Estado**: `COMPLETADO`  
> **Módulo**: `regulation`  
> **Ubicación Backend**: `src/modules/regulation/tenant`, `client`  
> **Ubicación Frontend**: `src/app/(protected)/administrative/clients`, `tenants`  
> **Fecha de Actualización**: 2026-08-11  

---

## 1. Contexto de Negocio e Historias de Usuario

### 1.1 Objetivo
Permitir la creación y administración de Clientes (Conjuntos Residenciales / Centros Comerciales) dentro de cada Tenant (Empresa de Seguridad). Cada Tenant opera con múltiples Clientes, aislando las minutas operativas por conjunto residencial según el cliente asignado al guardia/usuario.

### 1.2 Historias de Usuario
- **US-REG-08**: Como **Administrador / SuperAdmin**, quiero gestionar los Clientes (Conjuntos Residenciales) asignando código interno, NIT, contrato y coordenadas.
- **US-REG-09**: Como **Administrador**, quiero asignar un cliente a un Empleado y que su cuenta de Usuario asociada se sincronice automáticamente.
- **US-REG-10**: Como **Guarda de Seguridad (USER)**, quiero que mis minutas se registren e aíslen bajo mi Cliente (Conjunto Residencial) asignado.
- **US-REG-11**: Como **Admin (sin clientId directo)**, quiero poder filtrar las minutas de mi tenant por cliente (nombre, código interno o ID).

---

## 2. Permisos RBAC y Control de Acceso

- **Permisos de Clientes**: `client:read`, `client:create`, `client:update`, `client:delete`, `client:manage`.
- **Asignación**: Se otorgan al rol `ADMIN` para habilitar el submódulo de Clientes en el menú administrativo del frontend.

---

## 3. Modelo de Datos y Sincronización

- **Relación Client-Employee-User y Propagación de Sesión**:
  - `Employee` contiene `clientId` (opcional). Se configura exclusivamente en la pantalla de Empleados.
  - Al guardar un `Employee` con `clientId`, el backend busca la cuenta de `User` correspondiente por número de documento (`document`) y actualiza automáticamente `user.clientId = employee.clientId`.
  - El backend propaga `clientId` en la validación de usuario (`findActiveByDocument`), el payload JWT de sesión (`login` / `refresh`) e `interceptor/context`, asegurando que `auditExtension` inyecte transparentemente la relación `client: { connect: { id: clientId } }` en la creación y el filtro por cliente en las consultas de todas las minutas (`Minuta`, `VisitorEntryControl`, `CorrespondenceReceivedControl`, `ParkingResidentVehicleControl`).
  - Las 4 tablas de minutas en el frontend (Minuta General, Visitantes, Correspondencia, Parqueadero) incluyen la columna auditora **`Creado Por`** (`createdBy`), permitiendo identificar al usuario/guarda que registró la novedad.
  - La interfaz de usuario ([Navbar.tsx](file:///d:/projects/security-crm-frontend/src/components/layout/Navbar.tsx)) muestra una insignia o chip con el nombre del cliente asignado (`Conjunto: {nombre}`) cuando el usuario tiene un `clientId` activo.

---

## 4. Especificaciones del Formulario de Creación/Edición de Clientes (UI/UX)

- **Campos de Auditoría y Visibilidad de Clientes Inactivos**:
  - El modelo `Client` incorpora relaciones de auditoría con `User`: `createdById`/`createdBy`, `updatedById`/`updatedBy`, `deletedAt`, `deletedById`/`deletedBy`, e `isActive`.
  - Los clientes inactivados/soft-deleted permanecen **visibles en la lista principal como inactivos** (`isActive: false`), permitiendo su consulta y reactivación.
  - Se añade el endpoint `PATCH /client/:id/reactivate` que restaura el cliente (`isActive: true`, `deletedAt: null`, `deletedById: null`).
- **Iconos de Acción, Tooltips y Confirmación (UI/UX)**:
  - Todos los íconos de la columna de acciones incluyen tooltips descriptivos al hacer hover (`title` / `label` de 1 o 2 palabras: `Ver Detalle`, `Editar`, `Inhabilitar`, `Reactivar`, `Dar de Baja`).
  - Para clientes **activos**: se muestra el icono de inhabilitar `RemoveCircleIcon` (rojo/warning). La papelera por defecto se oculta.
  - Para clientes **inactivos**: la papelera y el icono de inhabilitación NO están disponibles. Se muestra únicamente el icono de restauración `RestoreFromTrashIcon` (verde).
  - Al solicitar la inhabilitación o la reactivación de un cliente, se exige la confirmación con el **NIT exacto** en [PromptConfirmDialog](file:///d:/projects/security-crm-frontend/src/components/common/PromptConfirmDialog.tsx).
- **Filtro Transversal de Estado (Todos / Activos / Inactivos)**:
  - Se integra en la barra de herramientas principal de [DataTable](file:///d:/projects/security-crm-frontend/src/components/common/DataTable.tsx) un control de filtro por estado (`Todos`, `Activos`, `Inactivos`).
  - La filtración se ejecuta a nivel de cliente (`useMemo`), garantizando 0ms de latencia, 0 peticiones adicionales al backend y óptima conservación de recursos.
- **Tecnología Instalada (`installedTech`)**:
  - Desplegable UI con opciones `Sí` (`"true"`) y `No` (`"false"`).
  - Mapeo transparente al payload HTTP como valor booleano (`true` / `false`).
- **Cantidad de Armas (`weaponsAmount`)**:
  - Input tipo numérico con coerción/conversión automática de string a `number` en la capa de UI (`FormDialog`/`Zod`) para prevenir errores de validación de esquema (`expected number, received string`).
- **Estudio de Seguridad (`securityStudy`)**:
  - Desplegable UI con opciones `Sí` y `No`.
  - Cuando se selecciona `Sí`, se renderiza dinámicamente un campo de carga de archivo (`Cargar Estudio de Seguridad`).
  - Campo de archivo actualmente **opcional** por practicidad de desarrollo y fase de lanzamiento preliminar (pasará a ser obligatorio en integración con Amazon S3 / almacenamiento persistente).


