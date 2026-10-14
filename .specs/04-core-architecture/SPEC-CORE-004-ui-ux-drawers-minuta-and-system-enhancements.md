# SPEC-CORE-004: Rediseño UX/UI de Minutas, Drawers Universales, Zonas Horarias Cloud y Mejoras del Sistema

> **Estado**: `IMPLEMENTADO Y VALIDADO (100% COMPLETADO)`  
> **Módulo**: `core-architecture / ui-ux / operation-minuta / administrative / cross-cutting`  
> **Autor(es)**: `Software Architect & Senior Fullstack UX/UI Engineer`  
> **Fecha de Creación**: `2026-10-13`  
> **Última Actualización**: `2026-10-13`  

---

## 1. Contexto de Negocio e Historias de Usuario

El sistema Noxia Security CRM ha avanzado significativamente en modularidad y arquitectura responsiva. Tras la revisión y aprobación del usuario, se acordó ejecutar los 10 puntos de optimización con una directiva clave de diseño: **el rediseño visual de la vista de detalle ("Easy to track > Easy to read" - Punto B) no se limitará a las minutas, sino que se estandarizará de manera UNIVERSAL en todos los módulos de la aplicación (minutas, empleados, usuarios, departamentos, cargos, roles, residentes, etc.)**.

### 1.1 Historias de Usuario (User Stories)
- **US-01 (Drawers de Creación y Edición - Punto A)**: Como usuario de escritorio o móvil, quiero que la creación y edición de recursos en minutas y módulos administrativos se abra en un Drawer lateral (desktop) o inferior (mobile), para mantener una experiencia moderna, fluida y consistente sin modales flotantes invasivos.
- **US-02 (Vista de Detalle Scannable Universal - Punto B)**: Como usuario del sistema, quiero que la vista de detalle en **TODOS** los módulos organice la información visualmente mediante tarjetas temáticas, iconos de anclaje, badges semánticos y jerarquía clara ("Easy to track > Easy to read"), permitiéndome identificar los datos críticos en menos de 1 segundo.
- **US-03 (Nomenclatura Semántica de Prioridad - Punto C)**: Como guarda o administrador, quiero ver nombres claros de prioridad ("Muy baja", "Baja", "Normal", "Alta", "Crítica") en lugar de números técnicos ("Nivel 1-5"), para entender el impacto inmediato del evento.
- **US-04 (Puestos de Guardia Físicos - Punto D)**: Como operador de minuta general, quiero que el selector "Puesto / Ubicación" liste exclusivamente ubicaciones residenciales reales (Recepción, Acceso Vehicular, Parqueadero, etc.), separando los cargos del personal de los puestos físicos.
- **US-05 (Persistencia de Dirección de Empleado - Punto E)**: Como administrador de RRHH, quiero que al editar un empleado la dirección registrada se cargue correctamente en el formulario, para no ser forzado a reingresarla cada vez que actualice otro campo.
- **US-06 (Gestión de Fechas y Zonas Horarias Cloud - Punto F)**: Como supervisor operativo, quiero que las fechas y horas registradas en minutas y módulos reflejen siempre el tiempo local del dispositivo/sede y no la hora UTC desfasada del servidor en la nube (Render).
- **US-07 (Columna Cargo en Minuta General - Punto G)**: Como auditor de seguridad, quiero ver en la tabla de Minuta General el cargo del usuario que registró la novedad al lado del puesto, para saber si fue registrada por un guarda, supervisor o coordinador.
- **US-08 (Apertura de Detalle por Clic en Fila - Punto H)**: Como usuario del sistema, quiero hacer clic en cualquier fila de las tablas de datos para abrir automáticamente su vista de detalle, sin tener que apuntar obligatoriamente al pequeño botón de acción.
- **US-09 (Bullets de Color en Menú Lateral - Punto I)**: Como usuario que navega por el sidebar, quiero identificar de un vistazo el tipo de minuta mediante un punto de color distintivo (General: azul, Visitas: naranja, Correspondencia: morada, Vehicular: verde).
- **US-10 (Soporte Universal de Pegado en Inputs - Punto J)**: Como usuario que copia datos de planillas o mensajes, quiero poder pegar texto formateado (teléfonos con prefijo, NIT con guiones, números con espacios) en los campos de entrada sin que el navegador bloquee el evento de pegado.

---

## 2. Especificación Técnica Detallada

