# SPEC-REG-006: Importación Masiva (CSV) de Organización (Empleados, Departamentos, Cargos)

> **Estado**: `APROBADO`  
> **Módulo**: `regulation`  
> **Autor(es)**: `AI Assistant`  
> **Fecha de Creación**: `2026-09-02`  
> **Última Actualización**: `2026-09-02`  

---

## 1. Contexto de Negocio e Historias de Usuario

### 1.1 Objetivo
Permitir a los administradores y gestores de recursos humanos realizar cargas masivas de datos organizacionales a través de archivos CSV. Esta funcionalidad ahorra un tiempo valioso en implementaciones iniciales o actualizaciones semestrales, permitiendo poblar los módulos de Departamentos, Cargos (Posiciones) y Empleados de manera rápida y estandarizada, reportando claramente qué registros fueron exitosos y cuáles fallaron mediante una interfaz amigable.

### 1.2 Historias de Usuario (User Stories)
- **US-01**: Como **[Administrador]**, quiero **[Importar un CSV de Departamentos]** para **[crear masivamente la estructura departamental de mi tenant]**.
- **US-02**: Como **[Administrador]**, quiero **[Importar un CSV de Cargos]** para **[registrar las posiciones jerárquicas rápidamente]**.
- **US-03**: Como **[Administrador]**, quiero **[Importar un CSV de Empleados]** para **[registrar todo mi personal operativo de una vez]**.
- **US-04**: Como **[Administrador]**, quiero **[Que los departamentos y cargos faltantes se creen automáticamente al importar empleados]** para **[no tener que hacer múltiples cargas previas si la estructura es simple]**.

---

## 2. Definición de Permisos y Matriz RBAC

### 2.1 Permisos requeridos
La funcionalidad de importación requerirá los mismos permisos de creación que la funcionalidad individual en cada uno de los sub-módulos.

| Permiso Code | Nombre Legible | Descripción | Rol por Defecto |
| :--- | :--- | :--- | :--- |
| `regulation:manage` | Administración Total | Control completo, incluye importaciones masivas | SuperAdmin, Godlike |
| `employee:create` | Creación de Empleados | Permite crear o importar empleados masivamente | Admin, RRHH |
| `department:create` | Creación de Departamentos | Permite crear o importar departamentos | Admin, RRHH |
| `position:create` | Creación de Cargos | Permite crear o importar posiciones/cargos | Admin, RRHH |

### 2.2 Reglas Multi-Tenant y Seguridad
- [x] **Aislamiento Obligatorio**: Todo registro creado masivamente debe estar obligatoriamente vinculado al `tenantId` del usuario que realiza la petición.
- [x] **Relaciones Dinámicas**: La creación automática de Departamentos o Cargos desde el importador de Empleados debe asignar el `tenantId` correspondiente.

---

## 3. Modelo de Datos (Prisma Schema Specification)

No hay cambios en la estructura de base de datos (`schema.prisma`). Se utilizarán los modelos existentes: `Employee`, `Department` y `Position`.

---

## 4. Contrato de API REST & Backend Specification (NestJS)

### 4.1 Endpoints REST Spec

#### `POST /api/v1/department/import`
- **Guardias**: `@UseGuards(JwtAuthGuard, PermissionsGuard)`
- **Permiso**: `@RequirePermissions('regulation:manage', 'department:create')`
- **Request Body**: Arreglo de objetos (filas procesadas desde CSV)
- **Columnas CSV Aceptadas**: `['Nombre', 'EstadoActivo']`
- **Lógica**: Por cada fila se crea el departamento asegurando que no exista un nombre idéntico para el mismo tenant. Retorna conteo de éxitos y arreglo de errores.

#### `POST /api/v1/position/import`
- **Guardias**: `@UseGuards(JwtAuthGuard, PermissionsGuard)`
- **Permiso**: `@RequirePermissions('regulation:manage', 'position:create')`
- **Request Body**: Arreglo de objetos (filas procesadas desde CSV)
- **Columnas CSV Aceptadas**: `['Nombre', 'Nivel', 'EstadoActivo']`
- **Lógica**: Por cada fila se crea el cargo. Se formatea `Nivel` a entero. Retorna estadísticas.

#### `POST /api/v1/employee/import`
- **Guardias**: `@UseGuards(JwtAuthGuard, PermissionsGuard)`
- **Permiso**: `@RequirePermissions('regulation:manage', 'employee:create')`
- **Request Body**: Arreglo de objetos (filas procesadas desde CSV)
- **Columnas CSV Aceptadas**: `['Nombre', 'SegundoNombre', 'Apellido', 'SegundoApellido', 'TipoDocumento', 'Documento', 'FechaNacimiento', 'Genero', 'Direccion', 'Telefono', 'Email', 'FechaIngreso', 'Cargo', 'Departamento']`
- **Lógica Específica**:
  1. Extrae los nombres únicos de `Cargo` y `Departamento` proporcionados en el batch completo.
  2. Consulta la base de datos para obtener los IDs de los existentes en el `tenantId`.
  3. **Auto-creación**: Si la columna `Cargo` o `Departamento` contiene un valor que no se encuentra en la base de datos, el servicio los creará en memoria y en base de datos antes de enlazar al empleado (conforme a la decisión de diseño).
  4. Crea los empleados referenciando los `departmentId` y `positionId` resueltos.

---

## 5. Especificación Frontend (Next.js App Router)

### 5.1 Componente Estandarizado
- **`DataTable.tsx`**: Modificar para aceptar una prop `extraHeaderActions?: React.ReactNode`. Esto permitirá insertar el botón "Cargar CSV" al lado del botón "Crear Nuevo", respetando el estilo y layout del grid actual.

### 5.2 Vistas a Actualizar
- `src/app/(protected)/administrative/departments/page.tsx`
- `src/app/(protected)/administrative/positions/page.tsx`
- `src/app/(protected)/administrative/employees/page.tsx`

Cada una integrará el `CsvImportDialog` y enlazará su `onImport` a la respectiva llamada de la API del HttpClient correspondiente.

---

## 6. Criterios de Aceptación y Matriz de Verificación

- [ ] Modificación de `DataTable.tsx` completada sin afectar vistas existentes.
- [ ] Endpoints implementados retornando formato estadístico correcto (`{ totalRows, successRows, errorRows, errors: [{ row, reason }] }`).
- [ ] La importación de Empleados crea satisfactoriamente cargos y departamentos inexistentes.
- [ ] Errores en filas individuales no detienen ni revierten los éxitos del resto de filas (procesamiento individual per-row o Promise.allSettled).
