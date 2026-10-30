# SPEC-ADM-032: Motor de Prestaciones Sociales (Prima, Cesantías e Intereses), Libro de Vacaciones, Liquidación Definitiva de Contrato y Estabilización de Periodos/Catálogos

> **Estado**: `APROBADO — LISTO PARA IMPLEMENTACIÓN`  
> **Módulo**: `administrative` / `payroll` (Ubicado en Dirección Financiera)  
> **Fase del Roadmap de Nómina**: **Fase 5 de 6 (+15% $\rightarrow$ 85% Acumulado del Módulo Integral)**  
> **Ubicación Frontend**:
> - `src/app/(protected)/finance/payroll/benefits/page.tsx` (Consola de Vacaciones, Prima, Cesantías/Intereses y Liquidación Definitiva)
> - `src/app/(protected)/finance/payroll/settlement/page.tsx` (Cajón lateral `ResponsiveFormDrawer` para Abrir/Generar Periodos y soporte ACH para Prestaciones/Liquidaciones)
> - `src/app/(protected)/finance/payroll/employees/page.tsx` (Ampliación de Pestaña 6 con Libro de Vacaciones y Acta de Liquidación Definitiva PDF)
> - `src/lib/api/payroll-benefits.ts`
> - `src/lib/api/payroll.ts` y `src/lib/api/payroll-settlement.ts`
> - `src/config/navigationRegistry.ts` (Dirección Financiera `id: "finance"`)
> **Ubicación Backend**:
> - `prisma/schema/payroll_benefits_and_liquidation.prisma`
> - `prisma/schema/payroll_settlement.prisma`
> - `prisma/schema/payroll_foundations.prisma`
> - `prisma/schema/enums.prisma`
> - `prisma/schema/employee.prisma`
> - `prisma/schema/tenant.prisma`
> - `prisma/schema/migrations/20261030180000_payroll_social_benefits_vacations_and_final_liquidation/migration.sql`
> - `src/common/prisma-extension/audit-extension.ts`
> - `src/modules/payroll/engines/social-benefits-and-vacations.engine.ts`
> - `src/modules/payroll/engines/contract-termination.engine.ts`
> - `src/modules/payroll/services/payroll-benefits-pdf.service.ts`
> - `src/modules/payroll/services/payroll-benefits.service.ts`
> - `src/modules/payroll/services/payroll-catalogs.service.ts`
> - `src/modules/payroll/controllers/payroll-benefits.controller.ts`
> - `src/modules/payroll/controllers/payroll-catalogs.controller.ts`
> - `src/modules/payroll/controllers/payroll-concepts.controller.ts`
> - `src/modules/payroll/dtos/payroll-benefits.dto.ts`
> - `src/modules/payroll/dtos/payroll-catalog.dto.ts`
> - `prisma/seed.ts` y `prisma/seed-payroll.ts`
> **Fecha de Creación**: `2026-10-30`  
> **Autor**: Antigravity (Senior Software Architect, Legal/Labor & Accounting Specialist)  
> **Referencias Base**: `csv_templates/roadmap_nomina.md` (Fase 5) y `csv_templates/Manual de usuario PRONOS.pdf` (Capítulo 3: Numerales `3.4`, `3.10`, `3.11`, `3.12` y `3.13`)

---

## 1. Contexto de Negocio, Jurídico, Laboral y Diagnóstico

### 1.1 Las 4 Prestaciones y Procesos Críticos en Empresas de Vigilancia y Seguridad Privada
Habiendo completado los cimientos paramétricos (**Fase 1 — `SPEC-ADM-028`**), el expediente laboral 360° y cumplimiento SVSP (**Fase 2 — `SPEC-ADM-029`**), la malla de turnos 24/7, incapacidades CIE-10 y préstamos (**Fase 3 — `SPEC-ADM-030`**) y el motor central de liquidación mensual, anticipos y bancos ACH (**Fase 4 — `SPEC-ADM-031`**), la **Fase 5** construye el **Motor de Prestaciones Sociales, Libro de Vacaciones y Liquidación Definitiva de Contrato ("Liquidación Total")**.

En el sector de vigilancia privada en Colombia, donde los guardas rotan en esquemas `2X2X2` o `4X2` y devengan todos los meses recargos nocturnos, dominicales, festivos y horas extras, la liquidación de prestaciones sociales y retiros exige reglas matemáticas precisas:

1. **Libro de Vacaciones, Calendario Inteligente y Sincronización 3-en-1 (Art. 186–192 CST y Numerales 3.4 / 3.11 Pronos)**:
   - **Causación Legal**: Todo trabajador causa **$15$ días hábiles remunerados** por cada año ($360$ días comerciales) de servicio ($\frac{15}{360} = 0.0416667$ días por día laborado, descontando días de licencias no remuneradas o sanciones `inLnr = true`).
   - **Cálculo de Fecha de Regreso (`returnDate`) y Días Calendario (`calendarDays`)**:
     - Al otorgar $N$ días hábiles de vacaciones a partir de `startDate`, el motor recorre día a día el calendario saltando domingos, días festivos nacionales registrados en `PayrollHoliday` (Ley Emiliani) y sábados cuando `PayrollSettings.saturdayIsWorkingDay === false`.
     - Determina el último día de disfrute (`endDate`), la fecha exacta en que el guarda debe presentarse nuevamente al puesto (`returnDate`) y el total de **días calendario pagados** (`calendarDays`, que incluye los domingos, sábados inhábiles y festivos intermedios).
   - **Base de Vacaciones (Art. 192 CST)**:
     - Sueldo básico vigente + promedio mensual del último año de los conceptos variables con bandera `inVac = true` (recargos nocturnos, dominicales y festivos; excluyendo auxilio de transporte y horas extras salvo parametrización expresa en `inVac`).
   - **Eliminación de la Triple Digitación (Sincronización Automática 3-en-1)**:
     - Al aprobar una liquidación de **Vacaciones Disfrutadas en Tiempo (`ENJOYED_IN_TIME`)**, el sistema ejecuta en una sola transacción:
       1. Registra y aprueba la liquidación en `PayrollVacationSettlement` descontando los días del Libro de Vacaciones del trabajador.
       2. Crea automáticamente la novedad de tiempo en `PayrollLeaveAndAbsence` (`leaveType = VACATION_TIME_VAC`).
       3. Marca automáticamente con código `VAC` los días del rango `[startDate, endDate]` en la Malla de Turnos (`PayrollShiftRecord`).
2. **Prima de Servicios Semestral con Fecha de Corte Proyectada (Art. 306 CST y Numeral 3.12 Pronos)**:
   - **Periodos Semestrales**:
     - Primer Semestre: $1$ de enero al $30$ de junio (máximo $180$ días comerciales).
     - Segundo Semestre: $1$ de julio al $31$ de diciembre (máximo $180$ días comerciales).
   - **Proyección de Promedios (Necesidad Operativa de Junio y Diciembre)**:
     - Dado que la prima se paga a mediados de junio o diciembre antes de cerrar la nómina de ese último mes, el motor permite definir una **Fecha de Corte de Acumulados (`cutoffDate`)** (ej. $31$ de mayo o $30$ de noviembre) y proyectar los días trabajados y el ingreso hasta el final del semestre (`projectionEndDate`: $30$ de junio o $31$ de diciembre).
   - **Base Prima**: Promedio mensual de conceptos con bandera `inPri = true` + Auxilio de Transporte legal vigente (cuando el promedio salarial no supera $2\text{ SMMLV}$):
     $$\text{Valor Prima} = \text{round}\left(\frac{\text{Base Promedio Semestral} \times \text{Días Netos del Semestre}}{360},\ 2\right)$$
   - **Doble Vía de Pago**: Permite tanto **(a) Generar Dispersión Bancaria ACH Independiente** como **(b) Inyectar como Novedad Pagable en el Periodo Abierto de Nómina**.
