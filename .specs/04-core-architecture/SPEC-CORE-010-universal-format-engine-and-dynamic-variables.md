# `SPEC-CORE-010`: Motor Universal de Formatos, Variables Dinámicas (Atajos), Tablas Avanzadas y Arquitectura "Parse & Drop" (Zero-S3)

> **Estado**: `PROPUESTA TÉCNICA / PENDIENTE DE APROBACIÓN`  
> **Módulo Principal**: `core / format-engine / document-lifecycle / administrative / general-tools`  
> **Código de Especificación**: `SPEC-CORE-010-universal-format-engine-and-dynamic-variables`  
> **Autor**: Lead Software Architect & Principal Systems Engineer  
> **Fecha de Creación**: 2026-10-25  
> **Última Actualización**: 2026-10-25 (Incorporación de Tablas TipTap, Subida/Conversión Word-Excel Parse & Drop y Datasets Masivos)  
> **Ubicación Backend**:
> - `prisma/schema/format_engine.prisma` (partición desacoplada de esquema con `@db.JsonB`)
> - `src/modules/core/format-engine/` (servicios de interpolación, parseo de Word/Excel y catálogo de datos)
> - `src/modules/commercial/document-engine/` (desacople y migración hacia core)
> **Ubicación Frontend**:
> - `src/components/format-engine/` (componentes "Piezas de Lego" transversales y tablas TipTap)
> - `src/app/(protected)/tools/formats/` (Gestor General de Formatos en Herramientas Generales)
> - `src/app/(protected)/settings/variables/` (Configuración de Mis Atajos / Variables)
> - `src/app/(protected)/commercial/settings/` (depuración de la pestaña extraída)
> **Aislamiento**: Multi-Tenant Estricto (`tenantId` obligatorio en todas las entidades e índices, inyección por `RequestContextService`) y Multi-Alcance (`PERSONAL` por usuario vs `GLOBAL` por tenant).

---

## 1. Contexto de Negocio y Objetivos de la Refactorización

### 1.1 El Problema Operativo y Diagnóstico Arquitectónico
En fases anteriores, el diseño de plantillas documentales y plantillas de texto (*"snippets"*) quedó indebidamente acoplado dentro de la dirección de **Comercial** (`src/modules/commercial/document-engine` y `/commercial/settings/components/tabs/DocumentSkinTab.tsx`). Esto originó cuatro deficiencias estructurales críticas:
1. **Aislamiento Departamental Injustificado**: Un sistema ERP de seguridad privada requiere generar múltiples tipos de documentos oficiales fuera de Comercial: contratos de trabajo, actas de entrega de dotación y solicitudes de vacaciones en **Recursos Humanos**, circulares y actas de auditoría en **Calidad / HSEQ**, consignas, control de armamento y minutas en **Operaciones**, y pagarés u otrosíes en **Jurídico**. Confinar las plantillas a Comercial forzaba dependencias artificiales entre módulos y duplicación de código.
2. **Inexistencia de Soporte para Tablas Complejas y Archivos Existentes**: Las empresas de seguridad privada ya poseen entre 50 y 120 formatos diseñados históricamente en Microsoft Word (`.docx`) y Excel (`.xlsx`). Obligar al usuario a rediseñar matrices y tablas celda por celda en un editor web de texto simple genera rechazo y pérdida de tiempo masiva.
3. **Complejidad y Ambigüedad de "Snippets"**: El término técnico *"snippet"* es confuso para el usuario operativo. Además, las variables estaban codificadas de forma rígida en frontend (`TEMPLATE_VARIABLES`), no permitían creación personalizada por usuario ni conexión intuitiva con los datos vivos de la base de datos (clientes, empleados, empresa, resoluciones).
4. **Plantillas Monolíticas vs. Necesidad de "Piezas de Lego"**: No todos los formatos requieren membrete con resolución de SuperVigilancia ni bloques de firmas. Un memorando de calidad solo necesita encabezado y cuerpo; un acta de entrega de dotación requiere una tabla matricial y dos firmas; una cotización requiere matriz económica y semáforo P&L. Las secciones de un formato deben ser componentes modulares opcionales (*toggles*).

