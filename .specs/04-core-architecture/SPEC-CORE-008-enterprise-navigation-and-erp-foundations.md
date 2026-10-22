# SPEC-CORE-008: Arquitectura de Navegación Dual-Rail, Registro Declarativo ERP y Hub Transversal de Herramientas

> **Estado**: `COMPLETADO Y VALIDADO (100% FUNCIONAL)`  
> **Módulo**: `frontend / layout / navigation / erp-manifest`  
> **Autor(es)**: `Software Architect & Lead UI/UX Engineer`  
> **Fecha de Creación**: `2026-10-20`  
> **Última Actualización**: `2026-10-20`  

---

## 1. Contexto de Negocio y Visión de Producto

La evolución de **Noxia** desde un CRM de Seguridad y Bitácoras Virtuales hacia un **ERP Integral de Seguridad Privada** exige transformar la arquitectura de navegación de la aplicación. 

El modelo operativo de la empresa de seguridad se estructura en **9 Direcciones Estratégicas**, complementadas por un área de **Configuraciones** (#10) y un conjunto de **Herramientas Generales Transversales** (#11):

```
1. Comercial
   a. Servicios ofrecidos
   b. Captar Cliente (Prospectos)
   c. Propuesta Económica (consecutivo, formato y envío por email)
   d. Pérdidas y Ganancias del contrato (P&L)
   e. Cotizaciones
   f. Orden de Servicio (promesa de compra)
   g. ANS (Acuerdos de Nivel de Servicio)
   h. Recolección de perfil del guarda ideal para el cliente

2. Recursos Humanos
   a. Captación de datos de aspirantes / vacantes
   b. Centro de formatos y plantillas laborales
   c. Contratos laborales
   d. Control y alertas de examen anual de porte de armas
   e. Requisitos de ley y cursos de la Superintendencia de Vigilancia

3. Almacén
   a. Inventario de armamento, munición, uniformes, chalecos y radios
   b. Cronograma de compras
   c. Cronograma de pagos
   d. Proveedores

4. Programación (El 'Cerebro' Logístico 24/7)
   a. Manejo y mallas de turnos (2x2, 4x2, 12h)
   b. Asignación de guardias a puestos de cliente
   c. Calendario de turnos por guarda
   d. Guardias disponibles en tiempo real
   e. Reporte de ausencias hacia la Central de Monitoreo
   f. Conteo y límites de horas contratadas por cliente
   g. Alertas de ruptura de programación (ausencias, excedentes de horas extras)
   h. Conteo de horas trabajadas por guarda
   i. Novedades e indisposiciones médicas
   j. Algoritmo de cálculo para emparejamiento del guarda ideal

5. Operaciones
   a. Central de Monitoreo (SOC / Help Desk interno)
   b. Control de servicios de campo (Minutas del cliente)
   c. Fuerza laboral en sedes (Ficha de guardias asignados)
   d. Estudios de seguridad (Canvas CAD y Geofencing Mapbox)

6. Tecnología (Seguridad Electrónica)
   a. Cotizaciones de proyectos electrónicos
   b. Instalaciones de cámaras CCTV, talanqueras, alarmas y biometría/facial

7. Calidad
   a. E-Learning (creación de cursos, archivos, videos, quiz y reproducción)
   b. Gestión de PQRS (flujo de estados, chat bidireccional y alertas SSE)

8. Contabilidad (Fase Posterior)
   - Cuentas contables, causaciones e impuestos según NIIF

9. Tesorería (Fase Posterior)
   - Facturación de puestos contratados y liquidación de nómina operativa

10. Configuraciones
    - Firma Digital
    - Cambio de credenciales / contraseñas
    - Perfil institucional del Tenant
    - Administración del sistema (Roles, Usuarios, Departamentos, Cargos)

11. Herramientas Generales (Transversales)
    - Canva interactivo de seguridad
    - Generador de cronogramas
    - Generador de formatos y contratos
    - Generador de cotizaciones
    - Generador de órdenes de compra
    - Generador de códigos QR (puntos de control, carnés, activos)
```

---

## 2. Decisión Arquitectónica Clave: Anti-Pattern Prevention (Cero Páginas Dummy)

### 2.1 Problemática de las Páginas Físicas Dummy
Crear físicamente 30-40 archivos `page.tsx` vacíos en Next.js App Router provocaría:
1. **Sobrecarga de Compilación en Turbopack/Next.js Build**: Cada ruta es un chunk y un worker en compilación, aumentando innecesariamente el bundle y el tiempo de despliegue en CI/CD.
2. **Deuda Técnica y Desalineación de Cobertura**: Archivos sin pruebas unitarias que reducen el coverage global por debajo del 80%.
3. **Violación de Anti-Over-Engineering**: Rompe la regla de oro del proyecto (*implementar solo lo requerido en el ciclo activo*).

### 2.2 Patrón de Solución: *Config-Driven Navigation Registry*
Toda la taxonomía del ERP se modela de forma **declarativa y tipada** en [`src/config/navigationRegistry.ts`](file:///d:/projects/security-crm-frontend/src/config/navigationRegistry.ts).

Cada ítem se clasifica mediante un estado de ciclo de vida:
- `ACTIVE`: El submódulo ya existe y está enlazado a su ruta física (`/administrative/clients`, `/operation/minuta-general`, `/administrative/employees`, etc.).
- `ROADMAP`: El submódulo está planificado en la visión 1-11. Se visualiza en el submenú con un badge sutil (`Planificado`) y al hacer clic despliega un **Roadmap Preview Drawer** informativo que documenta el alcance previsto sin salir de la pantalla actual.

Cuando un submódulo sea priorizado para desarrollo, se sigue el ciclo estricto SDD: Especificación -> Prisma Schema / Migraciones -> Endpoints NestJS + Tests (>=80%) -> Frontend Page -> Cambio de estado en el registro a `ACTIVE`.

---

## 3. Especificación Visual y de Componentes

### 3.1 Anatomía del Layout: "Dual-Rail Navigation"

```
┌──────┬──────────────────────┬────────────────────────────────────────────────────────┐
│ RAIL │ SUBMENÚ CONTEXTUAL   │ ÁREA DE TRABAJO PRINCIPAL (WORKSPACE)                  │
│ 68px │ 230px (Colapsable)   │ (100% de la pantalla restante)                         │
├──────┼──────────────────────┼────────────────────────────────────────────────────────┤
│[Logo]│ Comercial            │                                                        │
│ [💼] │ • Servicios          │  ┌──────────────────────────────────────────────────┐  │
│ [👥] │ • Captar Clientes    │  │ Header de la Vista (Breadcrumbs + Botón Acción)  │  │
│ [📦] │ • Propuesta Económ.  │  ├──────────────────────────────────────────────────┤  │
│ [📅] │ • Pérdidas y Gananc. │  │                                                  │  │
│ [🛡️] │ • Cotizaciones       │  │ Arquetipo de Interfaz Noxia correspondiente     │  │
│ [⚡] │ • Orden de Servicio  │  │ (DataTable / Split-Pane / Hub / Canvas)          │  │
│ [⭐] │ • Niveles ANS        │  │                                                  │  │
│ [📊] │ • Perfil del Guarda  │  │                                                  │  │
├──────┤                      │  │                                                  │  │
│ [🧰] │ [Toggle < o Ctrl+B]  │  │                                                  │  │
│ [⚙️] │                      │  │                                                  │  │
│[User]│                      │  └──────────────────────────────────────────────────┘  │
└──────┴──────────────────────┴────────────────────────────────────────────────────────┘
```

#### A. Carril Táctico Primario (`PrimaryRail.tsx` - 68px)
- **Superficie**: `secondary.main` (`#1E1B4B` - Midnight Obsidian).
- **Botón Superior**: Logotipo Noxia + isotipo del Tenant (Enlace a `/dashboard`).
- **Pilar Maestro Fundacional (Acceso Transversal 1-Clic)**:
  - `[📊]` Panel Principal (`direction: "dashboard"` -> `/dashboard`)
  - `[🏢]` Directorio de Clientes y Sedes (`direction: "clients"` -> `/administrative/clients`)
  - `[👥]` Padrón de Empleados y Guardias (`direction: "employees"` -> `/administrative/employees`)
- **Separador Visual (Divider)**: Segmentación sutil entre entidades maestras y áreas funcionales.
- **Lista Vertical de Direcciones Estratégicas (9 Departamentos)**:
  - `[💼]` Comercial (`direction: "commercial"`)
  - `[🪪]` Recursos Humanos (`direction: "human-resources"`)
  - `[📦]` Almacén (`direction: "warehouse"`)
  - `[📅]` Programación (`direction: "scheduling"`)
  - `[🛡️]` Operaciones (`direction: "operations"`)
  - `[⚡]` Tecnología (`direction: "technology"`)
  - `[⭐]` Calidad (`direction: "quality"`)
  - `[💰]` Finanzas (`direction: "finance"` - Agrupa Contabilidad y Tesorería)
- **Zona Inferior**:
  - `[🧰]` Botón de **Herramientas Generales** (Abre el Drawer de utilidades transversales #11).
  - `[⚙️]` Botón de **Configuraciones** (Abre modal/drawer de perfil, firma digital y administración #10).
  - `[Avatar]` Menú rápido de sesión y estado del operador.

#### B. Submenú Contextual (`ContextualSubmenu.tsx` - 230px)
- **Superficie**: `#FFFFFF` con borde derecho `1px solid #E2E8F0`.
- **Desactivación para Pilares Maestros**: Las entidades fundacionales (`dashboard`, `clients`, `employees`) poseen navegación directa 1-clic hacia sus pantallas principales sin submenú contextual (`width: 0`, margen de workspace `68px`), maximizando el área útil de las tablas de datos y paneles de métricas.
- **Activación Exclusiva por Dirección Estratégica**: El submenú contextual se despliega únicamente cuando la dirección seleccionada posee submódulos especializados (`commercial`, `human-resources`, `warehouse`, etc.).
- **Cabecera**: Nombre formal de la Dirección activa con icono y contador de funcionalidades activas vs planificadas.
- **Acciones Rápidas**:
  - Soporte de colapso rápido (`isPinned: false` o atajo `Ctrl + B`) para maximizar el área de trabajo en pantallas densas.
  - Al posar el mouse sobre el Rail mientras está colapsado, se despliega un Popover flotante instantáneo.
- **Renderizado de Ítems**:
  - Si `status === 'ACTIVE'`: Enlace de navegación tradicional (`Link`) con hover violeta (`#F5F3FF`) e icono temático.
  - Si `status === 'ROADMAP'`: Ítem visual con badge tipo chip en `#F1F5F9` (*"Planificado"*), que al presionar abre el `RoadmapFeatureDialog`.

#### C. Hub Transversal de Herramientas (`GeneralToolsDrawer.tsx` - Punto #11)
Drawer lateral derecho o modal flotante de alta jerarquía visual que reúne:
1. **Canva de Seguridad**: Enlace directo a la herramienta de diseño vectorial y georreferenciación.
2. **Generador de Códigos QR**: Generación de códigos para rondas, activos de almacén y credenciales.
3. **Centro de Formatos**: Catálogo de plantillas oficiales (contratos laborales, actas de entrega, acuerdos de confidencialidad).
4. **Generador de Cotizaciones**: Cotizaciones estándar para servicios de vigilancia física y técnica.
5. **Generador de Órdenes de Compra**: Emisión rápida de órdenes para abastecimiento.
6. **Cronogramas**: Vistas de calendario y cronogramas operativos.

#### D. Paleta de Comandos (`GlobalCommandPalette.tsx` - `Ctrl + K`)
- Modal de búsqueda reactivo con filtro difuso (*fuzzy search*).
- Permite invocar con pocas pulsaciones cualquier dirección, herramienta o registro activo sin tocar el ratón.

---

## 4. Contratos de Datos y Tipos TypeScript

### 4.1 Definición de Tipos en `src/config/navigationRegistry.ts`

```typescript
export type ModuleStatus = "ACTIVE" | "ROADMAP";

export type ErpDirectionId =
  | "commercial"
  | "human-resources"
  | "warehouse"
  | "scheduling"
  | "operations"
  | "technology"
  | "quality"
  | "finance";

export interface NavigationSubItem {
  id: string;
  title: string;
  description: string;
  status: ModuleStatus;
  path?: string;
  iconName: string;
  permissions?: string[];
  features?: string[];
  targetDepartment?: string;
  estimatedQuarter?: string;
}

export interface ErpDirection {
  id: ErpDirectionId;
  order: number;
  title: string;
  shortTitle: string;
  description: string;
  iconName: string;
  status: ModuleStatus;
  items: NavigationSubItem[];
}

export interface GeneralToolItem {
  id: string;
  title: string;
  description: string;
  iconName: string;
  category: "canvas" | "documents" | "quotations" | "qr" | "schedules";
  actionType: "LINK" | "DRAWER" | "MODAL";
  targetPath?: string;
}
```

---

## 5. Mapeo Exhaustivo de las 11 Áreas

### 1. Comercial (`id: "commercial"`)
- `services`: Servicios ofrecidos (`status: "ROADMAP"`)
- `prospects`: Captar Cliente / Prospectos (`status: "ACTIVE"`, path: `/administrative/prospects`)
- `clients`: Cartera de Clientes Contratados (`status: "ACTIVE"`, path: `/administrative/clients`)
- `economic-proposals`: Propuesta Económica con Consecutivo (`status: "ROADMAP"`)
- `pnl-analysis`: Pérdidas y Ganancias del Contrato (`status: "ROADMAP"`)
- `quotations`: Cotizaciones Comerciales (`status: "ROADMAP"`)
- `service-orders`: Órdenes de Servicio / Promesas de Compra (`status: "ROADMAP"`)
- `sla-agreements`: Acuerdos de Nivel de Servicio (ANS) (`status: "ROADMAP"`)
- `guard-profile-matrix`: Perfil del Guarda Ideal por Cliente (`status: "ROADMAP"`)

### 2. Recursos Humanos (`id: "human-resources"`)
- `recruitment`: Captación de Datos / Vacantes (`status: "ROADMAP"`)
- `employees`: Padrón Activo de Empleados (`status: "ACTIVE"`, path: `/administrative/employees`)
- `contracts`: Gestión y Archivo de Contratos Laborales (`status: "ROADMAP"`)
- `gun-license-control`: Control Examen Anual de Porte de Armas (`status: "ROADMAP"`)
- `supervigilancia-compliance`: Cursos y Acreditaciones de Seguridad (`status: "ROADMAP"`)
- `hr-formats`: Modificación de Formatos Laborales (`status: "ROADMAP"`)

### 3. Almacén (`id: "warehouse"`)
- `inventory`: Control de Inventario (Armamento, Munición, Uniformes, Radios) (`status: "ROADMAP"`)
- `purchase-schedules`: Cronograma de Compras (`status: "ROADMAP"`)
- `payment-schedules`: Cronograma de Pagos a Proveedores (`status: "ROADMAP"`)
- `suppliers`: Directorio y Calificación de Proveedores (`status: "ROADMAP"`)

### 4. Programación (`id: "scheduling"`)
- `shift-management`: Malla de Turnos Operativos 24/7 (`status: "ROADMAP"`)
- `guard-assignment`: Asignación de Guardias a Puestos (`status: "ROADMAP"`)
- `guard-calendar`: Calendario de Turnos Individual (`status: "ROADMAP"`)
- `available-guards`: Guardias Disponibles y de Reserva (`status: "ROADMAP"`)
- `absence-reports`: Reportes de Ausentismo hacia la Central (`status: "ROADMAP"`)
- `client-hours-quota`: Conteo y Límites de Horas Contratadas (`status: "ROADMAP"`)
- `schedule-alerts`: Alertas de Ruptura de Programación y Sobrecostos (`status: "ROADMAP"`)
- `worked-hours-audit`: Auditoría de Horas Trabajadas por Guardia (`status: "ROADMAP"`)
- `guard-novedades`: Seguimiento de Novedades Médicas e Indisposiciones (`status: "ROADMAP"`)
- `ideal-guard-algorithm`: Algoritmo de Emparejamiento de Guarda Ideal (`status: "ROADMAP"`)

### 5. Operaciones (`id: "operations"`)
- `soc-monitoring`: Central de Monitoreo / Help Desk Interno (`status: "ACTIVE"`, path: `/operation/internal/minuta-general`)
- `minuta-general`: Minuta General de Puestos (`status: "ACTIVE"`, path: `/operation/minuta-general`)
- `visitor-control`: Control de Acceso y Visitas (`status: "ACTIVE"`, path: `/operation/visitor`)
- `correspondence-control`: Control de Correspondencia (`status: "ACTIVE"`, path: `/operation/correspondence`)
- `parking-control`: Control de Parqueaderos (`status: "ACTIVE"`, path: `/operation/parking`)
- `security-studies`: Estudios de Seguridad & Geofencing (`status: "ACTIVE"`, path: `/administrative/clients`)

### 6. Tecnología (`id: "technology"`)
- `tech-quotations`: Cotizaciones de Seguridad Electrónica (`status: "ROADMAP"`)
- `installations`: Proyectos e Instalaciones (CCTV, Talanqueras, Alarmas, Reconocimiento Facial) (`status: "ROADMAP"`)

### 7. Calidad (`id: "quality"`)
- `pqrs-management`: Gestión Integral de PQRS B2B (`status: "ACTIVE"`, path: `/administrative/pqrs`)
- `elearning-authoring`: Creador de Cursos (Videos, Documentos, Quiz y Calificación) (`status: "ROADMAP"`)
- `elearning-player`: Aula Virtual y Reproducción de Cursos para Personal (`status: "ROADMAP"`)

### 8 & 9. Finanzas (`id: "finance"`)
- `treasury`: Tesorería (Facturación de Contratos y Liquidación de Nómina) (`status: "ROADMAP"`)
- `accounting`: Contabilidad General, Causaciones e Impuestos (`status: "ROADMAP"`)

### 10. Configuraciones (`id: "settings"`)
- `digital-signature`: Firma Digital de Documentos (`status: "ROADMAP"`)
- `change-password`: Gestión de Contraseña (`status: "ACTIVE"`)
- `user-management`: Cuentas de Usuario (`status: "ACTIVE"`, path: `/administrative/users`)
- `role-management`: Perfiles y Matriz RBAC (`status: "ACTIVE"`, path: `/administrative/roles`)
- `department-catalog`: Departamentos de la Empresa (`status: "ACTIVE"`, path: `/administrative/departments`)
- `position-catalog`: Cargos y Categorías Operativas (`status: "ACTIVE"`, path: `/administrative/positions`)
- `tenant-settings`: Parámetros Institucionales (`status: "ACTIVE"`, path: `/administrative/tenants`)

### 11. Herramientas Generales (`GeneralToolsDrawer`)
- `tool-canva`: Canva de Seguridad Interactivo (`status: "ACTIVE"`)
- `tool-qr`: Generador de Códigos QR para Puntos de Control y Activos (`status: "ACTIVE"`)
- `tool-templates`: Generador de Formatos Oficiales (Contratos, Actas, Otrosí) (`status: "ROADMAP"`)
- `tool-quotations`: Generador Transversal de Cotizaciones (`status: "ROADMAP"`)
- `tool-purchase-orders`: Generador de Órdenes de Compra (`status: "ROADMAP"`)
- `tool-schedules`: Diseñador de Cronogramas (`status: "ROADMAP"`)

---

## 6. Plan de Ejecución por Pasos

1. **Paso 1: Manifiesto Declarativo**:
   - Crear `src/config/navigationRegistry.ts` con todos los metadatos y contratos de tipo.
2. **Paso 2: Componentes de Layout Dual-Rail**:
   - Crear `PrimaryRail.tsx` (68px con iconos Midnight Obsidian).
   - Crear `ContextualSubmenu.tsx` (230px colapsable con soporte `Ctrl+B`).
   - Crear `GeneralToolsDrawer.tsx` con el catálogo visual de utilidades transversales.
   - Crear `RoadmapFeatureDialog.tsx` para mostrar la ficha de funcionalidades en planificación sin salir de pantalla.
   - Crear `GlobalCommandPalette.tsx` (`Ctrl+K`).
3. **Paso 3: Integración en `MainLayout` y Preservación de Compatibilidad**:
   - Sustituir el menú acordeón monolítico en `Sidebar.tsx` o integrarlo en el nuevo layout sin romper las rutas existentes.
   - Comprobar compatibilidad con perfiles especiales (`RESIDENCE_MANAGER` y `system` Godlike).
4. **Paso 4: Verificación Integral**:
   - Compilación limpia con Turbopack (`npm run build`).
   - TypeScript `0` errores (`tsc --noEmit`).
   - ESLint `0` errores (`npm run lint`).
   - Bitácora de decisiones actualizada en `ai-decisions.log`.

---

## 7. Criterios de Aceptación

- [x] **Zero Dummy Files**: No se crea ningún archivo `page.tsx` huérfano. Todas las 34 rutas actuales permanecen funcionales.
- [x] **Dual-Rail Operativo**: El carril de 68px permite alternar entre las 9 Direcciones con 1 clic.
- [x] **Submenú Inteligente**: Muestra con claridad las responsabilidades de cada dirección, distinguiendo rutas activas de las planificadas.
- [x] **Roadmap Dialog**: Al presionar una funcionalidad planificada, se abre un diálogo informativo limpio ("Easy to track > Easy to read") con descripción y dependencias.
- [x] **Toolbox Transversal**: Las Herramientas Generales (#11) son accesibles desde el Rail en cualquier momento.
- [x] **Command Palette**: `Ctrl + K` abre la búsqueda global instantánea.
- [x] **Alineación Visual**: Respeta el 100% de la guía "Deep Violet Tactical Enterprise".