3. **Cesantías Anuales e Intereses sobre Cesantías 12% (Art. 249 CST, Ley 52 de 1975 y Numeral 3.13 Pronos)**:
   - **Periodo Anual**: $1$ de enero al $31$ de diciembre (máximo $360$ días comerciales, descontando licencias no remuneradas/sanciones `inLnr = true`), con soporte de fecha de corte proyectada.
   - **Base Cesantías**: Promedio mensual del año de conceptos con bandera `inCes = true` + Auxilio de Transporte legal (si el promedio salarial $\le 2\text{ SMMLV}$):
     $$\text{Cesantías} = \text{round}\left(\frac{\text{Base Promedio Anual} \times \text{Días Netos del Año}}{360},\ 2\right)$$
     $$\text{Intereses sobre Cesantías (12\%)} = \text{round}\left(\frac{\text{Cesantías} \times \text{Días Netos del Año} \times 0.12}{360},\ 2\right)$$
   - **Consolidación por Fondo de Cesantías e Inyección de Intereses**:
     - Agrupa los valores de cesantías según el fondo afiliado de cada empleado (`EmployeePayrollProfile.cesantiasEntityId`: *Porvenir*, *Protección*, *Colfondos*, *FNA*) para consignación antes del 14 de febrero, y permite inyectar los Intereses de Cesantías ($12\%$) directamente en la nómina de enero o dispersarlos por ACH.
4. **Liquidación Definitiva de Contrato — "Liquidación Total" (Art. 64, 65 CST y Numeral 3.10 Pronos)**:
   - Cuando un trabajador se retira por renuncia, vencimiento de término fijo o despido:
     - Calcula tiempos en base comercial de $360$ días (`entryDate` a `retirementDate`), descontando días no remunerados (`inLnr`).
     - Liquida proporcionalmente: **Cesantías pendientes del año**, **Intereses sobre cesantías proporcionales**, **Prima proporcional del semestre** y **Vacaciones pendientes en dinero** (total días causados en toda la historia laboral menos los días ya disfrutados/compensados en el Libro de Vacaciones).
     - **Opción de Integrar Último Periodo de Nómina**: Si se activa `includePendingPayroll = true`, incluye los días laborados del mes de retiro, auxilio de transporte, recargos y descuentos de Salud ($4\%$) y Pensión ($4\%$).
     - **Indemnización por Despido sin Justa Causa (Art. 64 CST)**: Si la causal de retiro (`PayrollExitReason.isJustCause === false`) genera indemnización, calcula automáticamente el monto legal según el tipo de contrato:
       - `FIXED_TERM`: Días restantes desde `retirementDate` hasta `contractEndDate` (mínimo $15$ días si aplica).
       - `INDEFINITE`: Para salarios $< 10\text{ SMMLV}$, $30$ días por el primer año y $20$ días adicionales por cada año subsiguiente (proporcional por fracción); para salarios $\ge 10\text{ SMMLV}$, $20$ días por el primer año y $15$ días por cada año subsiguiente.
       - `WORK_OR_LABOR`: Tiempo faltante de la obra o mínimo legal de $15$ días.
     - **Cruce Automático de Cartera (`PayrollLoan`)**: Descuenta el saldo total pendiente (`remainingBalance`) de todos los préstamos activos del trabajador.
     - **Cierre Contractual al Aprobar**: Inactiva y retira al empleado (`isRetired = true`, `isActive = false`, `retiredAt = retirementDate`), actualiza `exitReasonId` y `isBlockedForRehire` (Base de Datos Negativa B.D.N), cierra sus asignaciones de puesto activas, marca sus préstamos descontados como `PAID_OFF` y emite el **Acta de Liquidación Definitiva y Paz y Salvo Laboral en PDF** (anexada también a la Pestaña 6 de su Expediente 360°).

### 1.2 Cierre de Brechas y Estabilización Transversal (Fases 1–4)
1. **Apertura y Generación de Periodos de Nómina (`PayrollPeriod`) sin Modales**:
   - Se incorpora `POST /payroll/catalogs/periods` (para crear un periodo individual) y `POST /payroll/catalogs/periods/generate-year` (para generar en 1 clic los 12 periodos mensuales de un año fiscal).
   - En `/finance/payroll/settlement`, el botón **"+ Abrir Periodo"** despliega exclusivamente un **`ResponsiveFormDrawer`** (cajón lateral deslizante, nunca un modal).
2. **Homologación de Permisos RBAC en Endpoints Transversales de Lectura (`GET`)**:
   - Se amplían los `@RequirePermissions` en los endpoints `GET` de `PayrollCatalogsController` (`entities`, `banks`, `branches`, `exit-reasons`, `periods`, `cie10`) y `PayrollConceptsController` (`GET /payroll/concepts`) para admitir cualquiera de los permisos de lectura del módulo (`payroll:settings:read`, `payroll:employees:read`, `payroll:dependencies:read`, `payroll:novelties:read`, `payroll:shifts:read`, `payroll:settlement:read`, `payroll:benefits:read`).
3. **Snapshot de Banderas Prestacionales en `PayrollSettlementLine`**:
   - Se añaden los campos booleanos `inPri`, `inCes`, `inVac`, `inLiq` en `PayrollSettlementLine`, alimentados automáticamente desde `PayrollConcept` en cada liquidación de nómina para acelerar y blindar el cálculo de promedios históricos.

---

## 2. Arquitectura de Datos y Esquema Prisma (`security-crm-backend`)

### 2.1 Nuevos Enums y Actualizaciones en [`prisma/schema/enums.prisma`](file:///d:/projects/security-crm-backend/prisma/schema/enums.prisma)

Se amplía `PayrollDisbursementType` y `NoveltyOriginType`, y se agregan los enums de la Fase 5:

```prisma
enum NoveltyOriginType {
  MANUAL                      // Digitada manualmente por analista
  CSV_IMPORT                  // Cargada mediante importador masivo
  SHIFT_ENGINE                // Generada automáticamente desde la Malla de Turnos
  LEAVE_ENGINE                // Generada por el liquidador de incapacidades/licencias
  LOAN_ENGINE                 // Cuota generada por el motor de préstamos
  BENEFITS_ENGINE             // Inyectada desde el motor de Prestaciones / Vacaciones (Fase 5)
}

enum PayrollDisbursementType {
  PAYROLL_PERIOD              // Dispersión de Nómina del Periodo
  FORTNIGHT_ADVANCE           // Dispersión de Anticipo Quincenal (Día 15)
  SOCIAL_BENEFITS             // Dispersión de Prima de Servicios o Intereses de Cesantías
  VACATION_SETTLEMENT         // Dispersión de Vacaciones
  FINAL_LIQUIDATION           // Dispersión de Liquidación Definitiva de Contrato
}

// ============================================================================
// SPEC-ADM-032: MOTOR DE PRESTACIONES SOCIALES, VACACIONES Y LIQUIDACIÓN TOTAL
// ============================================================================

enum VacationSettlementType {
  ENJOYED_IN_TIME             // Vacaciones disfrutadas en tiempo (Sincroniza con Turnos y Novedades)
  COMPENSATED_IN_CASH         // Vacaciones compensadas en dinero en vigencia del contrato (Art. 189 CST)
}

enum SocialBenefitType {
  PRIMA_FIRST_SEMESTER        // Prima de Servicios 1er Semestre (Enero - Junio)
  PRIMA_SECOND_SEMESTER       // Prima de Servicios 2do Semestre (Julio - Diciembre)
  SEVERANCE_ANNUAL            // Cesantías Anuales (Enero - Diciembre)
  SEVERANCE_INTERESTS         // Intereses sobre las Cesantías (12% Anual)
}
```

### 2.2 Ampliación de `PayrollSettlementLine` y `PayrollBankDisbursementBatch` en [`prisma/schema/payroll_settlement.prisma`](file:///d:/projects/security-crm-backend/prisma/schema/payroll_settlement.prisma)

En `PayrollSettlementLine` se agregan las 4 banderas de snapshot prestacional:
```prisma
  inPri                  Boolean                 @default(false)
  inCes                  Boolean                 @default(false)
  inVac                  Boolean                 @default(false)
  inLiq                  Boolean                 @default(false)
```

En `PayrollBankDisbursementBatch` se agregan las referencias opcionales para lotes de prestaciones y liquidaciones:
```prisma
  socialBenefitBatchId       String?
  socialBenefitBatch         PayrollSocialBenefitBatch?     @relation(fields: [socialBenefitBatchId], references: [id], onDelete: SetNull)

  finalSettlementId          String?
  finalSettlement            PayrollFinalContractSettlement? @relation(fields: [finalSettlementId], references: [id], onDelete: SetNull)
```