### 1.2 Objetivos de la Especificación
1. **Desacoplamiento Transversal**: Extraer el motor de plantillas de Comercial y elevarlo al riel de **Herramientas Generales** como el módulo canónico **"Elaboración de Formatos"** (`/tools/formats`).
2. **Editor Web con Tablas Avanzadas y Pegado Inteligente (Copy-Paste de Excel/Word)**:
   - Integración de las extensiones oficiales y gratuitas (MIT License) de tablas en TipTap (`@tiptap/extension-table`, `table-row`, `table-cell`, `table-header`).
   - Capacidad de copiar una tabla en Excel o Word y pegarla directamente con `Ctrl+V` en el editor web preservando filas, columnas y celdas combinadas.
3. **Pipeline "Parse & Drop" para Word (`.docx`) y Excel (`.xlsx`) (Cero Almacenamiento en S3)**:
   - Permitir al usuario subir su archivo Word o Excel existente.
   - El backend procesa el archivo efímeramente en memoria RAM, extrae la estructura, tablas y estilos convirtiéndolos a HTML semántico compatible con TipTap, e inserta los tokens `{{variable}}`.
   - **El archivo original se destruye de inmediato de la memoria (`buffer = null`)**. 0 bytes en AWS S3 y 100% editable en el navegador.
4. **Nuevo Motor de Variables Dinámicas ("Mis Atajos y Datos del Sistema")**:
   - Reemplazar la terminología *"snippets"* por **"Variables de Formato"** divididas en **"Mis Atajos Rápidos"** (textos frecuentes del usuario) y **"Campos del Sistema"** (datos vivos de la base de datos).
   - Configuración intuitiva de **2 inputs lado a lado**: `[Nombre/Clave] ↔ [Valor/Fuente]`.
   - Alcance dual: **Personales** (por usuario) y **Globales** (institucionales con gobernanza RBAC).
5. **Resaltado Visual en Editor Enriquecido (TipTap)**:
   - Toda variable `{{nombre}}` insertada o digitada en el lienzo se resalta en **ROJO VIVO Y NEGRITA** (`#DC2626`, fondo `#FEF2F2`), proporcionando claridad instantánea de qué campos son dinámicos.
6. **Ampliación Masiva del Catálogo de Base de Datos (Modelo "Oracle Reports")**:
   - Datasets estructurados para **Empresa**, **Cliente**, **Empleado**, **Procesos / Solicitudes** (Vacaciones, Dotación, Armamento) y **Financiero** (incluyendo conversión automática de números a letras para contratos en Colombia: `monto_en_letras`).
7. **Arquitectura Modular "Piezas de Lego"**:
   - Cada formato se compone de bloques activables/desactivables: Membrete, Credenciales SuperVigilancia (Modo automático desde BD o manual), Sellos de Calidad, Cuerpo TipTap con Tablas, Matriz Económica, Firmantes Autorizados y Pie de Página.
8. **Cero Código Huérfano en Comercial**:
   - Reutilización y elevación de `SnippetInterpolationService`, migración limpia de `DocumentTextSnippet` a `FormatVariable`, y conexión directa de `SplitScreenProposalWorkspace` al nuevo motor universal.

---

## 2. Definición Terminológica y Experiencia de Usuario (UI/UX)

### 2.1 Estandarización de Terminología (Erradicación de "Snippets")

| Término Legado (Deprecado) | Nuevo Término Canónico Noxia | Descripción para el Usuario Final |
| :--- | :--- | :--- |
| `Snippet` | **Variable de Formato** | Concepto sombrilla de cualquier valor interpolable entre llaves `{{...}}`. |
| `Text Snippet (Fijo)` | **Mi Atajo Rápido** (o *Texto Frecuente*) | Texto fijo personal que el usuario redacta una sola vez para no volver a escribirlo (ej. su firma personal, una cláusula común, un descargo). |
| `Dynamic Token (BD)` | **Campo del Sistema** | Dato dinámico que Noxia extrae en tiempo real de la base de datos (ej. NIT del cliente, nombre del guarda, canon mensual, fecha de hoy). |
| `Document Text Snippets Tab` | **Catálogo de Formatos y Variables** | Panel de gestión centralizado dentro de Herramientas Generales y Perfil. |

