# SPEC-REG-015: Ficha Integral del Recurso (Hub & Spoke de Empleados), Unificación de Identidad y Asignación Multi-Cliente

> **Estado**: `EN_REVISIÓN`  
> **Módulo**: `regulation` / `administrative`  
> **Ubicación Frontend**: `src/app/(protected)/administrative/employees/`, `src/app/(protected)/administrative/employees/[id]/`  
> **Ubicación Backend**: `src/modules/regulation/employee`, `src/modules/regulation/user`, `src/modules/regulation/auth`  
> **Fecha de Creación**: 2026-10-17  
> **Autor(es)**: Antigravity (Software Architect & Pair Programming)  

---

## 1. Contexto de Negocio y Planteamiento del Problema

### 1.1 Diagnóstico de la Situación Actual

En una empresa de seguridad privada, la fuerza laboral operativa (vigilantes, ronderos, supervisores, coordinadores) representa una **única persona física** con dos dimensiones complementarias:

1. **Dimensión Laboral / Operativa (`Employee`)**: Datos contractuales de Recursos Humanos (cédula, fecha de ingreso, cargo, departamento, dotación, puestos físicos asignados para prestar servicio).
2. **Dimensión Digital / Plataforma (`User`)**: Credenciales de inicio de sesión, roles RBAC, permisos y sedes accesibles dentro del software Noxia.

Anteriormente, el sistema mantenía ambas dimensiones en vistas y flujos completamente separados:
* `/administrative/employees`: Gestión de datos básicos y un drawer de asignación que solo permitía **un único puesto de trabajo fijo** (`clientId String?`).
* `/administrative/users`: Pantalla separada de creación y edición de usuarios, donde el operador debía volver a buscar al empleado para asignarle rol y contraseña.

### 1.2 Limitaciones Detectadas

1. **Incompatibilidad con Roles de Supervisión y Relevistas**:
   * Un **Supervisor** o un **Coordinador** no opera en un único puesto fijo: atiende y supervisa simultáneamente 5, 10 o 20 clientes concurrentes.
   * Un **Guarda Relevista / Rondero** cubre turnos rotativos en múltiples copropiedades dentro del mismo período.
   * El modelo singular `Employee.clientId` limitaba artificialmente la asignación a un solo cliente a la vez.

2. **Sobrecarga Cognitiva y Fragmentación**:
   * El operador de RRHH/Operaciones debía saltar entre dos pantallas desconectadas para gestionar a una misma persona.
   * Si a un empleado se le asignaban puestos pero luego se le creaba usuario digital, sus permisos de acceso a clientes no estaban sincronizados automáticamente.

3. **Inadecuación de Drawers para Información Extensa**:
   * Concentrar todos los datos de un empleado (laboral, puestos múltiples, credenciales, historial, dotación y futura programación) dentro de un drawer lateral modal genera sobrecarga vertical ("drawer infinito"), impidiendo el deep-linking y dificultando la navegación profunda.

---

## 2. Decisiones Arquitectónicas y Principios de Diseño

### 2.1 Adopción del Patrón Hub & Spoke para Personal (`/administrative/employees/[id]/...`)

Siguiendo el exitoso patrón ya implementado en Clientes y Tenants, la gestión de empleados evoluciona de un simple drawer hacia una **Ficha Técnica Integral del Recurso Humano** con arquitectura Hub & Spoke:

```
/administrative/employees/                          (Hub: DataTable Unificado)
   ├── [id]/layout.tsx                              (Header persistente con perfil y tabs)
   ├── [id]/overview/page.tsx                       (Spoke 1: Datos Personales y Laborales)
   ├── [id]/assignments/page.tsx                    (Spoke 2: Puestos Asignados Concurrente e Historial)
   ├── [id]/account/page.tsx                        (Spoke 3: Cuenta de Usuario y Seguridad RBAC)
   └── [id]/schedule/page.tsx                       (Spoke 4: Espacio Reservado - Programación de Guardas)
```

#### Ventajas Arquitectónicas:
* **Deep-Linking y URLs Navegables**: Permite acceder y compartir enlaces directos a los puestos asignados o a la cuenta de un empleado (`/administrative/employees/emp-123/assignments`).
* **Escalabilidad**: Habilita la incorporación progresiva de nuevos módulos (como el futuro módulo de Cuadrantes y Programación de Turnos) sin saturar la interfaz.
* **Consistencia Visual**: Homogeniza la experiencia de usuario con el resto de la plataforma Noxia.

---

### 2.2 DataTable de Empleados: Información Esencial sin Saturación Visual

* **Decisión explícita**: **NO** se incluirá una columna de "Clientes Activos" en la tabla principal de empleados. Mostrar listas de múltiples sedes para coordinadores o supervisores en una celda generaría deformación visual (*table bloat*) y sobrecarga de lectura.
* **Columnas de la Tabla Principal**:
  1. `Empleado`: Avatar con iniciales, Nombre Completo y Documento (C.C.).
  2. `Cargo`: Badge con el cargo actual (Vigilante, Supervisor, Coordinador, etc.).
  3. `Departamento`: Departamento organizacional (Operaciones, Administrativo, etc.).
  4. `Acceso Digital`: Badge de estado:
     * Chip verde: `Con Usuario` + Nombre del rol principal asignado.
     * Chip gris: `Sin Acceso` + botón de acción rápida `+ Crear Usuario`.
  5. `Estado Laboral`: Chip `Activo` / `Retirado`.
  6. `Acciones`: Menú contextual para navegar a los spokes de la ficha.

---

### 2.3 Sincronización Automática Bidireccional (`Employee` $\leftrightarrow$ `UserClientAccess`)

