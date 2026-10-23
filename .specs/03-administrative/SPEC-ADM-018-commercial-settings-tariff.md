# SPEC-ADM-018: Configuración Comercial, Motor Tarifario SVSP y Plantillas Camaleón

> **Estado**: `APROBADO`
> **Módulo**: `administrative`
> **Ubicación Frontend**:
>
> - `src/app/(protected)/commercial/settings/page.tsx`
> - `src/app/(protected)/commercial/settings/components/`
> - `src/config/navigationRegistry.ts`
> **Ubicación Backend**:
> - `prisma/schema/commercial_settings.prisma`
> - `prisma/schema/enums.prisma`
> - `prisma/schema/tenant.prisma`
> - `src/common/prisma-extension/audit-extension.ts`
> - `src/modules/administrative/commercial-settings/`
> - `prisma/seed-features.ts`
> - `prisma/seed.ts`
> **Fecha de Creación**: 2026-10-22
> **Autor**: Antigravity (Principal Software Architect & Lead Engineer)
> **Referencia Histórica**: Archivo Maestro `PROYECTO BITACORA 2026.xlsx` (Hojas `$`, `BD$.`, `BD`, `FORM $`, `VAG`, `INTERNO`)

---

## 1. Contexto de Negocio y Diagnóstico del Problema

En las empresas de seguridad privada y vigilancia física en Colombia, la tarificación y la formalización comercial están estrictamente reguladas por la **Superintendencia de Vigilancia y Seguridad Privada (SVSP)**. La fijación de precios no es libre ni arbitraria: se rige por decretos de Salario Mínimo Mensual Legal Vigente (SMMLV), factores de proporcionalidad diurna/nocturna de la jornada laboral legal, modalidades de servicio con/sin armas o medios caninos, y un esquema tributario especial de base gravable AIU (Administración, Imprevistos y Utilidad).

### 1.1 Diagnóstico del Problema Histórico

En el sistema legado analizado (`PROYECTO BITACORA 2026.xlsx`), la operación comercial dependía de más de 40 hojas frágiles con fórmulas encadenadas de `BUSCARV` (`VLOOKUP`):

1. **Riesgo por Cambios de Ley**: Cada año, al decretarse el nuevo SMMLV o aplicarse reducciones graduales de la jornada laboral semanal (Ley 2101: 48h $\rightarrow$ 47h $\rightarrow$ 46h $\rightarrow$ 44h $\rightarrow$ 42h), un usuario debía modificar manualmente fórmulas en decenas de hojas, generando desfases e inconsistencias en las ofertas emitidas a clientes.
2. **Falta de Tramos de Vigencia en el Mismo Año**: En la hoja `OE`, el año fiscal se dividía en tramos tarifarios distintos (ej. 1 Ene – 30 Jun y 1 Jul – 31 Dic por reducción de jornada laboral en julio). El Excel obligaba a duplicar tablas completas y copiar y pegar valores manualmente.
3. **Dispersión de Costos y Pérdida de Margen (P&L Ciego)**: Los comerciales otorgaban bonos de reinversión en efectivo o bienes en especie (lockers, hornos microondas, apoyos de guardia de 12h) sin un tope sistematizado, destruyendo la utilidad operativa del contrato antes de iniciar la prestación del servicio.
4. **Deuda de Marca y Textos Quemados en Código**: Los formatos legales, membretes, resoluciones de la SuperVigilancia y cartas de presentación estaban dispersos en plantillas fijas, imposibilitando un despliegue multi-empresa (*white-labeling*) limpio.

### 1.2 Objetivo del Módulo

Construir una **Vista de Configuración Única y Motor Tarifario SVSP** para el departamento comercial por cada empresa de seguridad (`tenantId`). Este módulo:

- Automatiza la matemática tarifaria de ley con precisión al centavo.
- Soporta múltiples vigencias tarifarias dentro de un mismo año fiscal.
- Estandariza la matriz salarial y los esquemas de turno de referencia para los guardas.
- Gobierna los topes de reinversión comercial y el catálogo valorizado de valores agregados (VAG).
- Controla la identidad institucional "Camaleón" (Brand Skin) del tenant y la matriz de distribución electrónica a las 9 áreas corporativas.

### 1.3 Historias de Usuario (User Stories)

- **US-COM-01 (Vigencias Tarifarias Múltiples)**: Como *Director Comercial*, quiero configurar los parámetros anuales (SMMLV, auxilios de transporte) y definir tramos de fecha con su jornada semanal aplicable (ej. 46h o 44h) para que el sistema calcule automáticamente los precios hora y mensuales de cada vigencia.

- **US-COM-02 (Catálogo de Servicios Paramétrico)**: Como *Asesor Comercial*, quiero consultar el catálogo de servicios de vigilancia física donde cada combinación de jornada, sector, modalidad de arma y programación tenga su costo directo, A&S, AIU e IVA precalculados con exactitud matemática.
- **US-COM-03 (Matriz Salarial de Puesto)**: Como *Director Comercial*, quiero parametrizar la estructura salarial por cargo y esquema de turno ($2\times2\times2$, $5\times2$, etc.) discriminando devengado, deducciones, rodamientos y neto libre a retirar para transparentar la remuneración al cliente y alimentar el P&L interno.
- **US-COM-04 (Topes de Reinversión y Catálogo VAG)**: Como *Gerente General*, quiero fijar los porcentajes máximos de reinversión autorizados a 1 y 2 años y catalogar los costos internos de bienes en especie (cámaras, lockers, apoyos) para evitar comprometer márgenes que afecten la salud financiera de la empresa.
- **US-COM-05 (Identidad Camaleón y Snippets Dinámicos)**: Como *Administrador del Tenant*, quiero configurar el logo corporativo, colores institucionales, resoluciones legales vigentes y plantillas de texto con variables (`{{nombre_cliente}}`, `{{nit}}`) para que los documentos oficiales exportables reflejen la identidad de mi empresa.
- **US-COM-06 (Matriz de Notificación de 9 Áreas)**: Como *Director de Operaciones*, quiero registrar los funcionarios y correos de las 9 dependencias internas para que las órdenes de servicio se despachen automáticamente al ganar una cotización.

---

## 2. Definición de Permisos y Matriz RBAC

### 2.1 Permisos en `prisma/seed.ts` y Feature Flag en `prisma/seed-features.ts`

#### Feature Flag Maestra (`seed-features.ts`)

```typescript
{
  key: 'commercial',
  name: 'Gestión Comercial',
  description: 'Motor tarifario SVSP, cotizaciones, propuestas, P&L y órdenes de servicio'
}
```

#### Matriz de Permisos RBAC (`seed.ts`)

| Permiso Code | Nombre Legible | Descripción | Roles Autorizados por Defecto |
| :--- | :--- | :--- | :--- |
| `commercial:settings:read` | Lectura de Parámetros Comerciales | Consultar tarifas SVSP, catálogo, salarios, VAG y skins | `GODLIKE`, `ADMIN`, `COMMERCIAL_MANAGER`, `COMMERCIAL_AGENT` |
| `commercial:settings:manage` | Administración Total de Configuración Comercial | Modificar SMMLV, crear tramos de vigencia, actualizar matriz salarial, alterar topes de reinversión y modificar piel institucional | `GODLIKE`, `ADMIN`, `COMMERCIAL_MANAGER` |

### 2.2 Reglas Multi-Tenant y Seguridad en AsyncLocalStorage (ALS)

