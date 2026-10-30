# SPEC-ADM-030: Gestión de Novedades, Incapacidades (CIE-10), Préstamos, Conceptos Fijos, Rotación de Puestos y Malla de Programación de Turnos

> **Estado**: `IMPLEMENTADO`  
> **Módulo**: `administrative` / `payroll` & `scheduling` (Ubicado en Dirección Financiera y enlazado en Programación de Turnos)  
> **Fase del Roadmap de Nómina**: **Fase 3 de 6 (50% Acumulado del Módulo Integral)**  
> **Ubicación Frontend**:
> - `src/app/(protected)/finance/payroll/novelties/page.tsx`
> - `src/app/(protected)/finance/payroll/shifts/page.tsx`
> - `src/lib/api/payroll-novelties.ts`
> - `src/lib/api/payroll-shifts.ts`
> - `src/config/navigationRegistry.ts` (Dirección Financiera `id: "finance"` y Programación de Turnos `id: "scheduling"`)
> **Ubicación Backend**:
> - `prisma/schema/payroll_novelties_and_shifts.prisma`
> - `prisma/schema/payroll_foundations.prisma`
> - `prisma/schema/enums.prisma`
> - `prisma/schema/employee.prisma`
> - `prisma/schema/tenant.prisma`
> - `prisma/schema/migrations/20261029230000_payroll_novelties_loans_and_shifts/migration.sql`
> - `src/common/prisma-extension/audit-extension.ts`
> - `src/modules/payroll/engines/incapacity-and-leave.engine.ts`
> - `src/modules/payroll/engines/shift-sequence.engine.ts`
> - `src/modules/payroll/services/payroll-novelties.service.ts`
> - `src/modules/payroll/services/payroll-shifts.service.ts`
> - `src/modules/payroll/controllers/payroll-novelties.controller.ts`
> - `src/modules/payroll/controllers/payroll-shifts.controller.ts`
> - `src/modules/payroll/dtos/payroll-novelties.dto.ts`
> - `src/modules/payroll/dtos/payroll-shifts.dto.ts`
> - `prisma/seed.ts` y `prisma/seed-payroll.ts`
> **Fecha de Creación**: `2026-10-29`  
> **Autor**: Antigravity (Senior Software Architect, Legal/Labor & Accounting Specialist)  
> **Referencias Base**: `csv_templates/roadmap_nomina.md` (Fase 3) y `csv_templates/Manual de usuario PRONOS.pdf` (Capítulos 3 y 4: Numerales `3.1` a `3.7` y `4.1` a `4.12`)

---

## 1. Contexto de Negocio, Jurídico, Contable y Diagnóstico

### 1.1 Diagnóstico Operativo en Pronos (Capítulos 3 y 4)
En una empresa de vigilancia y seguridad privada en Colombia, la nómina de cada periodo no depende de un sueldo estático de oficina, sino de la **operación diaria en terreno**: en qué puestos (Dependencias) prestó servicio el guarda, qué turnos realizó (`D` Diurno, `N` Nocturno, `X` Descanso, `R` Refuerzo), qué ausencias o incapacidades presentó y qué préstamos o conceptos permanentes tiene activos.

Al auditar los Capítulos 3 y 4 del manual de usuario de **Pronos** y las capturas de operación real, se identifican cinco limitaciones críticas que esta Fase 3 resuelve de raíz:

1. **Desconexión entre Programación de Turnos y Nómina (Numeral 4.9 de Pronos)**:
   - En Pronos, Operaciones registra turnos y ausencias en el módulo de Programación, pero Nómina no los ve hasta que un operador ejecuta manualmente un proceso por lotes (*"4.9 Importar novedades desde programación"*). Si Operaciones corrige un turno o agrega una incapacidad después, los datos quedan desfasados o se duplican registros.
2. **Complejidad en la Alta Rotación de Puestos (Caso Real Guarda Relevante / Polivalente — Numeral 4.1)**:
   - Un mismo guarda puede pasar por 3 o 4 puestos distintos en el mismo mes (ej. del día 1 al 10 en *Conjunto San Marcos*, del 11 al 20 en *Argenta 138 24H*, y del 21 al 30 como *Supervisor Matisse*). Cada puesto tiene un sueldo garantizado y una modalidad distinta. Se requiere una línea de tiempo relacional exacta (`EmployeeDependencyAssignment`) que además sincronice los permisos de minuta electrónica del guarda.
3. **Liquidación Normativa de Incapacidades y Control de Cartera EPS/ARL (Numerales 3.3 y 4.11)**:
   - En Colombia (**Art. 227 CST**, **Decreto 2943 de 2013** y **Ley 776 de 2002**):
     - **Enfermedad General (`EG`)**: Los primeros **dos (2) días** corren a cargo del empleador (al porcentaje configurado por la empresa: `66.67%` legal o `100%` por política empresarial, respetando siempre el piso de $1\text{ SMMLV}$ diario). Del **día 3 al 90**, el pago corresponde a la **EPS al $66.67\%$** del IBC del mes anterior (sin que el valor diario pueda ser inferior a $1\text{ SMMLV}$ diario = `SMMLV / 30`). Del **día 91 al 180**, al **$50\%$** (también con piso de $1\text{ SMMLV}$ diario). Si es **prórroga (`isExtension = true`)**, no se vuelven a cobrar los 2 días al empleador.
     - **Accidente de Trabajo (`AT`) / Enfermedad Laboral (`EL`)**: Se reconoce al **$100\%$ del IBC** desde el primer día a cargo de la **ARL**.
     - **Licencia de Maternidad / Paternidad (`LMA`)**: Se reconoce al **$100\%$ del IBC** a cargo de la **EPS**.
   - Además, la empresa paga el auxilio al guarda en la nómina y luego debe **recobrar ese dinero ante la EPS/ARL**, por lo que requiere un módulo de seguimiento de cartera (Radicado, Valor Esperado, Valor Recobrado, Estado).
4. **Rigidez en Conceptos Fijos y Préstamos (Numerales 3.1, 3.2 y 3.7)**:
   - En vigilancia existen **Conceptos Fijos por Empleado** (ej. Aporte Cooperativa, Bono personal) y **Conceptos Fijos por Puesto/Dependencia** (ej. Auxilio de transporte extralegal o bono de riesgo que se gana proporcionalmente a los días que cualquier guarda trabaje en ese puesto).