---

## 3. Modelo de Datos en Prisma (`format_engine.prisma`)

Se definirá un nuevo archivo de esquema Prisma desacoplado: `prisma/schema/format_engine.prisma`. Todas las columnas de tipo JSON se declaran obligatoriamente con la anotación nativa `@db.JsonB`.

```prisma
// ==========================================
// ARCHIVO: prisma/schema/format_engine.prisma
// ==========================================

enum FormatVisibilityScope {
  GLOBAL   // Visible para toda la empresa / tenant (requiere permiso RBAC)
  PERSONAL // Visible únicamente para el usuario creador
}

enum FormatCategory {
  COMMERCIAL      // Cotizaciones, propuestas, ofertas técnicas
  HUMAN_RESOURCES // Solicitud de vacaciones, contratos laborales, llamados de atención, dotación
  OPERATIONS      // Minutas, consignas de puesto, actas de empalme, inventario de armamento
  QUALITY_HSEQ    // Circulares, no conformidades, auditorías internas
  LEGAL           // Acuerdos de confidencialidad, pagarés, otrosíes, compromisos ANS
  GENERAL         // Formatos generales y memorandos
}

enum VariableSourceType {
  STATIC_TEXT     // Texto plano o enriquecido fijo ingresado por el usuario
  DATABASE_SYSTEM // Atributo mapeado en tiempo real a una entidad del sistema
}

/// Formato / Plantilla Universal (Estructura asimilada en PostgreSQL, 0 bytes en S3)
model UniversalDocumentFormat {
  id                String                @id @default(cuid(2))
  tenantId          String
  tenant            Tenant                @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  // Metadatos
  code              String                @db.VarChar(30)  // Ej: "CM-F-01", "TH-F-04"
  title             String                @db.VarChar(180) // Ej: "Solicitud Oficial de Vacaciones"
  description       String?               @db.Text
  category          FormatCategory        @default(GENERAL)
  scope             FormatVisibilityScope @default(PERSONAL)

  // Autoría / Permisos
  userId            String?               // Si es PERSONAL: ID del usuario creador
  user              User?                 @relation(fields: [userId], references: [id], onDelete: Cascade)
  isDefault         Boolean               @default(false)
  isActive          Boolean               @default(true)

  // -------------------------------------------------------------
  // CONTENIDO ESTRUCTURAL (Asimilado de Word/Excel o creado en Web)
  // -------------------------------------------------------------
  bodyTemplate      String                @db.Text         // HTML con tablas nativas y {{tokens}}
  sectionsConfig    Json                  @default("{}") @db.JsonB // Toggles "Piezas de Lego"
  
  // Caché de variables detectadas dentro del formato para validación rápida
  detectedVariables Json                  @default("[]") @db.JsonB // Ej: ["empleado_nombre", "dias_vacaciones"]

  createdAt         DateTime              @default(now())
  updatedAt         DateTime              @updatedAt
  createdById       String?
  updatedById       String?

  @@index([tenantId, category, scope])
  @@index([tenantId, userId])
  @@map("universal_document_formats")
}

/// Variables Dinámicas y Atajos Rápidos del Usuario / Sistema
model FormatVariable {
  id          String                @id @default(cuid(2))
  tenantId    String
  tenant      Tenant                @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  scope       FormatVisibilityScope @default(PERSONAL)
  userId      String?
  user        User?                 @relation(fields: [userId], references: [id], onDelete: Cascade)

  key         String                @db.VarChar(60)  // Input Izquierdo: Clave (ej. "MI_FIRMA", "CLIENTE_NIT")
  label       String                @db.VarChar(120) // Nombre amigable (ej. "Mi Firma Digital", "NIT del Cliente")
  sourceType  VariableSourceType    @default(STATIC_TEXT)
  
  staticValue String?               @db.Text         // Input Derecho (si es texto fijo)
  systemPath  String?               @db.VarChar(120) // Input Derecho (si es BD: ej. "employee.fullName")
  
  isActive    Boolean               @default(true)
  createdAt   DateTime              @default(now())
  updatedAt   DateTime              @updatedAt

  @@unique([tenantId, userId, key])
  @@index([tenantId, scope])
  @@map("format_variables")
}
```

