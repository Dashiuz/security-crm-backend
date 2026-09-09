# SPEC-REG-008: Corrección de Auditoría Creado Por, Normalización de Estado CSV y Reestructuración de Módulo Clientes

> **Estado**: `COMPLETADO`  
> **Módulo**: `regulation` / `administrative`  
> **Autor(es)**: AI / User  
> **Fecha de Creación**: 2026-09-07  
> **Última Actualización**: 2026-09-07  

---

## 1. Contexto de Negocio e Historias de Usuario

### 1.1 Objetivo
Resolver tres deficiencias identificadas en la experiencia de usuario, auditoría y administración de datos:
1. **Auditoría "Creado Por"**: En las tablas administrativas (Departamentos y Cargos), los registros creados o importados por administradores globales (GODLIKE / `system`) exhiben su identificador interno UUID/CUID en crudo en lugar de un nombre comprensible. Se establece la política de que todo registro originado por un usuario GODLIKE o del sistema debe presentarse en la interfaz como `"system"`, sin comprometer el aislamiento estricto multi-tenant (sin `bypassTenant: true`).
2. **Carga Masiva CSV de Departamentos y Posiciones**: Los archivos CSV con la columna de estado `EstadoActivo` con valor booleano estándar (`true`, `TRUE`, `1`, etc.) se importan erróneamente como inactivos (`isActive: false`) debido a una validación rígida que exigía la cadena exacta `'SI'`. Se requiere un conversor booleano flexible y tolerante a múltiples representaciones de estado.
3. **Navegación y Gestión de Clientes**: Reestructurar el menú lateral en la sección "Mis Clientes" a una lista plana coherente con las opciones: "Listado de Clientes", "Prospectos de Cliente", "Estudios de Seguridad" y "Proyectos de Tecnología". Reubicar la acción de "Cargar Clientes Existentes" desde el navbar hacia la pantalla de "Listado de Clientes" como un botón de cabecera "Cargar CSV" con modal de previsualización e importación (`CsvImportDialog`), unificando el patrón utilizado en los demás módulos del sistema.

### 1.2 Historias de Usuario (User Stories)
- **US-01**: Como **Administrador de Empresa**, quiero que en las tablas de Departamentos y Cargos la columna "Creado Por" muestre el nombre del empleado si fue creado localmente, o `"system"` si fue creado por un administrador GODLIKE / soporte global, para **evitar ver identificadores técnicos ilegibles**.
- **US-02**: Como **Usuario Administrativo**, quiero que al importar departamentos o cargos desde un archivo CSV con columna `EstadoActivo: true`, los registros se creen automáticamente con estado activo, para **no tener que activar cada registro manualmente uno por uno**.
- **US-03**: Como **Usuario del Sistema**, quiero **un menú de "Mis Clientes" ordenado y directo**, y poder **cargar clientes mediante un botón "Cargar CSV" en la cabecera de la tabla de clientes**, para **tener una experiencia de usuario rápida y homogénea con los demás módulos**.

---

## 2. Definición de Permisos y Matriz RBAC / Seguridad Multi-Tenant

### 2.1 Permisos requeridos
No se crean nuevos permisos en el sistema. Se reutilizan los permisos existentes del catálogo RBAC:
- `department:read`, `department:create`, `department:manage`
- `position:read`, `position:create`, `position:manage`
- `client:read`, `client:create`, `client:manage`

### 2.2 Reglas Multi-Tenant y Seguridad
- [x] **Aislamiento Multi-Tenant Estricto (Sin bypass)**: No se aplicará `bypassTenant: true` en las consultas de resolución de nombres de usuario. Las consultas de usuarios permanecerán confinadas al tenant de la empresa actual.
- [x] **Identidad Administrativa Central**: Si un registro fue creado por un usuario del tenant central (`system` o con rol `GODLIKE`), o si su creador no pertenece a la tabla de usuarios del tenant local, la capa de presentación y persistencia asignará y mostrará el identificador `"system"`.
- [x] **Inyección Segura de Auditoría**: Durante la creación o actualización de registros por parte de usuarios GODLIKE, la extensión de auditoría registrará `'system'` como actor.