5. **Dependencia de Archivos `.CSV` con Formato Rígido (`FIN, FIN` — Numeral 3.5)**:
   - En Pronos, para subir descuentos de cooperativas o novedades variables toca construir archivos planos sin validación previa.

---

### 1.2 Sinergia con Módulos Previos y con el Módulo de Programación de Turnos (`scheduling`)

1. **Reutilización y Sincronización con `UserClientAccess` y `Employee.clientHistory` (`SPEC-REG-013` y `SPEC-REG-015`)**:
   - Cuando se asigna o rota a un empleado hacia una `PayrollDependency` titular (`isPrimary = true`) que está vinculada a un `Client`, el servicio `PayrollShiftsService` actualiza automáticamente `Employee.clientId`, agrega la trazabilidad en `Employee.clientHistory` y activa el acceso en `UserClientAccess`, garantizando que el guarda pueda registrar minutas en ese puesto inmediatamente.
2. **Reutilización de `ServiceOrderPosition` (`SPEC-ADM-021`)**:
   - Cada `PayrollDependency` operativa conoce su `ServiceOrderPosition`, de donde lee la cantidad de guardas contratados (`quantityGuards`), el esquema de horario (`scheduleType`: `SCHEDULE_2X2X2`, `SCHEDULE_4X4X2`, `SCHEDULE_5X2`) y la modalidad de arma (`weaponModality`).
3. **Doble Enlace en la Navegación Dual-Rail (`navigationRegistry.ts`)**:
   - En **Dirección Financiera (`id: "finance"`)**:
     - Se activan los ítems **Novedades, Incapacidades y Préstamos** (`/finance/payroll/novelties`) y **Rotación de Puestos y Turnos** (`/finance/payroll/shifts`).
   - En **Programación de Turnos (`id: "scheduling"`)**:
     - El ítem **Malla de Turnos Operativos** (`sch-shift-management`) y **Asignación de Guardias** (`sch-guard-assignment`) pasan a estado `ACTIVE` apuntando a `/finance/payroll/shifts`, permitiendo que tanto el equipo de Operaciones/Programación como el de Nómina trabajen sobre la misma fuente única de verdad en tiempo real.

---

## 2. Arquitectura de Datos y Esquema Prisma (`security-crm-backend`)

### 2.1 Nuevos Enums en [`prisma/schema/enums.prisma`](file:///d:/projects/security-crm-backend/prisma/schema/enums.prisma)

```prisma
enum LeaveAndAbsenceType {
  SICK_LEAVE_EG               // Incapacidad Enfermedad General (Concepto 100 - Días 1-2 Empresa, 3+ EPS)
  WORK_ACCIDENT_AT            // Accidente de Trabajo / Enfermedad Laboral (Concepto 101 - 100% ARL desde día 1)
  MATERNITY_PATERNITY_LMA     // Licencia Maternidad / Paternidad (Concepto 102 - 100% EPS)
  PAID_LEAVE_LR               // Licencia Remunerada / Luto / Calamidad / Día Familia 110 (Concepto 103/110 - 100% Empresa)
  UNPAID_LEAVE_LNR            // Licencia No Remunerada (Afecta días trabajados e IBC según bandera LNR)
  DISCIPLINARY_SUSPENSION_SAN // Sanción Disciplinaria (Concepto 505 - Descuenta día y séptimo día)
  UNJUSTIFIED_ABSENCE_AUS     // Ausencia Injustificada / Turno No Laborado (Concepto 504 - Descuenta día y séptimo día)
  VACATION_TIME_VAC           // Vacaciones Disfrutadas en Tiempo (Concepto 105)
}

enum EpsClaimStatus {
  NOT_APPLICABLE              // No requiere recobro (ej. <= 2 días EG, Luto, Ausencia, Sanción)
  PENDING_FILING              // Pendiente de radicar ante EPS / ARL
  FILED_IN_AUDIT              // Radicada en auditoría médica / transcripción
  APPROVED_PENDING_PAYMENT    // Reconocida / Autorizada pendiente de giro
  PAID_RECOVERED              // Pagada por la EPS / ARL (Recobro exitoso)
  REJECTED                    // Negada / Glosada por la entidad
}

enum PayrollLoanStatus {
  ACTIVE                      // Vigente descontando en nómina
  PAUSED                      // Suspendido temporalmente para el próximo periodo
  PAID_OFF                    // Pagado en su totalidad (Saldo = 0)
  CANCELLED                   // Anulado
}

enum NoveltyPeriodicityRule {
  FIRST_FORTNIGHT             // Aplicar solo en 1ra Quincena / Anticipo
  SECOND_FORTNIGHT            // Aplicar solo en 2da Quincena / Cierre de Mes
  ALL_PERIODS                 // Aplicar en cada liquidación (Quincenal o Mensual)
}

enum PermanentConceptScope {
  BY_EMPLOYEE                 // Asignado directamente a un trabajador específico
  BY_DEPENDENCY               // Asignado a un puesto/dependencia (se liquida proporcional a días en ese puesto)
}

enum NoveltyOriginType {
  MANUAL                      // Digitada manualmente por analista
  CSV_IMPORT                  // Cargada mediante importador masivo
  SHIFT_ENGINE                // Generada automáticamente desde la Malla de Turnos
  LEAVE_ENGINE                // Generada por el liquidador de incapacidades/licencias
  LOAN_ENGINE                 // Cuota generada por el motor de préstamos
}

enum DependencyAssignmentRole {
  TITULAR                     // Guarda fijo / titular del puesto
  RELEVANTE                   // Guarda relevante / descansero (cubre descansos)
  SUPERVISOR                  // Supervisor / Coordinador asignado
  REFUERZO                    // Guarda enviado como refuerzo temporal o adicional
}

enum ShiftDayCode {
  D                           // Turno Diurno (ej. 06:00 a 18:00 - 12h)
  N                           // Turno Nocturno (ej. 18:00 a 06:00 - 12h)
  X                           // Descanso programado remunerado
  R                           // Turno de Refuerzo / Apoyo adicional (Facturable / Extra)
  INC                         // Incapacidad Enfermedad General
  AT                          // Incapacidad Accidente de Trabajo
  LMA                         // Licencia Maternidad / Paternidad
  LR                          // Licencia Remunerada / Día de la Familia
  LNR                         // Licencia No Remunerada
  SAN                         // Sanción Disciplinaria
  AUS                         // Ausencia Injustificada (Turno No Laborado 504)
  VAC                         // Vacaciones en tiempo
}
```

