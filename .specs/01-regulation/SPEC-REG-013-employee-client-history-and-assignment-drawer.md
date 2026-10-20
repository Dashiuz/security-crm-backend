# SPEC-REG-013: Historial de Asignaciones de Clientes a Empleados y Drawer Operativo de Vinculación/Desvinculación

> **Estado**: `COMPLETADO`  
> **Módulo**: `regulation` / `administrative`  
> **Ubicación Frontend**: `src/app/(protected)/administrative/employees/page.tsx` y `src/components/common/DataTable.tsx`  
> **Ubicación Backend**: `prisma/schema/employee.prisma`, `src/modules/regulation/employee/`  
> **Fecha de Creación**: 2026-10-15  
> **Autor**: Antigravity (Software Architect)  

---

## 1. Contexto de Negocio y Problemática Identificada

### 1.1 Problemática Operativa y de UI/UX
1. **Falta de Trazabilidad Histórica de Puestos de Trabajo**:
   - Actualmente, un empleado solo almacena una referencia escalar simple `clientId String?` en su registro.
   - Cuando un empleado es reubicado a otro cliente o retirado de un puesto, se sobreescribe el valor de `clientId`, perdiéndose por completo el registro histórico de los conjuntos residenciales y sedes en las que ha prestado servicio. Esto dificulta auditorías de minutas de guardia, inspecciones de supervisores y consultas de recursos humanos.
2. **Mezcla Antipatrón de Datos Personales con Información Laboral Operativa**:
   - En el formulario de *"Editar Empleado"*, el campo *"Cliente / Conjunto Residencial"* se encuentra intercalado entre la dirección personal y los datos de contacto/departamento.
   - La asignación de clientes es una acción operativa dinámica (relevos, rotaciones de personal, turnos especiales) y no debería forzar la edición de los datos biográficos del empleado ni viceversa.
3. **Ausencia de Historial en la Vista de Detalle**:
   - El Drawer de *"Detalles del Empleado"* solo exhibe `"Cliente / Conjunto: {nombre}"` o `"Sin asignar"`, sin contexto temporal ni trazabilidad cronológica.

---

## 2. Decisiones Arquitectónicas

### 2.1 Modelo de Datos en Base de Datos (SSOT en PostgreSQL)

#### A. Adición de Campo `@db.JsonB` en `Employee`
Para garantizar un almacenamiento inmutable, snapshots fieles de la información corporativa en el tiempo y consultas ultra rápidas con cero overhead de joins en la lectura, se añadirá el campo `clientHistory` en `prisma/schema/employee.prisma`:

```prisma
model Employee {
  // ... campos existentes ...
  clientId      String?
  client        Client?   @relation(fields: [clientId], references: [id], onDelete: SetNull)

  clientHistory Json?     @default("[]") @db.JsonB

  // ... relaciones y auditoría ...
}
```

#### B. Estructura TypeScript del Registro Histórico (`EmployeeClientHistoryItem`)
```typescript
export interface EmployeeClientHistoryItem {
  id: string;                  // CUID único del registro histórico
  clientId: string;            // ID del cliente asociado
  clientName: string;          // Snapshot inmutable del nombre del cliente
  clientCode?: string | null;  // Snapshot del código interno (ej. CLI-2005)
  assignedAt: string;          // Fecha efectiva de inicio (formato ISO YYYY-MM-DD)
  unassignedAt: string | null; // Fecha efectiva de fin (null si es la asignación actual vigente)
  recordedAt: string;          // Timestamp ISO exacto de registro en sistema (auditoría inmutable)
  recordedBy?: string | null;  // Usuario o rol que ejecutó la operación
  notes?: string | null;       // Observaciones opcionales del relevo/asignación
}
```

#### C. Protocolo de Migración Estricto (Prevención de Desfase con Supabase)
- **Queda terminantemente prohibido el uso de `prisma db push`**.
- Se generará un archivo de migración formal con:
  ```bash
  npx prisma migrate dev --create-only --name add_employee_client_history
  ```
- Se revisará el SQL generado (`prisma/schema/migrations/*_add_employee_client_history/migration.sql`) que aplicará:
  ```sql
  ALTER TABLE "employee" ADD COLUMN "clientHistory" JSONB DEFAULT '[]'::jsonb;
  ```
- Se aplicará localmente con `npx prisma migrate dev` para registrarla en `_prisma_migrations`, permitiendo que el pipeline de GitHub Actions la despliegue a Supabase con `prisma migrate deploy`.

---

### 2.2 Diseño de API REST (NestJS)

#### Endpoints Especializados:

1. **`PATCH /employee/:id/assign-client`**:
   - **Propósito**: Asignar un nuevo cliente a un empleado (primera vez o relevo de cliente previo).
   - **Payload (`AssignEmployeeClientDto`)**:
     - `clientId: string` (Obligatorio, ID válido del cliente existente).
     - `assignedAt?: string` (Opcional, fecha YYYY-MM-DD de inicio; por defecto fecha actual local UTC-5).
     - `unassignedAt?: string` (Opcional, fecha YYYY-MM-DD de finalización del cliente actual si existía; por defecto fecha actual local).
     - `notes?: string` (Opcional, observaciones del cambio).
   - **Lógica de Servicio**:
     - Si el empleado ya tenía un `clientId` activo y diferente:
       - Cierra el registro previo en `clientHistory` estableciendo `unassignedAt` con la fecha indicada.
     - Agrega un nuevo ítem a `clientHistory` con `unassignedAt: null`, `recordedAt: new Date().toISOString()`, `recordedBy: user.id`.
     - Actualiza el campo escalar `clientId` en `Employee`.
     - Sincroniza atómicamente el `clientId` en la cuenta de usuario `User` vinculada al empleado (si existe).
     - Retorna el `EmployeeResponseDto` enriquecido.

2. **`PATCH /employee/:id/unassign-client`**:
   - **Propósito**: Desvincular al empleado de su cliente actual, dejándolo en estado *"Sin Asignar / Disponible"*.
   - **Payload (`UnassignEmployeeClientDto`)**:
     - `unassignedAt?: string` (Opcional, fecha YYYY-MM-DD de retiro; por defecto fecha actual local).
     - `notes?: string` (Opcional, observaciones de la desvinculación).
   - **Lógica de Servicio**:
     - Valida que el empleado tenga un cliente asignado actualmente.
     - Localiza el registro activo en `clientHistory` (`unassignedAt === null`) y le asigna la fecha de retiro.
     - Actualiza `clientId` a `null` en `Employee`.
     - Sincroniza `clientId: null` en la cuenta de usuario vinculada.
     - Retorna el `EmployeeResponseDto` actualizado.

3. **Retrocompatibilidad en `EmployeeResponseDto`**:
   - Se añade `clientHistory: EmployeeClientHistoryItem[]` en el DTO de respuesta para consumo directo del frontend.

---

### 2.3 Diseño UI/UX en Frontend (Next.js & Material-UI)

#### A. Menú Kebab en Tabla de Empleados ([DataTable.tsx](file:///d:/projects/security-crm-frontend/src/components/common/DataTable.tsx))
- **`editActionLabel`**: Se parametriza en `DataTable.tsx` para permitir títulos personalizados en la acción de edición (por defecto `"Editar"`). En `EmployeesPage`, se define `editActionLabel="Editar Datos"`.
- **Nueva Acción "Asignar Cliente"**: Se incluye en el kebab con ícono corporativo (`TransferWithinAStationOutlined` o `BusinessOutlined`) para empleados activos.
- **Limpieza en Formulario "Editar Datos"**: Se elimina el campo `clientId` de `fields` en `EmployeesPage` para separar permanentemente los datos personales de la gestión de turnos/puestos.