- **Aislamiento Estricto Obligatorio**: Ningún tenant puede consultar, simular ni mutar parámetros comerciales de otra empresa de seguridad.

- **Inyección en `audit-extension.ts`**: Los modelos `CommercialSettings`, `TariffPeriodConfig`, `SecurityServiceCatalog`, `PositionSalaryMatrix`, `ValueAddedCatalogItem`, `TenantDocumentSkin`, `DocumentTextSnippet` y `ServiceOrderDistributionRecipient` deben registrarse en el array `multiTenantModels` de la extensión Prisma.
- **Trazabilidad de Auditoría**: Toda mutación en estos modelos inyecta automáticamente `createdById` y `updatedById` desde `RequestContextService`, registrando el log correspondiente en `AuditLog`.

---

## 3. Modelo de Datos (Prisma Schema Specification)

### 3.1 Enums en `prisma/schema/enums.prisma`

```prisma
enum CommercialSector {
  COMMERCIAL_PUBLIC      // Sector Comercial y Público (8.8 SMMLV)
  RESIDENTIAL_STRATA_4_6 // Residencial Estratos 4, 5 y 6 - Estrato A (8.6 SMMLV)
  RESIDENTIAL_STRATA_1_3 // Residencial Estratos 1, 2 y 3 - Estrato B (7.66 SMMLV o autorizada)
}

enum WeaponModality {
  NO_WEAPON              // Sin Arma (A&S: 8% comercial, 10% residencial)
  LETHAL_WEAPON          // Con Arma de Fuego Letal (A&S: 10%)
  NON_LETHAL_WEAPON      // Con Arma No Letal / Persuasión (A&S: 10%)
  CANINE_SUPPORT         // Medio Canino (A&S: 11%)
}

enum ShiftScheduleType {
  SCHEDULE_2X2X2         // 2 días diurnos, 2 días nocturnos, 2 días descanso
  SCHEDULE_3X3X2
  SCHEDULE_4X4X2
  SCHEDULE_5X1
  SCHEDULE_5X2
  SCHEDULE_6X1
  SCHEDULE_6X2
  SCHEDULE_7X1
  SPECIAL_CUSTOM
}

enum WorkingDaysModality {
  DAYS_30_ALL_MONTH      // Lunes a Domingo (30 días)
  DAYS_26_MON_SAT_HOL    // Lunes a Sábado con festivos (26 días)
  DAYS_24_MON_SAT_NO_HOL // Lunes a Sábado sin festivos (24 días)
  DAYS_22_MON_FRI_HOL    // Lunes a Viernes con festivos (22 días)
  DAYS_20_MON_FRI_NO_HOL // Lunes a Viernes sin festivos (20 días)
  DAYS_10_WEEKEND_HOL    // Sábados, Domingos y Festivos (10 días)
  DAYS_8_WEEKEND_ONLY    // Sábados y Domingos (8 días)
  DAYS_2_HOLIDAYS_ONLY   // Únicamente Festivos (2 días)
}

enum ValueAddedCategory {
  POST_EQUIPMENT         // Lockers, hornos microondas, linternas, botiquines
  SERVICE_SUPPORT        // Turnos adicionales de apoyo (12h diurno/nocturno)
  TECHNOLOGY_COMODATO    // Cámaras 360°, DVR, monitoreo desde central
  SECURITY_STUDY         // Estudio de seguridad física y electrónica
  CASH_REINVESTMENT      // Adecuaciones físicas y bonos para eventos de copropiedad
}

enum InternalDepartment {
  CONTRACTS
  OPERATIONS
  WAREHOUSE
  MONITORING_CENTER
  CUSTOMER_SERVICE
  HUMAN_RESOURCES
  QUALITY_ASSURANCE
  ACCOUNTING
  TREASURY
}
```

### 3.2 Esquema Principal en `prisma/schema/commercial_settings.prisma`

