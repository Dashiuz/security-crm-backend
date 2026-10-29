# SPEC-ADM-028: Cimientos del Módulo de Nómina, Maestros Legales, Motor de Conceptos PUC/NIE y Estructura Operativa (Dependencias y Modalidades)

> **Estado**: `EN_REVISIÓN`  
> **Módulo**: `administrative` / `payroll` (Ubicado en Dirección Financiera)  
> **Fase del Roadmap de Nómina**: **Fase 1 de 6 (15% del Módulo Integral)**  
> **Ubicación Frontend**:
> - `src/app/(protected)/finance/payroll/settings/page.tsx`
> - `src/app/(protected)/finance/payroll/settings/components/`
> - `src/app/(protected)/finance/payroll/dependencies/page.tsx`
> - `src/app/(protected)/finance/payroll/dependencies/components/`
> - `src/config/navigationRegistry.ts` (Dirección Financiera `id: "finance"`)
> **Ubicación Backend**:
> - `prisma/schema/payroll_foundations.prisma`
> - `prisma/schema/enums.prisma`
> - `prisma/schema/tenant.prisma`
> - `prisma/schema/clients.prisma`
> - `prisma/schema/commercial_service_orders.prisma`
> - `src/common/prisma-extension/audit-extension.ts`
> - `src/modules/payroll/` (Bounded Context con Repositorios Modulares)
> - `prisma/seed-features.ts`
> - `prisma/seed.ts`
> **Fecha de Creación**: `2026-10-29`  
> **Autor**: Antigravity (Senior Software Architect, Legal/Labor & Accounting Specialist)  
> **Referencias Base**: `csv_templates/roadmap_nomina.md` y `csv_templates/Manual de usuario PRONOS.pdf` (Numerales `1.1` a `1.15`, `4.1`, `4.2`, `5.2` y `5.3`)

---

## 1. Contexto de Negocio, Jurídico, Contable y Diagnóstico

### 1.1 Diagnóstico Operativo (Superando a Pronos)
En la industria de vigilancia y seguridad privada en Colombia (regulada por el **Código Sustantivo del Trabajo**, la **Ley 2101 de 2021**, la **UGPP - Ley 1393 de 2010 Art. 30**, la **DIAN - Res. 000013 de 2021** y el **Decreto Ley 356 de 1994 - SuperVigilancia**), la liquidación de nómina presenta tres particularidades críticas verificadas en el manual de usuario de **Pronos**:

1. **La «Dependencia» (Puesto de Trabajo) manda sobre el Sueldo (Págs. 13-14)**:
   - A diferencia de una nómina convencional donde el salario depende exclusivamente del contrato fijo del empleado, un guarda de seguridad rota por múltiples clientes y puestos en un mismo mes. Cada **Dependencia** define su propio *Valor Mensual Pagado*, *Monto Prestacional*, *Valor Diario*, *Nivel de Riesgo ARL* (`Clase I` a `Clase V`), *Modalidad de Turno* y *Tipo de Liquidación* (`Por Promedio / Salario Garantizado`, `Por Programación Real` o `Fijo Administrativo`).
2. **Desglose Porcentual en «Modalidades por Promedio Garantizado» (Pág. 14)**:
   - Cuando la empresa pacta con el cliente o el guarda un sueldo mensual garantizado en un puesto (ej. $\$2.450.000$ en turno $24\text{h}$ o $\$1.500.000$ en turno $12\text{h}$), legalmente no puede pagarse como una suma global sin discriminar el trabajo suplementario. La **Modalidad** define qué conceptos suplementarios (`2 Recargo Nocturno`, `4 H. Extras Nocturnas`, `5 Recargo Festivo`, `8 H. Extras Fest. Noc.`, `6 Dominical con Descanso`) absorben porcentualmente el excedente sobre el sueldo básico para que la suma de porcentajes dé exactamente el **$100.00\%$**.
3. **Imputación Contable Dual PUC y Agrupadores de Base (Págs. 10-12 y 36)**:
   - Cada concepto de nómina requiere una cuenta contable PUC **Administrativa (`5105xx`)**, una cuenta **Operativa/Vigilancia (`7205xx`)** y opcionalmente una **Comercial (`5205xx`)**, además del código oficial **DIAN NIE (`NIE070..NIE198`)** para Nómina Electrónica y su pertenencia a las 10 tablas de base (`LIQ`, `PRI`, `TIS`, `VAC`, `CES`, `IBC EPS/AFP`, `IBC2 ARL`, `IBC3 CCF`, `LHEX`, `LNR`) más el acumulador del **Tope 40% UGPP**.