### 2.2 Parametrización de Incapacidades en [`prisma/schema/payroll_foundations.prisma`](file:///d:/projects/security-crm-backend/prisma/schema/payroll_foundations.prisma)
En el modelo `PayrollSettings`, se añaden los porcentajes parametrizables de incapacidad general:

```prisma
  // Porcentajes de Reconocimiento de Incapacidad Enfermedad General (Decreto 2943/2013 y Política Empresa)
  employerSickLeaveRatePct      Decimal @default(66.67) @db.Decimal(5, 2) // Días 1 y 2 a cargo empresa (66.67% ley o 100% política)
  epsSickLeaveRateDays3To90Pct  Decimal @default(66.67) @db.Decimal(5, 2) // Días 3 a 90 a cargo EPS (66.67% con piso 1 SMMLV)
  epsSickLeaveRateDays91To180Pct Decimal @default(50.00) @db.Decimal(5, 2) // Días 91 a 180 a cargo EPS (50.00% con piso 1 SMMLV)
```

### 2.3 Nuevos Modelos en [`prisma/schema/payroll_novelties_and_shifts.prisma`](file:///d:/projects/security-crm-backend/prisma/schema/payroll_novelties_and_shifts.prisma)

```prisma
// ============================================================================
// SPEC-ADM-030: ROTACIÓN DE PUESTOS, TURNOS, INCAPACIDADES, PRÉSTAMOS Y NOVEDADES
// ============================================================================

/// 1. Historial y Rotación de Puestos (Dependencias) por Empleado (Numeral 4.1 Pronos)
model EmployeeDependencyAssignment {
  id             String                   @id @default(cuid(2))
  tenantId       String
  tenant         Tenant                   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  employeeId     String
  employee       Employee                 @relation(fields: [employeeId], references: [id], onDelete: Cascade)

  dependencyId   String
  dependency     PayrollDependency        @relation(fields: [dependencyId], references: [id], onDelete: Restrict)

  branchId       String?
  branch         PayrollBranch?           @relation(fields: [branchId], references: [id], onDelete: SetNull)

  assignmentRole DependencyAssignmentRole @default(TITULAR)
  startDate      DateTime                 @db.Date
  endDate        DateTime?                @db.Date // null = asignación vigente activa
  isPrimary      Boolean                  @default(true)
  isActive       Boolean                  @default(true)
  notes          String?                  @db.Text

  createdAt      DateTime                 @default(now())
  updatedAt      DateTime                 @updatedAt
  createdById    String?
  updatedById    String?

  @@index([tenantId, employeeId, startDate])
  @@index([tenantId, dependencyId, isActive])
  @@map("employee_dependency_assignments")
}

/// 2. Registro y Liquidación de Incapacidades (CIE-10), Licencias, Sanciones y Ausentismos (Numerales 3.3 y 4.11 Pronos)
model PayrollLeaveAndAbsence {
  id                       String              @id @default(cuid(2))
  tenantId                 String
  tenant                   Tenant              @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  employeeId               String
  employee                 Employee            @relation(fields: [employeeId], references: [id], onDelete: Cascade)

  periodId                 String?
  period                   PayrollPeriod?      @relation(fields: [periodId], references: [id], onDelete: SetNull)

  leaveType                LeaveAndAbsenceType
  conceptId                String
  concept                  PayrollConcept      @relation(fields: [conceptId], references: [id], onDelete: Restrict)

  // Diagnóstico Médico CIE-10 y Prórrogas (Aplica para EG, AT, LMA)
  cie10Id                  String?
  cie10                    PayrollCie10?       @relation(fields: [cie10Id], references: [id], onDelete: SetNull)
  isExtension              Boolean             @default(false) // true = Prórroga (no reinicia días 1-2 empresa)
  parentLeaveId            String?
  accumulatedPriorDays     Int                 @default(0)     // Días acumulados previos en caso de prórroga

  // Fechas y Conteo de Días
  startDate                DateTime            @db.Date
  endDate                  DateTime            @db.Date
  totalDays                Int                 @default(1)
  employerDays             Int                 @default(0)     // Días a cargo de la empresa (ej. días 1 y 2 EG o LR)
  entityDays               Int                 @default(0)     // Días a cargo de EPS / ARL (ej. día 3 en adelante)

  // Valores Matemáticos de Liquidación (al centavo)
  baseSalaryMonthly        Decimal             @default(1750905.00) @db.Decimal(14, 2) // Salario / IBC base mensual
  ibcDailyValue            Decimal             @default(58363.50) @db.Decimal(12, 2)   // IBC diario = baseSalaryMonthly / 30
  employerRecognizedAmount Decimal             @default(0.00) @db.Decimal(14, 2)       // Valor pagado/asumido por empresa
  entityRecognizedAmount   Decimal             @default(0.00) @db.Decimal(14, 2)       // Valor a cargo de EPS / ARL
  totalLiquidatedAmount    Decimal             @default(0.00) @db.Decimal(14, 2)       // Total devengado (o descontado si es AUS/SAN)
  affectsSeventhDay        Boolean             @default(false)                         // Si descuenta dominical (Art. 173 CST)

  // Gestión de Recobro / Cartera ante EPS o ARL (Numeral 4.11 Pronos)
  entityId                 String?
  entity                   PayrollEntity?      @relation(fields: [entityId], references: [id], onDelete: SetNull)
  certificateNumber        String?             @db.VarChar(60) // Nro. incapacidad o radicado médico
  claimStatus              EpsClaimStatus      @default(NOT_APPLICABLE)
  filingDate               DateTime?           @db.Date        // Fecha de cobro / radicación
  paymentDate              DateTime?           @db.Date        // Fecha de pago efectivo por EPS/ARL
  reimbursedAmount         Decimal             @default(0.00) @db.Decimal(14, 2) // Valor efectivamente recobrado
  s3SupportKey             String?             @db.VarChar(500)
  fileName                 String?             @db.VarChar(255)
  notes                    String?             @db.Text

  shiftRecords             PayrollShiftRecord[]

  createdAt                DateTime            @default(now())
  updatedAt                DateTime            @updatedAt
  createdById              String?
  updatedById              String?

  @@index([tenantId, employeeId, startDate])
  @@index([tenantId, leaveType])
  @@index([tenantId, claimStatus])
  @@map("payroll_leaves_and_absences")
}

/// 3. Préstamos, Libranzas, Embargos y Descuentos por Cuotas (Numeral 3.1 Pronos)
model PayrollLoan {
  id                  String                 @id @default(cuid(2))
  tenantId            String
  tenant              Tenant                 @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  employeeId          String
  employee            Employee               @relation(fields: [employeeId], references: [id], onDelete: Cascade)

  conceptId           String
  concept             PayrollConcept         @relation(fields: [conceptId], references: [id], onDelete: Restrict)

  creditorEntityId    String?
  creditorEntity      PayrollEntity?         @relation(fields: [creditorEntityId], references: [id], onDelete: SetNull)

  loanCode            String                 @db.VarChar(40)  // Ej: "PR-2026-001"
  description         String                 @db.VarChar(180) // Ej: "Préstamo Calamidad" o "Libranza Cooperativa"
  disbursementDate    DateTime               @db.Date
  startDeductionDate  DateTime               @db.Date

  principalAmount     Decimal                @db.Decimal(14, 2) // Monto total prestado
  installmentAmount   Decimal                @db.Decimal(14, 2) // Valor cuota fija por periodo
  totalInstallments   Int                    @default(1)        // Número total de cuotas pactadas
  paidInstallments    Int                    @default(0)        // Cuotas ya descontadas
  totalPaidAmount     Decimal                @default(0.00) @db.Decimal(14, 2)
  remainingBalance    Decimal                @db.Decimal(14, 2) // Saldo pendiente actual

  deductionRule       NoveltyPeriodicityRule @default(ALL_PERIODS)
  status              PayrollLoanStatus      @default(ACTIVE)
  notes               String?                @db.Text

  installments        PayrollLoanInstallment[]

  createdAt           DateTime               @default(now())
  updatedAt           DateTime               @updatedAt
  createdById         String?
  updatedById         String?

  @@unique([tenantId, loanCode])
  @@index([tenantId, employeeId, status])
  @@map("payroll_loans")
}

/// Historial de Cuotas Descontadas o Abonadas de un Préstamo
model PayrollLoanInstallment {
  id                String         @id @default(cuid(2))
  tenantId          String
  tenant            Tenant         @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  loanId            String
  loan              PayrollLoan    @relation(fields: [loanId], references: [id], onDelete: Cascade)

  periodId          String?
  period            PayrollPeriod? @relation(fields: [periodId], references: [id], onDelete: SetNull)

  installmentNumber Int
  paymentDate       DateTime       @db.Date
  amount            Decimal        @db.Decimal(14, 2)
  balanceAfter      Decimal        @db.Decimal(14, 2)
  paymentMethod     String         @default("PAYROLL_DEDUCTION") @db.VarChar(40) // PAYROLL_DEDUCTION | MANUAL_PAYMENT
  notes             String?        @db.VarChar(255)

  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt
  createdById       String?
  updatedById       String?

  @@index([tenantId, loanId])
  @@map("payroll_loan_installments")
}

/// 4. Conceptos Fijos / Permanentes por Empleado o por Dependencia (Numerales 3.2 y 3.7 Pronos)
model PayrollPermanentConcept {
  id                   String                 @id @default(cuid(2))
  tenantId             String
  tenant               Tenant                 @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  scope                PermanentConceptScope  @default(BY_EMPLOYEE)

  employeeId           String?
  employee             Employee?              @relation(fields: [employeeId], references: [id], onDelete: Cascade)

  dependencyId         String?
  dependency           PayrollDependency?     @relation(fields: [dependencyId], references: [id], onDelete: Cascade)

  conceptId            String
  concept              PayrollConcept         @relation(fields: [conceptId], references: [id], onDelete: Restrict)

  amount               Decimal                @db.Decimal(14, 2) // Valor mensual o fijo
  isProportionalToDays Boolean                @default(true)     // Si true, calcula (amount / 30) * días trabajados
  applicationRule      NoveltyPeriodicityRule @default(ALL_PERIODS)
  validFrom            DateTime?              @db.Date
  validUntil           DateTime?              @db.Date
  isActive             Boolean                @default(true)
  notes                String?                @db.VarChar(255)

  createdAt            DateTime               @default(now())
  updatedAt            DateTime               @updatedAt
  createdById          String?
  updatedById          String?

  @@index([tenantId, scope, isActive])
  @@index([tenantId, employeeId])
  @@index([tenantId, dependencyId])
  @@map("payroll_permanent_concepts")
}

/// 5. Novedades Variables del Periodo, Horas Extras Manuales e Importación Masiva (Numerales 3.4 y 3.5 Pronos)
model PayrollPeriodNovelty {
  id           String             @id @default(cuid(2))
  tenantId     String
  tenant       Tenant             @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  periodId     String
  period       PayrollPeriod      @relation(fields: [periodId], references: [id], onDelete: Cascade)

  employeeId   String
  employee     Employee           @relation(fields: [employeeId], references: [id], onDelete: Cascade)

  dependencyId String?
  dependency   PayrollDependency? @relation(fields: [dependencyId], references: [id], onDelete: SetNull)

  conceptId    String
  concept      PayrollConcept     @relation(fields: [conceptId], references: [id], onDelete: Restrict)

  noveltyDate  DateTime           @db.Date
  quantity     Decimal            @default(1.00) @db.Decimal(10, 2) // Horas o Días
  unitValue    Decimal            @default(0.00) @db.Decimal(14, 2)
  totalValue   Decimal            @db.Decimal(14, 2)
  origin       NoveltyOriginType  @default(MANUAL)
  isProcessed  Boolean            @default(false)
  notes        String?            @db.VarChar(255)

  createdAt    DateTime           @default(now())
  updatedAt    DateTime           @updatedAt
  createdById  String?
  updatedById  String?

  @@index([tenantId, periodId, employeeId])
  @@index([tenantId, conceptId])
  @@map("payroll_period_novelties")
}

/// 6. Catálogo de Secuencias de Turno (Numeral 4.2 Pronos: 2X2X2, 4X2, 5X2, 6X1)
model PayrollShiftSequence {
  id                  String   @id @default(cuid(2))
  tenantId            String
  tenant              Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  code                String   @db.VarChar(30)  // Ej: "2X2X2", "4X2", "5X2", "6X1_D"
  name                String   @db.VarChar(120) // Ej: "Secuencia 2 Diurnos, 2 Nocturnos, 2 Descansos (12H)"
  patternJson         Json     @db.JsonB        // Ej: ["D", "D", "N", "N", "X", "X"]
  cycleDaysLength     Int      @default(6)      // Longitud del ciclo en días
  dayShiftHours       Int      @default(12)     // Horas por turno D
  nightShiftHours     Int      @default(12)     // Horas por turno N
  defaultDayStartTime String   @default("06:00") @db.VarChar(10)
  defaultNightStartTime String @default("18:00") @db.VarChar(10)
  isActive            Boolean  @default(true)

  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  createdById         String?
  updatedById         String?

  @@unique([tenantId, code])
  @@index([tenantId, isActive])
  @@map("payroll_shift_sequences")
}

/// 7. Registro Diario de Malla de Turnos y Refuerzos (Numerales 4.4, 4.6 y 4.7 Pronos)
model PayrollShiftRecord {
  id                   String                  @id @default(cuid(2))
  tenantId             String
  tenant               Tenant                  @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  employeeId           String
  employee             Employee                @relation(fields: [employeeId], references: [id], onDelete: Cascade)

  dependencyId         String
  dependency           PayrollDependency       @relation(fields: [dependencyId], references: [id], onDelete: Restrict)

  shiftDate            DateTime                @db.Date
  year                 Int
  month                Int                     // 1..12
  dayOfMonth           Int                     // 1..31

  shiftCode            ShiftDayCode            @default(D)
  isReinforcement      Boolean                 @default(false) // true = Refuerzo facturable al cliente / turno adicional
  isHolidayOrSunday    Boolean                 @default(false)

  // Desglose de Horas Calculadas del Día
  ordinaryDayHours     Decimal                 @default(0.00) @db.Decimal(5, 2)
  nightSurchargeHours  Decimal                 @default(0.00) @db.Decimal(5, 2) // RN (35%)
  sundayHolidayHours   Decimal                 @default(0.00) @db.Decimal(5, 2) // Dom/Fest (80%)
  overtimeDayHours     Decimal                 @default(0.00) @db.Decimal(5, 2) // HED (125%)
  overtimeNightHours   Decimal                 @default(0.00) @db.Decimal(5, 2) // HEN (175%)
  overtimeHolidayDayHours Decimal              @default(0.00) @db.Decimal(5, 2) // HEFD (205%)
  overtimeHolidayNightHours Decimal            @default(0.00) @db.Decimal(5, 2) // HEFN (255%)

  leaveId              String?
  leave                PayrollLeaveAndAbsence? @relation(fields: [leaveId], references: [id], onDelete: SetNull)

  notes                String?                 @db.VarChar(255)

  createdAt            DateTime                @default(now())
  updatedAt            DateTime                @updatedAt
  createdById          String?
  updatedById          String?

  @@unique([tenantId, employeeId, shiftDate, isReinforcement])
  @@index([tenantId, dependencyId, year, month])
  @@index([tenantId, employeeId, year, month])
  @@map("payroll_shift_records")
}
```