---

## 4. Pipeline de Ingestión "Parse & Drop" (Cero Almacenamiento en S3)

Para dar respuesta a la necesidad de reutilizar formatos Word y Excel existentes sin generar costos ni basura en AWS S3:

```
 [ Usuario sube archivo .docx o .xlsx en Drawer ]
                         │
                         ▼
             [ Buffer en Memoria RAM ] (Multer MemoryStorage)
                         │
        ┌────────────────┴────────────────┐
        ▼                                 ▼
   [ Archivo Word .docx ]            [ Archivo Excel .xlsx ]
        │                                 │
   Extractor Mammoth                 Extractor ExcelJS
   (Convierte texto, negritas,       (Convierte filas, columnas,
    títulos y tablas a HTML)          combinaciones y celdas a HTML)
        │                                 │
        └────────────────┬────────────────┘
                         ▼
        [ Sanitizador y Normalizador ]
        • Reemplaza {tag} o [tag] por {{token_canónico}}
        • Inyecta clases CSS para bordes de tabla limpios
                         │
        ┌────────────────┴────────────────┐
        ▼                                 ▼
[ Estructura HTML + JSON ]      [ Destrucción de Buffer ]
Se almacena en PostgreSQL       buffer = null; (RAM liberada)
Columna: bodyTemplate           CERO BYTES EN AWS S3
```

### 4.1 Ventajas del Enfoque Parse & Drop:
1. **Edición Web Inmediata**: Al convertirse a HTML semántico con tablas de TipTap, el usuario ve su documento en pantalla exactamente como era su Word/Excel y puede editarlo, agregar celdas o insertar variables dinámicas en rojo directamente en el navegador.
2. **Cero Dependencia de S3 para Plantillas**: No se almacenan binarios `.docx` ni `.xlsx`. Toda la información vive en la base de datos PostgreSQL, asegurando copias de seguridad portátiles con `pg_dump`.
3. **Seguridad Total**: Se neutralizan macros, scripts o binarios corruptos al extraer únicamente la representación visual.

---

## 5. Matriz Expandida de "Campos del Sistema" (Modelo "Oracle Reports")

El backend expondrá un endpoint canónico (`GET /format-engine/variables/system-catalog`) que devolverá el árbol completo de datos disponibles para cualquier usuario del ERP:

```
[ Catálogo de Campos del Sistema ]
  ├── 🏢 Mi Empresa (Tenant / Perfil Institucional)
  ├── 👤 Cliente / Contratante (Directorio de Clientes)
  ├── 👮 Empleado / Personal (Padrón de Empleados)
  ├── 📑 Procesos y Solicitudes Operativas (Vacaciones, Dotación, Armamento)
  ├── 💰 Comercial y Financiero (Tarifas, Márgenes, Montos en Letras)
  └── 📅 Sistema y Fechas (Generales)
```