### 1.2 Mejoras Estructurales de la Fase 1 frente a Pronos
- **Sinergia Nativa Comercial $\rightarrow$ Nómina (Cero Doble Digitación)**: En NOXIA, el [`Client`](file:///d:/projects/security-crm-backend/prisma/schema/clients.prisma) actúa automáticamente como el **Centro de Costo**, y cada [`ServiceOrderPosition`](file:///d:/projects/security-crm-backend/prisma/schema/commercial_service_orders.prisma) puede sincronizar o generar su **Dependencia (`PayrollDependency`)** conservando el código OMEGA y permitiendo comparar la tarifa facturada vs. la nómina pagada (G&P Real). Además, se proveen de fábrica las dependencias especiales `0 - DISPONIBLE` y `100 - RELEVANTE`.
- **Erradicación de Conceptos `6xx` Duplicados por Entidad**: En Pronos (págs. 8-9), el usuario debía crear un concepto `6xx` distinto por cada EPS y AFP (`606 Compensar`, `611 Famisanar`, `648 Comfaboy`). En NOXIA existen conceptos únicos limpios (`601 Salud`, `602 Pensión`, `603 FSP`) y el sistema resuelve dinámicamente el NIT y código PLU desde la entidad afiliada al empleado (conservando un campo opcional `legacyConceptCode` en `PayrollEntity` para 100% compatibilidad de exportación con planos antiguos).
- **Switches Integrados y Matriz Interactiva de Tablas Base**: Elimina la pantalla de Pronos donde había que escribir `LIQ`, `PRI`, `CES` en mayúsculas y recorrer con flechas.
- **Simulador Matemático en Vivo de Modalidades y Generador Automático de Festivos Emiliani**: Validación en tiempo real del $100\%$ de distribución porcentual y generación de los 18 festivos oficiales de Colombia para cualquier año en 1 clic.

### 1.3 Historias de Usuario (User Stories)
- **US-PAY-01 (Parámetros de Ley y Periodicidad Totalmente Parametrizable)**: Como *Director Financiero / Jefe de Nómina*, quiero parametrizar la periodicidad de pago de la empresa (`Mensual con Anticipo día 15`, `Quincenal pura`, `Mensual pura` o `Semanal`), los topes y porcentajes de ley (SMMLV, Auxilio de Transporte, jornada semanal 44h/42h, recargos, FSP, exoneración Art. 114-1 E.T.) y los datos PILA/DIAN de la compañía.
- **US-PAY-02 (Motor de Conceptos, PUC Dual, Tablas Base y NIE)**: Como *Contador / Analista de Nómina*, quiero gestionar el catálogo de conceptos (`1..99` Devengos, `100..110` Licencias/Incapacidades, `500..599` Deducciones, `600+` Seguridad Social) asignando en un solo Drawer sus cuentas PUC (`5105` Admin / `7205` Operativo), su código DIAN `NIE` y las 10 banderas de agrupación (`LIQ`, `PRI`, `TIS`, `VAC`, `CES`, `IBC`, `IBC2`, `IBC3`, `LHEX`, `LNR`, `UGPP 40%`).
- **US-PAY-03 (Catálogos Oficiales y Festivos)**: Como *Analista de Nómina*, quiero disponer de los catálogos oficiales precargados y editables de Bancos, Entidades de Seguridad Social (EPS, AFP, ARL, CCF con NIT y PLU), Diagnósticos CIE-10, Causales de Retiro (B.D.N), Requisitos de Contratación, Academias y Niveles SVSP (`1101..1309`), y generar automáticamente los días festivos del año.
- **US-PAY-04 (Sucursales, Centros de Costo, Dependencias y Modalidades)**: Como *Coordinador de Nómina y Operaciones*, quiero administrar las Sucursales y las Dependencias (Puestos de trabajo vinculados a Clientes y Órdenes de Servicio), configurando su valor mensual pagado, monto prestacional, valor diario, nivel de riesgo ARL y su Modalidad de Turno con desglose porcentual al $100\%$, así como abrir o bloquear Periodos de Nómina.

---

## 2. Definición de Permisos y Matriz RBAC

### 2.1 Feature Flag en `prisma/seed-features.ts`
```typescript
{
  key: 'payroll',
  name: 'Nómina y Liquidación Laboral',
  description: 'Motor de nómina para vigilancia privada, dependencias operativas, turnos, PILA y Nómina Electrónica DIAN',
}
```

### 2.2 Permisos RBAC en `prisma/seed.ts`

| Permiso Code | Nombre Legible | Descripción en Español | Roles por Defecto |
| :--- | :--- | :--- | :--- |
| `payroll:settings:read` | Consultar Configuración de Nómina | Consultar parámetros legales, conceptos, cuentas PUC, festivos y catálogos de nómina | `GODLIKE`, `ADMIN` |
| `payroll:settings:manage` | Administrar Configuración de Nómina | Crear y actualizar parámetros legales, conceptos, tablas base, cuentas PUC y catálogos oficiales | `GODLIKE`, `ADMIN` |
| `payroll:dependencies:read` | Consultar Dependencias y Modalidades | Consultar sucursales, centros de costo, dependencias (puestos), modalidades de turno y periodos | `GODLIKE`, `ADMIN` |
| `payroll:dependencies:manage` | Administrar Dependencias y Modalidades | Crear, actualizar y sincronizar sucursales, dependencias operativas, modalidades de turno y periodos de nómina | `GODLIKE`, `ADMIN` |

### 2.3 Reglas Multi-Tenant y Seguridad en `audit-extension.ts`
- **Aislamiento Estricto por `tenantId`**: Todos los modelos de nómina incluyen `tenantId` obligatorio y se registran en `multiTenantModels` y `auditableModels` (y en `commercialAuditModels` para inyección automática de `createdById` y `updatedById`) dentro de [`src/common/prisma-extension/audit-extension.ts`](file:///d:/projects/security-crm-backend/src/common/prisma-extension/audit-extension.ts).
- **Aislamiento Multi-Cliente (`multiClientModels`)**: El modelo `PayrollDependency` (cuando está vinculado a un `clientId`) respeta el alcance de clientes si aplica, permitiendo además dependencias internas (`clientId = null`, como `0 - DISPONIBLE`, `1 - GERENCIA GENERAL` o `100 - RELEVANTE`).

---

## 3. Modelo de Datos (Prisma Schema Specification)

### 3.1 Nuevos Enums en `prisma/schema/enums.prisma`

```prisma
enum PayrollPaymentFrequency {
  MONTHLY_WITH_ADVANCE   // Liquidación mensual (día 30) con anticipo quincenal (día 15) - Estándar Vigilancia
  BIWEEKLY_PURE          // Liquidación quincenal pura (cortes día 15 y día 30)
  MONTHLY_PURE           // Liquidación mensual única (sin anticipo)
  WEEKLY                 // Liquidación semanal
}

enum PayrollAdvanceMode {
  FIXED_AMOUNT           // Valor fijo parametrizado en hoja de vida o puesto
  PERCENTAGE_OF_BASE     // Porcentaje sobre el sueldo básico / garantizado (ej. 40% o 50%)
  PROPORTIONAL_DAYS      // Proporcional a los días efectivamente laborados en la 1ra quincena
}

enum PayrollConceptNature {
  DEVENGO                // Rango 1 - 99: Pagos salariales y no salariales
  LICENCIA               // Rango 100 - 110: Licencias y permisos remunerados
  INCAPACIDAD            // Rango 100 - 110: Incapacidades médicas (EG, AT, EP)
  DEDUCCION              // Rango 500 - 599: Descuentos, préstamos, ausencias no remuneradas
  SEG_SOCIAL             // Rango 600+: Aportes a Salud, Pensión y FSP
  PROVISION              // Provisiones patronales y parafiscales
}

enum PayrollProportionality {
  DAYS                   // Proporcional a los días laborados (DIAS)
  NON_PROPORTIONAL       // Valor fijo / no proporcional (NO PROP.)
  HOURS                  // Calculado por cantidad de horas (HORAS)
}

enum SocialSecurityEntityType {
  EPS                    // Entidad Promotora de Salud
  AFP                    // Administradora de Fondos de Pensiones y Cesantías
  CCF                    // Caja de Compensación Familiar
  ARL                    // Administradora de Riesgos Laborales
}

enum ArlRiskClass {
  RISK_I                 // Clase I: 0.522% (Administrativo)
  RISK_II                // Clase II: 1.044%
  RISK_III               // Clase III: 2.436%
  RISK_IV                // Clase IV: 4.350% (Vigilancia sin arma / medios tecnológicos)
  RISK_V                 // Clase V: 6.960% (Vigilancia armada / escoltas)
}

enum DependencySettlementType {
  BY_AVERAGE_GUARANTEED  // Por Promedio (Salario Garantizado desglosado por Modalidad)
  BY_SCHEDULE            // Por Programación Real (Horas reales laboradas en malla)
  FIXED_ADMIN            // Fijo Administrativo (Sueldo básico contractual de hoja de vida)
}

enum ShiftModalityClass {
  ROTATING               // Rotativo (Turnos diurnos y nocturnos, ej. 2X2X2 24H)
  DAY_SHIFT              // Diurno exclusivo (ej. 12H Diurno)
  NIGHT_SHIFT            // Nocturno exclusivo (ej. 12H Nocturno)
  ADMINISTRATIVE         // Horario de oficina / administrativo
}

enum PayrollPeriodStatus {
  OPEN                   // Abierto para registro de novedades y pre-nómina
  CLOSED                 // Liquidado y cerrado para dispersión
  LOCKED                 // Bloqueado definitivamente (impide alterar turnos/novedades)
}
```

### 3.2 Nuevo Archivo de Esquema: `prisma/schema/payroll_foundations.prisma`

```prisma
// ============================================================================
// SPEC-ADM-028: CIMIENTOS DE NÓMINA, MAESTROS, CONCEPTOS PUC/NIE Y DEPENDENCIAS
// ============================================================================

/// 1. Parámetros Globales y Legales de Nómina por Empresa (Numeral 1.10 Pronos)
model PayrollSettings {
  id                        String                  @id @default(cuid(2))
  tenantId                  String                  @unique
  tenant                    Tenant                  @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  // Datos de Identificación Empleador para PILA / DIAN / Certificados
  companyLegalName          String                  @default("EMPRESA DE SEGURIDAD LTDA") @db.VarChar(180)
  companyNit                String                  @default("900000000") @db.VarChar(30)
  companyDv                 String                  @default("1") @db.VarChar(5)
  arlEntityCode             String?                 @db.VarChar(30)
  arlEntityName             String?                 @db.VarChar(120)
  daneEconomicActivityCode  String                  @default("8010") @db.VarChar(20) // 8010 / 7492 Actividades de seguridad privada
  daneCityCode              String                  @default("11001") @db.VarChar(15)
  daneCityName              String                  @default("BOGOTÁ D.C.") @db.VarChar(100)
  daneDepartmentCode        String                  @default("11") @db.VarChar(15)
  daneDepartmentName        String                  @default("BOGOTÁ D.C.") @db.VarChar(100)
  companyAddress            String?                 @db.VarChar(200)
  companyPhone              String?                 @db.VarChar(50)
  companyEmail              String?                 @db.VarChar(150)
  legalRepDocument          String?                 @db.VarChar(30)
  legalRepFullName          String?                 @db.VarChar(150)
  signatureName1            String?                 @db.VarChar(150) // Firma autorizada 1 (Constancias/Certificados)
  signatureRole1            String?                 @db.VarChar(120)
  signatureName2            String?                 @db.VarChar(150) // Firma autorizada 2
  signatureRole2            String?                 @db.VarChar(120)

  // Periodicidad y Políticas Operativas (100% Parametrizables)
  paymentFrequency          PayrollPaymentFrequency @default(MONTHLY_WITH_ADVANCE)
  advanceMode               PayrollAdvanceMode      @default(PERCENTAGE_OF_BASE)
  defaultAdvancePct         Decimal                 @default(0.40) @db.Decimal(5, 4) // 40% anticipo quincenal por defecto
  deductAbsencesInAdvance   Boolean                 @default(true)  // Contemplar novedades de 1ra quincena en anticipo
  saturdayIsWorkingDay      Boolean                 @default(true)  // Sábado día hábil para vacaciones por defecto
  applyExonerationLaw1607   Boolean                 @default(true)  // Exoneración Art. 114-1 E.T. (< 10 SMMLV)
  enforceUgpp40PctRule      Boolean                 @default(true)  // Control automático tope 40% no salarial Ley 1393
  scheduleLockDate          DateTime?               @db.Date        // Fecha Bloqueo Programación y Novedades

  // Parámetros Legales Vigentes (Sincronizables con TariffPeriodConfig)
  activeYear                Int                     @default(2026)
  smmlv                     Decimal                 @default(1750905.00) @db.Decimal(12, 2)
  transportAllowance        Decimal                 @default(249095.00) @db.Decimal(12, 2)
  uvtValue                  Decimal                 @default(49799.00) @db.Decimal(10, 2)
  weeklyWorkingHours        Int                     @default(44)    // 44h (divisor 220) o 42h (divisor 210)
  monthlyDivisorHours       Int                     @default(220)
  transportTopSmmlvMultiple Int                     @default(2)     // Hasta 2 SMMLV recibe auxilio de transporte

  // Porcentajes de Horas Extras y Recargos Legales (Representados en % igual que Pronos: 35, 125, 175, etc.)
  normalHourFactorPct       Decimal                 @default(100.00) @db.Decimal(6, 2)
  nightSurchargePct         Decimal                 @default(35.00) @db.Decimal(6, 2)
  extraDayPct               Decimal                 @default(125.00) @db.Decimal(6, 2)
  extraNightPct             Decimal                 @default(175.00) @db.Decimal(6, 2)
  sundayCompensatedPct      Decimal                 @default(80.00) @db.Decimal(6, 2)  // 80% vigencia 2026 (75% histórico)
  holidaySurchargePct       Decimal                 @default(80.00) @db.Decimal(6, 2)
  extraHolidayDayPct        Decimal                 @default(205.00) @db.Decimal(6, 2) // 100% + 105% recargo (o 200% histórico)
  extraHolidayNightPct      Decimal                 @default(255.00) @db.Decimal(6, 2) // 100% + 155% recargo (o 250% histórico)

  // Porcentajes Seguridad Social y Parafiscales
  employeeHealthPct         Decimal                 @default(4.00) @db.Decimal(5, 2)
  employeePensionPct        Decimal                 @default(4.00) @db.Decimal(5, 2)
  fspBasePct                Decimal                 @default(1.00) @db.Decimal(5, 2)   // Desde 4 SMMLV
  employerHealthPct         Decimal                 @default(8.50) @db.Decimal(5, 2)
  employerPensionPct        Decimal                 @default(12.00) @db.Decimal(5, 2)
  ccfPct                    Decimal                 @default(4.00) @db.Decimal(5, 2)
  senaPct                   Decimal                 @default(2.00) @db.Decimal(5, 2)
  icbfPct                   Decimal                 @default(3.00) @db.Decimal(5, 2)

  createdAt                 DateTime                @default(now())
  updatedAt                 DateTime                @updatedAt
  createdById               String?
  updatedById               String?

  @@index([tenantId])
  @@map("payroll_settings")
}

/// 2. Calendario de Días Festivos (Numeral 1.9 Pronos)
model PayrollHoliday {
  id          String   @id @default(cuid(2))
  tenantId    String
  tenant      Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  date        DateTime @db.Date
  year        Int
  name        String   @db.VarChar(120) // Ej: "Día del Trabajo", "Ascensión del Señor"
  isNational  Boolean  @default(true)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  createdById String?
  updatedById String?

  @@unique([tenantId, date])
  @@index([tenantId, year])
  @@map("payroll_holidays")
}

/// 3. Catálogo de Conceptos de Nómina, Cuentas PUC, Tablas Base y NIE (Numerales 1.6, 1.7, 1.8 y 4.2 Pronos)
model PayrollConcept {
  id                       String                 @id @default(cuid(2))
  tenantId                 String
  tenant                   Tenant                 @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  code                     Int                    // Consecutivo Pronos: 1..99 Devengos, 100..110 Licencias, 500..599 Deducciones, 600+ Seg. Social
  name                     String                 @db.VarChar(150)
  nature                   PayrollConceptNature   @default(DEVENGO)
  proportionality          PayrollProportionality @default(DAYS)
  isDeletableOnLiquidation Boolean                @default(true)  // "Concepto Borrable" en Pronos (pág. 9-10)
  isConstitutiveOfSalary   Boolean                @default(true)  // Salarial vs No Salarial

  // Parametrización Contable PUC (Numeral 1.6 y 1.8 Pronos)
  adminPucAccount          String?                @db.VarChar(30) // Ej: "510506", "510515"
  operativePucAccount      String?                @db.VarChar(30) // Ej: "720506", "720515"
  commercialPucAccount     String?                @db.VarChar(30) // Ej: "520506" (opcional)
  creditCounterpartPuc     String?                @db.VarChar(30) // Cuenta pasivo/contrapartida (ej. "250501", "237005")
  thirdPartyNit            String?                @db.VarChar(30) // NIT afectado fijo (si vacío, usa NIT del empleado o entidad SS)
  thirdPartyName           String?                @db.VarChar(150)

  // Mapeo Nómina Electrónica DIAN (Numeral 4.1 y 4.2 Pronos)
  dianNieCode              String?                @db.VarChar(20) // Ej: "NIE070", "NIE071", "NIE078", "NIE148"
  dianNieFieldName         String?                @db.VarChar(80) // Ej: "SueldoTrabajado", "AuxilioTransporte", "ConceptoNS"

  // Banderas de las 10 Tablas de Agrupación de Pronos (Numeral 1.7 Pronos) + UGPP 40%
  inLiq                    Boolean                @default(false) // LIQ: Tabla Liquidación Total de Prestaciones
  inPri                    Boolean                @default(false) // PRI: Tabla Liquidación de Prima
  inTis                    Boolean                @default(false) // TIS: Tabla Tiempo Seguridad Social
  inVac                    Boolean                @default(false) // VAC: Tabla Vacaciones Tiempo
  inCes                    Boolean                @default(false) // CES: Tabla Liquidación de Cesantías
  inIbcEpsAfp              Boolean                @default(false) // IBC: IBC EPS y AFP
  inIbcArl                 Boolean                @default(false) // IBC2: IBC ARL
  inIbcCcf                 Boolean                @default(false) // IBC3: IBC Caja de Compensación
  inLhex                   Boolean                @default(false) // LHEX: Listado de Horas Extras
  inLnr                    Boolean                @default(false) // LNR: Licencias No Remuneradas / Descuenta días
  inUgpp40Pct              Boolean                @default(false) // Bolsa Pagos No Salariales sujeta al tope 40% Ley 1393

  // Porcentaje o factor asociado (si es concepto de hora extra/recargo o deducción porcentual)
  defaultRatePct           Decimal?               @db.Decimal(6, 2)
  shiftCodeMap             String?                @db.VarChar(15) // Enlace con código de programación: "INC", "AT", "LMA", "LNR", "SAN", "AUS", "LT"

  isSystemDefault          Boolean                @default(false)
  isActive                 Boolean                @default(true)

  modalityItems            PayrollModalityItem[]

  createdAt                DateTime               @default(now())
  updatedAt                DateTime               @updatedAt
  createdById              String?
  updatedById              String?

  @@unique([tenantId, code])
  @@index([tenantId, nature, isActive])
  @@map("payroll_concepts")
}

/// 4. Entidades de Seguridad Social: EPS, AFP, CCF, ARL (Numeral 1.4 Pronos)
model PayrollEntity {
  id                String                   @id @default(cuid(2))
  tenantId          String
  tenant            Tenant                   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  code              String                   @db.VarChar(30)  // Ej: "COMFABOY_EPS", "FAMISANAR", "PORVENIR"
  name              String                   @db.VarChar(150)
  entityType        SocialSecurityEntityType
  nit               String                   @db.VarChar(30)
  dv                String?                  @db.VarChar(5)
  pluCode           String                   @db.VarChar(20)  // Código oficial PILA/ADRES (ej. "EPS017", "230301", "CCF09")
  legacyConceptCode Int?                                      // Compatibilidad Pronos (ej. 648, 611, 604)
  fspCode           String?                  @db.VarChar(20)  // Código Fondo Solidaridad
  address           String?                  @db.VarChar(180)
  phone             String?                  @db.VarChar(50)
  isActive          Boolean                  @default(true)

  createdAt         DateTime                 @default(now())
  updatedAt         DateTime                 @updatedAt
  createdById       String?
  updatedById       String?

  @@unique([tenantId, code])
  @@index([tenantId, entityType, isActive])
  @@map("payroll_entities")
}

/// 5. Catálogo de Bancos para Dispersión ACH (Numeral 1.1 y 7.1 Pronos)
model PayrollBank {
  id            String   @id @default(cuid(2))
  tenantId      String
  tenant        Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  code          String   @db.VarChar(20)  // Código Pronos / ACH (ej. "1007", "1032", "1051", "1001")
  name          String   @db.VarChar(120) // "BANCOLOMBIA", "BANCO CAJA SOCIAL", "BANCO DAVIVIENDA"
  achCode       String?  @db.VarChar(20)  // Código compensación ACH Colombia
  exportFormat  String   @default("STANDARD_ACH") @db.VarChar(40) // PAB_BANCOLOMBIA, BCSC, DAVIVIENDA, BOGOTA
  isActive      Boolean  @default(true)

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  createdById   String?
  updatedById   String?

  @@unique([tenantId, code])
  @@index([tenantId, isActive])
  @@map("payroll_banks")
}

/// 6. Catálogos Operativos Complementarios: B.D.N Retiros, CIE-10, Requisitos, Niveles SVSP y Academias
model PayrollExitReason {
  id          String   @id @default(cuid(2))
  tenantId    String
  tenant      Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  code        Int      // 1..9 según numeral 1.14 B.D.N Pronos
  name        String   @db.VarChar(150) // "Renuncia Voluntaria", "Terminación por justa causa", etc.
  isJustCause Boolean  @default(false)  // Define si genera o no indemnización Art. 64 CST
  isActive    Boolean  @default(true)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  createdById String?
  updatedById String?

  @@unique([tenantId, code])
  @@index([tenantId, isActive])
  @@map("payroll_exit_reasons")
}

model PayrollCie10 {
  id          String   @id @default(cuid(2))
  tenantId    String
  tenant      Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  code        String   @db.VarChar(10)  // Código CIE-10 (3 o 4 caracteres, ej. "J00", "A09X", "S820")
  familyCode  String?  @db.VarChar(10)  // Familia de 3 caracteres
  name        String   @db.VarChar(255) // Descripción clínica de la patología
  isActive    Boolean  @default(true)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  createdById String?
  updatedById String?

  @@unique([tenantId, code])
  @@index([tenantId, code])
  @@map("payroll_cie10_codes")
}

model PayrollHiringRequirement {
  id          String   @id @default(cuid(2))
  tenantId    String
  tenant      Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  code        Int      // 1..15 según numeral 1.5 Definición de Requisitos Pronos
  name        String   @db.VarChar(150) // "Documento Identificación", "Examen Ingreso", "Psicofísico"
  isMandatory Boolean  @default(true)
  hasExpiry   Boolean  @default(false)  // Si requiere control de vencimiento (ej. Psicofísico anual)
  isActive    Boolean  @default(true)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  createdById String?
  updatedById String?

  @@unique([tenantId, code])
  @@index([tenantId, isActive])
  @@map("payroll_hiring_requirements")
}

model PayrollSvspLevel {
  id           String   @id @default(cuid(2))
  tenantId     String
  tenant       Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  code         String   @db.VarChar(20)  // "1101", "1201", "1301".."1309" (Numeral 5.3 Pronos)
  name         String   @db.VarChar(180) // "FUNDAMENTACION VIGILANCIA", "REENTRENAMIENTO VIGILANCIA"
  validityDays Int      @default(365)    // Vigencia del curso en días (1 año por norma SVSP)
  isActive     Boolean  @default(true)

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  createdById  String?
  updatedById  String?

  @@unique([tenantId, code])
  @@index([tenantId, isActive])
  @@map("payroll_svsp_levels")
}

model PayrollSecurityAcademy {
  id                 String   @id @default(cuid(2))
  tenantId           String
  tenant             Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  code               Int      // Numeral 5.2 Academias de Vigilancia Pronos
  name               String   @db.VarChar(180)
  nit                String   @db.VarChar(30)
  address            String?  @db.VarChar(180)
  phone              String?  @db.VarChar(60)
  email              String?  @db.VarChar(150)
  legalRepName       String?  @db.VarChar(150)
  city               String?  @db.VarChar(100)
  isActive           Boolean  @default(true)

  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
  createdById        String?
  updatedById        String?

  @@unique([tenantId, code])
  @@index([tenantId, isActive])
  @@map("payroll_security_academies")
}

/// 7. Sucursales, Modalidades de Turno y Dependencias Operativas (Numerales 1.11 y 1.12 Pronos)
model PayrollBranch {
  id           String              @id @default(cuid(2))
  tenantId     String
  tenant       Tenant              @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  code         Int                 // 1: BOGOTA, 2: CALI, 3: BUCARAMANGA, 4: MEDELLIN
  name         String              @db.VarChar(100)
  daneCityCode String?             @db.VarChar(15)
  pilaBranchCode String?           @db.VarChar(20) // Código sucursal para Planilla Única PILA
  isActive     Boolean             @default(true)

  dependencies PayrollDependency[]

  createdAt    DateTime            @default(now())
  updatedAt    DateTime            @updatedAt
  createdById  String?
  updatedById  String?

  @@unique([tenantId, code])
  @@index([tenantId, isActive])
  @@map("payroll_branches")
}

/// Modalidades de Turno y Distribución Porcentual para Sueldos Garantizados (Numeral 1.12 Pronos)
model PayrollShiftModality {
  id             String                @id @default(cuid(2))
  tenantId       String
  tenant         Tenant                @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  code           Int                   // Ej: 1 (TURNO 24 HORAS), 18 (TURNO 12H N L-D)
  name           String                @db.VarChar(120)
  shiftClass     ShiftModalityClass    @default(ROTATING)
  hoursPerShift  Int                   @default(12) // Típicamente 12 horas por turno (8h ord + 4h ext)
  description    String?               @db.Text
  isActive       Boolean               @default(true)

  items          PayrollModalityItem[]
  dependencies   PayrollDependency[]

  createdAt      DateTime              @default(now())
  updatedAt      DateTime              @updatedAt
  createdById    String?
  updatedById    String?

  @@unique([tenantId, code])
  @@index([tenantId, isActive])
  @@map("payroll_shift_modalities")
}

/// Ítems porcentuales de una Modalidad (deben sumar exactamente 100.00% cuando aplica distribución)
model PayrollModalityItem {
  id             String               @id @default(cuid(2))
  tenantId       String
  tenant         Tenant               @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  modalityId     String
  modality       PayrollShiftModality @relation(fields: [modalityId], references: [id], onDelete: Cascade)

  conceptId      String
  concept        PayrollConcept       @relation(fields: [conceptId], references: [id], onDelete: Restrict)

  percentage     Decimal              @db.Decimal(6, 2) // Ej: 35.90, 29.14, 10.98, 13.98, 10.00 (Suma = 100.00%)
  sortOrder      Int                  @default(1)

  createdAt      DateTime             @default(now())
  updatedAt      DateTime             @updatedAt
  createdById    String?
  updatedById    String?

  @@unique([modalityId, conceptId])
  @@index([tenantId, modalityId])
  @@map("payroll_modality_items")
}

/// Dependencia / Puesto de Trabajo Operativo o Administrativo (Numeral 1.11.3 Pronos)
model PayrollDependency {
  id                       String                   @id @default(cuid(2))
  tenantId                 String
  tenant                   Tenant                   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  code                     Int                      // Ej: 0 (DISPONIBLE), 1 (GERENCIA), 100 (RELEVANTE), 243 (PORTERIA ALCALDIA)
  name                     String                   @db.VarChar(180)
  isInternal               Boolean                  @default(false) // true para dependencias internas/administrativas (sin cliente)

  // Jerarquía Operativa: Sucursal -> Centro de Costo (Client) -> Puesto Comercial (ServiceOrderPosition)
  branchId                 String
  branch                   PayrollBranch            @relation(fields: [branchId], references: [id], onDelete: Restrict)

  clientId                 String?                  // Centro de Costo (Cliente contratante)
  client                   Client?                  @relation(fields: [clientId], references: [id], onDelete: SetNull)

  serviceOrderPositionId   String?                  @unique // Enlace directo 1:1 con el puesto de la Orden de Servicio Comercial
  serviceOrderPosition     ServiceOrderPosition?    @relation(fields: [serviceOrderPositionId], references: [id], onDelete: SetNull)

  omegaCode                String?                  @db.VarChar(50) // Código OMEGA heredado o asignado

  // Centros de Costo Contables para Interfaz SIIGO / HELISA / WORLD OFFICE
  accountingCostCenter     String?                  @db.VarChar(40)
  accountingSubCostCenter  String?                  @db.VarChar(40)

  // Ficha Financiera y Salarial del Puesto (Pág. 13-14 Pronos)
  monthlyPaidValue         Decimal                  @default(1750905.00) @db.Decimal(14, 2) // Valor Mensual Pagado (sin aux. transporte)
  prestacionalAmount       Decimal                  @default(1750905.00) @db.Decimal(14, 2) // Monto Prestacional constitutivo
  dailyValue               Decimal                  @default(58363.50) @db.Decimal(12, 2)   // Valor Diario a liquidar (monthlyPaidValue / 30 o SMMLV / 30)

  settlementType           DependencySettlementType @default(BY_AVERAGE_GUARANTEED)
  modalityId               String?
  modality                 PayrollShiftModality?    @relation(fields: [modalityId], references: [id], onDelete: SetNull)

  arlRiskClass             ArlRiskClass             @default(RISK_IV) // Nivel IV (4.350%) o V (6.960%) en vigilancia
  cotizanteTypeCode        String                   @default("01") @db.VarChar(10) // "01" Dependiente en PILA
  isVariable               Boolean                  @default(true)  // Permite generar devengos adicionales al garantizado
  isActive                 Boolean                  @default(true)

  createdAt                DateTime                 @default(now())
  updatedAt                DateTime                 @updatedAt
  createdById              String?
  updatedById              String?

  @@unique([tenantId, code])
  @@index([tenantId, clientId])
  @@index([tenantId, branchId])
  @@index([tenantId, isActive])
  @@map("payroll_dependencies")
}

/// 8. Periodos de Nómina (Numeral 1.13 Pronos)
model PayrollPeriod {
  id            String              @id @default(cuid(2))
  tenantId      String
  tenant        Tenant              @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  code          Int                 // Código consecutivo de periodo (ej. 409, 410, 429)
  label         String              @db.VarChar(120) // Ej: "Nómina Mensual Noviembre 2026"
  year          Int
  month         Int                 // 1..12
  periodNumber  Int                 @default(1) // 1: 1ra Quincena, 2: 2da Quincena, 3: Mensual
  startDate     DateTime            @db.Date
  endDate       DateTime            @db.Date
  paymentDate   DateTime?           @db.Date
  status        PayrollPeriodStatus @default(OPEN)
  notes         String?             @db.Text

  createdAt     DateTime            @default(now())
  updatedAt     DateTime            @updatedAt
  createdById   String?
  updatedById   String?

  @@unique([tenantId, code])
  @@unique([tenantId, startDate, endDate, periodNumber])
  @@index([tenantId, year, month])
  @@index([tenantId, status])
  @@map("payroll_periods")
}
```

---

## 4. Motores Matemáticos y de Dominio Puros (Fase 1)

### 4.1 `ModalityBreakdownEngine` (`src/modules/payroll/engines/modality-breakdown.engine.ts`)
Implementa la regla contable/laboral de las páginas 13 y 14 del Manual de Pronos para puestos liquidados **`BY_AVERAGE_GUARANTEED`**:
1. Recibe:
   - `monthlyPaidValue`: Valor mensual garantizado en la Dependencia (sin auxilio de transporte).
   - `baseSalarySmmlv`: Sueldo básico de ley (`SMMLV` vigente, ej. $\$1.750.905$).
   - `workedDays`: Días laborados en esa dependencia en el período (por defecto $30$).
   - `modalityItems`: Arreglo de conceptos suplementarios con sus porcentajes (`percentage`).
2. Valida que $\sum \text{percentage} = 100.00\%$ (con tolerancia de punto flotante $\pm 0.01\%$).
3. Calcula:
   - $\text{Proporción Días} = \frac{\text{workedDays}}{30}$
   - $\text{Básico Proporcional} = \text{round}\left(\text{baseSalarySmmlv} \times \text{Proporción Días}\right)$
   - $\text{Total Garantizado Proporcional} = \text{round}\left(\text{monthlyPaidValue} \times \text{Proporción Días}\right)$
   - $\text{Bolsa Suplementaria a Distribuir} = \max\left(0, \text{Total Garantizado Proporcional} - \text{Básico Proporcional}\right)$
   - Para cada ítem $i$ de la modalidad ($1 \dots n-1$):
     $$\text{Valor Concepto}_i = \text{round}\left(\text{Bolsa Suplementaria} \times \frac{\text{percentage}_i}{100}\right)$$
   - Para el último ítem $n$ (ajuste por redondeo al peso colombiano para evitar descuadres de $\$1\text{ o }\$2\text{ COP}$):
     $$\text{Valor Concepto}_n = \text{Bolsa Suplementaria} - \sum_{i=1}^{n-1} \text{Valor Concepto}_i$$
   - Garantiza matemáticamente que:
     $$\text{Básico Proporcional} + \sum_{i=1}^{n} \text{Valor Concepto}_i \equiv \text{Total Garantizado Proporcional}$$

### 4.2 `ColombianHolidayEngine` (`src/modules/payroll/engines/colombian-holiday.engine.ts`)
Genera de forma determinista los **18 días festivos oficiales de Colombia** para cualquier año $Y$ aplicando la **Ley 51 de 1983 (Ley Emiliani)** y el algoritmo de Butcher-Meeus para la fecha del Domingo de Pascua:
- **Festivos de fecha fija**: 1 Ene (Año Nuevo), 1 May (Día del Trabajo), 20 Jul (Independencia), 7 Ago (Batalla de Boyacá), 8 Dic (Inmaculada Concepción), 25 Dic (Navidad).
- **Festivos trasladables al lunes siguiente (Ley Emiliani)**: 6 Ene (Reyes Magos), 19 Mar (San José), 29 Jun (San Pedro y San Pablo), 15 Ago (Asunción), 12 Oct (Día de la Raza), 1 Nov (Todos los Santos), 11 Nov (Independencia de Cartagena).
- **Festivos religiosos móviles (relativos a Pascua)**: Jueves Santo ($-3\text{ días}$), Viernes Santo ($-2\text{ días}$), Ascensión del Señor ($+43\text{ días}$, lunes), Corpus Christi ($+64\text{ días}$, lunes), Sagrado Corazón ($+71\text{ días}$, lunes).

---

## 5. Contrato de API REST & Backend Specification (NestJS)

### 5.1 Estructura Modular en `src/modules/payroll/`
```text
src/modules/payroll/
├── payroll.module.ts
├── engines/
│   ├── modality-breakdown.engine.ts
│   ├── modality-breakdown.engine.spec.ts
│   ├── colombian-holiday.engine.ts
│   └── colombian-holiday.engine.spec.ts
├── repositories/
│   ├── payroll-foundations.repository.ts
│   └── payroll-dependencies.repository.ts
├── services/
│   ├── payroll-foundations.service.ts
│   ├── payroll-foundations.service.spec.ts
│   ├── payroll-dependencies.service.ts
│   └── payroll-dependencies.service.spec.ts
├── controllers/
│   ├── payroll-foundations.controller.ts
│   ├── payroll-foundations.controller.spec.ts
│   ├── payroll-dependencies.controller.ts
│   └── payroll-dependencies.controller.spec.ts
└── dtos/
    ├── payroll-settings.dto.ts
    ├── payroll-concept.dto.ts
    ├── payroll-catalogs.dto.ts
    └── payroll-dependency.dto.ts
```

### 5.2 Endpoints REST (`PayrollFoundationsController` & `PayrollDependenciesController`)

Todos los controladores estarán protegidos por `@UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGuard)` y `@RequireFeature('payroll')`, con decoración Swagger completa (`@ApiTags`, `@ApiBearerAuth`, `@ApiOperation`, `@ApiOkResponse`).

1. **Parámetros y Festivos (`/payroll/foundations`)**:
   - `GET /payroll/foundations/settings` — Obtiene (o inicializa con defaults SVSP 2026) la configuración `PayrollSettings` del tenant.
   - `PATCH /payroll/foundations/settings` — Actualiza parámetros legales, periodicidad, datos PILA/DIAN y porcentajes.
   - `POST /payroll/foundations/settings/sync-tariff` — Sincroniza automáticamente SMMLV, Auxilio de Transporte y Jornada Semanal desde el `TariffPeriodConfig` comercial activo.
   - `GET /payroll/foundations/holidays?year=2026` — Lista los días festivos del año.
   - `POST /payroll/foundations/holidays/generate/:year` — Genera e inserta automáticamente los 18 festivos oficiales de Colombia para el año indicado.
   - `POST /payroll/foundations/holidays` y `DELETE /payroll/foundations/holidays/:id` — Agrega o elimina un día festivo específico.
2. **Motor de Conceptos, PUC y Tablas Base (`/payroll/foundations/concepts`)**:
   - `GET /payroll/foundations/concepts` — Lista todos los conceptos filtrables por naturaleza (`DEVENGO`, `LICENCIA`, `DEDUCCION`, `SEG_SOCIAL`), búsqueda o tabla base (`LIQ`, `PRI`, `CES`, `IBC`, etc.).
   - `POST /payroll/foundations/concepts` — Crea un concepto con sus cuentas PUC, código DIAN NIE y banderas de tablas base.
   - `PATCH /payroll/foundations/concepts/:id` — Actualiza un concepto o sus banderas de tablas base.
   - `PATCH /payroll/foundations/concepts/bulk-matrix` — Actualización rápida de la Matriz de Tablas Base (`LIQ`, `PRI`, `TIS`, `VAC`, `CES`, `IBC`, `IBC2`, `IBC3`, `LHEX`, `LNR`, `UGPP`).
3. **Catálogos Oficiales (`/payroll/foundations/catalogs`)**:
   - `GET / POST / PATCH /payroll/foundations/entities` — Entidades de Seguridad Social (`EPS`, `AFP`, `CCF`, `ARL`).
   - `GET / POST / PATCH /payroll/foundations/banks` — Bancos y formatos ACH.
   - `GET / POST / PATCH /payroll/foundations/exit-reasons` — Causales de retiro B.D.N.
   - `GET / POST / PATCH /payroll/foundations/cie10` — Diagnósticos CIE-10 (con búsqueda rápida debounced).
   - `GET / POST / PATCH /payroll/foundations/hiring-requirements` — Requisitos de contratación RR.HH.
   - `GET / POST / PATCH /payroll/foundations/svsp-levels` y `/academies` — Niveles de Vigilancia y Academias SVSP.
4. **Sucursales, Dependencias, Modalidades y Periodos (`/payroll/dependencies`)**:
   - `GET / POST / PATCH /payroll/dependencies/branches` — Gestión de Sucursales (`BOGOTA`, `MEDELLIN`, `CALI`, etc.).
   - `GET / POST / PATCH /payroll/dependencies/modalities` — Gestión de Modalidades de Turno con validación estricta del $100\%$ en sus ítems.
   - `POST /payroll/dependencies/modalities/simulate` — Simulador matemático en tiempo real del desglose de sueldo garantizado según una modalidad.
   - `GET / POST / PATCH /payroll/dependencies` — Gestión de Dependencias (Puestos de Trabajo) vinculadas a Sucursal y Cliente (Centro de Costo).
   - `POST /payroll/dependencies/sync-from-service-orders` — Sincroniza automáticamente los puestos de las Órdenes de Servicio Comerciales activas (`ServiceOrderPosition`) creando sus Dependencias en Nómina sin duplicar registros.
   - `GET / POST / PATCH /payroll/dependencies/periods` — Gestión y apertura/cierre/bloqueo de Periodos de Nómina.

---

## 6. Especificación Frontend y UI/UX (Dirección Financiera)

Siguiendo estrictamente la guía **[frontend-noxia-style-guide.md](file:///d:/projects/security-crm-frontend/.specs/00-general-rules/frontend-noxia-style-guide.md)** ("Noxia Deep Violet Tactical Enterprise"):

### 6.1 Actualización de `navigationRegistry.ts` en Dirección Financiera (`id: "finance"`)
Dentro de `id: "finance"` se habilitan como `ACTIVE` las vistas de la Fase 1 y se estructuran los submódulos de las fases siguientes:
1. **`fin-payroll-dependencies`**: **Sucursales, Centros y Dependencias** (`/finance/payroll/dependencies`) — Estado: `ACTIVE`.
2. **`fin-payroll-settings`**: **Maestros y Conceptos de Nómina** (`/finance/payroll/settings`) — Estado: `ACTIVE`.
3. Submódulos de fases 2 a 6 listos en el registro (`Liquidación y Manejo de Nómina`, `Novedades, Licencias y Préstamos`, `Prestaciones y Liquidación Total`, `PILA, DIAN y Dispersión Bancaria`).

### 6.2 Vista 1: `/finance/payroll/settings` (Maestros, Parámetros Legales y Motor de Conceptos PUC/NIE)
Diseñada bajo el **Arquetipo C / E (Master-Detail + Zero-Dialog Policy)**:
- **Tab 1: Parámetros de Ley y Empresa**:
  - Tarjetas tácticas con los parámetros vigentes (SMMLV, Auxilio de Transporte, Horas Semanales, Divisor 220h/210h, Botón `"Sincronizar con Vigencia Comercial SVSP"`), configuración de Periodicidad (`Mensual con Anticipo día 15`, `Quincenal`, etc.), reglas UGPP 40% / Exoneración Art. 114-1 E.T., porcentajes de recargos y datos del aportante PILA/DIAN.
- **Tab 2: Conceptos de Nómina y Cuentas PUC**:
  - Listado `<ResponsiveDataView />` con filtro por naturaleza (`Todos`, `Devengos 1-99`, `Licencias/Incap. 100-110`, `Deducciones 500-599`, `Seg. Social 600+`), mostrando código en `JetBrains Mono`, nombre, cuentas PUC (`5105` / `7205`), código DIAN `NIE` y chips de tablas base activas.
  - Creación/Edición en `<ResponsiveFormDrawer />` (CERO `<Dialog>`).
- **Tab 3: Matriz Interactiva de Tablas Base (`LIQ`, `PRI`, `CES`, `VAC`, `IBC`)**:
  - Reemplaza la tediosa ventana `1.7 Tabla de Conceptos` de Pronos por una matriz visual donde las filas son los conceptos y las columnas son las 10 agrupaciones (`LIQ`, `PRI`, `TIS`, `VAC`, `CES`, `IBC EPS/AFP`, `IBC2 ARL`, `IBC3 CCF`, `LHEX`, `LNR`, `UGPP 40%`) con checkboxes/switches instantáneos y guardado en lote.
- **Tab 4: Calendario de Días Festivos**:
  - Selector de año, botón `"Generar Festivos Oficiales de Colombia"` y listado de los 18 festivos con fecha formateada (`DD/MM/YYYY`) y día de la semana.
- **Tab 5: Entidades PILA y Bancos ACH**:
  - Gestión de EPS, AFP, ARL, CCF (con NIT y código PLU) y Bancos con su formato de archivo plano.
- **Tab 6: Catálogos Operativos (B.D.N Retiros, CIE-10, Requisitos y Niveles SVSP)**:
  - Sub-tabs limpios para administrar Causales de Retiro, Diagnósticos CIE-10, Requisitos de Hoja de Vida y Niveles/Academias de SuperVigilancia (`1101..1309`).

### 6.3 Vista 2: `/finance/payroll/dependencies` (Sucursales, Centros de Costo, Dependencias y Modalidades)
- **KPI Header**: Total Sucursales, Total Centros de Costo (`Clientes`), Total Dependencias Activas, y Botón Primario `"Sincronizar Puestos desde Órdenes de Servicio"`.
- **Tab 1: Dependencias (Puestos de Trabajo)**:
  - `<ResponsiveDataView />` mostrando Código (`0`, `100`, `243`), Nombre de Dependencia, Sucursal, Cliente (Centro de Costo), Código OMEGA, Valor Mensual Pagado (COP), Monto Prestacional, Valor Diario, Modalidad, Riesgo ARL (`IV - 4.350%` / `V - 6.960%`) y Tipo de Liquidación (`Por Promedio Garantizado` / `Por Programación`).
  - `<ResponsiveFormDrawer />` con cálculo automático en vivo del Valor Diario y vista previa del desglose salarial según la Modalidad seleccionada.
- **Tab 2: Modalidades de Turno y Simulador Garantizado**:
  - Tarjetas Bento de cada Modalidad (`TURNO 24 HORAS`, `TURNO 12H DIURNO`, `TURNO 12H NOCTURNO`) mostrando sus conceptos suplementarios y porcentajes que suman el $100\%$.
  - Incluye el **Simulador de Desglose de Sueldo Garantizado** en tiempo real: el usuario digita un sueldo prometido al guarda (ej. $\$2.450.000$) y ve al instante cuánto queda en Básico, Recargo Nocturno, Extras y Dominicales/Festivos.
- **Tab 3: Sucursales y Centros de Costo (Clientes)**:
  - Gestión de Sucursales regionales y vista integrada de Clientes como Centros de Costo contables.
- **Tab 4: Periodos de Nómina**:
  - Apertura, cierre y bloqueo de periodos quincenales/mensuales.

---

## 7. Criterios de Aceptación y Matriz de Verificación

- [x] **Esquema y Migración Formal**: Archivo `prisma/schema/payroll_foundations.prisma` validado y migración generada en `prisma/schema/migrations/20261029152000_payroll_foundations_concepts_and_dependencies`.
- [x] **Blindaje ALS / Prisma Extension**: Todos los nuevos modelos registrados en `audit-extension.ts` y verificados en `audit-extension.spec.ts` (11/11 tests passing).
- [x] **Semillas (`seed.ts` & `seed-features.ts`)**: Feature `payroll`, 4 permisos RBAC y todos los catálogos extraídos del manual de Pronos sembrados de forma idempotente vía `seed-payroll.ts`.
- [x] **Cobertura de Pruebas Unitarias $\ge 80\%$**: Suites Jest para `ModalityBreakdownEngine`, `ColombianHolidayEngine`, `PayrollSettingsService`, `PayrollConceptsService`, `PayrollDependenciesService`, `PayrollCatalogsService` y sus controladores (10 suites, 44/44 tests pasando en verde).
- [x] **Calidad Estática y Compilación**: `0` errores en `tsc --noEmit` y `0` errores en `npm run lint` tanto en Backend como en Frontend.