---

## 3. Modelo de Datos (Prisma Schema Specification)

No se requieren cambios estructurales en los esquemas de Prisma (`department.prisma`, `position.prisma`, `clients.prisma`, `user.prisma`). Los modelos actuales ya disponen de los campos escalares o relacionales necesarios para `createdBy`, `updatedBy` e `isActive`.

---

## 4. Especificación Backend (NestJS)

### 4.1 Extensión de Auditoría Prisma (`src/common/prisma-extension/audit-extension.ts`)
- **Lógica de Inyección de Actor**:
  - Validar si `contextService.isGodlike` es `true` o si `userId === 'system'`.
  - En las operaciones `create` y `update` de modelos auditables, si el usuario en sesión es GODLIKE, asignar `'system'` a `createdBy` / `updatedBy` en lugar de su UUID individual.

### 4.2 Módulo de Departamentos (`src/modules/regulation/department/`)
**Archivo:** `department.service.ts`
- **Resolución en Lectura (`findAll`, `findOne`)**:
  - Al procesar el mapa `userMap`:
    ```typescript
    const creatorName = d.createdBy ? userMap.get(d.createdBy) : null;
    return {
      ...d,
      createdBy: creatorName || 'system',
    };
    ```
  - Eliminar el fallback `|| d.createdBy` para garantizar que ningún UUID crudo sea devuelto.
- **Normalización de Carga CSV (`importDepartmentsFromCsv`)**:
  - Implementar función utilitaria de parseo booleano:
    - Reconocer como `true`: `true`, `'true'`, `'1'`, `'si'`, `'sí'`, `'yes'`, `'activo'`, `'activa'`, `'active'` (insensible a mayúsculas/minúsculas).
    - Reconocer como `false`: `false`, `'false'`, `'0'`, `'no'`, `'inactivo'`, `'inactiva'`, `'inactive'`.
    - Si el valor es indefinido o cadena vacía, tomar `true` por defecto.
  - Soportar alias de columna: `row.EstadoActivo ?? row.estadoActivo ?? row.isActive ?? row.Activo ?? row.activo`.
  - Asignar `createdBy: (user.roles?.includes('GODLIKE') || user.tenantId === 'system') ? 'system' : user.sub`.

### 4.3 Módulo de Posiciones / Cargos (`src/modules/regulation/position/`)
**Archivo:** `position.service.ts`
- **Resolución en Lectura (`findAll`, `findOne`)**:
  - Aplicar la misma lógica: `creatorName || 'system'`, suprimiendo la exposición de UUIDs no encontrados.
- **Normalización de Carga CSV (`importPositionsFromCsv`)**:
  - Aplicar el parseador booleano flexible para `EstadoActivo`.
  - Asignar `createdBy: 'system'` si el creador es GODLIKE o tenant `system`.

### 4.4 Módulo de Clientes (`src/modules/administrative/client/`)
**Archivo:** `client.service.ts`
- **Soporte de Cabeceras Multilenguaje en CSV (`importClientsFromCsv`)**:
  - Permitir que el mapeo de columnas acepte tanto claves en minúsculas como en español:
    - `nit`: `row.nit || row.NIT`
    - `name`: `row.name || row.Nombre || row.nombre || row.razonSocial`
    - `email`: `row.email || row.Email || row.Correo`
    - `phone`: `row.phone || row.Telefono || row.telefono`
    - `address`: `row.address || row.Direccion || row.direccion`
    - `city`: `row.city || row.Ciudad || row.ciudad`
    - `sector`: `row.sector || row.Sector`
    - `internalCode`: `row.internalCode || row.CodigoInterno || row.codigo`
    - `contractNumber`: `row.contractNumber || row.NumeroContrato || row.contrato`