---

### 2.3 Nuevo Archivo de Esquema [`prisma/schema/payroll_benefits_and_liquidation.prisma`](file:///d:/projects/security-crm-backend/prisma/schema/payroll_benefits_and_liquidation.prisma)

Contendrá los **4 modelos** de la Fase 5:

```prisma
// ============================================================================
// SPEC-ADM-032: MOTOR DE PRESTACIONES SOCIALES, VACACIONES Y LIQUIDACIÓN TOTAL
// ============================================================================

/// 1. Liquidación y Libro de Vacaciones por Empleado (Numerales 3.4 y 3.11 Pronos)
model PayrollVacationSettlement {
  id                      String                  @id @default(cuid(2))
  tenantId                String
  tenant                  Tenant                  @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  employeeId              String
  employee                Employee                @relation(fields: [employeeId], references: [id], onDelete: Cascade)

  vacationType            VacationSettlementType  @default(ENJOYED_IN_TIME)
  status                  PayrollSettlementStatus @default(DRAFT)

  // Periodo Causado que se está disfrutando/compensando (ej. 2025-05-01 a 2026-04-30)
  accrualStartDate        DateTime                @db.Date
  accrualEndDate          DateTime                @db.Date

  // Fechas de Salida, Fin y Regreso al Puesto
  enjoymentStartDate      DateTime                @db.Date
  enjoymentEndDate        DateTime                @db.Date
  returnDate              DateTime                @db.Date // Día exacto en que regresa a turno

  // Conteo de Días
  businessDays            Decimal                 @default(15.00) @db.Decimal(6, 2) // Días hábiles descontados del libro (ej. 15)
  nonWorkingDaysIncluded  Int                     @default(3)     // Domingos, festivos y sábados inhábiles intermedios
  calendarDaysPaid        Int                     @default(18)    // Total días calendario pagados (businessDays + nonWorkingDays)
  saturdayWasWorkingDay   Boolean                 @default(true)

  // Bases Financieras (Art. 192 CST)
  currentBasicSalary      Decimal                 @db.Decimal(14, 2)
  averageVariable VacBase Decimal                 @default(0.00) @db.Decimal(14, 2) // Promedio recargos último año (inVac = true)
  totalVacationBase       Decimal                 @db.Decimal(14, 2)
  dailyVacationRate       Decimal                 @db.Decimal(14, 2) // totalVacationBase / 30
  grossVacationAmount     Decimal                 @db.Decimal(14, 2) // dailyVacationRate * calendarDaysPaid
  healthDeductionAmount   Decimal                 @default(0.00) @db.Decimal(14, 2) // 4%
  pensionDeductionAmount  Decimal                 @default(0.00) @db.Decimal(14, 2) // 4%
  loansDeductionAmount    Decimal                 @default(0.00) @db.Decimal(14, 2)
  netPayAmount            Decimal                 @db.Decimal(14, 2)

  // Enlace de Sincronización con Novedades / Turnos e Inyección en Nómina
  linkedLeaveId           String?
  linkedLeave             PayrollLeaveAndAbsence? @relation(fields: [linkedLeaveId], references: [id], onDelete: SetNull)
  injectedNoveltyId       String?
  isInjectedToPayroll     Boolean                 @default(false)
  paymentDate             DateTime?               @db.Date
  notes                   String?                 @db.Text

  createdAt               DateTime                @default(now())
  updatedAt               DateTime                @updatedAt
  createdById             String?
  updatedById             String?

  @@index([tenantId, employeeId])
  @@index([tenantId, status])
  @@map("payroll_vacation_settlements")
}

/// 2. Cabecera de Lote de Liquidación de Prestaciones Sociales: Prima, Cesantías e Intereses (Numerales 3.12 y 3.13 Pronos)
model PayrollSocialBenefitBatch {
  id                  String                         @id @default(cuid(2))
  tenantId            String
  tenant              Tenant                         @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  benefitType         SocialBenefitType
  year                Int
  label               String                         @db.VarChar(150) // Ej: "Prima 1er Semestre 2026", "Cesantías Anuales 2026"
  periodStartDate     DateTime                       @db.Date         // 2026-01-01 o 2026-07-01
  cutoffDate          DateTime                       @db.Date         // Fecha real de corte de acumulados (ej. 2026-05-31 o 2026-11-30)
  projectionEndDate   DateTime                       @db.Date         // Fecha proyectada de cierre (2026-06-30 o 2026-12-31)
  paymentDate         DateTime?                      @db.Date

  status              PayrollSettlementStatus        @default(DRAFT)
  totalEmployees      Int                            @default(0)
  totalBenefitAmount  Decimal                        @default(0.00) @db.Decimal(16, 2)
  totalInterestAmount Decimal                        @default(0.00) @db.Decimal(16, 2) // Para lotes de Cesantías que calculan el 12%
  notes               String?                        @db.Text

  items               PayrollSocialBenefitItem[]
  achBatches          PayrollBankDisbursementBatch[]

  createdAt           DateTime                       @default(now())
  updatedAt           DateTime                       @updatedAt
  createdById         String?
  updatedById         String?

  @@unique([tenantId, benefitType, year])
  @@index([tenantId, year, status])
  @@map("payroll_social_benefit_batches")
}

/// 3. Detalle por Empleado de Liquidación de Prima, Cesantías e Intereses
model PayrollSocialBenefitItem {
  id                       String                    @id @default(cuid(2))
  tenantId                 String
  tenant                   Tenant                    @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  batchId                  String
  batch                    PayrollSocialBenefitBatch @relation(fields: [batchId], references: [id], onDelete: Cascade)

  employeeId               String
  employee                 Employee                  @relation(fields: [employeeId], references: [id], onDelete: Cascade)

  dependencyId             String?
  dependency               PayrollDependency?        @relation(fields: [dependencyId], references: [id], onDelete: SetNull)

  // Fondo de Cesantías (cuando benefitType es SEVERANCE_ANNUAL)
  cesantiasEntityId        String?
  cesantiasEntity          PayrollEntity?            @relation("BenefitCesantiasFund", fields: [cesantiasEntityId], references: [id], onDelete: SetNull)

  // Días del Semestre (máx 180) o del Año (máx 360)
  hireDateSnapshot         DateTime                  @db.Date
  grossDaysInPeriod        Int                       @default(180)
  unpaidLeaveDaysDeducted  Int                       @default(0)
  ProjectedDaysAdded       Int                       @default(0)
  netDaysWorked            Int                       @default(180)

  // Bases Promedio (inPri o inCes + Auxilio de Transporte si aplica)
  basicSalaryMonthly       Decimal                   @db.Decimal(14, 2)
  averageVariableEarnings  Decimal                   @default(0.00) @db.Decimal(14, 2)
  transportAllowanceBase   Decimal                   @default(0.00) @db.Decimal(14, 2)
  totalComputationBase     Decimal                   @db.Decimal(14, 2)

  // Valores Liquidados
  calculatedBenefitAmount  Decimal                   @db.Decimal(14, 2) // (totalComputationBase * netDaysWorked) / 360
  approvedBenefitAmount    Decimal                   @db.Decimal(14, 2)
  interestRatePct          Decimal                   @default(12.00) @db.Decimal(5, 2)
  calculatedInterestAmount Decimal                   @default(0.00) @db.Decimal(14, 2) // (approvedBenefitAmount * netDaysWorked * 0.12) / 360
  approvedInterestAmount   Decimal                   @default(0.00) @db.Decimal(14, 2)

  // Snapshot Bancario e Inyección en Nómina
  bankId                   String?
  bank                     PayrollBank?              @relation(fields: [bankId], references: [id], onDelete: SetNull)
  bankAccountType          BankAccountType           @default(SAVINGS)
  bankAccountNumber        String?                   @db.VarChar(50)
  hasBankWarning           Boolean                   @default(false)

  isManuallyEdited         Boolean                   @default(false)
  isInjectedToPayroll      Boolean                   @default(false)
  injectedPeriodId         String?
  notes                    String?                   @db.VarChar(255)

  createdAt                DateTime                  @default(now())
  updatedAt                DateTime                  @updatedAt
  createdById              String?
  updatedById              String?

  @@unique([batchId, employeeId])
  @@index([tenantId, employeeId])
  @@index([tenantId, cesantiasEntityId])
  @@map("payroll_social_benefit_items")
}

/// 4. Liquidación Definitiva de Contrato — "Liquidación Total" y Paz y Salvo (Numeral 3.10 Pronos)
model PayrollFinalContractSettlement {
  id                           String                         @id @default(cuid(2))
  tenantId                     String
  tenant                       Tenant                         @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  employeeId                   String
  employee                     Employee                       @relation(fields: [employeeId], references: [id], onDelete: Cascade)

  exitReasonId                 String
  exitReason                   PayrollExitReason              @relation(fields: [exitReasonId], references: [id], onDelete: Restrict)

  primaryDependencyId          String?
  primaryDependency            PayrollDependency?             @relation(fields: [primaryDependencyId], references: [id], onDelete: SetNull)

  status                       PayrollSettlementStatus        @default(DRAFT)
  contractTypeSnapshot         EmploymentContractType         @default(FIXED_TERM)
  hireDate                     DateTime                       @db.Date
  retirementDate               DateTime                       @db.Date
  contractEndDateSnapshot      DateTime?                      @db.Date
  paymentDate                  DateTime?                      @db.Date

  // Conteo de Tiempos Base 360
  totalContractDays360         Int                            @default(0) // Días totales desde hireDate hasta retirementDate
  unpaidLeaveDaysTotal         Int                            @default(0) // Días LNR/Sanción descontados
  netServiceDaysTotal          Int                            @default(0)

  // 1. Bases Promedio Independientes
  lastBasicSalary              Decimal                        @db.Decimal(14, 2)
  transportAllowanceApplicable Decimal                        @default(0.00) @db.Decimal(14, 2)
  cesantiasAverageBase         Decimal                        @db.Decimal(14, 2)
  primaAverageBase             Decimal                        @db.Decimal(14, 2)
  vacationAverageBase          Decimal                        @db.Decimal(14, 2)

  // 2. Liquidación Proporcional de Prestaciones Sociales
  cesantiasPendingDays         Int                            @default(0) // Días del año actual pendientes de cesantías
  cesantiasAmount              Decimal                        @default(0.00) @db.Decimal(14, 2)
  interestsCesantiasAmount     Decimal                        @default(0.00) @db.Decimal(14, 2)
  primaPendingDays             Int                            @default(0) // Días del semestre actual pendientes de prima
  primaAmount                  Decimal                        @default(0.00) @db.Decimal(14, 2)
  vacationTotalAccruedDays     Decimal                        @default(0.00) @db.Decimal(8, 2) // Total causados en toda la relación
  vacationEnjoyedDays          Decimal                        @default(0.00) @db.Decimal(8, 2) // Ya disfrutados/compensados en libro
  vacationPendingBusinessDays  Decimal                        @default(0.00) @db.Decimal(8, 2) // Días hábiles pendientes por pagar
  vacationAmount               Decimal                        @default(0.00) @db.Decimal(14, 2)

  // 3. Último Periodo de Sueldo Pendiente (Opcional)
  includePendingPayroll        Boolean                        @default(true)
  pendingPayrollDays           Int                            @default(0)
  pendingBasicSalaryAmount     Decimal                        @default(0.00) @db.Decimal(14, 2)
  pendingTransportAmount       Decimal                        @default(0.00) @db.Decimal(14, 2)
  pendingOvertimeAmount        Decimal                        @default(0.00) @db.Decimal(14, 2)
  pendingHealthDeduction       Decimal                        @default(0.00) @db.Decimal(14, 2)
  pendingPensionDeduction      Decimal                        @default(0.00) @db.Decimal(14, 2)

  // 4. Indemnización Art. 64 CST y Otros Devengos/Descuentos
  applyIndemnification         Boolean                        @default(false)
  indemnificationDays          Decimal                        @default(0.00) @db.Decimal(8, 2)
  indemnificationAmount        Decimal                        @default(0.00) @db.Decimal(14, 2)
  otherEarningsAmount          Decimal                        @default(0.00) @db.Decimal(14, 2)
  otherEarningsConcept         String?                        @db.VarChar(180)

  // 5. Cruce de Cartera (Préstamos Activos) y Deducciones de Retiro
  loansDeductedAmount          Decimal                        @default(0.00) @db.Decimal(14, 2)
  otherDeductionsAmount        Decimal                        @default(0.00) @db.Decimal(14, 2)
  otherDeductionsConcept       String?                        @db.VarChar(180)

  // 6. Totales Consolidados y Bloqueo B.D.N
  totalBenefitsAndEarnings     Decimal                        @default(0.00) @db.Decimal(14, 2)
  totalDeductions              Decimal                        @default(0.00) @db.Decimal(14, 2)
  netPayAmount                 Decimal                        @default(0.00) @db.Decimal(14, 2)
  blockForRehireBdn            Boolean                        @default(false)

  // Snapshot Bancario
  bankId                       String?
  bank                         PayrollBank?                   @relation(fields: [bankId], references: [id], onDelete: SetNull)
  bankAccountType              BankAccountType                @default(SAVINGS)
  bankAccountNumber            String?                        @db.VarChar(50)
  hasBankWarning               Boolean                        @default(false)

  notes                        String?                        @db.Text
  achBatches                   PayrollBankDisbursementBatch[]

  createdAt                    DateTime                       @default(now())
  updatedAt                    DateTime                       @updatedAt
  createdById                  String?
  updatedById                  String?

  @@index([tenantId, employeeId])
  @@index([tenantId, status])
  @@index([tenantId, retirementDate])
  @@map("payroll_final_contract_settlements")
}
```