```prisma
/// Configuración comercial global por empresa de seguridad (tenantId)
model CommercialSettings {
  id                       String             @id @default(cuid(2))
  tenantId                 String             @unique
  tenant                   Tenant             @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  // Parámetros Tributarios Predeterminados (Porcentajes en Decimal)
  defaultAiuRate           Decimal            @default(0.10) @db.Decimal(5, 4) // 10% Base AIU
  defaultIvaOnAiuRate      Decimal            @default(0.19) @db.Decimal(5, 4) // 19% IVA sobre AIU
  defaultRetefuenteRate    Decimal            @default(0.02) @db.Decimal(5, 4) // 2% Retefuente sobre AIU
  defaultReteIcaRate       Decimal            @default(0.0138) @db.Decimal(6, 5) // 1.38% ReteICA sobre Subtotal

  // Topes de Negociación y Políticas Comerciales
  maxReinvestmentPct1Yr    Decimal            @default(0.80) @db.Decimal(5, 4) // 80% de la 1ra factura
  maxReinvestmentPct2Yr    Decimal            @default(1.60) @db.Decimal(5, 4) // 160% acumulado
  defaultQuoteValidityDays  Int                @default(15) // Días hábiles de validez
  enableGuardSalaryDisplay Boolean            @default(true) // Mostrar sueldo del guarda en ofertas

  // Metadatos ISO / Calidad para Encabezados de Formatos Internos
  qualityDocCode           String             @default("CM-F-001")
  qualityDocVersion        String             @default("V.4")
  qualityDocRevisionDate   DateTime?          @db.Date

  // Relaciones Hijas
  tariffPeriods            TariffPeriodConfig[]
  serviceCatalog           SecurityServiceCatalog[]
  salaryMatrix             PositionSalaryMatrix[]
  valueAddedCatalog        ValueAddedCatalogItem[]
  distributionRecipients   ServiceOrderDistributionRecipient[]
  documentSkin             TenantDocumentSkin?
  textSnippets             DocumentTextSnippet[]

  // Auditoría
  createdAt                DateTime           @default(now())
  updatedAt                DateTime           @updatedAt
  createdById              String?
  updatedById              String?

  @@index([tenantId])
  @@map("commercial_settings")
}

/// Tramos de vigencia tarifaria (soporta múltiples períodos en el año, ej. reducciones de jornada)
model TariffPeriodConfig {
  id                   String             @id @default(cuid(2))
  tenantId             String
  tenant               Tenant             @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  commercialSettingsId String
  commercialSettings   CommercialSettings @relation(fields: [commercialSettingsId], references: [id], onDelete: Cascade)

  year                 Int                // Ej: 2026
  label                String             // Ej: "Tarifa 01 Enero al 30 Junio (46 Horas)"
  startDate            DateTime           @db.Date
  endDate              DateTime           @db.Date
  isActive             Boolean            @default(true)

  // Variables Macroeconómicas Oficiales 2026 (SuperVigilancia)
  smmlv                Decimal            @default(1750905.00) @db.Decimal(12, 2) // $1.750.905 SMMLV 2026
  monthlyTransportAux  Decimal            @default(249095.00) @db.Decimal(12, 2)  // $249.095 Auxilio Transporte
  dailyTransportAux    Decimal            @default(8303.17) @db.Decimal(12, 2)    // $8.303,17 diario

  // Factores de Proporcionalidad Horaria y Jornada Legal 2026 (Ley 2101: 44 Horas)
  statutoryWeeklyHours Int                @default(44) // 44h semanales en 2026 (divisor 220 horas)
  baseHourlyRate       Decimal            @default(7959.00) @db.Decimal(10, 2) // $7.959 Valor Hora Base Ordinaria Diurna
  statutoryDayHours    Int                @default(15) // Horas diurnas legales (06:00 - 21:00)
  statutoryNightHours  Int                @default(9)  // Horas nocturnas legales (21:00 - 06:00)
  dayProportionFactor  Decimal            @default(0.5597) @db.Decimal(6, 4)
  nightProportionFactor Decimal           @default(0.4403) @db.Decimal(6, 4)

  // Multiplicadores Sectoriales (en número de SMMLV)
  commercialMultiplier Decimal            @default(8.8) @db.Decimal(4, 2) // 8.8 SMMLV
  strata46Multiplier   Decimal            @default(8.6) @db.Decimal(4, 2) // 8.6 SMMLV
  strata13Multiplier   Decimal            @default(7.66376105) @db.Decimal(10, 8) // 7.66 SMMLV

  createdAt            DateTime           @default(now())
  updatedAt            DateTime           @updatedAt
  createdById          String?
  updatedById          String?

  @@unique([tenantId, year, label])
  @@index([tenantId, isActive])
  @@map("tariff_period_configs")
}

/// Catálogo maestro de servicios de seguridad física
model SecurityServiceCatalog {
  id                   String              @id @default(cuid(2))
  tenantId             String
  tenant               Tenant              @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  commercialSettingsId String
  commercialSettings   CommercialSettings  @relation(fields: [commercialSettingsId], references: [id], onDelete: Cascade)

  serviceCode          Int                 // Código numérico interno (ej: 1, 2, 829, 1135)
  name                 String              // Ej: "Servicio de Vigilancia 24 horas"
  targetPosition       String              // Guarda, Supervisor, OMT, Recepcionista
  sector               CommercialSector
  weaponModality       WeaponModality
  scheduleType         ShiftScheduleType   @default(SCHEDULE_2X2X2)
  daysModality         WorkingDaysModality @default(DAYS_30_ALL_MONTH)

  dailyTotalHours      Int                 // 24, 12, 16, 9, 8, etc.
  dayHours             Int                 // Horas diurnas en el turno (ej. 15 en 24h, 3 en 12h noche)
  nightHours           Int                 // Horas nocturnas en el turno (ej. 9 en 24h, 9 en 12h noche)
  billableDaysPerMonth Int                 // 30, 26, 24, 22, 20, 10, 8, 2

  adminSupervisionPct  Decimal             @db.Decimal(5, 4) // 0.08, 0.10, 0.11

  isSystemStandard     Boolean             @default(true)
  isActive             Boolean             @default(true)

  createdAt            DateTime            @default(now())
  updatedAt            DateTime            @updatedAt
  createdById          String?
  updatedById          String?

  @@unique([tenantId, serviceCode])
  @@index([tenantId, sector, weaponModality])
  @@map("security_service_catalogs")
}

/// Matriz de salarios de referencia por cargo operativo y esquema de turno (Referencia SVSP 2026)
model PositionSalaryMatrix {
  id                    String             @id @default(cuid(2))
  tenantId              String
  tenant                Tenant             @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  commercialSettingsId  String
  commercialSettings    CommercialSettings @relation(fields: [commercialSettingsId], references: [id], onDelete: Cascade)

  positionTitle         String             // "Guarda Portero", "Supervisor Motorizado", "OMT", "Recepcionista"
  scheduleType          ShiftScheduleType  @default(SCHEDULE_2X2X2)
  guardsRequiredPerPost Decimal            @default(3.0) @db.Decimal(4, 2) // Factor de guardas por puesto

  // Estructura Salarial Base SVSP 2026
  baseSalary            Decimal            @default(1750905.00) @db.Decimal(12, 2) // SMMLV Base ($1.750.905)
  transportAllowance    Decimal            @default(249095.00) @db.Decimal(12, 2)  // Auxilio Transporte ($249.095)
  shiftOrdinaryHours    Int                @default(8)                             // 8h ordinarias por turno
  shiftExtraHours       Int                @default(4)                             // 4h extras por turno (8h ord + 4h ext = 12h/turno)

  // Devengados Derivados de Recargos y Horas Extras
  estimatedOvertimePay  Decimal            @db.Decimal(12, 2)                      // Horas extras y recargos calculados
  grossSalary           Decimal            @db.Decimal(12, 2)                      // Total Devengado (Base + Auxilio + Recargos)

  // Deducciones de Nómina del Trabajador (Ley SVSP: 4.0% Salud + 4.0% Pensión)
  healthDeductionPct    Decimal            @default(0.04) @db.Decimal(5, 4)        // 4.0% Salud
  pensionDeductionPct   Decimal            @default(0.04) @db.Decimal(5, 4)        // 4.0% Pensión
  healthDeduction       Decimal            @db.Decimal(12, 2)                      // Valor retenido salud
  pensionDeduction      Decimal            @db.Decimal(12, 2)                      // Valor retenido pensión
  totalDeductions       Decimal            @db.Decimal(12, 2)                      // Subtotal deducciones nómina

  // Beneficios No Prestacionales y Rodamiento
  fixedBonusNonSalary   Decimal            @default(0) @db.Decimal(12, 2)          // Bonificación no salarial
  vehicleAllowance      Decimal            @default(0) @db.Decimal(12, 2)          // Rodamiento (motorizado)

  // Remuneración Final Libre a Retirar por el Guarda
  netTakeHomePay        Decimal            @db.Decimal(12, 2)                      // Sueldo neto bancario

  isActive              Boolean            @default(true)

  createdAt             DateTime           @default(now())
  updatedAt             DateTime           @updatedAt
  createdById           String?
  updatedById           String?

  @@unique([tenantId, positionTitle, scheduleType])
  @@index([tenantId, isActive])
  @@map("position_salary_matrices")
}

/// Catálogo de valores agregados, dotación de puesto y beneficios en especie
model ValueAddedCatalogItem {
  id                    String             @id @default(cuid(2))
  tenantId              String
  tenant                Tenant             @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  commercialSettingsId  String
  commercialSettings    CommercialSettings @relation(fields: [commercialSettingsId], references: [id], onDelete: Cascade)

  name                  String             // "Locker metálico 4 puestos", "Horno Microondas", "Apoyo Guarda 12h"
  category              ValueAddedCategory
  description           String?            @db.Text
  internalReferenceCost Decimal            @db.Decimal(12, 2) // Costo interno para el P&L
  isStandardBenefit     Boolean            @default(false)
  defaultQuantity       Int                @default(1)
  isActive              Boolean            @default(true)

  createdAt             DateTime           @default(now())
  updatedAt             DateTime           @updatedAt
  createdById           String?
  updatedById           String?

  @@unique([tenantId, name])
  @@index([tenantId, category])
  @@map("value_added_catalog_items")
}

/// Identidad Visual Corporativa y resoluciones legales para PDFs
model TenantDocumentSkin {
  id                       String             @id @default(cuid(2))
  tenantId                 String             @unique
  tenant                   Tenant             @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  commercialSettingsId     String             @unique
  commercialSettings       CommercialSettings @relation(fields: [commercialSettingsId], references: [id], onDelete: Cascade)

  // Identidad Visual de Marca
  primaryBrandColorHex     String             @default("#1E1B4B")
  accentBrandColorHex      String             @default("#7C3AED")
  logoS3Key                String?            // S3 Key en MediaAttachment
  secondaryLogoS3Key       String?            // Logo alternativo / fondo oscuro

  // Credenciales Legales y Resoluciones SVSP
  companyLegalName         String
  companyNit               String
  commercialRegisterNum    String?
  supervigilanciaLicense   String?
  supervigilanciaLicDate   DateTime?          @db.Date
  supervigilanciaLicExpiry DateTime?          @db.Date
  minTicLicenseNum         String?
  uniformsResolutionNum    String?
  overtimeResolutionNum    String?
  sstImplementationPct     Decimal?           @default(99.5) @db.Decimal(5, 2)

  // Sellos y Certificaciones
  hasIso9001Certified      Boolean            @default(true)
  hasBascCertified         Boolean            @default(true)
  hasPoliceSupportNetwork  Boolean            @default(true)
  hasDijinEnterpriseFront  Boolean            @default(true)

  // Firmantes Autorizados
  commercialDirectorName   String?
  commercialDirectorTitle  String?            @default("Director Comercial")
  commercialDirectorEmail  String?
  commercialDirectorPhone  String?
  commercialDirectorSigS3  String?

  legalRepName             String?
  legalRepTitle            String?            @default("Representante Legal y Gerente General")
  legalRepEmail            String?
  legalRepPhone            String?
  legalRepSigS3            String?

  createdAt                DateTime           @default(now())
  updatedAt                DateTime           @updatedAt
  createdById              String?
  updatedById              String?

  @@index([tenantId])
  @@map("tenant_document_skins")
}

/// Cláusulas y fragmentos de texto dinámico con variables
model DocumentTextSnippet {
  id                   String             @id @default(cuid(2))
  tenantId             String
  tenant               Tenant             @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  commercialSettingsId String
  commercialSettings   CommercialSettings @relation(fields: [commercialSettingsId], references: [id], onDelete: Cascade)

  key                  String             // "COVER_LETTER_RESIDENTIAL", "LABOR_WELFARE_PARAGRAPH"
  title                String             // "Carta de Presentación - Sector Residencial"
  bodyTemplate         String             @db.Text // Variables: {{client_name}}, {{nit}}, etc.
  category             String             // "LETTERS", "LEGAL_NOTES", "WELFARE", "SLA"
  isDefault            Boolean            @default(false)
  isActive             Boolean            @default(true)

  createdAt            DateTime           @default(now())
  updatedAt            DateTime           @updatedAt
  createdById          String?
  updatedById          String?

  @@unique([tenantId, key])
  @@index([tenantId, category])
  @@map("document_text_snippets")
}

/// Destinatarios de la matriz de notificación de Orden de Servicio a las 9 áreas
model ServiceOrderDistributionRecipient {
  id                   String             @id @default(cuid(2))
  tenantId             String
  tenant               Tenant             @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  commercialSettingsId String
  commercialSettings   CommercialSettings @relation(fields: [commercialSettingsId], references: [id], onDelete: Cascade)

  department           InternalDepartment
  recipientName        String
  recipientEmail       String
  isActive             Boolean            @default(true)

  createdAt            DateTime           @default(now())
  updatedAt            DateTime           @updatedAt
  createdById          String?
  updatedById          String?

  @@unique([tenantId, department])
  @@index([tenantId, isActive])
  @@map("service_order_distribution_recipients")
}
```