---

## 3. Migración SQL y Blindaje Multi-Tenant (`audit-extension.ts`)

1. **Archivo de Migración Obligatorio**:
   - Se generará y aplicará la migración formal en:
     `prisma/schema/migrations/20261029230000_payroll_novelties_loans_and_shifts/migration.sql`
   - Contendrá todos los `CREATE TYPE`, `ALTER TABLE "payroll_settings"`, `CREATE TABLE`, `CREATE UNIQUE INDEX`, `CREATE INDEX` y `ADD CONSTRAINT ... FOREIGN KEY` correspondientes a los 7 nuevos modelos.
2. **Registro en `src/common/prisma-extension/audit-extension.ts`**:
   - Se registrarán los 7 nuevos modelos en `auditableModels`, `multiTenantModels` y `commercialAuditModels`:
     - `'EmployeeDependencyAssignment'`
     - `'PayrollLeaveAndAbsence'`
     - `'PayrollLoan'`
     - `'PayrollLoanInstallment'`
     - `'PayrollPermanentConcept'`
     - `'PayrollPeriodNovelty'`
     - `'PayrollShiftSequence'`
     - `'PayrollShiftRecord'`

---

## 4. Motores Matemáticos Deterministas (`src/modules/payroll/engines/`)

### 4.1 `IncapacityAndLeaveEngine` (`incapacity-and-leave.engine.ts`)
Recibe como entrada:
- `leaveType`: `LeaveAndAbsenceType`
- `startDate` y `endDate` (`Date` / `YYYY-MM-DD`)
- `baseSalaryMonthly` (`number` — IBC / Salario básico mensual del guarda)
- `smmlv` (`number` — ej. `$1.750.905` en 2026, cuyo piso diario es `$1.750.905 / 30 = $58.363,50`)
- `employerSickLeaveRatePct` (`number` — ej. `66.67` o `100.00` desde `PayrollSettings`)
- `epsSickLeaveRateDays3To90Pct` (`number` — `66.67`)
- `epsSickLeaveRateDays91To180Pct` (`number` — `50.00`)
- `isExtension` (`boolean` — indica si es prórroga)
- `accumulatedPriorDays` (`number` — días acumulados antes de la prórroga)