### 2.1 Punto A: Drawers Universales de Creación y Edición (`ResponsiveFormDrawer`)
- **Arquitectura**:
  - Creamos el componente central `src/components/common/ResponsiveFormDrawer.tsx`:
    - **Desktop (`md` en adelante)**: `<Drawer anchor="right">` con ancho adaptable (`{ xs: '100%', sm: 540, md: 600 }`), cabecera sticky con título, icono distintivo y botón de cierre, cuerpo scrolleable estilizado, y barra de acciones inferior fija (`Cancelar` y `Guardar/Crear`).
    - **Mobile (`down('md')`)**: `<Drawer anchor="bottom">` estilo Bottom Sheet, con altura máxima de `92vh`, bordes superiores redondeados (`borderRadius: '20px 20px 0 0'`), tirador visual de arrastre (*drag handle*), contenido desplazable y acciones fijas en la base con safe-area padding.
  - **Refactorización de `FormDialog.tsx`**:
    - Se actualiza internamente `FormDialog.tsx` para renderizar su contenido dentro de `ResponsiveFormDrawer` en lugar de `<Dialog>`. Esto transforma automáticamente todos los formularios que ya consumen este componente:
      - `departments`, `employees`, `permissions`, `positions`, `roles`, `user-roles`, `users`.
  - **Adaptación en Formularios Dedicados**:
    - Reemplazo de `<Dialog>` por `ResponsiveFormDrawer` en:
      - `src/app/(protected)/operation/minuta-general/page.tsx`
      - `src/app/(protected)/operation/correspondence/page.tsx` (registro y entrega)
      - `src/app/(protected)/operation/visitor/page.tsx`
      - `src/app/(protected)/operation/parking/page.tsx`
      - `src/app/(protected)/administrative/my-residents/page.tsx`
      - `src/app/(protected)/administrative/prospects/page.tsx` (diálogo de conversión)

---