### 3.3 Extensión en `prisma/schema/tenant.prisma`

```prisma
// Dentro del modelo Tenant:
commercialSettings CommercialSettings?
tariffPeriodConfigs TariffPeriodConfig[]
securityServiceCatalogs SecurityServiceCatalog[]
positionSalaryMatrices PositionSalaryMatrix[]
valueAddedCatalogItems ValueAddedCatalogItem[]
tenantDocumentSkin TenantDocumentSkin?
documentTextSnippets DocumentTextSnippet[]
serviceOrderDistributionRecipients ServiceOrderDistributionRecipient[]
```

---

## 4. Lógica de Negocio, Motor Tarifario y Calculadora Salarial SVSP 2026

### 4.1 Motor Tarifario Comercial SVSP (`TariffCalculationEngine`)

El servicio `TariffCalculationEngine` es una utilidad matemática pura y determinista sin efectos secundarios que calcula la tarifa comercial oficial de venta:

```typescript
// src/modules/administrative/commercial-settings/services/tariff-calculation.service.ts

export interface TariffInput {
  smmlv: number;
  monthlyTransportAux: number;
  sector: CommercialSector;
  weaponModality: WeaponModality;
  dayHours: number;              // Horas diurnas en el turno (ej. 15 en 24h, 3 en 12h noche)
  nightHours: number;            // Horas nocturnas en el turno (ej. 9 en 24h, 9 en 12h noche)
  billableDays: number;          // Días facturables al mes (30, 26, 24, 22, 20, 10, 8, 2)
  customSectorMultiplier?: number;
  customAdminSupervisionPct?: number;
  aiuRate?: number;              // Predeterminado 0.10 (10%)
  ivaOnAiuRate?: number;         // Predeterminado 0.19 (19%)
  retefuenteRate?: number;       // Predeterminado 0.02 (2%)
  reteIcaRate?: number;          // Predeterminado 0.0138 (1.38%)
  discountPct?: number;          // Porcentaje pronto pago (ej. 0.05 para 5%)

  // Parámetros de Proporcionalidad Dinámica (desde TariffPeriodConfig)
  dayProportionFactor?: number;  // Default: 0.5597
  nightProportionFactor?: number;// Default: 0.4403
  statutoryDayHours?: number;    // Default: 15
  statutoryNightHours?: number;  // Default: 9
}

export interface TariffCalculationBreakdown {
  tariffBase24h: number;
  dayHourlyRateMonth: number;
  nightHourlyRateMonth: number;
  directCost: number;
  adminSupervisionPct: number;
  adminSupervisionValue: number;
  subtotalBeforeTax: number;
  discountValue: number;
  subtotalAfterDiscount: number;
  aiuBaseValue: number;
  ivaValue: number;
  retefuenteValue: number;
  reteIcaValue: number;
  totalWithTax: number;
  netCompanyToReceive: number;
  dailyRate: number;
}

export class TariffCalculationEngine {
  private static readonly DEFAULT_DAY_PROPORTION = 0.5597;
  private static readonly DEFAULT_NIGHT_PROPORTION = 0.4403;
  private static readonly DEFAULT_LEGAL_DAY_HOURS = 15;
  private static readonly DEFAULT_LEGAL_NIGHT_HOURS = 9;

  private static roundTax(val: number): number {
    return Math.round((val + Number.EPSILON) * 100) / 100;
  }

  private static roundCOP(val: number): number {
    return Math.round(val);
  }

  static calculate(input: TariffInput): TariffCalculationBreakdown {
    // 1. Multiplicador de Sector (múltiplos de SMMLV)
    let multiplier = 8.8; // Comercial y Público
    if (input.customSectorMultiplier) {
      multiplier = input.customSectorMultiplier;
    } else if (input.sector === CommercialSector.RESIDENTIAL_STRATA_4_6) {
      multiplier = 8.6;
    } else if (input.sector === CommercialSector.RESIDENTIAL_STRATA_1_3) {
      multiplier = 7.66376105;
    }

    // 2. Tarifa Base 24h
    const tariffBase24h = this.roundCOP(input.smmlv * multiplier);

    // 3. Proporcionalidad Horaria Dinámica
    const dayFactor = input.dayProportionFactor ?? this.DEFAULT_DAY_PROPORTION;
    const nightFactor = input.nightProportionFactor ?? this.DEFAULT_NIGHT_PROPORTION;
    const legalDayHours = input.statutoryDayHours ?? this.DEFAULT_LEGAL_DAY_HOURS;
    const legalNightHours = input.statutoryNightHours ?? this.DEFAULT_LEGAL_NIGHT_HOURS;

    const dayHourlyRateMonth = (tariffBase24h * dayFactor) / legalDayHours;
    const nightHourlyRateMonth = (tariffBase24h * nightFactor) / legalNightHours;

    // 4. Costo Directo Mensual
    const dailyCost = (dayHourlyRateMonth * input.dayHours) + (nightHourlyRateMonth * input.nightHours);
    const directCost = this.roundTax((dailyCost / 30) * input.billableDays);

    // 5. A&S (Administración y Supervisión)
    let adminSupervisionPct = 0.10;
    if (input.customAdminSupervisionPct !== undefined) {
      adminSupervisionPct = input.customAdminSupervisionPct;
    } else if (input.weaponModality === WeaponModality.CANINE_SUPPORT) {
      adminSupervisionPct = 0.11;
    } else if (
      input.sector === CommercialSector.COMMERCIAL_PUBLIC &&
      input.weaponModality === WeaponModality.NO_WEAPON
    ) {
      adminSupervisionPct = 0.08;
    }

    const adminSupervisionValue = this.roundTax(directCost * adminSupervisionPct);
    const subtotalBeforeTax = this.roundTax(directCost + adminSupervisionValue);

    // 6. Descuento Financiero (Pronto Pago)
    const discountPct = input.discountPct ?? 0;
    const discountValue = this.roundTax(subtotalBeforeTax * discountPct);
    const subtotalAfterDiscount = this.roundTax(subtotalBeforeTax - discountValue);

    // 7. Base Gravable AIU e IVA sobre AIU (19% sobre 10%)
    const aiuRate = input.aiuRate ?? 0.10;
    const ivaOnAiuRate = input.ivaOnAiuRate ?? 0.19;
    const aiuBaseValue = this.roundTax(subtotalAfterDiscount * aiuRate);
    const ivaValue = this.roundTax(aiuBaseValue * ivaOnAiuRate);

    // 8. Retenciones
    const retefuenteRate = input.retefuenteRate ?? 0.02;
    const reteIcaRate = input.reteIcaRate ?? 0.0138;
    const retefuenteValue = this.roundTax(aiuBaseValue * retefuenteRate);
    const reteIcaValue = this.roundTax(subtotalAfterDiscount * reteIcaRate);

    // 9. Totales Finales
    const totalWithTax = this.roundCOP(subtotalAfterDiscount + ivaValue);
    const netCompanyToReceive = this.roundTax(subtotalAfterDiscount + ivaValue - retefuenteValue - reteIcaValue);
    const dailyRate = this.roundTax(subtotalBeforeTax / input.billableDays);

    return {
      tariffBase24h,
      dayHourlyRateMonth: this.roundTax(dayHourlyRateMonth),
      nightHourlyRateMonth: this.roundTax(nightHourlyRateMonth),
      directCost,
      adminSupervisionPct,
      adminSupervisionValue,
      subtotalBeforeTax,
      discountValue,
      subtotalAfterDiscount,
      aiuBaseValue,
      ivaValue,
      retefuenteValue,
      reteIcaValue,
      totalWithTax,
      netCompanyToReceive,
      dailyRate,
    };
  }
}

### 4.2 Motor Salarial y Calculadora de Horas SVSP 2026 (`GuardSalaryCalculationEngine`)

Extraído directamente de la leyenda oficial de la calculadora de la **Superintendencia de Vigilancia y Seguridad Privada (SVSP) para 2026**:

```mermaid
flowchart TD
    SMMLV["SMMLV 2026: $ 1.750.905"] --> DIV["Divisor Mensual: 220 horas (44h semanales)"]
    DIV --> BASE["Valor Base Ord. Diurna: $ 7.959"]

    BASE --> H1["Ord. Diurna: $ 7.959 (Base)"]
    BASE --> H2["Ord. Nocturna: $ 10.744 (+35% = $ 2.785)"]
    BASE --> H3["Extra Diurna: $ 9.948 (+25% = $ 1.989)"]
    BASE --> H4["Extra Nocturna: $ 13.927 (+75% = $ 5.968)"]
    BASE --> H5["Dom/Fest Ord. Diur: $ 14.325 (+80% = $ 6.366)"]
    BASE --> H6["Dom/Fest Ord. Noct: $ 17.111 (+115% = $ 9.152)"]
    BASE --> H7["Dom/Fest Extra D.: $ 16.315 (+105% = $ 8.356)"]
    BASE --> H8["Dom/Fest Extra N.: $ 20.294 (+155% = $ 12.335)"]

    subgraph TURNO ["Estructura de Turno Operativo"]
        T1["8h Ordinarias"] + T2["4h Extras"] --> T12["12h / Turno"]
    end

    subgraph DED ["Deducciones de Ley del Empleado"]
        SAL["Salud: 4.0%"]
        PEN["Pensión: 4.0%"]
    end
