# Especificación Técnica SDD: Saneamiento de Marca Pronos, Corrección de Estudios Satelitales, Bitácora de Clientes y Refactorización Hub & Spoke de Prospectos

> **Código de Especificación**: `SPEC-ADM-034`  
> **Módulos Afectados**: `administrative/clients`, `administrative/prospects`, `administrative/security-studies`, `payroll`  
> **Ámbito**: Backend (`security-crm-backend`) & Frontend (`security-crm-frontend`)  
> **Fecha**: 2026-11-03  
> **Estado**: `COMPLETADO`

---

## 1. Resumen Ejecutivo y Motivación

Esta especificación consolida cuatro mejoras sustanciales en la experiencia de usuario, consistencia de marca y arquitectura modular de **NOXIA CRM**:

1. **Saneamiento de Marca (Erradicación de "Pronos")**: Eliminar cualquier vestigio de la denominación de terceros en interfaces públicas y documentación técnica Swagger.
2. **Corrección de Geofencing y Estudios Satelitales**: Asegurar la persistencia de metadatos satelitales en la entidad `Client` al generar la imagen base desde Mapbox, permitiendo que la geocerca se valide como existente (`hasGeofence: true`) y el botón "Nuevo Estudio Satelital" active fluidamente la creación del estudio CAD.
3. **Bitácora Administrativa en Clientes Establecidos**: Habilitar en la Hoja de Vida Comercial (`/administrative/clients/[id]/commercial`) la captura interactiva de gestiones y novedades administrativas con `ResponsiveFormDrawer` mediante el servicio canónico de CRM (`CommercialFollowUp`).
4. **Lavado de Imagen y Refactorización Hub & Spoke de Prospectos**: Descomponer el monolito de 2,677 líneas en `/administrative/prospects/[id]` en un espacio de trabajo modular (`layout.tsx`, `ProspectContext.tsx`, `overview/`, `operations/`, `commercial/`), reemplazando las pestañas y el envío de objetos masivos por mutaciones granulares con `ResponsiveFormDrawer`.

---

## 2. Requerimientos Funcionales y Técnicos Implementados

### 2.1 Saneamiento de Marca "Pronos"
- [x] Reemplazadas todas las apariciones en vistas de nómina (`compliance/page.tsx`, `dependencies/page.tsx`, `employees/page.tsx`, `settings/page.tsx`):
  - "Flujo de Cumplimiento Mensual (PRONOS NOXIA)" $\rightarrow$ "Flujo de Cumplimiento Mensual de Nómina (NOXIA)"
  - "Desglose por modalidad Pronos" $\rightarrow$ "Desglose por modalidad de turno"
  - "Causal de Retiro (Pronos B.D.N)" $\rightarrow$ "Causal de Retiro (B.D.N)"
  - "Catálogos Maestros Pronos" $\rightarrow$ "Catálogos Maestros de Nómina"
  - "matriz de bases Pronos" $\rightarrow$ "matriz de bases de cálculo"
  - "Código de Concepto (Pronos)" $\rightarrow$ "Código de Concepto"
  - "Catálogo de Conceptos Contables y Banderas de Base (Pronos)" $\rightarrow$ "Catálogo de Conceptos Contables y Banderas de Base"
  - "Causales de Retiro B.D.N Pronos" $\rightarrow$ "Causales de Retiro B.D.N"
- [x] Actualizadas descripciones Swagger en controladores y DTOs backend de nómina.

### 2.2 Persistencia de Metadatos Satelitales en Client
- [x] En `SecurityStudiesRepository`: agregado método `updateClientMapboxData` para persistir metadatos satelitales.
- [x] En `SecurityStudiesService.generateBaseMap`: persiste atómicamente en `Client`:
  - `mapboxBaseImageS3Key`, `mapboxCenterLat`, `mapboxCenterLng`, `mapboxZoom`, `mapboxBboxMinLat`, `mapboxBboxMinLng`, `mapboxBboxMaxLat`, `mapboxBboxMaxLng`.
- [x] En `ClientSecurityStudiesPage`:
  - Al aprobar el perímetro (`onPerimeterApproved`), ejecuta `fetchStudies()` y abre automáticamente el drawer de creación de estudio (`handleOpenCreateDialog()`).

### 2.3 Bitácora de Clientes Establecidos
- [x] En `/administrative/clients/[id]/commercial`:
  - En la pestaña de Bitácora CRM, habilitado el botón `"Registrar Novedad / Gestión"`.
  - Integrado `ResponsiveFormDrawer` para capturar canal, fecha, persona de contacto, cargo, resumen de gestión y estado.
  - Guarda mediante `commercialCrmApi.createFollowUp` vinculado a `clientId` y refresca reactivamente la línea de tiempo.

### 2.4 Arquitectura Hub & Spoke en Prospectos
- [x] `ProspectContext.tsx`: Contexto reactivo con `updateGeneral`, `updateOperations`, `convertProspect` y resolución RBAC.
- [x] `layout.tsx`: Sidenav lateral en escritorio + Barra institucional con botón y drawer "Formalizar Contrato (Convertir a Cliente)".
- [x] `page.tsx`: Hub móvil con tarjetas táctiles / Redirección desktop a `overview`.
- [x] `overview/page.tsx`: Tarjetas de Datos Básicos, Ubicación y Contacto con edición granular por tarjeta usando `ResponsiveFormDrawer`.
- [x] `operations/page.tsx`: Tarjetas de Estructura Física, Amenidades y Puntos de Acceso con edición granular por tarjeta y subida de fotos con `StorageApi`.
- [x] `commercial/page.tsx`: Bitácora interactiva con registro de interacciones, tabla de propuestas con visor PDF Chameleon y alerta de recaptación.
- [x] `ProspectService.update` en backend: saneado manejo de `coordinatorInChargeId` y `commercialContactId` para evitar errores de relación en Prisma durante actualizaciones parciales.

---

## 3. Plan de Verificación Cumplido

- [x] Validación de compilación TypeScript en backend y frontend (`tsc --noEmit` con 0 errores).
- [x] Verificación de linter en backend y frontend (`npm run lint` con 0 errores).
- [x] Verificación de pruebas unitarias Jest de los servicios modificados (29/29 tests aprobados en verde).
- [x] Actualización de memoria técnica en `.specs/ai-decisions.log`.