---

## 5. Especificación Frontend (Next.js App Router)

### 5.1 Reestructuración de la Navegación (`src/components/layout/Sidebar.tsx`)
- **Sección "Mis Clientes"**:
  - Reemplazar la jerarquía anidada actual por una estructura de lista plana con el siguiente orden exacto:
    1. **"Listado de Clientes"**: `{ text: "Listado de Clientes", icon: <ListIcon />, path: "/administrative/clients", feature: "client", permission: ["client:manage", "client:read"] }`
    2. **"Prospectos de Cliente"**: `{ text: "Prospectos de Cliente", icon: <ProspectIcon />, path: "/administrative/prospects", feature: "client", permission: ["client:manage", "client:read"] }`
    3. **"Estudios de Seguridad"**: `{ text: "Estudios de Seguridad", icon: <SecurityStudyIcon />, disabled: true }`
    4. **"Proyectos de Tecnología"**: `{ text: "Proyectos de Tecnología", icon: <TechProjectIcon />, disabled: true }`
  - Eliminar el sub-acordeón "Clientes".
  - Eliminar la opción "Cargar Clientes Existentes" del navbar.
  - Limpiar la propiedad `Clientes` en el estado inicial `openSubmenus`.

### 5.2 Pantalla de Listado de Clientes (`src/app/(protected)/administrative/clients/page.tsx`)
- **Botón de Cabecera "Cargar CSV"**:
  - Añadir a `extraHeaderActions` en `<DataTable>` un botón idéntico al de Departamentos y Posiciones con icono `<CloudUploadIcon />`.
- **Integración de `CsvImportDialog`**:
  - Añadir estado `csvImportOpen: boolean`.
  - Integrar el componente modal `<CsvImportDialog>` con:
    - `title="Importar Clientes"`
    - `templateColumns={["nit", "name", "email", "phone", "address", "city", "sector", "internalCode", "contractNumber"]}`
    - `onImport={handleImport}` llamando a `POST /client/import/csv` con `{ data, fileName }`.
    - En caso de éxito, invocar `showSuccess` y refrescar la tabla incrementando `refreshTrigger`.
- **Actualización de Breadcrumbs**:
  - Cambiar a `breadcrumbs={[{ label: "Mis Clientes" }, { label: "Listado de Clientes" }]}`.

---

## 6. Plan de Verificación y Criterios de Aceptación

### 6.1 Criterios de Aceptación
1. **Auditoría Creado Por**:
   - En `/administrative/departments` y `/administrative/positions`, ningún registro muestra un UUID alfanumérico. Los creados por GODLIKE o sin usuario local asociado muestran `"system"`. Los creados por usuarios locales muestran su nombre real.
2. **Carga CSV EstadoActivo**:
   - Cargar un archivo CSV en Departamentos y Posiciones que contenga `EstadoActivo: true`. Los registros resultantes deben figurar inmediatamente con estado `Activo: true` (con el check verde en la tabla).
3. **Navegación "Mis Clientes"**:
   - Al expandir "Mis Clientes", se observan de forma plana y en orden: "Listado de Clientes", "Prospectos de Cliente", "Estudios de Seguridad" y "Proyectos de Tecnología".
   - No existe el sub-acordeón "Clientes" ni el enlace "Cargar Clientes Existentes" en el menú lateral.
4. **Carga CSV en Clientes**:
   - En `/administrative/clients`, existe el botón "Cargar CSV" en la parte superior derecha de la tabla. Al hacer clic se abre el modal `CsvImportDialog` y permite cargar archivos CSV de clientes con éxito.

### 6.2 Pruebas de Compilación
- `npm run build` o `npx tsc --noEmit` en backend (`security-crm-backend`).
- `npm run build` o `npx tsc --noEmit` en frontend (`security-crm-frontend`).