```

#### Especificación de Tipos e Implementación del Motor Salarial

```typescript
// src/modules/administrative/commercial-settings/services/guard-salary-calculation.service.ts

export interface HourlyRateItem {
  name: string;
  code: string;
  baseRate: number;
  surchargePct: number;
  surchargeValue: number;
  totalHourlyRate: number;
}

export interface SvspSalaryReference2026 {
  smmlv: number;               // $ 1.750.905
  transportAllowance: number;  // $ 249.095
  totalMinimumGross: number;   // $ 2.000.000 (SMMLV + Auxilio)
  statutoryWeeklyHours: number;// 44 horas semanales
  monthlyDivisorHours: number; // 220 horas
  baseHourlyRate: number;      // $ 7.959

  // Matriz de las 8 Horas Oficiales SVSP
  hourlyRates: {
    ordinaryDay: HourlyRateItem;           // $ 7.959
    ordinaryNight: HourlyRateItem;         // $ 10.744 (Recargo: $ 2.785)
    overtimeDay: HourlyRateItem;           // $ 9.948 (Recargo: $ 1.989)
    overtimeNight: HourlyRateItem;         // $ 13.927 (Recargo: $ 5.968)
    sundayHolidayOrdDay: HourlyRateItem;   // $ 14.325 (Recargo: $ 6.366)
    sundayHolidayOrdNight: HourlyRateItem; // $ 17.111 (Recargo: $ 9.152)
    sundayHolidayExtDay: HourlyRateItem;   // $ 16.315 (Recargo: $ 8.356)
    sundayHolidayExtNight: HourlyRateItem; // $ 20.294 (Recargo: $ 12.335)
  };

  // Reglas de Turno y Deducciones de Nómina
  shiftStructure: {
    ordinaryHoursPerShift: number; // 8h
    extraHoursPerShift: number;    // 4h
    totalShiftHours: number;       // 12h
  };
  deductionRates: {
    healthPct: number;  // 0.04 (4.0%)
    pensionPct: number; // 0.04 (4.0%)
  };
}

export interface GuardPayrollSimulationInput {
  smmlv?: number;
  transportAllowance?: number;
  statutoryWeeklyHours?: number;
  fixedBonusNonSalary?: number;
  vehicleAllowance?: number;
  scheduleType?: ShiftScheduleType;
  overtimeHoursDay?: number;
  overtimeHoursNight?: number;
  sundayHolidayHoursDay?: number;
  sundayHolidayHoursNight?: number;
}