---

## 3. Archivo de Migración SQL y Blindaje Multi-Tenant (`audit-extension.ts`)

### 3.1 Archivo de Migración SQL (`prisma/schema/migrations/20261030180000_payroll_social_benefits_vacations_and_final_liquidation/migration.sql`)

Se creará sin BOM UTF-8 y contendrá el DDL completo:

```sql
-- AlterEnum
ALTER TYPE "NoveltyOriginType" ADD VALUE IF NOT EXISTS 'BENEFITS_ENGINE';

-- AlterEnum
ALTER TYPE "PayrollDisbursementType" ADD VALUE IF NOT EXISTS 'SOCIAL_BENEFITS';
ALTER TYPE "PayrollDisbursementType" ADD VALUE IF NOT EXISTS 'VACATION_SETTLEMENT';
ALTER TYPE "PayrollDisbursementType" ADD VALUE IF NOT EXISTS 'FINAL_LIQUIDATION';

-- CreateEnum
CREATE TYPE "VacationSettlementType" AS ENUM ('ENJOYED_IN_TIME', 'COMPENSATED_IN_CASH');

-- CreateEnum
CREATE TYPE "SocialBenefitType" AS ENUM ('PRIMA_FIRST_SEMESTER', 'PRIMA_SECOND_SEMESTER', 'SEVERANCE_ANNUAL', 'SEVERANCE_INTERESTS');

-- AlterTable payroll_settlement_lines
ALTER TABLE "payroll_settlement_lines"
  ADD COLUMN IF NOT EXISTS "inPri" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "inCes" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "inVac" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "inLiq" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable payroll_bank_disbursement_batches
ALTER TABLE "payroll_bank_disbursement_batches"
  ADD COLUMN IF NOT EXISTS "socialBenefitBatchId" TEXT,
  ADD COLUMN IF NOT EXISTS "finalSettlementId" TEXT;

-- CreateTable payroll_vacation_settlements
CREATE TABLE "payroll_vacation_settlements" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "vacationType" "VacationSettlementType" NOT NULL DEFAULT 'ENJOYED_IN_TIME',
    "status" "PayrollSettlementStatus" NOT NULL DEFAULT 'DRAFT',
    "accrualStartDate" DATE NOT NULL,
    "accrualEndDate" DATE NOT NULL,
    "enjoymentStartDate" DATE NOT NULL,
    "enjoymentEndDate" DATE NOT NULL,
    "returnDate" DATE NOT NULL,
    "businessDays" DECIMAL(6,2) NOT NULL DEFAULT 15.00,
    "nonWorkingDaysIncluded" INTEGER NOT NULL DEFAULT 3,
    "calendarDaysPaid" INTEGER NOT NULL DEFAULT 18,
    "saturdayWasWorkingDay" BOOLEAN NOT NULL DEFAULT true,
    "currentBasicSalary" DECIMAL(14,2) NOT NULL,
    "averageVariableVacBase" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "totalVacationBase" DECIMAL(14,2) NOT NULL,
    "dailyVacationRate" DECIMAL(14,2) NOT NULL,
    "grossVacationAmount" DECIMAL(14,2) NOT NULL,
    "healthDeductionAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "pensionDeductionAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "loansDeductionAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "netPayAmount" DECIMAL(14,2) NOT NULL,
    "linkedLeaveId" TEXT,
    "injectedNoveltyId" TEXT,
    "isInjectedToPayroll" BOOLEAN NOT NULL DEFAULT false,
    "paymentDate" DATE,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "payroll_vacation_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable payroll_social_benefit_batches
CREATE TABLE "payroll_social_benefit_batches" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "benefitType" "SocialBenefitType" NOT NULL,
    "year" INTEGER NOT NULL,
    "label" VARCHAR(150) NOT NULL,
    "periodStartDate" DATE NOT NULL,
    "cutoffDate" DATE NOT NULL,
    "projectionEndDate" DATE NOT NULL,
    "paymentDate" DATE,
    "status" "PayrollSettlementStatus" NOT NULL DEFAULT 'DRAFT',
    "totalEmployees" INTEGER NOT NULL DEFAULT 0,
    "totalBenefitAmount" DECIMAL(16,2) NOT NULL DEFAULT 0.00,
    "totalInterestAmount" DECIMAL(16,2) NOT NULL DEFAULT 0.00,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "payroll_social_benefit_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable payroll_social_benefit_items
CREATE TABLE "payroll_social_benefit_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "dependencyId" TEXT,
    "cesantiasEntityId" TEXT,
    "hireDateSnapshot" DATE NOT NULL,
    "grossDaysInPeriod" INTEGER NOT NULL DEFAULT 180,
    "unpaidLeaveDaysDeducted" INTEGER NOT NULL DEFAULT 0,
    "projectedDaysAdded" INTEGER NOT NULL DEFAULT 0,
    "netDaysWorked" INTEGER NOT NULL DEFAULT 180,
    "basicSalaryMonthly" DECIMAL(14,2) NOT NULL,
    "averageVariableEarnings" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "transportAllowanceBase" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "totalComputationBase" DECIMAL(14,2) NOT NULL,
    "calculatedBenefitAmount" DECIMAL(14,2) NOT NULL,
    "approvedBenefitAmount" DECIMAL(14,2) NOT NULL,
    "interestRatePct" DECIMAL(5,2) NOT NULL DEFAULT 12.00,
    "calculatedInterestAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "approvedInterestAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "bankId" TEXT,
    "bankAccountType" "BankAccountType" NOT NULL DEFAULT 'SAVINGS',
    "bankAccountNumber" VARCHAR(50),
    "hasBankWarning" BOOLEAN NOT NULL DEFAULT false,
    "isManuallyEdited" BOOLEAN NOT NULL DEFAULT false,
    "isInjectedToPayroll" BOOLEAN NOT NULL DEFAULT false,
    "injectedPeriodId" TEXT,
    "notes" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "payroll_social_benefit_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable payroll_final_contract_settlements
CREATE TABLE "payroll_final_contract_settlements" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "exitReasonId" TEXT NOT NULL,
    "primaryDependencyId" TEXT,
    "status" "PayrollSettlementStatus" NOT NULL DEFAULT 'DRAFT',
    "contractTypeSnapshot" "EmploymentContractType" NOT NULL DEFAULT 'FIXED_TERM',
    "hireDate" DATE NOT NULL,
    "retirementDate" DATE NOT NULL,
    "contractEndDateSnapshot" DATE,
    "paymentDate" DATE,
    "totalContractDays360" INTEGER NOT NULL DEFAULT 0,
    "unpaidLeaveDaysTotal" INTEGER NOT NULL DEFAULT 0,
    "netServiceDaysTotal" INTEGER NOT NULL DEFAULT 0,
    "lastBasicSalary" DECIMAL(14,2) NOT NULL,
    "transportAllowanceApplicable" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "cesantiasAverageBase" DECIMAL(14,2) NOT NULL,
    "primaAverageBase" DECIMAL(14,2) NOT NULL,
    "vacationAverageBase" DECIMAL(14,2) NOT NULL,
    "cesantiasPendingDays" INTEGER NOT NULL DEFAULT 0,
    "cesantiasAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "interestsCesantiasAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "primaPendingDays" INTEGER NOT NULL DEFAULT 0,
    "primaAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "vacationTotalAccruedDays" DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    "vacationEnjoyedDays" DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    "vacationPendingBusinessDays" DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    "vacationAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "includePendingPayroll" BOOLEAN NOT NULL DEFAULT true,
    "pendingPayrollDays" INTEGER NOT NULL DEFAULT 0,
    "pendingBasicSalaryAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "pendingTransportAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "pendingOvertimeAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "pendingHealthDeduction" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "pendingPensionDeduction" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "applyIndemnification" BOOLEAN NOT NULL DEFAULT false,
    "indemnificationDays" DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    "indemnificationAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "otherEarningsAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "otherEarningsConcept" VARCHAR(180),
    "loansDeductedAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "otherDeductionsAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "otherDeductionsConcept" VARCHAR(180),
    "totalBenefitsAndEarnings" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "totalDeductions" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "netPayAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "blockForRehireBdn" BOOLEAN NOT NULL DEFAULT false,
    "bankId" TEXT,
    "bankAccountType" "BankAccountType" NOT NULL DEFAULT 'SAVINGS',
    "bankAccountNumber" VARCHAR(50),
    "hasBankWarning" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "payroll_final_contract_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payroll_vacation_settlements_tenantId_employeeId_idx" ON "payroll_vacation_settlements"("tenantId", "employeeId");
CREATE INDEX "payroll_vacation_settlements_tenantId_status_idx" ON "payroll_vacation_settlements"("tenantId", "status");
CREATE UNIQUE INDEX "payroll_social_benefit_batches_tenantId_benefitType_year_key" ON "payroll_social_benefit_batches"("tenantId", "benefitType", "year");
CREATE INDEX "payroll_social_benefit_batches_tenantId_year_status_idx" ON "payroll_social_benefit_batches"("tenantId", "year", "status");
CREATE UNIQUE INDEX "payroll_social_benefit_items_batchId_employeeId_key" ON "payroll_social_benefit_items"("batchId", "employeeId");
CREATE INDEX "payroll_social_benefit_items_tenantId_employeeId_idx" ON "payroll_social_benefit_items"("tenantId", "employeeId");
CREATE INDEX "payroll_social_benefit_items_tenantId_cesantiasEntityId_idx" ON "payroll_social_benefit_items"("tenantId", "cesantiasEntityId");
CREATE INDEX "payroll_final_contract_settlements_tenantId_employeeId_idx" ON "payroll_final_contract_settlements"("tenantId", "employeeId");
CREATE INDEX "payroll_final_contract_settlements_tenantId_status_idx" ON "payroll_final_contract_settlements"("tenantId", "status");
CREATE INDEX "payroll_final_contract_settlements_tenantId_retirementDate_idx" ON "payroll_final_contract_settlements"("tenantId", "retirementDate");

-- AddForeignKey
ALTER TABLE "payroll_vacation_settlements" ADD CONSTRAINT "payroll_vacation_settlements_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payroll_vacation_settlements" ADD CONSTRAINT "payroll_vacation_settlements_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payroll_vacation_settlements" ADD CONSTRAINT "payroll_vacation_settlements_linkedLeaveId_fkey" FOREIGN KEY ("linkedLeaveId") REFERENCES "payroll_leaves_and_absences"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "payroll_social_benefit_batches" ADD CONSTRAINT "payroll_social_benefit_batches_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "payroll_social_benefit_items" ADD CONSTRAINT "payroll_social_benefit_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payroll_social_benefit_items" ADD CONSTRAINT "payroll_social_benefit_items_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "payroll_social_benefit_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payroll_social_benefit_items" ADD CONSTRAINT "payroll_social_benefit_items_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payroll_social_benefit_items" ADD CONSTRAINT "payroll_social_benefit_items_dependencyId_fkey" FOREIGN KEY ("dependencyId") REFERENCES "payroll_dependencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payroll_social_benefit_items" ADD CONSTRAINT "payroll_social_benefit_items_cesantiasEntityId_fkey" FOREIGN KEY ("cesantiasEntityId") REFERENCES "payroll_entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payroll_social_benefit_items" ADD CONSTRAINT "payroll_social_benefit_items_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "payroll_banks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "payroll_final_contract_settlements" ADD CONSTRAINT "payroll_final_contract_settlements_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payroll_final_contract_settlements" ADD CONSTRAINT "payroll_final_contract_settlements_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payroll_final_contract_settlements" ADD CONSTRAINT "payroll_final_contract_settlements_exitReasonId_fkey" FOREIGN KEY ("exitReasonId") REFERENCES "payroll_exit_reasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payroll_final_contract_settlements" ADD CONSTRAINT "payroll_final_contract_settlements_primaryDependencyId_fkey" FOREIGN KEY ("primaryDependencyId") REFERENCES "payroll_dependencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payroll_final_contract_settlements" ADD CONSTRAINT "payroll_final_contract_settlements_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "payroll_banks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "payroll_bank_disbursement_batches" ADD CONSTRAINT "payroll_bank_disbursement_batches_socialBenefitBatchId_fkey" FOREIGN KEY ("socialBenefitBatchId") REFERENCES "payroll_social_benefit_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payroll_bank_disbursement_batches" ADD CONSTRAINT "payroll_bank_disbursement_batches_finalSettlementId_fkey" FOREIGN KEY ("finalSettlementId") REFERENCES "payroll_final_contract_settlements"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

### 3.2 Registro en [`src/common/prisma-extension/audit-extension.ts`](file:///d:/projects/security-crm-backend/src/common/prisma-extension/audit-extension.ts)
Se registrarán los 4 modelos en `auditableModels`, `multiTenantModels` y `commercialAuditModels`:
- `'PayrollVacationSettlement'`
- `'PayrollSocialBenefitBatch'`
- `'PayrollSocialBenefitItem'`
- `'PayrollFinalContractSettlement'`

---

## 4. Motores Matemáticos y Servicios Especializados (`src/modules/payroll/`)

### 4.1 `SocialBenefitsAndVacationsEngine` (`src/modules/payroll/engines/social-benefits-and-vacations.engine.ts`)
Motor determinístico y libre de efectos secundarios con 3 funciones nucleares:

1. **`calculateDays360(startDate: Date, endDate: Date): number`**:
   - Aplica la convención comercial colombiana de $30$ días por mes y $360$ días por año:
     $$\text{Días}_{360} = (Y_2 - Y_1) \times 360 + (M_2 - M_1) \times 30 + (\min(D_2, 30) - \min(D_1, 30)) + 1$$
     (Con normalización de fin de febrero 28/29 al día 30).
2. **`calculateVacationScheduleAndAmount(input)`**:
   - Recibe `enjoymentStartDate`, `businessDays`, `saturdayIsWorkingDay`, `holidayDates[]`, `currentBasicSalary`, `averageVariableVacBase`, `vacationType` y `loansToDeduct`.
   - Si `vacationType === 'ENJOYED_IN_TIME'`:
     - Avanza día a día desde `enjoymentStartDate` contando únicamente los días hábiles (lunes a viernes, más sábados si `saturdayIsWorkingDay === true`, excluyendo cualquier fecha presente en `holidayDates`).
     - Cuando completa `businessDays`, fija `enjoymentEndDate`.
     - Continúa avanzando a partir de `enjoymentEndDate + 1` hasta encontrar el siguiente día hábil (o siguiente día de turno) para fijar `returnDate`.
     - Calcula `calendarDaysPaid` como la diferencia de días calendario entre `enjoymentStartDate` y `returnDate` (o `enjoymentEndDate` inclusivo más los días inhábiles previos al retorno).
     - Deduce $4\%$ de Salud y $4\%$ de Pensión sobre el valor bruto disfrutado.
   - Si `vacationType === 'COMPENSATED_IN_CASH'`:
     - Liquida los días solicitados en dinero sobre `totalVacationBase / 30` sin deducción de Salud/Pensión del trabajador (por tratarse de compensación en dinero Art. 189 CST).
3. **`calculateSocialBenefitItem(input)`**:
   - Calcula **Prima Semestral** (`PRIMA_FIRST_SEMESTER` / `PRIMA_SECOND_SEMESTER`) o **Cesantías e Intereses** (`SEVERANCE_ANNUAL` / `SEVERANCE_INTERESTS`) soportando `cutoffDate` y `projectionEndDate`:
     - Determina la fecha de inicio efectiva en el semestre/año: $\max(\text{periodStartDate}, \text{employee.entryDate})$.
     - Calcula `grossDaysInPeriod = calculateDays360(effectiveStart, projectionEndDate)`.
     - Resta `unpaidLeaveDaysDeducted` (`inLnr = true`) para obtener `netDaysWorked`.
     - Promedia los conceptos variables con bandera `inPri = true` (para Prima) o `inCes = true` (para Cesantías) causados entre `effectiveStart` y `cutoffDate`. Si el empleado no tiene liquidaciones previas cerradas, utiliza el salario garantizado/básico de su puesto o perfil.
     - Suma `transportAllowance` vigente si `basicSalaryMonthly + averageVariableEarnings <= 2 * smmlv`.
     - Calcula:
       $$\text{Prima o Cesantías} = \text{round}\left(\frac{\text{totalComputationBase} \times \text{netDaysWorked}}{360},\ 2\right)$$
       $$\text{Intereses Cesantías (12\%)} = \text{round}\left(\frac{\text{Cesantías} \times \text{netDaysWorked} \times 0.12}{360},\ 2\right)$$

### 4.2 `ContractTerminationEngine` (`src/modules/payroll/engines/contract-termination.engine.ts`)
Calcula de forma determinística la **Liquidación Definitiva de Contrato ("Liquidación Total")**:
1. **Tiempos de Servicio**:
   - `totalContractDays360 = calculateDays360(hireDate, retirementDate)`.
   - `netServiceDaysTotal = max(0, totalContractDays360 - unpaidLeaveDaysTotal)`.
   - `cesantiasPendingDays`: Días en base 360 desde $\max(\text{1 de enero del año de retiro}, \text{hireDate})$ hasta `retirementDate`, menos ausencias no remuneradas del año.
   - `primaPendingDays`: Días en base 360 desde $\max(\text{inicio del semestre de retiro}, \text{hireDate})$ hasta `retirementDate`, menos ausencias no remuneradas del semestre.
   - `vacationTotalAccruedDays` $= \text{round}\left(\frac{\text{netServiceDaysTotal} \times 15}{360},\ 2\right)$.
   - `vacationPendingBusinessDays` $= \max(0,\ \text{vacationTotalAccruedDays} - \text{vacationEnjoyedDays})$.
2. **Cálculo de Prestaciones Proporcionales**:
   - $\text{Cesantías} = \text{round}\left(\frac{\text{cesantiasAverageBase} \times \text{cesantiasPendingDays}}{360},\ 2\right)$
   - $\text{Intereses} = \text{round}\left(\frac{\text{Cesantías} \times \text{cesantiasPendingDays} \times 0.12}{360},\ 2\right)$
   - $\text{Prima} = \text{round}\left(\frac{\text{primaAverageBase} \times \text{primaPendingDays}}{360},\ 2\right)$
   - $\text{Vacaciones} = \text{round}\left(\frac{\text{vacationAverageBase}}{30} \times \text{vacationPendingBusinessDays},\ 2\right)$
3. **Indemnización por Despido sin Justa Causa (Art. 64 CST)**:
   - Si `isJustCause === false` (o `applyIndemnification === true`):
     - **`FIXED_TERM`**: Si `contractEndDateSnapshot > retirementDate`, `indemnificationDays = calculateDays360(retirementDate, contractEndDateSnapshot) - 1` (mínimo $15$ días).
     - **`INDEFINITE`**:
       - Si `lastBasicSalary < 10 * smmlv`: Primer año ($\le 360$ días) $= 30$ días de salario; por cada año adicional o fracción ($> 360$ días), $+ \frac{20 \times (\text{netServiceDaysTotal} - 360)}{360}$ días.
       - Si `lastBasicSalary >= 10 * smmlv`: Primer año $= 20$ días; por cada año adicional o fracción, $+ \frac{15 \times (\text{netServiceDaysTotal} - 360)}{360}$ días.
     - **`WORK_OR_LABOR`**: Mínimo legal de $15$ días.
     - $\text{indemnificationAmount} = \text{round}\left(\frac{\text{lastBasicSalary}}{30} \times \text{indemnificationDays},\ 2\right)$.
4. **Cruce de Último Sueldo y Cartera de Préstamos**:
   - Suma el sueldo y recargos pendientes del mes de retiro (si `includePendingPayroll === true`), resta el $4\%$ de Salud y $4\%$ de Pensión de ese último salario y descuenta `loansDeductedAmount` y `otherDeductionsAmount`.

### 4.3 `PayrollBenefitsPdfService` (`src/modules/payroll/services/payroll-benefits-pdf.service.ts`)
Generador vectorial con `pdf-lib` y `qrcode`:
- **`generateFinalLiquidationPdf(settlement)`**: Genera el **Acta de Liquidación Definitiva de Contrato y Paz y Salvo Laboral** con encabezado corporativo, datos contractuales, tiempos base 360, bases promedio, cuadro de devengos prestacionales, cuadro de deducciones/préstamos, cláusula legal de Paz y Salvo, código QR de verificación y bloques de firma del empleador y trabajador.
- **`generateVacationSlipPdf(vacation)`**: Genera el **Comprobante de Otorgamiento y Liquidación de Vacaciones** detallando periodo causado, fecha de inicio, fecha de retorno al puesto, días hábiles, días calendario y neto pagado.

---

## 5. Contratos de API REST (`src/modules/payroll/controllers/`)

### 5.1 Ampliación de `PayrollCatalogsController` (`/payroll/catalogs`) y `PayrollConceptsController` (`/payroll/concepts`)
1. `POST /payroll/catalogs/periods` (`payroll:settings:manage`, `payroll:settlement:manage`):
   - Crea un nuevo `PayrollPeriod` validando que no exista solapamiento ni código repetido.
2. `POST /payroll/catalogs/periods/generate-year` (`payroll:settings:manage`, `payroll:settlement:manage`):
   - Genera automáticamente los 12 periodos mensuales de un `year` indicado (Enero a Diciembre) con fechas de inicio y fin exactas.
3. **Homologación de Permisos en `GET`**:
   - Todos los `GET` de `PayrollCatalogsController` y `GET /payroll/concepts` aceptan `payroll:settings:read`, `payroll:employees:read`, `payroll:dependencies:read`, `payroll:novelties:read`, `payroll:shifts:read`, `payroll:settlement:read` y `payroll:benefits:read`.

### 5.2 Nuevo `PayrollBenefitsController` (`/payroll/benefits`)
Protegido con `@UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGuard)` y `@RequireFeature('payroll')`:

1. `GET /payroll/benefits/kpis` (`payroll:benefits:read`):
   - KPIs ejecutivos: Empleados con más de 15 días de vacaciones acumuladas, Provisión/Total Prima del semestre, Total Cesantías e Intereses del año y Liquidaciones Definitivas del mes.
2. **Vacaciones y Libro de Saldos**:
   - `GET /payroll/benefits/vacations/book` (`payroll:benefits:read`): Lista el Libro de Vacaciones de todos los empleados activos (Fecha ingreso, Días totales servidos, Días hábiles causados, Días disfrutados/compensados, **Días hábiles pendientes** y Semáforo de alerta si acumula $\ge 15$ o $\ge 30$ días).
   - `POST /payroll/benefits/vacations/simulate` (`payroll:benefits:read`, `payroll:benefits:manage`): Simula en vivo una salida a vacaciones o compensación en dinero devolviendo `enjoymentEndDate`, `returnDate`, `calendarDaysPaid`, `totalVacationBase` y `netPayAmount`.
   - `POST /payroll/benefits/vacations` (`payroll:benefits:manage`): Crea un registro de vacaciones en `PayrollVacationSettlement`.
   - `POST /payroll/benefits/vacations/:id/approve` (`payroll:benefits:manage`): Aprueba las vacaciones y ejecuta la **Sincronización 3-en-1** (crea novedad `VACATION_TIME_VAC` en `PayrollLeaveAndAbsence`, pinta `VAC` en `PayrollShiftRecord` y opcionalmente inyecta a nómina).
   - `GET /payroll/benefits/vacations` (`payroll:benefits:read`): Lista el historial de liquidaciones de vacaciones.
   - `GET /payroll/benefits/vacations/:id/pdf` (`payroll:benefits:read`, `payroll:employees:read`): Descarga el PDF del Comprobante de Vacaciones.
3. **Prima de Servicios y Cesantías / Intereses**:
   - `POST /payroll/benefits/batches/generate` (`payroll:benefits:manage`): Genera o recalcula un lote masivo (`PRIMA_FIRST_SEMESTER`, `PRIMA_SECOND_SEMESTER`, `SEVERANCE_ANNUAL`, `SEVERANCE_INTERESTS`) con soporte de `cutoffDate` y `projectionEndDate`.
   - `GET /payroll/benefits/batches` (`payroll:benefits:read`): Lista los lotes generados por año y tipo, incluyendo el resumen agrupado por Fondo de Cesantías cuando aplica.
   - `GET /payroll/benefits/batches/:batchId` (`payroll:benefits:read`): Obtiene el lote con todos sus ítems por empleado (`PayrollSocialBenefitItem`).
   - `PATCH /payroll/benefits/batches/items/:itemId` (`payroll:benefits:manage`): Edita manualmente el valor aprobado de prima/cesantías/intereses de un trabajador.
   - `POST /payroll/benefits/batches/:batchId/approve` (`payroll:benefits:manage`): Aprueba el lote de prestaciones.
   - `POST /payroll/benefits/batches/:batchId/inject-to-payroll` (`payroll:benefits:manage`): Inyecta los valores aprobados del lote (ej. Intereses de Cesantías del 12% o Prima) como novedades `PayrollPeriodNovelty` en el periodo de nómina abierto seleccionado.
4. **Liquidación Definitiva de Contrato ("Liquidación Total")**:
   - `POST /payroll/benefits/final-settlements/simulate` (`payroll:benefits:read`, `payroll:benefits:manage`): Simula en tiempo real la liquidación definitiva de un empleado para una `retirementDate` y `exitReasonId`, devolviendo tiempos 360, promedios, prestaciones proporcionales, indemnización Art. 64 CST y préstamos activos a descontar.
   - `POST /payroll/benefits/final-settlements` (`payroll:benefits:manage`): Guarda la liquidación definitiva en estado `DRAFT`.
   - `POST /payroll/benefits/final-settlements/:id/approve` (`payroll:benefits:manage`): Aprueba la liquidación definitiva, retira e inactiva al trabajador (`isRetired = true`, `isActive = false`, `retiredAt`), actualiza la Base de Datos Negativa (`isBlockedForRehire`), cierra sus puestos activos y salda los préstamos descontados.
   - `GET /payroll/benefits/final-settlements` (`payroll:benefits:read`): Lista todas las liquidaciones definitivas de contrato.
   - `GET /payroll/benefits/final-settlements/:id/pdf` (`payroll:benefits:read`, `payroll:employees:read`): Descarga el **Acta de Liquidación Definitiva y Paz y Salvo en PDF**.

---

## 6. Experiencia de Usuario y Diseño Frontend (`security-crm-frontend`)

Siguiendo estrictamente [`frontend-noxia-style-guide.md`](file:///d:/projects/security-crm-frontend/.specs/00-general-rules/frontend-noxia-style-guide.md) (*Deep Violet Tactical Enterprise*, fondo `#F8FAFC`, superficies `#FFFFFF`, bordes `#E2E8F0`, acento `#7C3AED`, tipografía `JetBrains Mono` en cifras/códigos y **uso exclusivo de `ResponsiveFormDrawer` — prohibido usar modales `Dialog`**):

