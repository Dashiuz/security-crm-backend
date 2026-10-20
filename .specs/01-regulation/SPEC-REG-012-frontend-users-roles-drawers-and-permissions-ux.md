# SPEC-REG-012: Modernización UI/UX de Usuarios y Roles (Drawers Unificados, Sin Modales y Permisos en Español)

> **Estado**: `COMPLETADO`  
> **Módulo**: `regulation` / `administrative`  
> **Ubicación Frontend**: `src/app/(protected)/administrative/users` y `src/app/(protected)/administrative/roles`  
> **Ubicación Backend**: `prisma/seed.ts` (descripciones de permisos en español)  
> **Fecha de Creación**: 2026-10-15  
> **Autor**: Antigravity (Software Architect)  

---

## 1. Contexto de Negocio y Diagnóstico de UI/UX

### 1.1 Problemática Identificada

1. **Inconsistencia de Modales en Módulo de Usuarios (`administrative/users`)**:
   - **Creación de Usuarios**: Actualmente utiliza un modal flotante `<Dialog>` (`StandardUserCreateDialog`), desalineado del estándar universal `ResponsiveFormDrawer` adoptado en los demás módulos del sistema.
   - **Edición de Usuarios**: Utiliza un modal flotante `<Dialog>` (`UserEditDialog`) con dos tabs ("Información General" y "Seguridad").
   - **Colisión Crítica de Doble Backdrop / Colapso de UI**: Al seleccionar el tab "Seguridad", se renderiza un `<FormDialog>` que a su vez despliega un `ResponsiveFormDrawer` lateral encima del modal existente. Esto genera dos backdrops competidores, rompiendo la interacción táctil/ratón y colapsando ambas ventanas al hacer clic, impidiendo el restablecimiento de contraseñas.

2. **Gestión de Roles (`administrative/roles`)**:
   - **Presencia de Modal Flotante**: Actualmente `RoleEditDialog` utiliza `<Dialog fullScreen={isMobile} maxWidth="md">`. Se busca eliminar los modales y unificar la experiencia hacia drawers o vistas especializadas.
   - **Redundancia en Permisos**: El switch general *"Habilitar todos los permisos de..."* es redundante dado que la arquitectura RBAC de Noxia ya cuenta con permisos específicos `<modulo>:manage`, que otorgan gobernanza completa sobre el recurso.
   - **Idioma de Descripciones**: Las descripciones de los permisos (`desc` en la tabla `permission`) se encuentran redactadas en inglés en la base de datos (heredadas del seed inicial), afectando la legibilidad para los administradores locales.

---

## 2. Decisiones Arquitectónicas y Evaluación Técnica

### 2.1 Módulo de Usuarios (`users/page.tsx`)

#### A. Creación de Usuarios (`UserCreateDrawer`)
- Sustituir `StandardUserCreateDialog` por `ResponsiveFormDrawer`:
  - **Desktop (md+)**: Drawer lateral derecho (`width: { xs: "100%", sm: 540 }`).
  - **Mobile (<md)**: Bottom-sheet fluido con tirador de arrastre (`drag handle`) y acciones ancladas al pie (`sticky footer`).
  - Formulario reactivo soportando creación de usuario para `EMPLOYEE` (con autocompletado de empleados y selección múltiple de roles) y `RESIDENCE_MANAGER` (con asignación de conjunto residencial y nombre completo).

#### B. Edición de Usuarios (`UserEditDrawer`)
- **Eliminar por completo el modal `<Dialog>` y las pestañas (`Tabs`) internas**.
- Integrar la gestión completa en un único `ResponsiveFormDrawer` con diseño estructurado y scannable dividido en dos secciones visualmente diferenciadas:
  1. **Sección Rol y Accesos (`SecurityOutlined`)**:
     - Visualización del rol actual y selector de cambio de rol.
     - Botón de acción individual *"Actualizar Rol"*.
  2. **Sección Seguridad y Credenciales (`LockResetOutlined`)**:
     - Alerta informativa de advertencia: *"Al restablecer la contraseña, se obligará al usuario a cambiarla en su próximo inicio de sesión"*.
     - Campos *"Nueva Contraseña"* y *"Confirmar Contraseña"* con adornos para alternar visibilidad (mostrar/ocultar contraseña).
     - Botón de acción individual *"Restablecer Contraseña"*.
- **Impacto**: Erradica por completo el choque de backdrops y simplifica el flujo operativo a cero clics de navegación por tabs.

---

## 2.2 Módulo de Roles (`roles/page.tsx`)