| DataSet / Módulo | Campo en Español | Ruta en Backend (`systemPath`) | Token Resultante | Tipo / Formato |
| :--- | :--- | :--- | :--- | :--- |
| **🏢 Mi Empresa** | Razón Social Institucional | `tenant.profile.legalName` | `{{empresa_razon_social}}` | Texto |
| **🏢 Mi Empresa** | NIT de la Empresa | `tenant.profile.taxId` | `{{empresa_nit}}` | Texto |
| **🏢 Mi Empresa** | Licencia Oficial SuperVigilancia | `tenant.skin.supervigilanciaLicense` | `{{empresa_licencia_svsp}}` | Texto |
| **🏢 Mi Empresa** | Fecha Expedición Licencia | `tenant.skin.supervigilanciaLicDate` | `{{empresa_licencia_fecha}}` | Fecha (DD/MM/AAAA) |
| **🏢 Mi Empresa** | Fecha Vencimiento Licencia | `tenant.skin.supervigilanciaLicExpiry` | `{{empresa_licencia_vence}}` | Fecha (DD/MM/AAAA) |
| **🏢 Mi Empresa** | Representante Legal | `tenant.profile.legalRepresentative` | `{{empresa_representante}}` | Texto |
| **🏢 Mi Empresa** | Ciudad y Dirección Sede | `tenant.profile.cityAddress` | `{{empresa_ciudad_direccion}}` | Texto |
| **🏢 Mi Empresa** | Resolución de Uniformes | `tenant.skin.uniformsResolutionNum` | `{{empresa_res_uniformes}}` | Texto |
| **🏢 Mi Empresa** | Resolución de Horas Extras | `tenant.skin.overtimeResolutionNum` | `{{empresa_res_horas_extras}}` | Texto |
| **👤 Cliente** | Razón Social / Nombre Cliente | `client.name` | `{{cliente_nombre}}` | Texto |
| **👤 Cliente** | NIT / Cédula Cliente | `client.nit` | `{{cliente_nit}}` | Texto |
| **👤 Cliente** | Representante Legal / Admin | `client.legalRepName` | `{{cliente_administrador}}` | Texto |
| **👤 Cliente** | Dirección del Puesto / Sede | `client.address` | `{{cliente_direccion}}` | Texto |
| **👤 Cliente** | Ciudad de la Sede | `client.city` | `{{cliente_ciudad}}` | Texto |
| **👤 Cliente** | Estrato Socioeconómico | `client.stratum` | `{{cliente_estrato}}` | Numérico (1-6) |
| **👤 Cliente** | Correo Electrónico Principal | `client.email` | `{{cliente_email}}` | Texto |
| **👮 Empleado** | Nombre Completo del Empleado | `employee.fullName` | `{{empleado_nombre}}` | Texto |
| **👮 Empleado** | Número de Cédula (C.C.) | `employee.documentNumber` | `{{empleado_cedula}}` | Texto |
| **👮 Empleado** | Cargo / Rango Operativo | `employee.position.name` | `{{empleado_cargo}}` | Texto |
| **👮 Empleado** | Tipo de Contrato Laboral | `employee.contractType` | `{{empleado_tipo_contrato}}` | Texto (Término Fijo/Indefinido) |
| **👮 Empleado** | Salario Base Mensual | `employee.baseSalary` | `{{empleado_salario}}` | Moneda (COP) |
| **👮 Empleado** | Fecha de Ingreso | `employee.hireDate` | `{{empleado_fecha_ingreso}}` | Fecha (DD/MM/AAAA) |
| **👮 Empleado** | Entidad de Salud (EPS) | `employee.epsName` | `{{empleado_eps}}` | Texto |
| **👮 Empleado** | Administradora Riesgos (ARL) | `employee.arlName` | `{{empleado_arl}}` | Texto |
| **👮 Empleado** | Fondo de Pensiones | `employee.pensionFundName` | `{{empleado_pension}}` | Texto |
| **👮 Empleado** | Fondo de Cesantías | `employee.severanceFundName` | `{{empleado_cesantias}}` | Texto |
| **📑 Proceso: Vacaciones** | Fecha de Salida a Vacaciones | `vacation.startDate` | `{{vacaciones_fecha_salida}}` | Fecha (DD/MM/AAAA) |
| **📑 Proceso: Vacaciones** | Fecha de Reintegro Laboral | `vacation.endDate` | `{{vacaciones_fecha_reintegro}}` | Fecha (DD/MM/AAAA) |
| **📑 Proceso: Vacaciones** | Días Hábiles Solicitados | `vacation.businessDaysCount` | `{{vacaciones_dias}}` | Numérico |
| **📑 Proceso: Vacaciones** | Periodo Causado / Año | `vacation.accrualPeriod` | `{{vacaciones_periodo}}` | Texto (ej. "2025-2026") |
| **📑 Proceso: Vacaciones** | Guarda de Reemplazo Asignado | `vacation.replacementEmployeeName`| `{{vacaciones_reemplazo}}` | Texto |
| **📑 Proceso: Dotación** | Talla de Camisa / Uniforme | `equipment.shirtSize` | `{{dotacion_talla_camisa}}` | Texto (S, M, L, XL) |
| **📑 Proceso: Dotación** | Talla de Calzado / Botas | `equipment.shoeSize` | `{{dotacion_talla_calzado}}` | Numérico (ej. 40, 42) |
| **📑 Proceso: Armamento** | Serie de Arma Asignada | `weapon.serialNumber` | `{{arma_serie}}` | Texto |
| **📑 Proceso: Armamento** | Número de Salvoconducto | `weapon.permitNumber` | `{{arma_salvoconducto}}` | Texto |
| **💰 Financiero** | Monto Total en Letras (Legal) | `finance.amountInWords` | `{{monto_en_letras}}` | Texto formal (ej. "QUINCE MILLONES...") |
| **💰 Financiero** | Valor Mensual Antes de IVA | `proposal.subtotalMonthly` | `{{propuesta_subtotal}}` | Moneda (COP) |
| **💰 Financiero** | Valor Mensual Total con IVA | `proposal.totalMonthlyWithTax` | `{{propuesta_total_mensual}}` | Moneda (COP) |
| **💰 Financiero** | Base Gravable AIU (10%) | `proposal.aiuBaseAmount` | `{{propuesta_aiu}}` | Moneda (COP) |
| **💰 Financiero** | IVA sobre AIU (19%) | `proposal.ivaAmount` | `{{propuesta_iva}}` | Moneda (COP) |
| **📅 Sistema** | Fecha de Hoy (Texto formal) | `system.currentDateFormatted` | `{{fecha_hoy_formal}}` | Ej: "25 de octubre de 2026" |
| **📅 Sistema** | Año Calendario Actual | `system.currentYear` | `{{año_actual}}` | Ej: "2026" |
| **📅 Sistema** | Hora Actual de Radicación | `system.currentTime` | `{{hora_actual}}` | Ej: "10:30 AM" |