### 6.1 Nueva Consola `/finance/payroll/benefits/page.tsx`
Organizada con 4 tarjetas KPI superiores y **4 Pestañas Tácticas**:

1. **Pestaña 1 — Libro de Vacaciones y Liquidación de Vacaciones**:
   - **Sección Superior (Libro de Vacaciones)**: Tabla con buscador mostrando para cada empleado activo: Fecha de Ingreso, Tiempo Servido, Días Causados, Días Disfrutados, **Días Pendientes** (con Chip de alerta ámbar/rojo si supera 15 o 30 días) y botón **"Liquidar Vacaciones"**.
   - **Sección Inferior (Historial de Vacaciones Liquidadas)**: Tabla con Fechas de Salida y Retorno, Tipo (`En Tiempo` vs `En Dinero`), Días Hábiles/Calendario, Neto Pagado, Estado (`Sincronizado en Turnos`) y botón **"Descargar PDF"**.
   - **`ResponsiveFormDrawer` de Liquidación de Vacaciones**: Permite elegir empleado, tipo (`Disfrutadas en Tiempo` o `Compensadas en Dinero`), fecha de salida y días hábiles; ejecuta la simulación en vivo mostrando la **Fecha Exacta de Regreso al Puesto** y el desglose financiero antes de guardar/aprobar.