**Reglas Exactas de Cálculo**:
1. `totalDays` = diferencia inclusiva de días calendario entre `startDate` y `endDate`.
2. `ibcDailyValue = round(baseSalaryMonthly / 30, 2)` y `smmlvDailyFloor = round(smmlv / 30, 2)`.
3. **Caso `SICK_LEAVE_EG` (Enfermedad General)**:
   - Para cada día $d \in [1 \dots \text{totalDays}]$, su índice cronológico en la incapacidad es `dayIndex = (isExtension ? accumulatedPriorDays : 0) + d`.
   - Si `dayIndex <= 2`:
     - Asume el **Empleador** (`employerDays++`).
     - Valor diario = $\max\left(\text{ibcDailyValue} \times \frac{\text{employerSickLeaveRatePct}}{100},\ \text{smmlvDailyFloor}\right)$.
   - Si `3 <= dayIndex <= 90`:
     - Asume la **EPS** (`entityDays++`).
     - Valor diario = $\max\left(\text{ibcDailyValue} \times \frac{\text{epsSickLeaveRateDays3To90Pct}}{100},\ \text{smmlvDailyFloor}\right)$.
   - Si `dayIndex >= 91`:
     - Asume la **EPS / AFP** (`entityDays++`).
     - Valor diario = $\max\left(\text{ibcDailyValue} \times \frac{\text{epsSickLeaveRateDays91To180Pct}}{100},\ \text{smmlvDailyFloor}\right)$.
   - `claimStatus` inicial = `entityDays > 0 ? PENDING_FILING : NOT_APPLICABLE`.