La entidad física `Employee` y la entidad digital `User` comparten la clave de identidad nacional `document`.

```
                    ┌──────────────────────────────────────────────┐
                    │                   Employee                   │
                    │  - id: cuid                                  │
                    │  - document: string (Identidad)              │
                    │  - fullName: string                          │
                    │  - clientAssignments: JsonB / M:N            │
                    └──────────────────────┬───────────────────────┘
                                           │ Mismo Documento
                                           ▼ (1 a 1 Opcional)
                    ┌──────────────────────────────────────────────┐
                    │                     User                     │
                    │  - id: cuid                                  │
                    │  - document: string (Identidad Única)        │
                    │  - clientId: activeClientId                  │
                    └──────────────────────┬───────────────────────┘
                                           │ 1
                                           │
                                           │ N
                    ┌──────────────────────▼───────────────────────┐
                    │               UserClientAccess               │
                    │  - userId -> User.id                         │
                    │  - clientId -> Client.id                     │
                    │  - isActive: true                            │
                    └──────────────────────────────────────────────┘
```

#### Reglas de Sincronización:
1. **Asignación en Empleado con Usuario Activo**:
   * Si el empleado ya cuenta con usuario digital (`User.document === Employee.document`), cualquier cliente vinculado o desvinculado en `/assignments` se replica de forma automática en `UserClientAccess`.
2. **Creación Posterior de Usuario para Empleado con Puestos Existentes**:
   * Si un empleado tiene 3 clientes asignados y posteriormente se le crea cuenta de usuario en `/account`, el sistema inserta automáticamente los 3 registros correspondientes en `UserClientAccess`.
3. **Mantenimiento de Puestos para Empleados sin Usuario**:
   * Los vigilantes que no requieran credenciales digitales pueden mantener múltiples puestos físicos activos registrados en su ficha laboral sin exigir la existencia previa de un `User`.

---

### 2.4 Command Box Unificado de Búsqueda y Selección de Sedes

En el spoke de Puestos Asignados (`/assignments`):
* En lugar de campos de texto flotantes desconectados de la lista de selección rápida, se implementa un **Command Box Unificado**:
  * Contenedor exterior continuo con borde redondeado y sombra sutil.
  * Buscador superior integrado sin bordes duplicados (`InputBase` / buscador limpio con icono de lupa).
  * Divisor horizontal sutil (`Divider`).
  * Lista deslizable integrada de resultados con botón rápido de vinculación.

---

## 3. Historias de Usuario (User Stories)

* **US-01 (Ficha Integral del Recurso)**: Como **Director de Operaciones / RRHH**, quiero acceder a una ficha completa por empleado con navegación por pestañas (Hub & Spoke), para visualizar y gestionar sus datos laborales, puestos físicos y credenciales de usuario desde una sola entidad.
* **US-02 (Asignación Multi-Cliente Concurrente)**: Como **Coordinador Operativo**, quiero asignar múltiples clientes a un supervisor o rondero sin obligarlo a tener un puesto único, para reflejar con precisión su área de cobertura real.
* **US-03 (Sincronización Transparente)**: Como **Operador de Sistema**, quiero que al asignar sedes a un empleado con usuario activo, sus permisos de acceso a clientes se actualicen automáticamente sin tener que configurar dos pantallas distintas.
* **US-04 (Habilitación Digital en Sitio)**: Como **Administrador de Seguridad**, quiero habilitar o gestionar las credenciales de acceso de un empleado directamente desde su pestaña de Cuenta (`/account`), configurando rol y contraseña sin salir de su ficha.

---

## 4. Estructura de Rutas y Endpoints

### 4.1 Frontend (Next.js App Router)
* `/administrative/employees`: Hub principal con DataTable y visualización de estado de usuario.
* `/administrative/employees/[id]/overview`: Spoke de datos personales, fecha de ingreso, cargo y contacto.
* `/administrative/employees/[id]/assignments`: Spoke de puestos activos concurrentes, Command Box unificado y acordeón de historial de relevos.
* `/administrative/employees/[id]/account`: Spoke de credenciales de usuario (creación, edición de roles, reset de password).
* `/administrative/employees/[id]/schedule`: Spoke reservado para el módulo de programación de guardas.

### 4.2 Backend (NestJS)
* `GET /employee/:id/workforce-summary`: Endpoint consolidado que retorna los datos del empleado, su estado de usuario vinculado (si existe), roles y sus sedes activas.
* `POST /employee/:id/assign-client`: Asigna un cliente al empleado y sincroniza automáticamente `UserClientAccess` si el empleado tiene usuario.
* `POST /employee/:id/unassign-client`: Desvincula un puesto específico y actualiza `UserClientAccess` (`isActive = false`).
* `POST /employee/:id/enable-user`: Crea o vincula la cuenta de usuario digital para el empleado, heredando sus puestos activos en `UserClientAccess`.

---

## 5. Criterios de Aceptación

1. La tabla principal de empleados no contiene columnas de clientes múltiples saturadas; muestra el estado digital de forma limpia (`Con Usuario` / `Sin Acceso`).
2. Al ingresar a un empleado, la navegación utiliza el patrón Hub & Spoke con header persistente y sub-pestañas operativas.
3. El empleado puede tener múltiples clientes asignados concurrentemente en `/assignments`.
4. La sección "Vincular a Nuevo Cliente" se renderiza como un único bloque visual cohesionado (Command Box unificado).
5. Las credenciales digitales y roles de acceso se administran dentro de la pestaña `/account` del empleado.
6. La sincronización hacia `UserClientAccess` se ejecuta de forma automática sin errores de concurrencia.