2. **Pestaña 2 — Prima de Servicios Semestral (Junio y Diciembre)**:
   - Selector de Año y Semestre (`1er Semestre: Ene–Jun` o `2do Semestre: Jul–Dic`), selector de **Fecha de Corte de Promedios (`cutoffDate`)** y **Fecha Proyectada (`projectionEndDate`)**, botón **"Calcular / Recalcular Prima Semestral"**, botón **"Aprobar Lote"**, botón **"Inyectar en Periodo de Nómina"** y botón **"Generar Plano Bancario ACH"**.
   - Tabla detallada por empleado con Días Trabajados, Sueldo Básico, Promedio Variable (`inPri`), Auxilio Transporte Base, Base Total y **Valor Prima**, con edición puntual en **`ResponsiveFormDrawer`**.
3. **Pestaña 3 — Cesantías Anuales e Intereses a las Cesantías (12%)**:
   - Selector de Año y Fecha de Corte, tarjetas de resumen agrupadas por **Fondo de Cesantías** (`Porvenir`, `Protección`, `Colfondos`, `FNA`), botón **"Calcular Cesantías e Intereses 12%"**, botón **"Aprobar Lote"** y botón **"Inyectar Intereses (12%) en Nómina de Enero"**.
   - Tabla por empleado con Fondo de Cesantías, Días Netos del Año, Base Promedio (`inCes`), **Valor Cesantías**, **Valor Intereses (12%)** y acciones.