---

## 6. Resaltado Visual y Soporte de Tablas en TipTap

### 6.1 Dependencias 100% Gratuitas y de Código Abierto (Licencia MIT)
* `@tiptap/extension-table`
* `@tiptap/extension-table-row`
* `@tiptap/extension-table-cell`
* `@tiptap/extension-table-header`
* Costo de licenciamiento: **$0.00 USD**.

### 6.2 Resaltado en Rojo y Negrita (`DynamicTokenExtension`)
Cualquier coincidencia con la sintaxis `\{\{\s*([a-zA-Z0-9_\.]+)\s*\}\}` dentro de párrafos o dentro de las celdas de las tablas se estiliza automáticamente:

```css
.noxia-dynamic-token {
  display: inline-flex;
  align-items: center;
  color: #DC2626 !important; /* Rojo vivo 600 */
  font-weight: 700 !important;
  background-color: #FEF2F2 !important; /* Fondo rojo sutil 50 */
  border: 1px dashed #F87171 !important; /* Borde punteado */
  border-radius: 4px !important;
  padding: 1px 6px !important;
  margin: 0 2px !important;
  font-family: var(--font-monospace, monospace);
  font-size: 0.88em;
  user-select: all;
}
```

---

## 7. Arquitectura Frontend: "Piezas de Lego" Modulares