4. **Caso `WORK_ACCIDENT_AT` (Accidente de Trabajo / Enfermedad Laboral)**:
   - `employerDays = 0`, `entityDays = totalDays`.
   - Valor diario = `ibcDailyValue` ($100\%$).
   - `entityRecognizedAmount = round(ibcDailyValue * totalDays, 2)`.
   - `claimStatus` inicial = `PENDING_FILING`.
5. **Caso `MATERNITY_PATERNITY_LMA` (Licencia de Maternidad / Paternidad)**:
   - `employerDays = 0`, `entityDays = totalDays`.
   - Valor diario = `ibcDailyValue` ($100\%$).
   - `entityRecognizedAmount = round(ibcDailyValue * totalDays, 2)`.
   - `claimStatus` inicial = `PENDING_FILING`.
6. **Caso `PAID_LEAVE_LR` y `VACATION_TIME_VAC` (Licencia Remunerada / Luto / Día de la Familia `110` / Vacaciones)**:
   - `employerDays = totalDays`, `entityDays = 0`.
   - `employerRecognizedAmount = round(ibcDailyValue * totalDays, 2)`.
   - `claimStatus = NOT_APPLICABLE`.
7. **Caso `UNPAID_LEAVE_LNR`, `DISCIPLINARY_SUSPENSION_SAN` y `UNJUSTIFIED_ABSENCE_AUS` (Turno No Laborado `504`)**:
   - `employerDays = 0`, `entityDays = 0`.
   - En `SAN` y `AUS`, calcula el valor de descuento salarial por los días no laborados (`round(ibcDailyValue * totalDays, 2)`) y marca `affectsSeventhDay = true` por defecto.

### 4.2 `ShiftSequenceEngine` (`shift-sequence.engine.ts`)
Proyecta y calcula los turnos de un mes ($1 \dots 31$):
- Recibe el arreglo `pattern` (ej. `["D", "D", "N", "N", "X", "X"]`), el offset de inicio (`startStepOffset`: $0 \dots 5$), el año, el mes, el conjunto de fechas festivas del `ColombianHolidayEngine` y las licencias/incapacidades activas del empleado en ese mes.
- Si una fecha está cubierta por una `PayrollLeaveAndAbsence`, asigna automáticamente el código correspondiente (`INC`, `AT`, `LMA`, `LR`, `LNR`, `SAN`, `AUS`, `VAC`) y pone las horas laboradas en `0`.
- Si el turno es `D` (Diurno 12h: `06:00–18:00`):
  - En día ordinario (Lunes a Sábado no festivo): `ordinaryDayHours = 8`, `overtimeDayHours = 4`.
  - En Domingo o Festivo: `sundayHolidayHours = 8`, `overtimeHolidayDayHours = 4`.
- Si el turno es `N` (Nocturno 12h: `18:00–06:00`, cruzando jornada nocturna colombiana `19:00–06:00` o `21:00–06:00`):
  - Calcula las horas ordinarias, recargo nocturno (`RN 35%`), extras nocturnas (`HEN 175%`) y festivas nocturnas (`HEFN 255%`).

---

## 5. Contratos de API REST (`src/modules/payroll/controllers/`)

### 5.1 `PayrollNoveltiesController` (`/payroll/novelties`)
1. `GET /payroll/novelties/kpis`: Resumen ejecutivo del mes (Incapacidades activas, Cartera EPS/ARL pendiente por recobrar en `$ COP`, Saldo total de préstamos activos, Total novedades variables del periodo).
2. `POST /payroll/novelties/leaves/preview`: Pre-liquida en tiempo real una incapacidad o licencia sin guardarla aún en BD, devolviendo `totalDays`, `employerDays`, `entityDays`, `employerRecognizedAmount`, `entityRecognizedAmount` y `totalLiquidatedAmount`.
3. `GET /payroll/novelties/leaves`: Lista incapacidades, licencias, sanciones y ausentismos con filtros por empleado, tipo, estado de recobro EPS/ARL y rango de fechas.
4. `POST /payroll/novelties/leaves`: Registra la incapacidad/licencia, ejecuta el motor matemático y sincroniza automáticamente los días en `PayrollShiftRecord` (bloqueando los días con `INC`, `AT`, `VAC`, `AUS`, etc.).
5. `PATCH /payroll/novelties/leaves/:id/claim`: Actualiza el estado de recobro ante EPS/ARL (`claimStatus`, `certificateNumber`, `filingDate`, `paymentDate`, `reimbursedAmount`).
6. `DELETE /payroll/novelties/leaves/:id`: Elimina un registro de novedad de tiempo (si el periodo sigue abierto) y libera los días en la malla de turnos.
7. `GET /payroll/novelties/loans`: Lista préstamos, libranzas y embargos con su progreso de cuotas y saldo.
8. `POST /payroll/novelties/loans`: Crea un nuevo préstamo o libranza calculando el número de cuotas o valor de cuota.
9. `PATCH /payroll/novelties/loans/:id/status`: Pausa, reactiva o cancela un préstamo.
10. `POST /payroll/novelties/loans/:id/installments`: Registra un abono o descuento de cuota y actualiza `paidInstallments` y `remainingBalance` (cambiando el estado a `PAID_OFF` automáticamente cuando el saldo llega a $0$).
11. `GET /payroll/novelties/permanent-concepts`: Lista conceptos fijos filtrables por `scope` (`BY_EMPLOYEE` o `BY_DEPENDENCY`).
12. `POST /payroll/novelties/permanent-concepts` y `DELETE /payroll/novelties/permanent-concepts/:id`.
13. `GET /payroll/novelties/period-novelties`: Lista novedades variables y horas extras de un `periodId`.
14. `POST /payroll/novelties/period-novelties`, `POST /payroll/novelties/period-novelties/bulk-import` (cargue masivo validado por documento de identidad y código de concepto) y `DELETE /payroll/novelties/period-novelties/:id`.