4. **Pestaña 4 — Liquidación Definitiva de Contrato y Paz y Salvo ("Liquidación Total")**:
   - Botón primario **"+ Nueva Liquidación Definitiva"** y tabla de trabajadores liquidados/retirados con Causal de Retiro, Fecha de Ingreso/Retiro, Días Netos Base 360, Total Prestaciones, Indemnización, Préstamos Descontados, **Neto Liquidado**, Estado B.D.N y botón **"Acta Paz y Salvo PDF"**.
   - **`ResponsiveFormDrawer` de Simulación y Liquidación Definitiva**:
     - Selecciona empleado activo, Fecha de Retiro y Causal de Retiro (`PayrollExitReason`).
     - Switches tácticos: *"Incluir días pendientes del último periodo de nómina"*, *"Aplicar Indemnización Art. 64 CST"* (auto-activado si la causal es sin justa causa) y *"Bloquear para recontratación en Base de Datos Negativa (B.D.N)"*.
     - Muestra en vivo las tarjetas de tiempos base 360, bases promedio (`inCes`, `inPri`, `inVac`), renglones de Cesantías, Intereses, Prima, Vacaciones pendientes, Indemnización, Préstamos descontados y Neto a Pagar.

### 6.2 Cajón Lateral `ResponsiveFormDrawer` para Periodos en `/finance/payroll/settlement/page.tsx`
- En la barra superior de `/finance/payroll/settlement`, junto al selector de periodo, se añade el botón **"+ Abrir Periodo"**, el cual abre un **`ResponsiveFormDrawer`** (sin usar modales) con dos opciones:
  1. **Crear Periodo Individual** (Año, Mes, Número, Etiqueta, Fecha Inicio, Fecha Fin, Fecha Pago).
  2. **Generar los 12 Periodos Mensuales del Año** en 1 clic.
