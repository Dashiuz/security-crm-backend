# SPEC-OPE-008: Filtros de Cliente, Registros Internos y Restricciones de Creación (Admins)

> **Estado**: `IMPLEMENTADO`  
> **Módulo**: `operation` (Minutas, Visitas, Parqueaderos, Correspondencia)  
> **Autor(es)**: `Arquitecto AI`  
> **Fecha de Creación**: `2026-09-10`  
> **Última Actualización**: `2026-09-10`  

---

## 1. Contexto de Negocio e Historias de Usuario

### 1.1 Objetivo
Esta especificación define la solución para permitir a los Usuarios Administrativos Globales (Tenant Admins) visualizar y crear "Registros Internos" (aquellos que pertenecen al tenant general y no a un cliente/conjunto específico). Adicionalmente, soluciona el problema de retención de estado en el dropdown de selección de cliente cuando se selecciona "Todos los Clientes / Conjuntos" y establece validaciones estrictas en la interfaz gráfica para prevenir la creación de registros huérfanos por error.

### 1.2 Historias de Usuario (User Stories)
- **US-01**: Como **Usuario Administrador**, quiero poder seleccionar la opción "Todos los Clientes / Conjuntos" en el filtro global sin que la aplicación me fuerce automáticamente al primer cliente de la lista.
- **US-02**: Como **Usuario Administrador**, quiero disponer de un interruptor (Toggle) que me permita aislar y visualizar únicamente los registros internos del tenant (minutas sin un `clientId` asociado).
- **US-03**: Como **Usuario Administrador**, quiero que la interfaz de creación de registros sea clara y evite errores; si intento crear un registro mientras visualizo "Todos los Clientes", el sistema me exigirá seleccionar un cliente en específico o habilitar el modo de registro interno.
- **US-04**: Como **Usuario Administrador**, quiero que el modal de creación de registros (independientemente del tipo de minuta) me confirme visualmente mediante una etiqueta o título dónde se guardará el registro ("Nuevo Registro Interno" o "Nuevo Registro para [Nombre del Cliente]").

---

## 2. Definición de Permisos y Matriz RBAC

- No se requiere la creación de nuevos permisos.
- Las reglas de negocio aplicarán exclusivamente a usuarios cuyo `session?.user?.clientId` sea nulo o indefinido (conocidos como Global Users o Tenant Admins).
- Para los Guardias de Seguridad (usuarios con `clientId` preasignado), la interfaz y los flujos seguirán operando con normalidad, omitiendo el toggle de registros internos y las alertas descritas.

---

## 3. Modelo de Datos (Prisma Schema Specification)

No hay alteraciones en el esquema de Prisma. Los registros internos ya son soportados por la base de datos al enviar `clientId = null`.

---

## 4. Contrato de API REST & Backend Specification (NestJS)

### 4.1 Actualización de Query DTOs de Filtrado
En los DTOs de filtrado de los 4 módulos operativos (`MinutaFilterQueryDto`, `VisitorFilterQueryDto`, `ParkingFilterQueryDto`, `CorrespondenceFilterQueryDto`), se añadirá:
```typescript
@ApiPropertyOptional()
@IsOptional()
@IsBooleanString()
isInternal?: string;
```

### 4.2 Lógica en Servicios de Operación
En el método `findAll()` de `MinutaGeneralService`, `VisitorControlService`, `ParkingControlService` y `CorrespondenceControlService`, se actualizará la condición del `where`:
```typescript
if (query?.isInternal === 'true') {
  where.clientId = null; // Forza a buscar solo registros sin cliente (Internos)
} else if (query?.clientId) {
  where.clientId = query.clientId; // Busca por el cliente seleccionado
}
// Si no se envía ni isInternal ni clientId, la búsqueda omite el filtro y retorna todos.
```

---

## 5. Especificación Frontend (Next.js App Router)

Esta sección aplica a los archivos `page.tsx` de: `minuta-general`, `visitor`, `parking`, y `correspondence`.

### 5.1 Corrección del Dropdown "Todos los Clientes"
- Se reemplazará la dependencia directa que forzaba el cambio al primer cliente en cada re-render.
- Se implementará un mecanismo (ej. `useRef` o una sola evaluación inicial) para asegurar que la auto-selección del primer cliente ocurra exclusivamente la primera vez que se cargan los datos, respetando si el usuario selecciona posteriormente la cadena vacía `""`.

### 5.2 Filtro y Toggle "Registros Internos"
- Se introducirá un estado `viewMode: "CLIENT" | "INTERNAL"`.
- Se añadirá un componente `Switch` (o Toggle) junto al dropdown de clientes con el texto "Ver Registros Internos".
- Al activar el modo `INTERNAL`, el dropdown de clientes se deshabilitará, y el `DataTable` solicitará los datos incluyendo `&isInternal=true`.
- Al desactivarlo (`CLIENT`), se restablecerá el filtrado por el cliente seleccionado en el dropdown.

### 5.3 Validaciones y UX en la Creación de Registros (Solo Admins)
Al accionar el botón **"Crear Nuevo"** (o su equivalente), se evaluarán las siguientes reglas:

1. **Intento de creación con "Todos los Clientes" (`selectedClientId === ""` y `viewMode === "CLIENT"`)**:
   - Se bloqueará la apertura del modal.
   - Se mostrará una alerta (usando `showError` o similar) con el mensaje: *"Debe escoger un cliente específico o seleccionar registros internos antes de generar un registro nuevo."*

2. **Creación en Modo Interno (`viewMode === "INTERNAL"`)**:
   - El modal se abrirá y su título o etiqueta destacada indicará: **"Nuevo Registro Interno"**.
   - Al guardar, se garantizará que el payload envíe `clientId: null`.

3. **Creación en Modo Cliente Específico (`viewMode === "CLIENT"` y `selectedClientId` tiene valor)**:
   - El modal se abrirá y su título o etiqueta destacada indicará: **"Nuevo Registro para [Nombre del Cliente]"** (extrayendo el nombre del cliente de la lista precargada).
   - Al guardar, el payload enviará el `clientId` correspondiente.

---

## 6. Criterios de Aceptación y Matriz de Verificación
- [x] Dropdown de selección de cliente retiene correctamente la opción "Todos los Clientes / Conjuntos" sin revertirse.
- [x] Toggle de registros internos cambia correctamente el dataset visible mostrando únicamente aquellos con `clientId = null`.
- [x] Bloqueo activo y visualización de notificación de error si el admin intenta crear un registro teniendo seleccionado "Todos los clientes".
- [x] El título de los modales de creación refleja el destino del registro dinámicamente ("Interno" o "[Nombre del Cliente]").
- [x] Todos los flujos se aplican y verifican en los módulos de Minuta General, Visitantes, Parqueaderos y Correspondencia.