export interface GuardPayrollSimulationResult {
  reference: SvspSalaryReference2026;
  baseSalary: number;
  transportAllowance: number;
  overtimePay: number;
  nightSurcharges: number;
  sundayHolidaySurcharges: number;
  totalSalaryEarned: number; // Base imponible para salud y pensión
  healthDeduction: number;   // 4.0%
  pensionDeduction: number;  // 4.0%
  totalDeductions: number;   // 8.0%
  fixedBonusNonSalary: number;
  vehicleAllowance: number;
  grossSalaryTotal: number;  // Total devengado con auxilio y bonos
  netTakeHomePay: number;    // Sueldo neto bancario
}

export class GuardSalaryCalculationEngine {
  private static readonly DEFAULT_SMMLV_2026 = 1750905.0;
  private static readonly DEFAULT_TRANSPORT_2026 = 249095.0;
  private static readonly DEFAULT_WEEKLY_HOURS_2026 = 44;

  private static round(val: number): number {
    return Math.round(val);
  }

  /**
   * Genera la tabla oficial de 8 tarifas horarias SVSP 2026
   */
  static getSalaryReference2026(
    smmlv = this.DEFAULT_SMMLV_2026,
    transport = this.DEFAULT_TRANSPORT_2026,
    weeklyHours = this.DEFAULT_WEEKLY_HOURS_2026,
  ): SvspSalaryReference2026 {
    const monthlyDivisorHours = weeklyHours * 5; // 44 * 5 = 220 horas
    const rawBaseHour = smmlv / monthlyDivisorHours; // 1.750.905 / 220 = 7.958,659...
    const baseHourlyRate = this.round(rawBaseHour); // $ 7.959

    const buildRate = (name: string, code: string, surchargePct: number): HourlyRateItem => {
      const surchargeValue = this.round(rawBaseHour * surchargePct);
      const totalHourlyRate = baseHourlyRate + surchargeValue;
      return {
        name,
        code,
        baseRate: baseHourlyRate,
        surchargePct,
        surchargeValue,
        totalHourlyRate,
      };
    };

    return {
      smmlv,
      transportAllowance: transport,
      totalMinimumGross: smmlv + transport,
      statutoryWeeklyHours: weeklyHours,
      monthlyDivisorHours,
      baseHourlyRate,
      hourlyRates: {
        ordinaryDay: {
          name: 'Ord. Diurna',
          code: 'ORD_DIUR',
          baseRate: baseHourlyRate,
          surchargePct: 0.0,
          surchargeValue: 0,
          totalHourlyRate: baseHourlyRate, // $ 7.959
        },
        ordinaryNight: buildRate('Ord. Nocturna', 'ORD_NOCT', 0.35),       // $ 10.744 ($ 2.785)
        overtimeDay: buildRate('Extra Diurna', 'EXT_DIUR', 0.25),          // $ 9.948  ($ 1.989)
        overtimeNight: buildRate('Extra Nocturna', 'EXT_NOCT', 0.75),      // $ 13.927 ($ 5.968)
        sundayHolidayOrdDay: buildRate('Dom/Fest Ord. Diur', 'DOM_ORD_D', 0.80),   // $ 14.325 ($ 6.366)
        sundayHolidayOrdNight: buildRate('Dom/Fest Ord. Noct', 'DOM_ORD_N', 1.15), // $ 17.111 ($ 9.152)
        sundayHolidayExtDay: buildRate('Dom/Fest Extra D.', 'DOM_EXT_D', 1.05),    // $ 16.315 ($ 8.356)
        sundayHolidayExtNight: buildRate('Dom/Fest Extra N.', 'DOM_EXT_N', 1.55),  // $ 20.294 ($ 12.335)
      },
      shiftStructure: {
        ordinaryHoursPerShift: 8,
        extraHoursPerShift: 4,
        totalShiftHours: 12,
      },
      deductionRates: {
        healthPct: 0.04,
        pensionPct: 0.04,
      },
    };
  }

  /**
   * Simula la nómina integral de un guarda con deducciones de ley exactas
   */
  static simulateGuardPayroll(input: GuardPayrollSimulationInput): GuardPayrollSimulationResult {
    const ref = this.getSalaryReference2026(
      input.smmlv,
      input.transportAllowance,
      input.statutoryWeeklyHours,
    );

    const baseSalary = ref.smmlv;
    const transportAllowance = ref.transportAllowance;

    // Horas extras y recargos
    const overtimePay = this.round(
      (input.overtimeHoursDay ?? 0) * ref.hourlyRates.overtimeDay.totalHourlyRate +
      (input.overtimeHoursNight ?? 0) * ref.hourlyRates.overtimeNight.totalHourlyRate,
    );

    const nightSurcharges = this.round(
      (input.overtimeHoursNight ?? 0) * ref.hourlyRates.ordinaryNight.surchargeValue,
    );

    const sundayHolidaySurcharges = this.round(
      (input.sundayHolidayHoursDay ?? 0) * ref.hourlyRates.sundayHolidayOrdDay.surchargeValue +
      (input.sundayHolidayHoursNight ?? 0) * ref.hourlyRates.sundayHolidayOrdNight.surchargeValue,
    );

    // Base salarial para deducciones (excluye auxilio de transporte por ley)
    const totalSalaryEarned = baseSalary + overtimePay + nightSurcharges + sundayHolidaySurcharges;

    // Deducciones de Nómina (4.0% Salud + 4.0% Pensión)
    const healthDeduction = this.round(totalSalaryEarned * ref.deductionRates.healthPct);
    const pensionDeduction = this.round(totalSalaryEarned * ref.deductionRates.pensionPct);
    const totalDeductions = healthDeduction + pensionDeduction;

    const fixedBonusNonSalary = input.fixedBonusNonSalary ?? 0;
    const vehicleAllowance = input.vehicleAllowance ?? 0;

    const grossSalaryTotal = totalSalaryEarned + transportAllowance + fixedBonusNonSalary + vehicleAllowance;
    const netTakeHomePay = grossSalaryTotal - totalDeductions;

    return {
      reference: ref,
      baseSalary,
      transportAllowance,
      overtimePay,
      nightSurcharges,
      sundayHolidaySurcharges,
      totalSalaryEarned,
      healthDeduction,
      pensionDeduction,
      totalDeductions,
      fixedBonusNonSalary,
      vehicleAllowance,
      grossSalaryTotal,
      netTakeHomePay,
    };
  }
}
```

---

## 5. Contratos de API REST (NestJS DTOs & Endpoints)

Todos los endpoints residen en `src/modules/administrative/commercial-settings/controllers/commercial-settings.controller.ts` bajo el prefijo `/api/v1/commercial/settings`:

### 5.1 Endpoints REST Spec

| Verbo | Ruta | Permiso RBAC | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/commercial/settings` | `commercial:settings:read` | Consulta la configuración comercial integral del tenant (incluyendo relaciones) |
| `PATCH` | `/api/v1/commercial/settings` | `commercial:settings:manage` | Actualiza parámetros tributarios y topes de reinversión |
| `POST` | `/api/v1/commercial/settings/tariff-periods` | `commercial:settings:manage` | Registra un nuevo tramo de vigencia tarifaria |
| `PATCH` | `/api/v1/commercial/settings/tariff-periods/:id` | `commercial:settings:manage` | Actualiza un tramo existente (fechas, SMMLV, jornada) |
| `DELETE` | `/api/v1/commercial/settings/tariff-periods/:id` | `commercial:settings:manage` | Elimina o desactiva un tramo tarifario |
| `POST` | `/api/v1/commercial/settings/simulate-rate` | `commercial:settings:read` | Ejecuta la simulación matemática de un servicio al vuelo |
| `POST` | `/api/v1/commercial/settings/simulate-salary` | `commercial:settings:read` | Simula la nómina del guarda, recargos y los 8 valores de hora SVSP |
| `GET` | `/api/v1/commercial/settings/service-catalog` | `commercial:settings:read` | Lista los servicios configurados en el catálogo |
| `POST` | `/api/v1/commercial/settings/service-catalog` | `commercial:settings:manage` | Agrega un nuevo servicio al catálogo |
| `PATCH` | `/api/v1/commercial/settings/service-catalog/:id` | `commercial:settings:manage` | Modifica un servicio existente |
| `DELETE` | `/api/v1/commercial/settings/service-catalog/:id` | `commercial:settings:manage` | Desactiva un servicio del catálogo |
| `GET` | `/api/v1/commercial/settings/salary-matrix` | `commercial:settings:read` | Lista la matriz salarial por cargo y programación |
| `PUT` | `/api/v1/commercial/settings/salary-matrix` | `commercial:settings:manage` | Actualización masiva (batch upsert) de salarios por cargo |
| `GET` | `/api/v1/commercial/settings/value-added` | `commercial:settings:read` | Lista los valores agregados y dotación de puesto |
| `POST` | `/api/v1/commercial/settings/value-added` | `commercial:settings:manage` | Registra un nuevo bien o servicio en especie |
| `PATCH` | `/api/v1/commercial/settings/value-added/:id` | `commercial:settings:manage` | Modifica descripción, categoría o costo interno |
| `DELETE` | `/api/v1/commercial/settings/value-added/:id` | `commercial:settings:manage` | Desactiva un valor agregado del catálogo |
| `PATCH` | `/api/v1/commercial/settings/document-skin` | `commercial:settings:manage` | Actualiza la piel institucional, colores y resoluciones |
| `PUT` | `/api/v1/commercial/settings/distribution` | `commercial:settings:manage` | Sincroniza la matriz de destinatarios de las 9 áreas |
| `GET` | `/api/v1/commercial/settings/snippets` | `commercial:settings:read` | Lista las plantillas de texto dinámicas |
| `POST` | `/api/v1/commercial/settings/snippets` | `commercial:settings:manage` | Crea una nueva plantilla de texto |
| `PATCH` | `/api/v1/commercial/settings/snippets/:id` | `commercial:settings:manage` | Modifica el cuerpo de la plantilla de texto |
| `DELETE` | `/api/v1/commercial/settings/snippets/:id` | `commercial:settings:manage` | Desactiva una plantilla de texto |