- Además, en la Pestaña 3 (*Dispersión Bancaria ACH*) de `/finance/payroll/settlement`, el selector de tipo de pago permite dispersar también lotes de **Prima / Prestaciones Sociales (`SOCIAL_BENEFITS`)** y **Liquidaciones Definitivas (`FINAL_LIQUIDATION`)**.

### 6.3 Ampliación de la Pestaña 6 en `/finance/payroll/employees/page.tsx`
- En la Pestaña 6 del Expediente 360° (*Desprendibles e Historial Salarial*), se añade la visualización de los **Comprobantes de Vacaciones** y, si el trabajador tiene **Liquidación Definitiva de Contrato**, el botón directo para descargar su **Acta de Liquidación y Paz y Salvo PDF**.

### 6.4 Activación en el Menú Lateral (`src/config/navigationRegistry.ts`)
- Dentro de `id: "finance"` (*Dirección Financiera*), se añade como `ACTIVE` el ítem:
  - `id: "fin-payroll-benefits"`
  - `title: "Prestaciones y Liquidación"`
  - `description: "Libro de vacaciones, prima semestral, cesantías/intereses 12% y liquidación definitiva con paz y salvo"`
  - `path: "/finance/payroll/benefits"`
  - `permissions: ["payroll:benefits:read", "payroll:benefits:manage"]`

---

## 7. Permisos RBAC y Semillas (`prisma/seed.ts` y `prisma/seed-payroll.ts`)

1. **Permisos Nuevos en `prisma/seed.ts`**:
   - `payroll:benefits:read`
   - `payroll:benefits:manage`
   Asignados dinámicamente a todos los roles `GODLIKE` y `ADMIN` de todos los tenants activos.
2. **Datos Semilla en `prisma/seed-payroll.ts`**:
   - Semilla de una liquidación de vacaciones de ejemplo (`PayrollVacationSettlement`) y un lote de Prima Semestral (`PayrollSocialBenefitBatch` + `PayrollSocialBenefitItem`) para que la consola `/finance/payroll/benefits` muestre datos reales desde el primer ingreso.

---

## 8. Criterios de Aceptación y Matriz de Verificación (Quality Gates)

- [x] **Gate 1 — Prisma Schema & Migration**: Validación `npx.cmd prisma validate` exitosa y archivo SQL de migración creado y desplegado en `prisma/schema/migrations/20261030180000_payroll_social_benefits_vacations_and_final_liquidation/migration.sql`.
- [x] **Gate 2 — Blindaje ALS (`audit-extension.ts`)**: Los 4 nuevos modelos registrados en `auditableModels`, `multiTenantModels` y `commercialAuditModels`, con `audit-extension.spec.ts` en verde.
- [x] **Gate 3 — Cobertura de Pruebas Unitarias ($\ge 80\%$)**: Suites unitarias para `SocialBenefitsAndVacationsEngine`, `ContractTerminationEngine`, `PayrollBenefitsPdfService`, `PayrollBenefitsService`, `PayrollBenefitsController` y los nuevos métodos de periodos en `PayrollCatalogsService`/`Controller`.
- [x] **Gate 4 — Cero Errores de Compilación y Linter**: `npx.cmd tsc --noEmit` y `npm.cmd run lint` con `0` errores en `security-crm-backend` y `security-crm-frontend`.
- [x] **Gate 5 — Fidelidad Visual NOXIA Style Guide (Cero Modales)**: Verificación de `/finance/payroll/benefits`, el `ResponsiveFormDrawer` de creación de periodos en `/finance/payroll/settlement` y el ítem activo en `navigationRegistry.ts`.
- [x] **Gate 6 — Prevención de Context Rot**: Actualización de `.specs/ai-decisions.log` y marcado de `[x]` en esta especificación al finalizar.