#### A. Evaluación Arquitectónica: ¿Drawer vs Vista Completa (`/roles/[id]`)?
- **Decisión**: **Drawer Especializado (`ResponsiveFormDrawer` ancho: 760px en Desktop / Bottom-Sheet en Mobile)**.
- **Justificación Técnica y Ciclos de Vida React**:
  1. **Ahorro de Recursos y Rendimiento**: Crear una subruta en Next.js App Router (`/administrative/roles/[id]`) obliga a desmontar por completo la vista principal de roles, desechando el estado de la tabla (`DataTable`), filtros y paginación en memoria. Un Drawer encapsula su estado localmente (`Set<string>` para permisos activos) y lo monta/desmonta eficientemente sin forzar recompilaciones de rutas ni round-trips de navegación en el router.
  2. **Ergonomía UI**: Con un ancho de `760px` en desktop, el patrón Master-Detail (columna izquierda 32% para módulos/categorías con chips contadores `X/Y`, columna derecha 68% para permisos) dispone de espacio visual amplio y cómodo.
  3. **Continuidad SPA**: El usuario edita permisos, pulsa *"Guardar Cambios"*, recibe feedback instantáneo y la tabla se actualiza sin pestañeo ni pérdida de foco.
  4. **Adaptación Móvil**: En pantallas móviles (<md), el `ResponsiveFormDrawer` se abre como bottom-sheet con selector de categorías dropdown en el encabezado, conservando la alta usabilidad ya validada.

#### B. Reestructuración de Permisos y Jerarquía `:manage`
- **Eliminación del Toggle Maestro**: Se retira el switch *"Habilitar todos los permisos de..."*.
- **Priorización Visual del Permiso `:manage`**:
  - En cada categoría, el permiso que contenga `:manage` se posiciona de **primer lugar** en la lista.
  - Se le aplica un realce visual premium:
    - Borde destacado con color primario (`primary.main`).
    - Fondo diferenciado con gradiente o tonalidad suave (`primary.50` en modo claro / `rgba(25, 118, 210, 0.12)` en modo oscuro).
    - Chip distintivo `ADMIN / CONTROL TOTAL` con ícono de seguridad (`AdminPanelSettingsOutlined`).
    - Tipografía en negrita que comunique claramente que su activación concede control total sobre el módulo.

#### C. Estrategia para Descripciones en Español
- **Evaluación de Alternativas**:
  - *Alternativa 1 (Diccionario en Frontend)*: Fragilidad ante nuevos permisos; la base de datos y la API Swagger seguirían en inglés.
  - *Alternativa 2 (Nueva columna `descEs` en DB)*: Sobreingeniería innecesaria; Noxia es un producto empresarial hispanohablante y no requiere i18n bilingüe.
  - *Alternativa 3 (Recomendada: Actualización en SSOT `desc` + Seed + Script/Migración)*:
    1. En `prisma/seed.ts`, traducir los campos `desc` de todos los permisos al español formal y claro (ej: `Create client accounts and sites` -> `Crear cuentas y sedes de clientes`, `Manage all client operations` -> `Control total de operaciones del cliente`).
    2. Ejecutar actualización en la base de datos para que la columna `desc` almacene las descripciones nativas en español.
    3. En el frontend, el componente consume directamente `perm.desc` en español nativo desde la API, con un fallback amigable por regex si viniese vacío.

---

## 3. Plan de Implementación Paso a Paso

- [x] **Paso 1 (Backend - SSOT Permisos en Español)**:
  - Actualizar `prisma/seed.ts` con descripciones de permisos en español para todos los módulos.
  - Ejecutar un script de actualización rápida en PostgreSQL para sincronizar la columna `desc` de la tabla `permission`.
- [x] **Paso 2 (Frontend - Usuarios)**:
  - Reemplazar `StandardUserCreateDialog` por `UserCreateDrawer` basado en `ResponsiveFormDrawer`.
  - Reemplazar `UserEditDialog` por `UserEditDrawer` basado en `ResponsiveFormDrawer`, eliminando los tabs y unificando Rol y Contraseña en tarjetas ordenadas.
- [x] **Paso 3 (Frontend - Roles)**:
  - Migrar `RoleEditDialog` a `RoleEditDrawer` utilizando `ResponsiveFormDrawer` (`width: { xs: "100%", md: 760 }`).
  - Eliminar el switch maestro *"Habilitar todos los permisos de..."*.
  - Reordenar la lista para colocar el permiso `:manage` en la primera posición con tarjeta destacada y badge `ADMIN / CONTROL TOTAL`.
- [x] **Paso 4 (Verificación & Calidad)**:
  - Comprobación estricta de TypeScript (`npx.cmd tsc --noEmit`) en backend y frontend.
  - Comprobación de linter (`npm.cmd run lint`) en ambos repositorios.
  - Compilación de producción en Next.js (`npm.cmd run build`) con Turbopack.
- [x] **Paso 5 (Documentación & Cierre)**:
  - Registrar las decisiones en `.specs/ai-decisions.log`.
  - Marcar pasos en `SPEC-REG-012` y pasar a `COMPLETADO`.

---

## 4. Criterios de Aceptación
1. En `administrative/users`, tanto la creación como la edición de usuarios se abren como Drawers laterales en desktop y Bottom-Sheets en móvil.
2. No existen ventanas modulares anidadas ni cierres intempestivos al restablecer contraseñas.
3. En `administrative/roles`, la edición se abre mediante un Drawer amplio (760px) con el patrón Master-Detail intacto.
4. En cada categoría de roles, el permiso `:manage` aparece de primero con realce visual administrativo.
5. Las descripciones de los permisos se muestran en español claro y profesional.
6. Cero errores de compilación TypeScript y build de Next.js exitoso.