### 5.2 `PayrollShiftsController` (`/payroll/shifts`)
1. `GET /payroll/shifts/sequences`: Lista el catálogo de secuencias de turno (`2X2X2`, `4X2`, `5X2`, `6X1`).
2. `POST /payroll/shifts/sequences`: Crea o actualiza una secuencia personalizada.
3. `GET /payroll/shifts/assignments`: Lista la rotación de puestos (`EmployeeDependencyAssignment`) por empleado o por dependencia.
4. `POST /payroll/shifts/assignments`: Asigna o rota a un empleado a una `PayrollDependency` desde `startDate` hasta `endDate`, cerrando automáticamente la asignación primaria anterior y sincronizando `Employee.clientId`, `Employee.clientHistory`, `UserClientAccess` y `EmployeePayrollProfile.primaryDependencyId`.
5. `GET /payroll/shifts/grid`: Retorna la matriz mensual ($1 \dots 31$) de turnos para una dependencia o grupo de empleados en un `year` y `month`, incluyendo el listado de festivos del mes y los totales por guarda (Días trabajados, Turnos D, Turnos N, Descansos, Refuerzos, Ausencias/Incapacidades y Horas).
6. `POST /payroll/shifts/generate-sequence`: Genera automáticamente la programación del mes para uno o varios guardas en una dependencia aplicando una secuencia (`2X2X2`, etc.) con el offset de inicio elegido, respetando los días donde el guarda ya tenga incapacidades o vacaciones.
7. `PUT /payroll/shifts/cell`: Actualiza en vivo una celda individual de la malla de turnos (día + empleado + dependencia), recalculando las horas del día o marcando un turno adicional como **Refuerzo (`isReinforcement = true`)**.

---

## 6. Experiencia de Usuario y Diseño Frontend (`security-crm-frontend`)