### 2.2 Punto B: Rediseño Visual de Detalle de Minutas ("Easy to Track")
- **Problema Actual (Referencia Visual #1)**:
  - Estructura plana de 12 campos de texto en dos columnas idénticas sin pesos visuales.
  - La anotación principal se pierde al final como una línea más de texto.
  - La fotografía queda descontextualizada y los estados carecen de destaque.
- **Solución UX/UI en `DetailDialog.tsx`**:
  - **Hero / Header Multimedia**:
    - Contenedor de evidencia fotográfica con bordes suaves, fondo oscuro para contraste y badge de tipo de evento sobrepuesto. Si no hay foto, se muestra un header de estado elegante con iconografía de seguridad.
  - **Sección 1: Alerta / Novedad Principal ("La Noticia")**:
    - Tarjeta destacada con acento visual lateral, tipografía ampliada (`body1` con peso 500) y comillas o icono de cita, para que el lector entienda de inmediato qué ocurrió.
  - **Sección 2: Cuándo y Dónde (Tiempo y Espacio)**:
    - Grid de micro-tarjetas con iconos semánticos:
      - 📅 Fecha del suceso + ⏰ Hora local del suceso.
      - 📍 Puesto / Ubicación física + 🏢 Unidad / Destino (si aplica).
  - **Sección 3: Personas y Vinculación**:
    - Tarjeta de contexto: Residente vinculado, Cliente asociado, o Fuente externa de origen.
  - **Sección 4: Auditoría y Trazabilidad (Metadatos)**:
    - Barra inferior en tono tenue con:
      - Guarda registrador + Cargo.
      - Timestamp exacto de creación en sistema.
      - ID del registro en fuente monospace con botón de copiado al portapapeles.

---

### 2.3 Punto C: Nomenclatura Semántica de Prioridades
- **Definición de Escala**:
  - `1`: **Muy baja** (Chip gris pizarra / neutral)
  - `2`: **Baja** (Chip azul informativo)
  - `3`: **Normal** (Chip verde suave / neutro)
  - `4`: **Alta** (Chip ámbar / alerta)
  - `5`: **Crítica** (Chip rojo carmesí / emergencia)
- **Implementación**:
  - Centralización en `src/lib/constants/minuta.ts` o `formatters.ts`: función `getPriorityBadge(priority: number)`.
  - Aplicación consistente en:
    - Columnas de `DataTable` (`renderCell`).
    - Tarjetas móviles `UniversalMobileCard`.
    - Selector del formulario de registro (opciones con etiquetas descriptivas).
    - Vista de detalle `DetailDialog`.

---

### 2.4 Punto D: Puesto / Ubicación en Minuta General
- **Problema**: `GUARD_POST_OPTIONS` contenía roles ("Recorredor", "Supervisor", "Líder") mezclados con ubicaciones.
- **Catálogo de Puestos Físicos Residenciales**:
  - "Recepción / Portería Principal"
  - "Acceso Vehicular"
  - "Acceso Peatonal"
  - "Parqueadero Residentes"
  - "Parqueadero Visitantes"
  - "Áreas Comunes / Club House"
  - "Piscina / Zonas Húmedas"
  - "Zona Infantil / Juegos"
  - "Torre / Bloque Residencial"
  - "Ronda Perimetral"
  - "Cuarto Técnico / Subestación / Basuras"
  - "Otro"
- Permite además la entrada libre de texto si se requiere una ubicación puntual.

---

### 2.5 Punto E: Corrección de Dirección en Edición de Empleados
- **Causa Raíz Identificada**:
  - En backend: `d:\projects\security-crm-backend\src\modules\regulation\employee\employee.service.ts` (líneas 140-158):
    - `createEmployee` recibía `dto.address` en el DTO validado, pero **no lo incluía** en el objeto pasado a `this.employeeRepository.createEmployee`. Prisma asignaba por omisión el default `""`.
- **Solución Backend**:
  - Agregar `address: dto.address.trim()` en el payload de creación de `employee.service.ts`.
- **Solución Frontend**:
  - En `employees/page.tsx`:
    - En `handleEdit`: asegurar `address: data.address || ""` y proveer fallback si se trata de un registro histórico con dirección vacía para evitar bloqueos en el formulario.

---

### 2.6 Punto F: Zonas Horarias Cloud (Render Backend en UTC vs. Dispositivo Local en Vercel)
- **Diagnóstico del Desfase**:
  1. `toISOString().split("T")[0]` en el navegador calcula la fecha en UTC. En horarios nocturnos (después de las 7:00 PM en UTC-5), genera **la fecha del día siguiente**.
  2. `occurredAt: `${dateVal}T${timeVal}Z`` añade `'Z'` (UTC) a una hora que el usuario ingresó como hora local. Al guardarse y recuperarse, el navegador le resta 5 horas nuevamente, desfasando la hora real.
  3. Campos `@db.Time` y `@db.Date` devueltos por Prisma como `"1970-01-01T20:00:00.000Z"` y `"2026-10-13T00:00:00.000Z"` eran parseados con `dayjs(value)` en cliente, el cual restaba el huso horario local (UTC-5), alterando la hora del suceso o restando un día completo.
- **Estrategia y Arquitectura de Solución**:
  1. **Inicialización de formularios en Frontend**:
     - Usar `dayjs().format("YYYY-MM-DD")` y `dayjs().format("HH:mm")` (hora local del dispositivo garantizada).
  2. **Envío de Timestamps**:
     - `occurredAt: dayjs(`${dateVal} ${timeVal}`).toISOString()`, permitiendo que Day.js calcule la conversión exacta de hora local a UTC real.
  3. **Formateadores en `src/lib/formatters.ts`**:
     - `formatDate`: Extraer la porción `YYYY-MM-DD` sin desplazamiento de huso horario (`dayjs(value.split("T")[0]).format("DD-MM-YYYY")`), asegurando que una fecha de calendario nunca cambie de día por diferencias de zona.
     - `formatTime`: Si la cadena proviene de un campo Time (`1970-01-01T...`), extraer directamente la hora literal o usar `dayjs.utc(value).format("HH:mm:ss")`.
     - `formatDateTime`: Para campos `createdAt` y `occurredAt` (instantes UTC absolutos), formatear con `dayjs(value).format("DD-MM-YYYY HH:mm:ss")`, lo que proyecta la hora local exacta del usuario.

---

### 2.7 Punto G: Columna "Cargo" en Minuta General
- **Backend**:
  - El modelo `User` en Prisma ya posee el campo directo `position: String`.
  - En `MinutaRepositoryService.findMany` y `findUnique`:
    - Extender la selección de usuario: `createdBy: { select: { id: true, fullName: true, position: true } }`.
    - Mapear en la respuesta: `creatorPosition: r.createdBy?.position || 'Guarda de Seguridad'`.
    - *Zero migraciones de base de datos requeridas.*
- **Frontend**:
  - Agregar la columna "Cargo" en `minuta-general/page.tsx` inmediatamente después de "Puesto / Ubicación".
  - Mostrar el cargo en la tarjeta de auditoría de `DetailDialog`.

---

### 2.8 Punto H: Clic en Fila para Abrir Detalle
- **Implementación en `DataTable.tsx`**:
  - En el componente `DataGrid`:
    ```tsx
    onRowClick={(params, event) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.closest("button") ||
        target?.closest(".MuiCheckbox-root") ||
        target?.closest("a") ||
        (target?.closest(".MuiDataGrid-cell")?.getAttribute("data-field") === "actions")
      ) {
        return;
      }
      if (onView) {
        onView(params.row);
      }
    }}
    ```
  - Configurar `cursor: onView ? "pointer" : "default"` y transición suave en hover sobre las filas.

---

### 2.9 Punto I: Bullets de Color en Sidebar para Minutas
- **Paleta de Identificación Visual**:
  - **Minuta General**: Azul (`#1976d2`)
  - **Control de Visitas / Registro Peatonal**: Naranja (`#ed6c02`)
  - **Control de Domicilios / Correspondencia**: Morado (`#9c27b0`)
  - **Control de Parqueadero / Vehicular**: Verde (`#2e7d32`)
- **Implementación en `Sidebar.tsx`**:
  - Añadir propiedad `bulletColor?: string` en el esquema de elementos de menú.
  - Renderizar un punto luminoso circular (`width: 8, height: 8, borderRadius: '50%'`) con resplandor suave (*box-shadow*) al lado de cada submenú de minuta (tanto en "Minutas del Cliente" como en "Minutas de la Empresa").

---

### 2.10 Punto J: Auditoría y Soporte de Pegado (Paste / Ctrl+V) en Inputs
- **Problema**:
  - Inputs con `type="number"` rechazan de forma nativa cualquier pegado que contenga espacios, guiones o signos de moneda.
  - Handlers de `onChange` con `replace(/\D/g, "")` pueden experimentar pérdida de foco o valores nulos si el navegador cancela el pegado antes del evento change.
- **Solución**:
  - Para campos numéricos (`floorsAmount`, `apartmentsPerFloor`, `elevators`, `unitsAmount`, `commercialStoresAmount`):
    - Configurar `inputMode="numeric"` con `type="text"` o agregar un manejador `onPaste` que limpie automáticamente caracteres no numéricos y asigne el número limpio.
  - Para campos de teléfono y NIT:
    - Asegurar que el manejador `onPaste` permita pegar cadenas como `+57 300 123 4567` o `900.123.456-7`, extrayendo y formateando los dígitos limpiamente.

---

## 3. Plan de Pruebas y Cero Regresiones

1. **Backend**:
   - Ejecución de la suite completa de pruebas unitarias (`npm test`): Las 27 suites y 140 tests deben permanecer en verde (100% pass).
   - Verificación de tipos con `npx.cmd tsc --noEmit`.
2. **Frontend**:
   - Verificación de compilación de producción con `npm run build`: Las 33 rutas deben compilar sin advertencias ni errores.
   - Verificación de linter con `npm run lint`.
3. **Validación Funcional Cruzada**:
   - Probar creación y edición de minutas y entidades administrativas en Drawer lateral y móvil.
   - Probar clic en filas de tablas para apertura de detalle.
   - Validar visualización correcta de fechas y horas en horario local.
   - Validar persistencia de dirección en creación y edición de empleados.
   - Validar pegado de datos (Ctrl+V) con formatos variados.

---

## 4. Fases de Implementación Propuestas

- **Fase 1 (Backend)**:
  - Corrección de `employee.service.ts` (persistencia de `address`).
  - Extensión de `minuta.repository.service.ts` (`creatorPosition`).
  - Verificación `npm test` en backend.
- **Fase 2 (Componentes Core de Frontend)**:
  - Creación de `ResponsiveFormDrawer.tsx`.
  - Refactorización de `FormDialog.tsx`.
  - Rediseño de `DetailDialog.tsx`.
  - Actualización de `DataTable.tsx` (row click).
  - Actualización de `Sidebar.tsx` (bullets de color).
  - Actualización de `formatters.ts` (manejo timezone).
- **Fase 3 (Vistas de Módulos)**:
  - Actualización de Minuta General (columna cargo, puestos limpios, prioridades).
  - Reemplazo de Dialog por `ResponsiveFormDrawer` en minutas (`minuta-general`, `correspondence`, `visitor`, `parking`) y `my-residents`.
  - Corrección de inputs de pegado en `clients/new`.
- **Fase 4 (Validación y Cierre)**:
  - Compilación final y actualización de `ai-decisions.log`.
