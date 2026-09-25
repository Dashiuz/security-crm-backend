# SPEC-ADM-007: Refactor de Canva, Geofencing y Estudios de Seguridad

## 1. Contexto y Justificación
Actualmente, el módulo de Canva y los Estudios de Seguridad presentan áreas de mejora en cuanto a la consistencia de datos (SSOT), el acoplamiento de responsabilidades y la validación de acceso (Módulos/Features del Tenant). 

**Problemas identificados:**
1. Los tenants pueden acceder al Canva y sus funcionalidades incluso si el módulo (`canva`) está deshabilitado en su suscripción, debido a la falta de un Feature Guard estricto.
2. Los Estudios de Seguridad dependen fuertemente del Canva. Si un tenant solo tiene Estudios de Seguridad (`sec_study`) sin `canva`, la UI no se adapta correctamente para funcionar como un repositorio documental ("pool de archivos").
3. Al descontinuar un Estudio de Seguridad y crear uno nuevo, se obliga al usuario a volver a consumir la API de Mapbox y dibujar el Geofence desde cero, lo cual genera inconsistencia en el SSOT y gastos innecesarios de API.

**Decisión Arquitectónica (Alineada al escenario 5.2 sugerido):**
Desacoplar la creación del mapa base (Geofence) de los Estudios de Seguridad. El Geofence será una propiedad exclusiva y centralizada del **Cliente**. Los Estudios de Seguridad consumirán esta imagen base, garantizando el Single Source of Truth (SSOT) y ahorrando peticiones a servicios externos.

---

## 2. Requerimientos Funcionales

### 2.1. Guardias de Módulos (Feature Flags)
- **Backend**: Implementar un `FeatureGuard` global o decorador `@RequireFeature('feature_key')` que intercepte las peticiones y valide si el `Tenant` actual tiene habilitado dicho módulo en su tabla de `Feature`.
- **Frontend**: Utilizar `isFeatureEnabled('canva')` para proteger las rutas, ocultar botones de "Abrir Canva" y adaptar las vistas.

### 2.2. Estudios de Seguridad SIN Canva (Fallback Documental)
- Si un Tenant tiene `sec_study` pero NO `canva`:
  - La vista de Estudios de Seguridad se limitará a mostrar el listado de versiones.
  - La creación solicitará únicamente Nombre y Descripción.
  - Al abrir un estudio, se mostrará exclusivamente la interfaz de adjuntar/gestionar archivos (Pool de archivos).
  - Se ocultarán etiquetas, estados y botones relacionados con coordenadas, Mapbox, vértices y "Ver/Editar Canva".

### 2.3. Desacoplamiento del Geofence (El Cliente como SSOT)
- **Gestión desde el Cliente**: En el Listado de Clientes (`/clients`), se agregará una acción en la tabla: **"Configurar Geofence"** (condicionada a que el módulo `canva` esté activo).
- **Proceso de Configuración**: Al hacer clic, se abrirá el flujo actual de Mapbox (búsqueda de dirección, generación de imagen base y dibujo del perímetro/polígono). Estos datos se guardarán directamente en la entidad `Client` (`mapboxBaseImageS3Key`, `geofence`, y propiedades relacionadas con los bounds).
- **Consumo en Estudios de Seguridad**: 
  - Para crear un Estudio de Seguridad (con Canva), será **prerrequisito** que el Cliente tenga un Geofence configurado.
  - El Estudio de Seguridad ya NO consumirá la API de Mapbox. Tomará la imagen base y el perímetro (geofence) directamente del Cliente.
  - Dentro del Canva del Estudio, el usuario se limitará a añadir Dispositivos (`devices`) y Líneas/Facilidades (`facilities`). El polígono del perímetro será de solo lectura (importado del cliente).
- **Módulo Futuro (Control de Rondas)**: Al centralizar el Geofence en el Cliente, el futuro módulo de rondas podrá consumir el perímetro directamente de la entidad `Client`, validando que depende de `canva` y no de `sec_study`.

---

## 3. Cambios Técnicos Propuestos

### 3.1. Base de Datos (Prisma)
- **Modelo `SecurityStudy`**:
  - Los campos `baseImageS3Key`, `mapboxCenterLat`, `mapboxCenterLng`, `mapboxZoom`, `mapboxBbox*` pasan a ser redundantes. Se mantendrán por compatibilidad o se migrarán totalmente hacia el Cliente, dependiendo de si se desea inmutabilidad histórica. *(Decisión: Apuntar al cliente `Client.mapboxBaseImageS3Key` para nuevos estudios)*.
- **Modelo `Client`**:
  - Ya cuenta con `mapboxBaseImageS3Key` y `geofence`. Se añadirán los campos `mapboxBbox*` para permitir el cálculo matemático correcto del Canvas sin depender del Estudio.

### 3.2. Backend (NestJS)
- **`AccessControlModule`**: Crear/Ajustar `FeatureGuard` y `FeatureDecorator`.
- **`SecurityStudiesController` & `ClientsController`**:
  - Mover el endpoint de `generate-base-map` hacia un flujo controlado por el Cliente (`ClientsController` o nuevo `GeofenceController`).
  - Aplicar `@RequireFeature('canva')` a todos los endpoints de generación de mapas y Canva.
  - Actualizar la lógica de guardado de estado vectorial (`canvasState`) para diferenciar entre el guardado del perímetro (Client) y el guardado de dispositivos (SecurityStudy).

### 3.3. Frontend (React/Next)
- **`ClientList`**: Añadir botón/icono de "Geofence".
- **`SecurityCanvasEditor`**:
  - Refactorizar para admitir dos "modos": 
    1. *Modo Geofence (Cliente)*: Permite dibujar el polígono.
    2. *Modo Estudio de Seguridad*: El polígono es read-only; permite agregar cámaras y facilidades.
- **`SecurityStudyViews`**: Limpiar la UI si `isFeatureEnabled('canva')` es falso.

---

## 4. Plan de Implementación (Fases)

1. [x] **Fase 1: Implementación Global de Feature Guards**: Habilitar y aplicar `@RequireFeature('...')` transversalmente en todos los módulos del sistema, garantizando que la seguridad de suscripción se ejecute en el servidor. En controladores que manejan múltiples módulos (como `SecurityStudiesController` para `sec_study` y `canva`), la decoración se aplicará a nivel de **endpoint** y no global al controlador.
2. [x] **Fase 2: Modo Documental**: Ajuste visual de los Estudios de Seguridad cuando no hay Canva.
3. [x] **Fase 3: Migración Geofence a Cliente**: Movimiento de la generación de Mapbox a la vista del Cliente y actualización de los modelos (Prisma).
4. [x] **Fase 4: Adaptación del Canva Editor**: Separación de las responsabilidades de dibujo (Perímetro vs Geofence y Dispositivos).
5. [x] **Fase 5: Pruebas Unitarias y QA**: Verificación estricta (localAsyncStorage, auditoría y flujos visuales).

---

## 5. Estado de la Implementación
- **Estado**: COMPLETADO (IMPLEMENTED)
- **Fecha**: 2026-09-25
- **Tests**: 30/30 pruebas unitarias aprobadas en backend (`security-studies` y `feature.guard`).
- **Compilación**: TypeScript (`tsc --noEmit`) con 0 errores en backend y frontend.
