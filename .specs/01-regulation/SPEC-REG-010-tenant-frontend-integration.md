---
title: "Tenant Frontend UI Integration: Wizard & Tabs"
status: "completed"
module: "administrative/regulation"
description: "Implementación de la interfaz de usuario en el frontend para soportar los modelos satélite (Profile, Subscription, Settings) de los Tenants mediante un Wizard de Creación y una Vista por Pestañas."
---

# SPEC-REG-010: Tenant Frontend Integration

## 1. Objetivo
Actualizar la experiencia de usuario (UX/UI) en la gestión de Empresas (`Tenants`) en el Frontend para soportar los nuevos campos introducidos por los modelos satélite (`TenantProfile`, `TenantSubscription`, `TenantSettings`). Debido a la cantidad de información, se reemplazará el modal simple actual por un **Wizard multi-pasos para la creación** y una **vista de pestañas para la edición/visualización**.

## 2. Decisiones de Diseño Confirmadas
- **Wizard de Creación**: Se implementará en una **página dedicada nueva** (`/administrative/tenants/create`), proporcionando mayor limpieza visual.
- **Asignación de Módulos (Features)**: Se incluirá como el **último paso** dentro del Wizard de creación, para configurar la empresa por completo desde un inicio.

## 3. Especificación Técnica

### 3.1. Componente de Wizard
**Archivo:** `src/components/common/WizardStepper.tsx` (Nuevo)
- Implementar un componente reutilizable basado en Stepper (ej. Material-UI `<Stepper>`).
- Debe aceptar un arreglo de "Pasos" (Steps), donde cada paso contenga su formulario, validación independiente y botón de continuar.

### 3.2. Página de Creación de Empresa
**Archivo:** `src/app/(protected)/administrative/tenants/create/page.tsx` (Nuevo)
- Layout de página que utiliza `WizardStepper` con 5 pasos:
  - **Paso 1: Información General** (Nombre, Slug, Estado Activo, Color Primario/Secundario, Logo URL).
  - **Paso 2: Perfil Legal y Contacto** (Razón Social, NIT/RUT, Email de contacto, Teléfono, Dirección, Ciudad, País, Representante Legal).
  - **Paso 3: Suscripción y Límites** (Plan (BASIC/PRO/ENTERPRISE), Estado, Máx. Usuarios, Máx. Clientes, Máx. Empleados, Fecha fin de suscripción).
  - **Paso 4: Configuración y Seguridad** (Timezone, Moneda, Política de contraseñas, MFA requerido, Timeout de sesión).
  - **Paso 5: Módulos Habilitados** (Checkboxes para la selección de los `features` disponibles en el sistema).
- Al finalizar el último paso, debe enviar el payload completo al backend:
  1. POST a `/tenants` con la data de Tenant y objetos anidados (`profile`, `subscription`, `settings`).
  2. PUT a `/tenants/:id/features` con los módulos seleccionados.
- Redireccionar a la tabla de Tenants tras el éxito.

### 3.3. Página de Listado (Index)
**Archivo:** `src/app/(protected)/administrative/tenants/page.tsx` (Modificar)
- **Botón "Nueva Empresa"**: Redirigir hacia `/administrative/tenants/create` en lugar de abrir el `FormDialog`.
- **Acciones de Fila (Editar / Ver)**: Redirigir hacia `/administrative/tenants/[id]` en lugar de abrir el `DetailDialog` o `FormDialog`.
- Mantener la tabla actual y la funcionalidad de *Impersonate* (activar/desactivar).

### 3.4. Página de Detalle y Edición
**Archivo:** `src/app/(protected)/administrative/tenants/[id]/page.tsx` (Nuevo)
- Vista dividida por **Pestañas (Tabs)**:
  1. **Resumen (Overview):** Estado actual, métricas rápidas (opcional).
  2. **General:** Formulario para editar colores, logo y nombre.
  3. **Perfil Legal:** Formulario para editar `TenantProfile`.
  4. **Suscripción:** Formulario para editar `TenantSubscription`.
  5. **Ajustes:** Formulario para editar `TenantSettings`.
  6. **Módulos:** Switch/Checkboxes para modificar los `features`.
- Cada pestaña debe tener su propio botón "Guardar Cambios" para enviar peticiones `PATCH` parciales y evitar sobrescribir data erróneamente.
- Al cargar la vista, se debe hacer una petición GET para traer toda la información de la empresa, incluyendo los joins correspondientes. (Asumiendo que el endpoint GET `/tenants/:id` devuelve la información completa).

### 3.5. Validación Centralizada
**Archivo:** `src/lib/schemas/tenant.schema.ts` (Nuevo o Modificado)
- Crear esquemas `zod` que emulen las validaciones del backend (`CreateTenantDto`, `CreateTenantProfileDto`, `CreateTenantSubscriptionDto`, `CreateTenantSettingsDto`).
- Se utilizarán con `react-hook-form` y `@hookform/resolvers/zod` para cada formulario/paso del Wizard.

## 4. Criterios de Aceptación
1. Un usuario `GODLIKE` puede navegar a la página de creación y ver el Wizard multi-pasos.
2. Cada paso del Wizard valida los campos obligatorios antes de permitir avanzar.
3. El paso 5 muestra los módulos disponibles y la creación envía correctamente la data.
4. El listado de tenants navega correctamente a la página de detalles de una empresa específica.
5. La página de detalles carga los datos en las pestañas correctas y permite guardar cambios por sección de manera independiente.