### 5.2 DTOs Principales

```typescript
// src/modules/administrative/commercial-settings/dtos/create-tariff-period.dto.ts
export class CreateTariffPeriodDto {
  @ApiProperty({ example: 2026 })
  @IsInt()
  @Min(2020)
  @Max(2050)
  year: number;

  @ApiProperty({ example: "Tarifa Vigencia Oficial SVSP 2026 (44 Horas)" })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({ example: "2026-01-01" })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: "2026-12-31" })
  @IsDateString()
  endDate: string;

  @ApiProperty({ example: 1750905.00, description: "SMMLV 2026 oficial" })
  @IsNumber()
  @Min(0)
  smmlv: number;

  @ApiProperty({ example: 249095.00, description: "Auxilio de transporte mensual 2026" })
  @IsNumber()
  @Min(0)
  monthlyTransportAux: number;

  @ApiProperty({ example: 8303.17, description: "Auxilio de transporte diario" })
  @IsNumber()
  @Min(0)
  dailyTransportAux: number;

  @ApiPropertyOptional({ example: 44, description: "Jornada legal semanal vigente (Ley 2101)" })
  @IsInt()
  @IsOptional()
  statutoryWeeklyHours?: number;

  @ApiPropertyOptional({ example: 8.8 })
  @IsNumber()
  @IsOptional()
  commercialMultiplier?: number;

  @ApiPropertyOptional({ example: 8.6 })
  @IsNumber()
  @IsOptional()
  strata46Multiplier?: number;

  @ApiPropertyOptional({ example: 7.66376105 })
  @IsNumber()
  @IsOptional()
  strata13Multiplier?: number;
}

// src/modules/administrative/commercial-settings/dtos/simulate-salary.dto.ts
export class SimulateSalaryDto {
  @ApiPropertyOptional({ example: 1750905.00 })
  @IsNumber()
  @IsOptional()
  smmlv?: number;

  @ApiPropertyOptional({ example: 249095.00 })
  @IsNumber()
  @IsOptional()
  transportAllowance?: number;

  @ApiPropertyOptional({ example: 44 })
  @IsInt()
  @IsOptional()
  statutoryWeeklyHours?: number;

  @ApiPropertyOptional({ example: 150000.00 })
  @IsNumber()
  @IsOptional()
  fixedBonusNonSalary?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsNumber()
  @IsOptional()
  vehicleAllowance?: number;

  @ApiPropertyOptional({ example: 20, description: "Horas extras nocturnas del mes" })
  @IsNumber()
  @IsOptional()
  overtimeHoursNight?: number;
}
```

---

## 6. Especificación Frontend (Next.js App Router & MUI Canónico)

### 6.1 Ubicación y Navegación

- **Ruta de la Pantalla**: `src/app/(protected)/commercial/settings/page.tsx`

- **Segundo Riel (`navigationRegistry.ts`)**:
  Se actualiza la dirección `commercial` activando el ítem #5:

  ```typescript
  {
    id: "com-settings",
    title: "Catálogo y Configuración",
    description: "Motor tarifario SVSP, catálogo de servicios, salarios y plantillas",
    status: "ACTIVE",
    path: "/commercial/settings",
    iconName: "TuneOutlined",
    permissions: ["commercial:settings:read", "commercial:settings:manage"],
    features: ["commercial"],
  }
  ```

### 6.2 Layout y Arquitectura Visual (Arquetipo E: Master-Detail Settings)

Siguiendo las reglas de diseño "Deep Violet Tactical Enterprise" (`noxiaTheme.ts`):

- **Desktop (`md+`)**: Contenedor principal dividido en dos columnas:
  - Columna Izquierda (260px): `<Tabs orientation="vertical">` fija con iconos estilizados:
    1. `CalendarMonthOutlined` $\rightarrow$ **Vigencias y Tarifas SVSP**
    2. `ShieldOutlined` $\rightarrow$ **Catálogo de Servicios**
    3. `BadgeOutlined` $\rightarrow$ **Matriz Salarial y Turnos**
    4. `CardGiftcardOutlined` $\rightarrow$ **Valores Agregados y Topes**
    5. `PaletteOutlined` $\rightarrow$ **Plantillas e Identidad Empresarial**
    6. `SendTimeExtensionOutlined` $\rightarrow$ **Distribución a 9 Áreas**
- **Mobile (`xs/sm`)**: Barra lateral colapsable convertida en `<Select>` nativo en cabecera o acordeones `<Accordion>` con micro-animaciones fluidas.

### 6.3 Comportamiento Detallado de los 6 Tabs

1. **Tab 1: Vigencias y Tarifas SVSP**:
   - Listado de tramos del año fiscal con badges `ACTIVE` / `INACTIVE`.
   - Botón `+ Nueva Vigencia` que despliega un `<ResponsiveFormDrawer/>` para registrar SMMLV y horas semanales de ley.
   - **Widget Flotante del Simulador en Tiempo Real**: Permite elegir sector, turno y días para verificar al instante cómo cambia el desglose tarifario sin recargar la página.