```
src/components/format-engine/
├── blocks/
│   ├── FormatHeaderBlock.tsx          # 1. Membrete, Logo, Código ISO, Ciudad y Fecha
│   ├── FormatSvspCredentialsBlock.tsx # 2. Licencias SVSP/MinTIC (Automático de BD o Manual)
│   ├── FormatQualityBadgesBlock.tsx   # 3. Sellos ISO 9001, BASC, Red de Apoyo, DIJIN
│   ├── FormatTipTapBodyBlock.tsx      # 4. Cuerpo Enriquecido con Tablas y Tokens en Rojo
│   ├── FormatEconomicGridBlock.tsx    # 5. Tabla Tarifaria / Matriz de Puestos (Comercial)
│   ├── FormatSignersBlock.tsx         # 6. Firmantes Autorizados (0, 1, 2 o N firmantes)
│   └── FormatFooterBlock.tsx          # 7. Disclaimer Legal y Numeración de Página
├── drawers/
│   ├── UniversalFormatDrawer.tsx      # Creación/Edición de Formatos y Zona Drag & Drop Word/Excel
│   └── VariableEditorDrawer.tsx       # Configuración de 2 Inputs Lado a Lado
└── selector/
    └── FormatSelectionModal.tsx       # Modal inicial en módulos: "Elegir Formato" vs "En Blanco"
```

---

## 8. Estrategia de Refactorización Limpia (Cero Código Huérfano en Comercial)

1. **Backend**:
   * `SnippetInterpolationService`: Se traslada de `modules/commercial/document-engine/` a `modules/core/format-engine/` y se registra en `CoreModule`.
   * `DocumentTextSnippet`: Se migra a `FormatVariable` mediante script de migración Prisma, renombrando la tabla a `format_variables` para conservar datos previos si existieran.
   * `commercial-settings.service.ts`: Se eliminan los métodos CRUD huérfanos de snippets; ahora delegan en `FormatEngineService`.
2. **Frontend**:
   * `DocumentSkinTab.tsx`: Se extrae de `/commercial/settings` la cuadrícula de plantillas. `/commercial/settings` conserva únicamente la parametrización tarifaria SVSP y la identidad visual de la empresa.
   * `SnippetEditorDrawer.tsx`: Se borra y se sustituye por `VariableEditorDrawer.tsx` en `src/components/format-engine/drawers/`.
   * `SplitScreenProposalWorkspace.tsx`: Se conecta al nuevo selector universal de formatos y renderiza con el nuevo editor con tablas.

---

## 9. Plan de Implementación Secuencial Paso a Paso

### Fase 1: Backend - Esquema Prisma (`@db.JsonB`) y Motor Core
1. Crear `prisma/schema/format_engine.prisma` con `FormatVariable` y `UniversalDocumentFormat` (sin S3, con `@db.JsonB`).
2. Migrar la base de datos local PostgreSQL (`npx prisma migrate dev --name init_universal_format_engine`).
3. Registrar los modelos en `audit-extension.ts` para propagación de `tenantId`.
4. Implementar `FormatEngineService` con:
   - CRUD de variables (Personales / Globales).
   - Ingestor efímero de archivos Word (`mammoth`) y Excel (`exceljs`) que devuelve HTML y destruye el buffer.
   - Interpolador universal con soporte de montos en letras.
5. Pruebas unitarias Jest con cobertura $\ge 80\%$.

### Fase 2: Frontend - Extensión de Tablas TipTap y Resaltado en Rojo
1. Instalar `@tiptap/extension-table` y extensiones de fila/celda (licencia MIT gratuita).
2. Desarrollar `DynamicTokenExtension` para estilizar `{{variables}}` en rojo y negrita dentro y fuera de tablas.
3. Habilitar la zona de soltar archivos (Word/Excel) que dispara la conversión y monta el HTML resultante en TipTap.

### Fase 3: Frontend - Reubicación Transversal y "Piezas de Lego"
1. Crear la vista `/tools/formats` conectada al botón *"Elaboración de Formatos"* de Herramientas Generales.
2. Desarrollar `UniversalFormatDrawer.tsx` con los interruptores modulares de bloques.
3. Desarrollar `VariableEditorDrawer.tsx` con la interfaz de 2 inputs lado a lado y árbol de selección de campos de BD.

### Fase 4: Desacople de Comercial y Validación Integral
1. Eliminar la pestaña de plantillas de `/commercial/settings`.
2. Conectar el selector modal de formatos en `/commercial/proposals`.
3. Validar compilación TypeScript (`tsc --noEmit`), build de Next.js y suite de Jest.