#### B. Drawer "Ver Detalle" (*Easy to track > Easy to read*)
Se agrega una tarjeta visual jerarquizada en [ResponsiveDetailWrapper](file:///d:/projects/security-crm-frontend/src/components/common/ResponsiveDetailWrapper.tsx):
- **Puesto Actual**:
  - Badge pulsante verde `"VIGENTE"` o chip gris `"SIN ASIGNAR"`.
  - Nombre del conjunto residencial y código interno.
  - Fecha de vinculación y días de servicio acumulados en el puesto.
- **Línea de Tiempo Histórica**:
  - Stepper vertical moderno listando cronológicamente los puestos anteriores.
  - Cada ítem muestra: Nombre del Cliente, Código, Periodo `[Fecha Inicio] — [Fecha Fin]` y duración total.
  - Si no posee historial previo, exhibe un empty state limpio: *"Sin historial de asignaciones registrado"*.

#### C. Drawer Especializado "Asignar Cliente" (`EmployeeAssignClientDrawer`)
Construido sobre [ResponsiveFormDrawer](file:///d:/projects/security-crm-frontend/src/components/common/ResponsiveFormDrawer.tsx) (540px en desktop / bottom-sheet en móvil):
1. **Header**: Avatar del empleado, nombre completo y badge de estado.
2. **Tarjeta de Situación Actual**:
   - Muestra el cliente asignado actualmente con su fecha de vinculación o *"Actualmente sin cliente asignado"*.
   - Si tiene cliente actual, incluye el botón de acción secundaria: *"Desvincular Cliente Actual"* (con confirmación y fecha de salida).
3. **Buscador de Nuevo Cliente con Debounce (500ms)**:
   - Autocomplete interactivo con búsqueda reactiva por nombre o código interno.
4. **Flujo de Confirmación y Fechas Dinámicas**:
   - Al seleccionar un nuevo cliente en el buscador:
     - **Si ya tenía cliente asignado**:
       - Mensaje de confirmación: *"¿Confirmas la reubicación a [Nuevo Cliente]?"*.
       - Pregunta 1: *"Fecha de desvinculación de [Cliente Actual]"* con Checkbox *"Hoy ([Fecha actual])"* marcado por defecto. Si se desmarca, se despliega un DatePicker calendario.
       - Pregunta 2: *"Fecha de vinculación a [Nuevo Cliente]"* con Checkbox *"Hoy ([Fecha actual])"* marcado por defecto o DatePicker calendario.
     - **Si NO tenía cliente asignado (Primera vez)**:
       - Mensaje de confirmación: *"¿Confirmas la asignación a [Nuevo Cliente]?"*.
       - Pregunta única: *"Fecha de vinculación a [Nuevo Cliente]"* con Checkbox *"Hoy ([Fecha actual])"* o DatePicker calendario.
5. **Gobernanza de Auditoría**:
   - `recordedAt` siempre registra de forma inmutable la fecha/hora en curso del sistema (UTC-5), garantizando trazabilidad real.
6. **Historial Desplegable al Pie**:
   - Acordeón colapsable para que el operador pueda examinar relevos anteriores sin abandonar el Drawer.

---

## 3. Plan de Implementación Paso a Paso

- [x] **Paso 1 (Backend - Migración & Schema)**:
  - Modificar `prisma/schema/employee.prisma` añadiendo `clientHistory Json? @default("[]") @db.JsonB`.
  - Crear la migración formal `npx prisma migrate dev --create-only --name add_employee_client_history`.
  - Aplicar la migración y regenerar el cliente de Prisma.
- [x] **Paso 2 (Backend - DTOs, Repositorio y Servicio)**:
  - Definir `AssignEmployeeClientDto` y `UnassignEmployeeClientDto` con validaciones de clase (`class-validator`).
  - Actualizar `EmployeeResponseDto` con la interfaz `EmployeeClientHistoryItem`.
  - Implementar `assignClient(employeeId, dto)` y `unassignClient(employeeId, dto)` en `EmployeeService`.
  - Mantener sincronización atómica con `UserRepositoryService.updateUser(user.id, { clientId })`.
  - Registrar endpoints en `EmployeeController` con documentación Swagger y decoradores RBAC.
- [x] **Paso 3 (Backend - Pruebas Unitarias)**:
  - Crear pruebas en `employee.service.spec.ts` y `employee.controller.spec.ts` cubriendo:
    - Primera asignación (cliente previo nulo).
    - Reasignación de puesto (cierre de registro previo con `unassignedAt` y apertura de nuevo registro).
    - Desvinculación de puesto (dejar en `null`).
    - Validaciones de fechas (`unassignedAt` anterior a `assignedAt`).
    - Sincronización con cuenta de usuario vinculada.
- [x] **Paso 4 (Frontend - Menú Kebab y Separación de Formularios)**:
  - Añadir propiedad opcional `editActionLabel?: string` en `DataTable.tsx`.
  - En `administrative/employees/page.tsx`, pasar `editActionLabel="Editar Datos"`.
  - Retirar el campo `clientId` del arreglo `fields` del formulario de edición.
- [x] **Paso 5 (Frontend - Drawer de Asignación y Actualización de Detalle)**:
  - Crear el componente `EmployeeAssignClientDrawer.tsx` con buscador debounced (500ms), flujo interactivo de confirmación y selección de fechas.
  - Actualizar `ResponsiveDetailWrapper` en `employees/page.tsx` para mostrar la tarjeta de puesto actual y la línea de tiempo histórica.
- [x] **Paso 6 (Verificación & Calidad Total)**:
  - Compilación estricta de TypeScript (`npx.cmd tsc --noEmit`) en backend y frontend.
  - Linter (`npm.cmd run lint`) en ambos proyectos.
  - Pruebas unitarias backend (`npm.cmd test`).
  - Compilación de producción en Next.js (`npm.cmd run build`).
- [x] **Paso 7 (Documentación & Registro)**:
  - Registrar las decisiones en `.specs/ai-decisions.log`.
  - Marcar pasos en `SPEC-REG-013` y pasar a `COMPLETADO`.

---

## 4. Criterios de Aceptación

1. **Integridad de Migraciones**: La base de datos local y Supabase comparten la misma historia de migraciones en `prisma/schema/migrations`, sin desfaces de schema ni uso de `prisma db push`.
2. **Trazabilidad Completa**: Cada asignación y desvinculación de cliente queda registrada en `clientHistory` con identificador, snapshot de cliente, fechas efectivas, `recordedAt` del sistema y notas.
3. **Separación de Responsabilidades**: En la tabla de empleados, el kebab muestra *"Editar Datos"* (sin selector de cliente) y *"Asignar Cliente"*.
4. **UX de Confirmación y Fechas**: El Drawer permite confirmar en pantalla la fecha de desvinculación (si existía puesto previo) y la fecha de vinculación mediante checkbox *"Hoy"* o calendario DatePicker.
5. **Desvinculación Funcional**: Permite dejar al empleado *"Sin Asignar / Disponible"* registrando la fecha efectiva de salida.
6. **Visualización Scannable**: En *"Ver Detalle"*, el puesto actual y el historial se comprenden de inmediato en menos de 5 segundos.
7. **Cobertura de Pruebas**: 100% de las pruebas unitarias pasan exitosamente y cero errores de TypeScript y build.