2. **Tab 2: Catálogo de Servicios de Vigilancia**:
   - Implementa el componente canónico `<ResponsiveDataView/>`.
   - Vista de tabla densa en escritorio con código interno (`COD`), descripción, horas diurnas/nocturnas, % A&S y acciones rápidas.
   - Tarjetas interactivas virtualizadas (`react-virtuoso`) para pantallas móviles.
3. **Tab 3: Matriz Salarial y Esquemas de Turno (Leyenda Oficial SVSP 2026)**:
   - **Bloque Superior de Referencia Salarial Oficial**:
     - Banner informativo con icono `InfoOutlined` y título: **"REFERENCIA SALARIAL 2026 (SVSP)"**.
     - Fila de parámetros clave: `SMMLV: $ 1.750.905` | `Aux. Transporte: $ 249.095` | `Total Mínimo: $ 2.000.000`.
   - **Matriz de Valor por Hora Trabajada (8 Tarjetas Tácticas)**:
     1. `Ord. Diurna (Base)`: `$ 7.959` (Contorno Ámbar suave)
     2. `Ord. Nocturna`: `$ 10.744` *(Base + Recargo: $ 2.785)* (Contorno Azul)
     3. `Extra Diurna`: `$ 9.948` *(Base + Recargo: $ 1.989)* (Contorno Naranja)
     4. `Extra Nocturna`: `$ 13.927` *(Base + Recargo: $ 5.968)* (Contorno Azul oscuro)
     5. `Dom/Fest Ord. Diur`: `$ 14.325` *(Base + Recargo: $ 6.366)* (Contorno Rojo suave)
     6. `Dom/Fest Ord. Noct`: `$ 17.111` *(Base + Recargo: $ 9.152)* (Contorno Violeta)
     7. `Dom/Fest Extra D.`: `$ 16.315` *(Base + Recargo: $ 8.356)* (Contorno Rojo intenso)
     8. `Dom/Fest Extra N.`: `$ 20.294` *(Base + Recargo: $ 12.335)* (Contorno Violeta oscuro)
   - **Badges de Regla Operativa**:
     - Composición de turno: `[ 8h ord. ] + [ 4h ext. ] = 12h/turno`.
     - Deducciones de ley del empleado: `Salud 4.0%` y `Pensión 4.0%` (calculadas sobre devengado salarial sin auxilio de transporte).
   - **Tabla Editable por Cargo**:
     - Filas clicables para gestionar cargos: Guarda Portero, Supervisor Motorizado, OMT, Recepcionista.
     - Muestra: Total Devengado, Deducción Salud (4%), Deducción Pensión (4%), Bonificación, Rodamiento y **Sueldo Neto Libre a Retirar**.
4. **Tab 4: Valores Agregados y Topes de Reinversión**:
   - Formulario con `<Slider>` y switches para fijar los topes de reinversión permitidos sin autorización de Gerencia (80% a 1 año, 160% a 2 años).
   - Catálogo de bienes en especie (lockers, microondas, apoyos de 12h) con su costo de referencia interno.
5. **Tab 5: Plantillas e Identidad Empresarial de Texto**:
   - Selectores de color corporativo (Primario `#1E1B4B`, Acento `#7C3AED`) con previsualizador de documento en vivo.
   - Carga de Logo y Firmas en S3 mediante presigned URLs (`MediaAttachment`).
   - Editor de plantillas de texto con chips interactivos para insertar variables dinámicas (`{{nombre_cliente}}`, `{{nit}}`, `{{validez_oferta}}`).
6. **Tab 6: Matriz de Distribución (9 Áreas)**:
   - Listado fijo de los 9 departamentos (`CONTRATOS`, `OPERACIONES`, `ALMACÉN`, `CENTRAL`, `RECEPCIÓN`, `RRHH`, `CALIDAD`, `CONTABILIDAD`, `TESORERÍA`).
   - Cada fila cuenta con input de nombre de funcionario, correo electrónico institucional y switch de activación.

---

## 7. Criterios de Aceptación y Matriz de Verificación (Quality Gate)

- [ ] **Esquema de Base de Datos**: Migración en `prisma/schema/migrations` ejecutada limpiamente sin pérdida de datos ni drift (`npx prisma migrate status`).
- [ ] **Aislamiento Multi-Tenant**: Las consultas de un usuario autenticado en `Tenant_A` no retornan parámetros ni servicios pertenecientes a `Tenant_B` (verificado mediante interceptores de `audit-extension.ts`).
- [ ] **Exactitud Matemática de la Referencia Salarial SVSP 2026**:
  - Para `SMMLV = $ 1.750.905` y jornada semanal de `44 horas` (divisor `220 horas`):
    - Valor Base Ordinario Diurno = **`$ 7.959`** ($7.958,66 redondeado).
    - Ord. Nocturna (+35%) = **`$ 10.744`** (Recargo: `$ 2.785`).
    - Extra Diurna (+25%) = **`$ 9.948`** (Recargo: `$ 1.989`).
    - Extra Nocturna (+75%) = **`$ 13.927`** (Recargo: `$ 5.968`).
    - Dom/Fest Ord. Diurno (+80%) = **`$ 14.325`** (Recargo: `$ 6.366`).
    - Dom/Fest Ord. Nocturno (+115%) = **`$ 17.111`** (Recargo: `$ 9.152`).
    - Dom/Fest Extra Diurno (+105%) = **`$ 16.315`** (Recargo: `$ 8.356`).
    - Dom/Fest Extra Nocturno (+155%) = **`$ 20.294`** (Recargo: `$ 12.335`).
  - Los tests unitarios en Jest deben verificar estos 8 valores exactos sin margen de discrepancia.
- [ ] **Exactitud Tarifaria Comercial SVSP 2026**:
  - Servicio 24 horas permanente L-D (30 días), Comercial (8.8 SMMLV), Con Arma (10% A&S):
    - $\text{Tarifa Base 24h} = \$ 1.750.905 \times 8.8 = \$ 15.407.964$
    - $\text{A\&S (10\%)} = \$ 1.540.796$
    - $\text{Subtotal antes de IVA} = \$ 16.948.760$
    - $\text{Base AIU (10\%)} = \$ 1.694.876$
    - $\text{IVA sobre AIU (19\%)} = \$ 322.026,44$
    - $\text{Total con IVA} = \$ 17.270.786$
- [ ] **Turno de 12 Horas Regulado**:
  - Verificación de la regla operativa: `8h ord. + 4h ext. = 12h/turno`.
- [ ] **Deducciones de Nómina del Guarda**:
  - `Salud = 4.0%` y `Pensión = 4.0%` aplicados sobre el devengado salarial (excluyendo auxilio de transporte de $249.095).
- [ ] **Múltiples Vigencias Operativas**:
  - Soporte para 2 tramos tarifarios en el mismo año fiscal (ej. Enero-Junio a 46h y Julio-Diciembre a 44h) sin colisiones de claves ni sobrescrituras.
- [ ] **Resiliencia en Generación de Documentos**:
  - Si el tenant no ha cargado logotipo o firmas, los servicios exportables deben renderizar imágenes de respaldo institucionales (*placeholders*) sin lanzar excepciones ni romper el hilo de ejecución.
- [ ] **Cobertura de Pruebas Unitarias**:
  - Módulo con cobertura de Jest $\ge 80\%$ en servicios y utilidades matemáticas.
- [ ] **Registro de Decisiones**:
  - Entrada formal registrada en `.specs/ai-decisions.log`.
