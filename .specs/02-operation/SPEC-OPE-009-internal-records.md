# SPEC-OPE-009: Reestructuración de Minutas y Registros Internos

## 1. Contexto y Decisión Arquitectónica
Se requiere adaptar el módulo operativo (Minutas) para soportar el registro de novedades internas propias de la empresa (Tenant), desvinculadas de clientes externos, apartamentos o residentes, y en su lugar asociadas a empleados directos de la compañía.

### Decisión de Base de Datos
Entre las opciones de (1) crear tablas nuevas para registros internos o (2) adaptar las tablas existentes, **se ha decidido la Opción 2: Ajustar las tablas existentes**.

**Justificación:**
- Evita la duplicación masiva de controladores, servicios, DTOs y tablas en la base de datos.
- Mantiene una fuente única de verdad para reportes globales.
- Permite reutilizar la lógica de frontend existente (Componentes de DataGrid, Exportaciones, etc.) simplemente diferenciando con un flag lógico.

## 2. Modificaciones en Base de Datos (Prisma)
Se añadirán campos en las tablas existentes para soportar el contexto interno:

- **`Minuta` (General)**:
  - Añadir `isInternal Boolean @default(false)`
  - Ya posee `clientId` para vincularla a un cliente de ser necesario.

- **`ParkingResidentVehicleControl` (Parqueadero)**:
  - Añadir `isInternal Boolean @default(false)`
  - Añadir `employeeId String?` (relación a `Employee`)

- **`VisitorEntryControl` (Visitantes)**:
  - Añadir `isInternal Boolean @default(false)`
  - Añadir `employeeId String?` (relación a `Employee`, reemplaza al residente/anfitrión)

- **`CorrespondenceReceivedControl` (Domicilios/Paquetería)**:
  - Añadir `isInternal Boolean @default(false)`
  - Añadir `recipientEmployeeId String?` (relación a `Employee`, reemplaza al destinatario residente)

## 3. Modificaciones en el Backend (API)
- **DTOs**: Actualizar los DTOs de creación y actualización para aceptar `isInternal` y los respectivos IDs de empleados (`employeeId`, `recipientEmployeeId`). Validar que si `isInternal` es `false`, se sigan las reglas actuales, pero si es `true`, no se exija unidad ni residente.
- **Controllers & Services**:
  - Modificar los endpoints `GET` para recibir `isInternal` como query param.
  - Ajustar la lógica de seguridad:
    - `isInternal = true`: Accesible por Guardias Internos y Administradores.
    - `isInternal = false`: Accesible por Guardias asignados al cliente y Administradores.

## 4. Modificaciones en el Frontend

### 4.1. Menú Lateral (Sidebar)
Modificar la estructura del menú bajo "Operaciones" para que sea un menú desplegable con tres sub-ítems:
1. **Minutas del Cliente**: Enrutará a las listas actuales filtradas por `isInternal=false`. Visible para guardias de cliente y admins.
2. **Minutas de [Nombre del Tenant]**: Enrutará a las listas internas (`isInternal=true`). Visible para guardias internos y admins.
3. **Recorridos**: Opción inactiva/bloqueada para el futuro.

### 4.2. Formularios de Minutas Internas
En las pantallas de registros internos (`isInternal=true`), los formularios de creación/edición variarán:
- **Minuta General**: Cambiar "Unidad/Residente" por un toggle "¿Vinculada a un cliente?". Si es "sí", mostrar un buscador de cliente (debounce 500ms).
- **Parqueadero**: Añadir toggle "¿Vinculada a un empleado del tenant?". Si es "sí", mostrar buscador de empleado (debounce 500ms).
- **Visitantes**: Cambiar "Destino Residencial y Residente" por buscador de Empleado (debounce 500ms).
- **Correspondencia**: Cambiar "Apartamento y Residente" por buscador de Empleado (debounce 500ms).

### 4.3. Buscador Global de Clientes (Admins)
- Remover los toggles "Ver registros internos" actuales.
- En todas las minutas, cambiar el Dropdown `<Select>` de "Conjunto / Cliente Activo" por un input `<Autocomplete>` asíncrono con debounce de 500ms.
- El buscador permitirá buscar por nombre del cliente o `internalCode`.

## 5. Criterios de Aceptación
- La BD migra exitosamente con los nuevos campos sin perder data existente.
- Los menús del sidebar reflejan las opciones basadas en el rol/tenant dinámico.
- La creación de registros internos guarda correctamente el `employeeId` y oculta/ignora campos de unidad/residente.
- Los administradores pueden usar el buscador por debounce para encontrar clientes rápidamente.