Siguiendo estrictamente la guía [`frontend-noxia-style-guide.md`](file:///d:/projects/security-crm-frontend/.specs/00-general-rules/frontend-noxia-style-guide.md) (*Deep Violet Tactical Enterprise*, fondo general `#F8FAFC`, tarjetas `#FFFFFF`, bordes `#E2E8F0`, acento `#7C3AED`, tipografía `JetBrains Mono` en cifras/códigos y `ResponsiveFormDrawer` bajo política *Zero-Dialog*):

### 6.1 Actualización de [`src/config/navigationRegistry.ts`](file:///d:/projects/security-crm-frontend/src/config/navigationRegistry.ts)
1. **En Dirección Financiera (`id: "finance"`)**:
   - `fin-payroll-novelties`: **"Novedades, Incapacidades y Préstamos"** $\rightarrow$ `/finance/payroll/novelties` (`ACTIVE`).
   - `fin-payroll-shifts`: **"Rotación de Puestos y Turnos"** $\rightarrow$ `/finance/payroll/shifts` (`ACTIVE`).
2. **En Programación de Turnos (`id: "scheduling"`)**:
   - `sch-shift-management`: **"Malla de Turnos Operativos"** pasa a `status: "ACTIVE"`, `path: "/finance/payroll/shifts"`, `permissions: ["payroll:shifts:read", "payroll:shifts:manage"]`.
   - `sch-guard-assignment`: **"Asignación y Rotación de Guardias"** pasa a `status: "ACTIVE"`, `path: "/finance/payroll/shifts?tab=assignments"`.
   - `sch-novedades`: **"Novedades e Indisposiciones"** pasa a `status: "ACTIVE"`, `path: "/finance/payroll/novelties"`.

### 6.2 Vista 1: `/finance/payroll/novelties/page.tsx` (Centro de Novedades, Incapacidades CIE-10 y Préstamos)
- **Cabecera Ejecutiva + 4 Tarjetas KPI**:
  1. *Incapacidades y Licencias del Mes* (Conteo + Días totales).
  2. *Cartera Pendiente EPS / ARL* (`$ COP` por recobrar en `JetBrains Mono`).
  3. *Saldo Activo de Préstamos y Libranzas* (`$ COP` y número de préstamos vigentes).
  4. *Novedades Variables del Periodo* (Devengos y deducciones puntuales registradas).
- **Navegación por 4 Pestañas Tácticas**:
  - **Pestaña 1 — Incapacidades (CIE-10), Licencias, Sanciones y Ausentismos**:
    - Tabla con trabajador, tipo de novedad (Chip semántico), diagnóstico CIE-10, fechas, desglose `Días Empresa / Días EPS-ARL`, valor liquidado y semáforo de **Recobro EPS/ARL** (`Pendiente`, `Radicada`, `Pagada`).
    - `ResponsiveFormDrawer` para registrar nueva incapacidad/licencia con **Simulador en Tiempo Real**: al elegir el empleado, el tipo (`EG`, `AT`, `LMA`, `LR`, `SAN`, `AUS`) y las fechas, muestra al instante cuánto asume la empresa y cuánto la EPS/ARL, respetando el parámetro `employerSickLeaveRatePct` (`66.67%` o `100%`) y el piso de 1 SMMLV diario.
    - `ResponsiveFormDrawer` de gestión de cartera para actualizar radicado y pago de EPS/ARL.
  - **Pestaña 2 — Préstamos, Libranzas y Cooperativas**:
    - Tabla con código de préstamo, empleado, concepto (`510` Préstamo / `511` Libranza), entidad acreedora, monto inicial, valor cuota, barra de progreso de cuotas (`paidInstallments / totalInstallments`), saldo pendiente, regla de descuento (1ra Quincena, 2da Quincena, Todos) y acciones (Pausar/Reactivar, Abonar cuota, Ver historial).
  - **Pestaña 3 — Conceptos Fijos / Permanentes (Por Empleado y Por Dependencia)**:
    - Selector de alcance (`Por Empleado` vs `Por Puesto / Dependencia`), permitiendo configurar bonos de puesto o deducciones recurrentes que el motor de liquidación de Fase 4 tomará automáticamente.
  - **Pestaña 4 — Novedades Variables del Periodo e Importador Masivo**:
    - Selector de `PayrollPeriod` abierto, registro rápido de horas extras/bonos/descuentos de almacén y Drawer de **Importación Masiva CSV/Excel** (Pegar desde Excel o subir `.csv` con `Documento;CodigoConcepto;Cantidad;ValorTotal;Observacion`).

### 6.3 Vista 2: `/finance/payroll/shifts/page.tsx` (Malla de Programación 24/7 y Rotación de Puestos)
- **Cabecera Ejecutiva + Controles de Periodo (Año / Mes / Dependencia)**.
- **Pestaña 1 — Malla Interactiva de Control de Turnos ($1 \dots 31$)**:
  - Grilla táctica con columnas congeladas para el Guarda y su Rol (`Titular`, `Relevante`, `Refuerzo`), seguida de las columnas de los días del mes ($1 \dots 31$, resaltando domingos y festivos de la Ley Emiliani en cabecera violeta/ámbar) y columnas de totalización a la derecha (`Días`, `D`, `N`, `X`, `R`, `Novedades`, `Horas`).
  - Clic sobre cualquier celda para cambiar rápidamente el turno (`D`, `N`, `X`, `R` Refuerzo, `AUS` Ausencia) o botón **"Generar por Secuencia (2x2x2 / 4x2)"** en un `ResponsiveFormDrawer` que proyecta todo el mes en 1 clic.
- **Pestaña 2 — Historial y Rotación de Puestos por Empleado (`EmployeeDependencyAssignment`)**:
  - Permite visualizar y registrar los traslados de puesto con fecha exacta de inicio y fin (sincronizando automáticamente el acceso del guarda a las minutas del cliente).
- **Pestaña 3 — Catálogo de Secuencias Operativas (`2X2X2`, `4X2`, `5X2`, `6X1`)**:
  - Configuración visual de los ciclos de programación.

### 6.4 Parámetro de Incapacidad en `/finance/payroll/settings/page.tsx`
- En la Pestaña 1 de Configuración Legal, se añade el campo numérico **`% Reconocimiento Empresa Incapacidad EG (Días 1 y 2)`** (`employerSickLeaveRatePct`: `66.67%` o `100.00%`).

---

## 7. Permisos RBAC y Semillas (`prisma/seed.ts` y `prisma/seed-payroll.ts`)

1. **Permisos Nuevos en `prisma/seed.ts`**:
   - `payroll:novelties:read`
   - `payroll:novelties:manage`
   - `payroll:shifts:read`
   - `payroll:shifts:manage`
   Asignados automáticamente a los roles `GODLIKE` y `ADMIN` de todos los tenants activos.
2. **Datos Semilla en `prisma/seed-payroll.ts`**:
   - Semilla de las secuencias estándar de vigilancia en `PayrollShiftSequence`:
     - `2X2X2`: `["D", "D", "N", "N", "X", "X"]` (Ciclo 6 días, 12h)
     - `4X2`: `["D", "D", "D", "D", "X", "X"]` (Ciclo 6 días, 12h)
     - `5X2`: `["D", "D", "D", "D", "D", "X", "X"]` (Ciclo 7 días, Administrativo/Operativo)
     - `6X1`: `["D", "D", "D", "D", "D", "D", "X"]` (Ciclo 7 días)
   - Semilla de asignaciones iniciales en `EmployeeDependencyAssignment`, un ejemplo de incapacidad con CIE-10 en `PayrollLeaveAndAbsence`, un préstamo activo en `PayrollLoan` y un concepto fijo en `PayrollPermanentConcept`.

---

## 8. Criterios de Aceptación y Matriz de Verificación (Quality Gates)

- [x] **Gate 1 — Prisma Schema & Migration**: Validación `npx.cmd prisma validate` exitosa y archivo SQL de migración creado y desplegado en `prisma/schema/migrations/20261029230000_payroll_novelties_loans_and_shifts/migration.sql`.
- [x] **Gate 2 — Blindaje ALS (`audit-extension.ts`)**: Los nuevos modelos registrados en `auditableModels`, `multiTenantModels` y `commercialAuditModels`, con `audit-extension.spec.ts` en verde.
- [x] **Gate 3 — Cobertura de Pruebas Unitarias ($\ge 80\%$)**: Suites unitarias para `IncapacityAndLeaveEngine`, `ShiftSequenceEngine`, `PayrollNoveltiesService`, `PayrollShiftsService` y sus controladores.
- [x] **Gate 4 — Cero Errores de Compilación y Linter**: `npx.cmd tsc --noEmit` y `npm.cmd run lint` con `0` errores en `security-crm-backend` y `security-crm-frontend`.
- [x] **Gate 5 — Fidelidad Visual NOXIA Style Guide & Enlace Dual**: Verificación de vistas `/finance/payroll/novelties` y `/finance/payroll/shifts` enlazadas tanto en **Dirección Financiera** como en **Programación de Turnos**.
- [x] **Gate 6 — Prevención de Context Rot**: Registro detallado de las decisiones arquitectónicas de la Fase 3 en `.specs/ai-decisions.log`.

