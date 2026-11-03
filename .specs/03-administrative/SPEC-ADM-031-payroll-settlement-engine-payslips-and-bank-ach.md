# SPEC-ADM-031: Motor Central de Liquidación de Nómina, Gestión Salarial con Historial, Anticipos Quincenales, Desprendibles PDF en Perfil y Dispersión Bancaria ACH

> **Estado**: `IMPLEMENTADO`  
> **Módulo**: `administrative` / `payroll` (Ubicado en Dirección Financiera)  
> **Fase del Roadmap de Nómina**: **Fase 4 de 6 (+20% $\rightarrow$ 70% Acumulado del Módulo Integral)**  
> **Ubicación Frontend**:
> - `src/app/(protected)/finance/payroll/settlement/page.tsx`
> - `src/app/(protected)/finance/payroll/employees/page.tsx` (Ampliación con Modo Salarial `MINIMUM_WAGE`, Calculadora de Aumento Salarial Individual y Pestaña 6: Desprendibles e Historial Salarial)
> - `src/app/(protected)/finance/payroll/settings/page.tsx` (Propagación automática de cambio de SMMLV)
> - `src/lib/api/payroll-settlement.ts`
> - `src/lib/api/payroll-employees.ts`
> - `src/config/navigationRegistry.ts` (Dirección Financiera `id: "finance"`)
> **Ubicación Backend**:
> - `prisma/schema/payroll_settlement.prisma`
> - `prisma/schema/payroll_foundations.prisma`
> - `prisma/schema/payroll_employees.prisma`
> - `prisma/schema/payroll_novelties_and_shifts.prisma`
> - `prisma/schema/enums.prisma`
> - `prisma/schema/employee.prisma`
> - `prisma/schema/tenant.prisma`
> - `prisma/schema/migrations/20261030120000_payroll_settlement_advances_and_ach/migration.sql`
> - `src/common/prisma-extension/audit-extension.ts`
> - `src/common/mail/mail.interfaces.ts` y `src/common/mail/mail.service.ts`
> - `src/modules/payroll/engines/payroll-liquidation.engine.ts`
> - `src/modules/payroll/engines/bank-ach-generator.engine.ts`
> - `src/modules/payroll/services/payroll-payslip-pdf.service.ts`
> - `src/modules/payroll/services/payroll-settlement.service.ts`
> - `src/modules/payroll/services/payroll-employees.service.ts`
> - `src/modules/payroll/services/payroll-settings.service.ts`
> - `src/modules/payroll/controllers/payroll-settlement.controller.ts`
> - `src/modules/payroll/controllers/payroll-employees.controller.ts`
> - `src/modules/payroll/dtos/payroll-settlement.dto.ts`
> - `src/modules/payroll/dtos/payroll-employee-dossier.dto.ts`
> - `prisma/seed.ts` y `prisma/seed-payroll.ts`
> **Fecha de Creación**: `2026-10-30`  
> **Autor**: Antigravity (Senior Software Architect, Legal/Labor & Accounting Specialist)  
> **Referencias Base**: `csv_templates/roadmap_nomina.md` (Fase 4) y `csv_templates/Manual de usuario PRONOS.pdf` (Capítulos 3 y 7: Numerales `3.6`, `3.8`, `3.9`, `3.10`, `7.1` y `7.2`)

---

## 1. Contexto de Negocio, Jurídico, Contable y Diagnóstico

### 1.1 Diagnóstico Operativo del Motor de Liquidación en Vigilancia y Seguridad Privada
Habiendo completado los cimientos paramétricos (**Fase 1 — `SPEC-ADM-028`**), el expediente laboral 360° y cumplimiento SVSP (**Fase 2 — `SPEC-ADM-029`**) y la programación de turnos 24/7 junto con incapacidades CIE-10, préstamos y novedades (**Fase 3 — `SPEC-ADM-030`**), la **Fase 4** construye el corazón matemático y financiero del módulo: **El Motor Central de Liquidación de Nómina, Gestión Salarial, Emisión de Desprendibles PDF y Dispersión Bancaria ACH**.

En el sector de vigilancia privada en Colombia, la liquidación de nómina presenta seis particularidades críticas que un software estándar no resuelve y que en **Pronos** requerían procesos manuales propensos a error:

1. **Liquidación Multi-Puesto por Tramos de Días en Base Comercial de 30 Días**:
   - Un guarda relevante o polivalente puede laborar del día 1 al 10 en el *Puesto A* (`$1.900.000` garantizado en `2X2X2`), del 11 al 20 en el *Puesto B* (`$2.100.000` garantizado) y del 21 al 31 como *Supervisor* (`$2.400.000`).
   - En Colombia, el mes comercial laboral para efectos salariales y de cotización a Seguridad Social es siempre de **30 días** (tanto en febrero de 28/29 días como en meses de 31 días). El motor debe normalizar automáticamente los tramos del periodo a base **30 días laborales**, descontando únicamente los días efectivos de incapacidad, licencia o ausencia ocurridos en cada tramo e imputando cada peso al centro de costo (`PayrollDependency` / `Client`) exacto donde se causó.
2. **Gobierno Salarial Claro: Empleados por Puesto (`BY_DEPENDENCY`), Salario Mínimo Legal Automático (`MINIMUM_WAGE`) y Salario Fijo Personalizado (`CUSTOM_FIXED`) con Historial de Aumentos**:
   - En la práctica administrativa de nómina, existen tres realidades contractuales:
     - **Guardas Operativos por Puesto (`BY_DEPENDENCY`)**: Ganan según la ficha financiera de la dependencia donde presten servicio.
     - **Personal contratado a 1 SMMLV (`MINIMUM_WAGE`)**: Trabajadores cuyo contrato pacta explícitamente *"1 Salario Mínimo Mensual Legal Vigente"*. Cuando el administrador actualiza el SMMLV en `/finance/payroll/settings` al iniciar el año, todos los empleados en `MINIMUM_WAGE` (así como cualquier salario o dependencia que haya quedado por debajo del nuevo mínimo legal según el **Art. 148 CST**) deben nivelarse automáticamente en la misma transacción dejando rastro de auditoría.
     - **Personal con Sueldo Fijo Personalizado (`CUSTOM_FIXED`)**: Supervisores, escoltas, coordinadores o personal administrativo con salarios superiores (ej. `$2.800.000`). Cuando reciben un **aumento salarial individual** a mitad de año (por ascenso, mérito o IPC), el sistema debe permitir aplicarlo por **porcentaje (`+%`)** o por **nuevo valor fijo (`$ COP`)** y conservar la bitácora histórica (`EmployeeSalaryHistory`) con salario anterior, nuevo salario, porcentaje de variación, fecha efectiva y motivo.
3. **Control Automático del Tope del 40% No Salarial de la UGPP (Art. 30 Ley 1393 de 2010)**:
   - Los pagos pactados como no constitutivos de salario (`isConstitutiveOfSalary = false` y bandera `inUgpp40Pct = true`, tales como bonificaciones ocasionales o auxilios extralegales, excluyendo el auxilio de transporte legal) no pueden superar el **$40\%$ del total de la remuneración** ($S + NS$). Todo valor que exceda ese $40\%$ debe sumarse automáticamente al Ingreso Base de Cotización (**IBC**) de Salud, Pensión y ARL.
4. **Cálculo Normativo de Seguridad Social, Fondo de Solidaridad Pensional (FSP), Retención en la Fuente (Art. 383 E.T.) y Exoneración Ley 1607 (Art. 114-1 E.T.)**:
   - **Aportes del Trabajador**: Salud ($4\%$) y Pensión ($4\%$) sobre el IBC (exentos para aprendices SENA; pensión exenta para pensionados activos).
   - **Fondo de Solidaridad Pensional (FSP — Art. 27 Ley 100 de 1993)**: Para trabajadores con $\text{IBC} \ge 4\text{ SMMLV}$, se descuenta la tarifa progresiva legal ($1.0\%$ de $4$ a $16\text{ SMMLV}$; $1.2\%$ de $16$ a $17$; $1.4\%$ de $17$ a $18$; $1.6\%$ de $18$ a $19$; $1.8\%$ de $19$ a $20$; y $2.0\%$ para $> 20\text{ SMMLV}$).
   - **Retención en la Fuente Salarios (Art. 383 E.T. — Procedimiento 1)**: Depuración automática restando ingresos no constitutivos de renta (Salud, Pensión, FSP), aplicando el $25\%$ de renta exenta laboral (con tope en UVT) y evaluando la tabla marginal en UVT ($> 95\text{ UVT}$).
   - **Aportes Patronales y Parafiscales**: Aplicación automática de la exoneración del **Art. 114-1 del Estatuto Tributario** (si devenga menos de $10\text{ SMMLV}$, el empleador está exonerado de Salud Patronal $8.5\%$, SENA $2\%$ e ICBF $3\%$, cotizando únicamente Pensión Patronal $12\%$, ARL según Clase de Riesgo `I` a `V` y Caja de Compensación $4\%$).
5. **Liquidación de Anticipos Quincenales (Día 15) y Cruce Automático en Cierre de Mes (Numeral 3.6 Pronos)**:
   - Las empresas con modalidad `MONTHLY_WITH_ADVANCE` pagan el día 15 un anticipo (ej. $40\%$ del básico o un valor fijo personalizado `customAdvanceValue`), descontando proporcionalmente las ausencias o licencias no remuneradas ocurridas entre el día 1 y el 15 (`deductAbsencesInAdvance = true`). Al liquidar el cierre de mes (día 30), el motor cruza y descuenta automáticamente ese anticipo bajo el Concepto `509` (*Anticipo de Quincena*).
6. **Desprendibles PDF Corporativos (Anexados al Perfil del Empleado + Envío por Email) y Dispersión Multi-Banco ACH**:
   - Cada liquidación debe generar su comprobante oficial en `.PDF` (con código QR, opción de agrupar horas extras en un solo renglón, envío por correo electrónico vía `MailService` con el PDF adjunto y **anexo automático dentro del Expediente 360° del empleado** para consulta permanente).
   - Para tesorería, el generador bancario debe emitir los archivos planos `.TXT` / `.CSV` según la estructura de cada banco (`Bancolombia PAB`, `Davivienda`, `Banco Caja Social`, `Banco de Bogotá`, `ACH Estándar`) alertando preventivamente si algún trabajador carece de número de cuenta.

---

## 2. Arquitectura de Datos y Esquema Prisma (`security-crm-backend`)

### 2.1 Nuevos Enums y Actualizaciones en [`prisma/schema/enums.prisma`](file:///d:/projects/security-crm-backend/prisma/schema/enums.prisma)

Se amplía `EmployeeSalaryMode` con el valor `MINIMUM_WAGE` y se agregan los siguientes enums de liquidación:

```prisma
enum EmployeeSalaryMode {
  BY_DEPENDENCY          // Liquida según el Valor Pagado / Modalidad de la Dependencia donde labore
  MINIMUM_WAGE           // Liquida con 1 SMMLV vigente y se actualiza automáticamente al modificar el SMMLV general
  CUSTOM_FIXED           // Liquida según el Sueldo Básico Fijo pactado individualmente en la Hoja de Vida
}

// ============================================================================
// SPEC-ADM-031: MOTOR DE LIQUIDACIÓN DE NÓMINA, ANTICIPOS, PDF Y BANCOS ACH
// ============================================================================

enum SalaryAdjustmentOrigin {
  INITIAL_CONTRACT       // Asignación salarial al crear o configurar el contrato
  INDIVIDUAL_INCREASE    // Aumento o ajuste salarial individual (% o valor fijo)
  SMMLV_GLOBAL_UPDATE    // Nivelación automática por actualización de SMMLV en Configuración Legal
}

enum PayrollSettlementStatus {
  DRAFT                  // Pre-nómina en borrador (editable y reliquidable)
  APPROVED               // Aprobada lista para dispersión bancaria
  PAID                   // Cerrada, pagada y bloqueada
  ANNULLED               // Anulada
}

enum PayrollLineOrigin {
  DEPENDENCY_SPAN        // Sueldo básico proporcional por tramo de puesto
  MODALITY_GUARANTEED    // Desglose porcentual de modalidad de turno garantizada
  SHIFT_SCHEDULE         // Horas reales de recargos/extras desde malla 1..31
  REINFORCEMENT          // Turnos adicionales de refuerzo (R)
  TRANSPORT_ALLOWANCE    // Auxilio de transporte legal proporcional
  SEVENTH_DAY_DEDUCTION  // Descuento dominical por sanción o ausencia (Art. 173 CST)
  LEAVE_OR_INCAPACITY    // Incapacidad CIE-10, licencia o vacaciones disfrutadas
  PERMANENT_CONCEPT      // Concepto fijo por empleado o por dependencia
  PERIOD_NOVELTY         // Novedad variable puntual o importada por CSV
  LOAN_INSTALLMENT       // Cuota descontada de préstamo o libranza
  FORTNIGHT_ADVANCE      // Descuento de anticipo quincenal del día 15 (Concepto 509)
  SOCIAL_SECURITY        // Aporte Salud, Pensión, FSP o Retención en la Fuente
  MANUAL_OVERRIDE        // Ajuste manual aplicado por el analista en Pre-Nómina
}

enum PayslipDeliveryStatus {
  NOT_SENT               // Pendiente de envío por correo
  SENT                   // Enviado exitosamente con PDF adjunto
  FAILED                 // Falló el despacho al correo
  NO_EMAIL               // El empleado no tiene correo electrónico registrado
}

enum PayrollDisbursementType {
  PAYROLL_PERIOD         // Dispersión de Nómina del Periodo
  FORTNIGHT_ADVANCE      // Dispersión de Anticipo Quincenal (Día 15)
}
```

---

### 2.2 Nuevo Archivo de Esquema [`prisma/schema/payroll_settlement.prisma`](file:///d:/projects/security-crm-backend/prisma/schema/payroll_settlement.prisma)

Contendrá los **6 modelos** de la Fase 4:

```prisma
// ============================================================================
// SPEC-ADM-031: MOTOR DE LIQUIDACIÓN DE NÓMINA, HISTORIAL SALARIAL, ANTICIPOS Y BANCOS
// ============================================================================

/// 1. Historial de Aumentos y Ajustes Salariales por Empleado
model EmployeeSalaryHistory {
  id              String                 @id @default(cuid(2))
  tenantId        String
  tenant          Tenant                 @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  employeeId      String
  employee        Employee               @relation(fields: [employeeId], references: [id], onDelete: Cascade)

  salaryMode      EmployeeSalaryMode     @default(CUSTOM_FIXED)
  previousSalary  Decimal                @db.Decimal(14, 2)
  newSalary       Decimal                @db.Decimal(14, 2)
  variationPct    Decimal                @default(0.00) @db.Decimal(6, 2) // Porcentaje de incremento (ej. 9.50%)
  effectiveDate   DateTime               @db.Date
  origin          SalaryAdjustmentOrigin @default(INDIVIDUAL_INCREASE)
  reason          String                 @db.VarChar(255) // Ej: "Ascenso a Supervisor", "Nivelación IPC", "Actualización SMMLV 2026"

  createdAt       DateTime               @default(now())
  updatedAt       DateTime               @updatedAt
  createdById     String?
  updatedById     String?

  @@index([tenantId, employeeId, effectiveDate])
  @@map("employee_salary_histories")
}

/// 2. Cabecera de Liquidación de Anticipos Quincenales (Día 15 — Numeral 3.6 Pronos)
model PayrollAdvanceSettlement {
  id              String                  @id @default(cuid(2))
  tenantId        String
  tenant          Tenant                  @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  year            Int
  month           Int                     // 1..12
  cutoffDate      DateTime                @db.Date // Usualmente día 15 del mes
  paymentDate     DateTime?               @db.Date
  status          PayrollSettlementStatus @default(DRAFT)
  totalEmployees  Int                     @default(0)
  totalAmount     Decimal                 @default(0.00) @db.Decimal(16, 2)
  notes           String?                 @db.Text

  items           PayrollAdvanceItem[]
  achBatches      PayrollBankDisbursementBatch[]

  createdAt       DateTime                @default(now())
  updatedAt       DateTime                @updatedAt
  createdById     String?
  updatedById     String?

  @@unique([tenantId, year, month])
  @@index([tenantId, status])
  @@map("payroll_advance_settlements")
}

/// 3. Detalle por Empleado de Anticipo Quincenal (Día 15)
model PayrollAdvanceItem {
  id                       String                   @id @default(cuid(2))
  tenantId                 String
  tenant                   Tenant                   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  advanceSettlementId      String
  advanceSettlement        PayrollAdvanceSettlement @relation(fields: [advanceSettlementId], references: [id], onDelete: Cascade)

  employeeId               String
  employee                 Employee                 @relation(fields: [employeeId], references: [id], onDelete: Cascade)

  dependencyId             String?
  dependency               PayrollDependency?       @relation(fields: [dependencyId], references: [id], onDelete: SetNull)

  baseSalary               Decimal                  @db.Decimal(14, 2)
  advancePctApplied        Decimal                  @default(0.40) @db.Decimal(5, 4)
  workedDaysFirstFortnight Int                      @default(15) // 0..15
  absenceDaysDeducted      Int                      @default(0)
  calculatedAmount         Decimal                  @db.Decimal(14, 2)
  approvedAmount           Decimal                  @db.Decimal(14, 2) // Editable por analista
  isManuallyEdited         Boolean                  @default(false)
  isDeductedInPayroll      Boolean                  @default(false) // true cuando se cruza en el cierre mensual (Concepto 509)

  bankId                   String?
  bank                     PayrollBank?             @relation(fields: [bankId], references: [id], onDelete: SetNull)
  bankAccountType          BankAccountType          @default(SAVINGS)
  bankAccountNumber        String?                  @db.VarChar(50)
  hasBankWarning           Boolean                  @default(false)
  notes                    String?                  @db.VarChar(255)

  createdAt                DateTime                 @default(now())
  updatedAt                DateTime                 @updatedAt
  createdById              String?
  updatedById              String?

  @@unique([advanceSettlementId, employeeId])
  @@index([tenantId, employeeId])
  @@map("payroll_advance_items")
}

/// 4. Cabecera de Liquidación de Nómina por Empleado en un Periodo (Numerales 3.8 y 3.9 Pronos)
model PayrollPeriodSettlement {
  id                          String                  @id @default(cuid(2))
  tenantId                    String
  tenant                      Tenant                  @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  periodId                    String
  period                      PayrollPeriod           @relation(fields: [periodId], references: [id], onDelete: Cascade)

  employeeId                  String
  employee                    Employee                @relation(fields: [employeeId], references: [id], onDelete: Cascade)

  primaryDependencyId         String?
  primaryDependency           PayrollDependency?      @relation(fields: [primaryDependencyId], references: [id], onDelete: SetNull)

  branchId                    String?
  branch                      PayrollBranch?          @relation(fields: [branchId], references: [id], onDelete: SetNull)

  status                      PayrollSettlementStatus @default(DRAFT)
  salaryModeSnapshot          EmployeeSalaryMode      @default(BY_DEPENDENCY)
  baseSalaryMonthly           Decimal                 @default(1750905.00) @db.Decimal(14, 2)

  // Conteo de Días del Periodo (Normalizado a Base 30 Días Comerciales)
  workedDays                  Int                     @default(30)
  paidLeaveDays               Int                     @default(0)
  incapacityDays              Int                     @default(0)
  vacationDays                Int                     @default(0)
  unpaidAbsenceDays           Int                     @default(0)
  seventhDaysLost             Int                     @default(0)

  // Totales de Devengos
  basicSalaryEarned           Decimal                 @default(0.00) @db.Decimal(14, 2)
  transportAllowanceAmount    Decimal                 @default(0.00) @db.Decimal(14, 2)
  overtimeAndSurchargesAmount Decimal                 @default(0.00) @db.Decimal(14, 2)
  leavesAndIncapacitiesAmount Decimal                 @default(0.00) @db.Decimal(14, 2)
  bonusesNonSalarialAmount    Decimal                 @default(0.00) @db.Decimal(14, 2)
  otherEarningsAmount         Decimal                 @default(0.00) @db.Decimal(14, 2)
  totalEarnings               Decimal                 @default(0.00) @db.Decimal(14, 2)

  // Regla del 40% UGPP (Art. 30 Ley 1393 de 2010)
  ugppTotalRemuneration       Decimal                 @default(0.00) @db.Decimal(14, 2)
  ugppLimit40Pct              Decimal                 @default(0.00) @db.Decimal(14, 2)
  ugppNonSalarialTotal        Decimal                 @default(0.00) @db.Decimal(14, 2)
  ugppExcessAmount            Decimal                 @default(0.00) @db.Decimal(14, 2)

  // Ingreso Base de Cotización (IBCs)
  ibcEps                      Decimal                 @default(0.00) @db.Decimal(14, 2)
  ibcAfp                      Decimal                 @default(0.00) @db.Decimal(14, 2)
  ibcArl                      Decimal                 @default(0.00) @db.Decimal(14, 2)
  ibcCcf                      Decimal                 @default(0.00) @db.Decimal(14, 2)

  // Deducciones y Retenciones del Trabajador
  healthEmployeeAmount        Decimal                 @default(0.00) @db.Decimal(14, 2) // 4%
  pensionEmployeeAmount       Decimal                 @default(0.00) @db.Decimal(14, 2) // 4%
  fspAmount                   Decimal                 @default(0.00) @db.Decimal(14, 2) // 1% a 2% (>= 4 SMMLV)
  withholdingTaxAmount        Decimal                 @default(0.00) @db.Decimal(14, 2) // Retefuente Art. 383 E.T.
  loansDeductionAmount        Decimal                 @default(0.00) @db.Decimal(14, 2)
  advanceDeductionAmount      Decimal                 @default(0.00) @db.Decimal(14, 2) // Anticipo día 15
  otherDeductionsAmount       Decimal                 @default(0.00) @db.Decimal(14, 2)
  totalDeductions             Decimal                 @default(0.00) @db.Decimal(14, 2)
  netPayAmount                Decimal                 @default(0.00) @db.Decimal(14, 2) // Neto a pagar

  // Aportes Patronales y Parafiscales Causados (Ley 1607 Art. 114-1 E.T.)
  isExoneratedLaw1607         Boolean                 @default(true)
  employerHealthAmount        Decimal                 @default(0.00) @db.Decimal(14, 2)
  employerPensionAmount       Decimal                 @default(0.00) @db.Decimal(14, 2)
  employerArlAmount           Decimal                 @default(0.00) @db.Decimal(14, 2)
  employerCcfAmount           Decimal                 @default(0.00) @db.Decimal(14, 2)
  employerSenaAmount          Decimal                 @default(0.00) @db.Decimal(14, 2)
  employerIcbfAmount          Decimal                 @default(0.00) @db.Decimal(14, 2)
  totalEmployerCost           Decimal                 @default(0.00) @db.Decimal(14, 2)

  // Snapshot Bancario y Trazabilidad de Desprendible PDF
  bankId                      String?
  bank                        PayrollBank?            @relation(fields: [bankId], references: [id], onDelete: SetNull)
  bankAccountType             BankAccountType         @default(SAVINGS)
  bankAccountNumber           String?                 @db.VarChar(50)
  hasBankWarning              Boolean                 @default(false)

  payslipEmailStatus          PayslipDeliveryStatus   @default(NOT_SENT)
  payslipSentAt               DateTime?
  isManuallyEdited            Boolean                 @default(false)
  notes                       String?                 @db.Text

  lines                       PayrollSettlementLine[]

  createdAt                   DateTime                @default(now())
  updatedAt                   DateTime                @updatedAt
  createdById                 String?
  updatedById                 String?

  @@unique([tenantId, periodId, employeeId])
  @@index([tenantId, periodId, status])
  @@index([tenantId, employeeId])
  @@map("payroll_period_settlements")
}

/// 5. Renglones Detallados de Liquidación por Concepto y Dependencia
model PayrollSettlementLine {
  id                     String                  @id @default(cuid(2))
  tenantId               String
  tenant                 Tenant                  @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  settlementId           String
  settlement             PayrollPeriodSettlement @relation(fields: [settlementId], references: [id], onDelete: Cascade)

  periodId               String
  period                 PayrollPeriod           @relation(fields: [periodId], references: [id], onDelete: Cascade)

  employeeId             String
  employee               Employee                @relation(fields: [employeeId], references: [id], onDelete: Cascade)

  conceptId              String
  concept                PayrollConcept          @relation(fields: [conceptId], references: [id], onDelete: Restrict)

  dependencyId           String?
  dependency             PayrollDependency?      @relation(fields: [dependencyId], references: [id], onDelete: SetNull)

  nature                 PayrollConceptNature
  origin                 PayrollLineOrigin       @default(DEPENDENCY_SPAN)
  quantity               Decimal                 @default(1.00) @db.Decimal(10, 2) // Días u Horas
  unitValue              Decimal                 @default(0.00) @db.Decimal(14, 2)
  totalValue             Decimal                 @default(0.00) @db.Decimal(14, 2)

  // Snapshot de Banderas Base para Recálculo Instantáneo
  isConstitutiveOfSalary Boolean                 @default(true)
  isDeletable            Boolean                 @default(true)
  inIbcEpsAfp            Boolean                 @default(false)
  inIbcArl               Boolean                 @default(false)
  inIbcCcf               Boolean                 @default(false)
  inUgpp40Pct            Boolean                 @default(false)

  loanId                 String?
  loan                   PayrollLoan?            @relation(fields: [loanId], references: [id], onDelete: SetNull)

  leaveId                String?
  leave                  PayrollLeaveAndAbsence? @relation(fields: [leaveId], references: [id], onDelete: SetNull)

  isManualOverride       Boolean                 @default(false)
  notes                  String?                 @db.VarChar(255)

  createdAt              DateTime                @default(now())
  updatedAt              DateTime                @updatedAt
  createdById            String?
  updatedById            String?

  @@index([tenantId, settlementId])
  @@index([tenantId, periodId, dependencyId])
  @@index([tenantId, employeeId])
  @@map("payroll_settlement_lines")
}

/// 6. Historial de Lotes de Dispersión Bancaria ACH (Numeral 7.1 Pronos)
model PayrollBankDisbursementBatch {
  id                         String                   @id @default(cuid(2))
  tenantId                   String
  tenant                     Tenant                   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  disbursementType           PayrollDisbursementType  @default(PAYROLL_PERIOD)

  periodId                   String?
  period                     PayrollPeriod?           @relation(fields: [periodId], references: [id], onDelete: SetNull)

  advanceSettlementId        String?
  advanceSettlement          PayrollAdvanceSettlement? @relation(fields: [advanceSettlementId], references: [id], onDelete: SetNull)

  bankId                     String?
  bank                       PayrollBank?             @relation(fields: [bankId], references: [id], onDelete: SetNull)

  exportFormat               String                   @default("STANDARD_ACH") @db.VarChar(40)
  fileName                   String                   @db.VarChar(180)
  totalRecords               Int                      @default(0)
  totalAmount                Decimal                  @default(0.00) @db.Decimal(16, 2)
  skippedMissingAccountCount Int                      @default(0)
  generatedAt                DateTime                 @default(now())
  notes                      String?                  @db.VarChar(255)

  createdAt                  DateTime                 @default(now())
  updatedAt                  DateTime                 @updatedAt
  createdById                String?
  updatedById                String?

  @@index([tenantId, periodId])
  @@index([tenantId, advanceSettlementId])
  @@map("payroll_bank_disbursement_batches")
}
```

---

## 3. Migración SQL y Blindaje Multi-Tenant (`audit-extension.ts`)

1. **Archivo de Migración Obligatorio**:
   - Se creará y aplicará la migración en:
     `prisma/schema/migrations/20261030120000_payroll_settlement_advances_and_ach/migration.sql`
   - Incluirá el `ALTER TYPE "EmployeeSalaryMode" ADD VALUE IF NOT EXISTS 'MINIMUM_WAGE'`, la creación de los nuevos `ENUM` (`SalaryAdjustmentOrigin`, `PayrollSettlementStatus`, `PayrollLineOrigin`, `PayslipDeliveryStatus`, `PayrollDisbursementType`) y las 6 tablas relacionales con todos sus índices y llaves foráneas.
2. **Registro en [`src/common/prisma-extension/audit-extension.ts`](file:///d:/projects/security-crm-backend/src/common/prisma-extension/audit-extension.ts)**:
   - Se registrarán los 6 modelos en `auditableModels`, `multiTenantModels` y `commercialAuditModels`:
     - `'EmployeeSalaryHistory'`
     - `'PayrollAdvanceSettlement'`
     - `'PayrollAdvanceItem'`
     - `'PayrollPeriodSettlement'`
     - `'PayrollSettlementLine'`
     - `'PayrollBankDisbursementBatch'`

---

## 4. Motores Matemáticos y Servicios Especializados (`src/modules/payroll/`)

### 4.1 `PayrollLiquidationEngine` (`src/modules/payroll/engines/payroll-liquidation.engine.ts`)
Motor determinístico y libre de efectos secundarios (100% testeable en aislamiento) que ejecuta la liquidación en 6 etapas:

1. **Etapa 1 — Normalización Comercial a 30 Días y Tramos por Puesto (`EmployeeDependencyAssignment`)**:
   - Toma el rango `[period.startDate, period.endDate]`.
   - Determina los días de vigencia del contrato del empleado dentro del periodo (respetando `entryDate` y `retiredAt` si ingresó o se retiró a mitad de mes). Si el empleado estuvo activo hasta el último día calendario del mes (día 28/29 en febrero o día 31 en meses largos), ajusta el último tramo para que la suma total de días del mes sea exactamente **30 días comerciales** (o **15 días** si es liquidación quincenal).
   - Cruza los días de incapacidades/licencias/ausencias (`PayrollLeaveAndAbsence`) y los descuenta del tramo de la dependencia activa en esas fechas.
2. **Etapa 2 — Liquidación Salarial y de Recargos por Tramo**:
   - Determina el salario base aplicable según `salaryMode`:
     - Si `salaryMode === 'MINIMUM_WAGE'`: usa `settings.smmlv`.
     - Si `salaryMode === 'CUSTOM_FIXED'`: usa `profile.customBaseSalary`.
     - Si `salaryMode === 'BY_DEPENDENCY'`: usa la configuración de cada `PayrollDependency` donde trabajó en el mes:
       - **`BY_AVERAGE_GUARANTEED`**: Invoca `ModalityBreakdownEngine.calculateBreakdown()` pasando `monthlyPaidValue`, `smmlv`, `daysWorked` del tramo y los ítems de la modalidad. Genera el Concepto `1` (*Sueldo Básico*) y los renglones suplementarios garantizados (`RN`, `HEN`, `Dom/Fest`, `HEFN`). Además, suma cualquier turno adicional marcado como **Refuerzo (`isReinforcement = true`)** en `PayrollShiftRecord`.
       - **`BY_SCHEDULE`**: Calcula el Sueldo Básico proporcional (`baseSalary / 30 * daysWorked`) y liquida las horas reales registradas en `PayrollShiftRecord` (`nightSurchargeHours`, `sundayHolidayHours`, `overtimeDayHours`, `overtimeNightHours`, `overtimeHolidayDayHours`, `overtimeHolidayNightHours`) usando el valor de hora ordinaria `hourlyRate = baseSalary / settings.monthlyDivisorHours`.
       - **`FIXED_ADMIN`**: Liquida el Sueldo Básico proporcional a los días trabajados.
3. **Etapa 3 — Séptimo Día (Art. 173 CST) y Auxilio de Transporte Legal (Concepto `10`)**:
   - Si el empleado presenta `UNJUSTIFIED_ABSENCE_AUS` o `DISCIPLINARY_SUSPENSION_SAN` con `affectsSeventhDay = true`, contabiliza `seventhDaysLost` y registra el descuento del dominical proporcional.
   - Si `profile.hasTransportAllowance === true` y `baseSalaryMonthly <= settings.smmlv * settings.transportTopSmmlvMultiple` ($2\text{ SMMLV}$), liquida el Concepto `10` (*Auxilio de Transporte Legal*) proporcional a `workedDays`:
     $$\text{Auxilio Transporte} = \text{round}\left(\frac{\text{transportAllowance}}{30} \times \text{workedDays},\ 2\right)$$
4. **Etapa 4 — Incapacidades/Licencias, Conceptos Fijos y Novedades Variables**:
   - Agrega los renglones de `PayrollLeaveAndAbsence` intersectados con el periodo (calculando la porción exacta de días que caen dentro del periodo si una incapacidad cruza de un mes a otro).
   - Evalúa `PayrollPermanentConcept` tanto `BY_EMPLOYEE` como `BY_DEPENDENCY` (proporcional a los días laborados en esa dependencia si `isProportionalToDays = true`), respetando `applicationRule` (`FIRST_FORTNIGHT`, `SECOND_FORTNIGHT`, `ALL_PERIODS`).
   - Agrega las novedades variables de `PayrollPeriodNovelty`.
5. **Etapa 5 — Tope 40% UGPP (Ley 1393/2010), IBCs, Salud, Pensión, FSP y Retefuente (Art. 383 E.T.)**:
   - **Tope 40% UGPP**:
     - Sea $S$ la suma de todos los devengos constitutivos de salario (o que suman a IBC) y $NS$ la suma de devengos no salariales con `inUgpp40Pct = true` (excluyendo auxilio de transporte).
     - `ugppTotalRemuneration` $= S + NS$, `ugppLimit40Pct` $= \text{round}((S + NS) \times 0.40,\ 2)$.
     - Si `settings.enforceUgpp40PctRule === true` y $NS > \text{ugppLimit40Pct}$, entonces `ugppExcessAmount` $= \text{round}(NS - \text{ugppLimit40Pct},\ 2)$.
   - **IBCs (`ibcEps`, `ibcAfp`, `ibcArl`, `ibcCcf`)**:
     - Suma los renglones con bandera `inIbcEpsAfp`, `inIbcArl`, `inIbcCcf` respectivamente y adiciona `ugppExcessAmount` a `ibcEps`, `ibcAfp` e `ibcArl`. Aplica piso proporcional de $1\text{ SMMLV}$ por días cotizados y tope máximo de $25\text{ SMMLV}$.
   - **Aportes Empleado**:
     - Salud (Concepto `601`): $4\%$ de `ibcEps` ($0\%$ si `pilaContributorType` es `'12'` o `'19'` Aprendiz SENA).
     - Pensión (Concepto `602`): $4\%$ de `ibcAfp` ($0\%$ si es Aprendiz SENA o `isPensioner === true`).
     - **Fondo de Solidaridad Pensional (FSP — Concepto `603`)**: Si `ibcAfp >= 4 * smmlv` (y no es aprendiz ni pensionado), aplica el porcentaje según el múltiplo $m = \text{ibcAfp} / \text{smmlv}$:
       - $4 \le m < 16 \implies 1.0\%$
       - $16 \le m < 17 \implies 1.2\%$
       - $17 \le m < 18 \implies 1.4\%$
       - $18 \le m < 19 \implies 1.6\%$
       - $19 \le m \le 20 \implies 1.8\%$
       - $m > 20 \implies 2.0\%$
   - **Retención en la Fuente (Art. 383 E.T.)**:
     - Ingreso laboral gravable bruto $-$ Aportes obligatorios (Salud + Pensión + FSP) $=$ Ingreso Neto.
     - Renta exenta del $25\%$ (tope mensual de $65\text{ UVT}$).
     - Si la base gravable en UVT supera $95\text{ UVT}$, calcula el impuesto marginal según los tramos del Art. 383 E.T. (`95–150 UVT`: $19\%$, `150–360 UVT`: $28\%$, `>360 UVT`: $33\%$).
   - **Aportes Patronales y Exoneración Ley 1607**:
     - `isExoneratedLaw1607 = settings.applyExonerationLaw1607 && (S < 10 * smmlv)`.
     - Calcula `employerHealthAmount` ($0\%$ o $8.5\%$), `employerPensionAmount` ($12\%$), `employerArlAmount` (`RISK_I`: $0.522\%$, `RISK_II`: $1.044\%$, `RISK_III`: $2.436\%$, `RISK_IV`: $4.350\%$, `RISK_V`: $6.960\%$), `employerCcfAmount` ($4\%$), `employerSenaAmount` ($0\%$ o $2\%$) y `employerIcbfAmount` ($0\%$ o $3\%$).
6. **Etapa 6 — Préstamos (`PayrollLoan`) y Anticipos Quincenales (`PayrollAdvanceItem`)**:
   - Por cada préstamo `ACTIVE` elegible en el periodo, agrega el renglón deductivo por `min(installmentAmount, remainingBalance)` vinculado a `loanId`.
   - Si existe un `PayrollAdvanceItem` aprobado en el mismo mes no descontado aún (`isDeductedInPayroll = false`), agrega el renglón deductivo bajo el Concepto `509` (*Anticipo de Quincena*).

---

### 4.2 `BankAchGeneratorEngine` (`src/modules/payroll/engines/bank-ach-generator.engine.ts`)
Formatea los pagos aprobados/liquidados en archivos planos de dispersión bancaria:
1. **`PAB_BANCOLOMBIA`**:
   - Registro Cabecera Tipo `1`: NIT Pagador (15 pos), Clase de Pago `225` (Pago de Nómina), Fecha Aplicación `YYYYMMDD`, Secuencia, Número de Registros y Valor Total Entero.
   - Registros Detalle Tipo `6`: NIT Beneficiario (15 pos), Nombre Beneficiario (30 pos), Código Banco ACH (9 pos), Número de Cuenta (17 pos), Tipo de Transacción (`27` Abono a Cuenta de Ahorros, `37` Abono a Cuenta Corriente) y Valor del Pago.
2. **`DAVIVIENDA`**:
   - Cabecera `RC` + Registros `TR` con NIT, Cuenta, Tipo Cuenta (`CA` / `CC`), Código Banco y Valor a 2 decimales sin separador.
3. **`BCSC` (Banco Caja Social) y `BOGOTA` (Banco de Bogotá)**:
   - Estructuras estándar de convenio empresarial de nómina.
4. **`STANDARD_ACH`**:
   - Archivo `.CSV` delimitado por `;` con columnas: `TIPO_DOC;DOCUMENTO;EMPLEADO;BANCO;CODIGO_ACH;TIPO_CUENTA;NUMERO_CUENTA;VALOR_NETO;REFERENCIA_PERIODO`.

---

### 4.3 `PayrollPayslipPdfService` (`src/modules/payroll/services/payroll-payslip-pdf.service.ts`)
Servicio basado en `pdf-lib` y `qrcode`:
- Genera el comprobante individual o un documento PDF multi-página con todos los comprobantes del periodo.
- Incluye el soporte del parámetro `groupOvertime?: boolean`: cuando es `true`, consolida los conceptos con bandera `inLhex = true` en una sola fila denominada `"HORAS EXTRAS Y RECARGOS SUPLEMENTARIOS"`; cuando es `false`, imprime cada concepto detallado.
- Incrusta un código QR en la esquina inferior con el resumen criptográfico de validación (`NIT | Periodo | Documento | Neto a Pagar`).

---

## 5. Contratos de API REST (`src/modules/payroll/controllers/`)

### 5.1 Nuevos Endpoints en `PayrollEmployeesController` (`/payroll/employees`)
1. `POST /payroll/employees/:id/salary-adjustment` (`payroll:employees:manage`):
   - Recibe `{ salaryMode, adjustmentType: 'PERCENTAGE' | 'FIXED_AMOUNT', increasePct?, newSalary?, effectiveDate, reason }`.
   - Calcula el nuevo salario (validando que nunca sea inferior al SMMLV vigente), actualiza `EmployeePayrollProfile` y crea el registro en `EmployeeSalaryHistory`.
2. `GET /payroll/employees/:id/payslips/:settlementId/pdf` (`payroll:employees:read`):
   - Descarga el desprendible de pago `.PDF` directamente desde el Expediente 360° del trabajador.

### 5.2 `PayrollSettlementController` (`/payroll/settlement`)
1. `GET /payroll/settlement/kpis`: KPIs ejecutivos del periodo seleccionado (Empleados liquidados, Total Devengado, Total Deducciones + Seg. Social, Neto a Dispersar, Costo Patronal Total, Alertas Bancarias y Alertas UGPP 40%).
2. `POST /payroll/settlement/periods/:periodId/liquidate`: Ejecuta o reliquida el periodo para todos los empleados activos (o filtrados por `branchId`, `dependencyId`, `employeeIds`), preservando ajustes manuales si `preserveManualEdits = true`.
3. `GET /payroll/settlement/periods/:periodId/items`: Lista las liquidaciones (`PayrollPeriodSettlement`) del periodo con filtros de búsqueda, sucursal, dependencia y alertas.
4. `GET /payroll/settlement/items/:settlementId`: Obtiene el detalle completo de la liquidación de un empleado con todos sus renglones (`PayrollSettlementLine`) e imputación por puesto.
5. `PATCH /payroll/settlement/items/:settlementId/manual-edit`: Permite al analista modificar o agregar renglones en la pre-nómina del trabajador y recalcula instantáneamente el tope 40% UGPP, IBCs, Salud, Pensión, FSP, Retefuente, Aportes Patronales y Neto a Pagar.
6. `POST /payroll/settlement/periods/:periodId/close`: Cierra el periodo (`CLOSED` o `LOCKED`), crea las cuotas descontadas en `PayrollLoanInstallment`, actualiza saldos de `PayrollLoan`, marca los anticipos quincenales como descontados (`isDeductedInPayroll = true`) y fija `PayrollSettings.scheduleLockDate = period.endDate`.
7. `POST /payroll/settlement/periods/:periodId/reopen`: Reabre un periodo `CLOSED` a `OPEN` revirtiendo transaccionalmente las cuotas de préstamos y marcas de anticipos aplicadas en ese cierre.
8. `GET /payroll/settlement/periods/:periodId/export-excel`: Descarga la Sábana Consolidada de Nómina y Costos por Puesto en `.xlsx` (`exceljs`).
9. `POST /payroll/settlement/advances/generate`: Genera o recalcula el lote de Anticipos Quincenales (Día 15) para un `year` y `month`.
10. `GET /payroll/settlement/advances`: Obtiene el lote de anticipos quincenales de un `year` y `month` con todos sus ítems.
11. `PATCH /payroll/settlement/advances/items/:itemId`: Edita manualmente el monto aprobado de anticipo de un empleado.
12. `POST /payroll/settlement/advances/:advanceId/approve`: Aprueba el lote de anticipos quincenales.
13. `POST /payroll/settlement/ach/generate`: Genera el archivo plano `.TXT`/`.CSV` de dispersión bancaria ACH para un periodo de nómina o lote de anticipo (filtrable por `bankId` o consolidado), registrando el lote en `PayrollBankDisbursementBatch`.
14. `GET /payroll/settlement/ach/batches`: Lista el historial de lotes ACH generados.
15. `GET /payroll/settlement/periods/:periodId/payslips/pdf`: Descarga el PDF consolidado de desprendibles del periodo (o individual pasando `?employeeId=...&groupOvertime=true|false`).
16. `POST /payroll/settlement/periods/:periodId/payslips/send-email`: Envía por correo electrónico (`MailService`) los desprendibles PDF adjuntos a los trabajadores seleccionados (o a todo el periodo) y actualiza `payslipEmailStatus` y `payslipSentAt`.

---

## 6. Experiencia de Usuario y Diseño Frontend (`security-crm-frontend`)

Siguiendo estrictamente [`frontend-noxia-style-guide.md`](file:///d:/projects/security-crm-frontend/.specs/00-general-rules/frontend-noxia-style-guide.md) (*Deep Violet Tactical Enterprise*, fondo `#F8FAFC`, tarjetas `#FFFFFF`, bordes `#E2E8F0`, acento `#7C3AED`, tipografía `JetBrains Mono` en cifras/códigos y `ResponsiveFormDrawer`):

### 6.1 Nueva Consola `/finance/payroll/settlement/page.tsx`
Organizada en **4 Pestañas Tácticas**:
1. **Pestaña 1 — Pre-Nómina y Liquidación de Periodo**:
   - Selector de `PayrollPeriod` (con botón para crear nuevo periodo si se requiere), filtros por Sucursal y Dependencia, botón primario **"Liquidar / Reliquidar Periodo"**, botón **"Exportar Sábana Excel (.xlsx)"** y botón **"Cerrar Periodo"** / **"Reabrir Periodo"**.
   - 4 Tarjetas KPI: *Total Devengado*, *Total Deducciones + Seg. Social*, *Neto a Dispersar* y *Costo Patronal Total*.
   - Tabla de liquidaciones por empleado mostrando: Trabajador, Modo Salarial, Puesto(s) en el Mes, Días (`Trabajados / Incap. / Ausencias`), Total Devengado, IBC (con Chip de alerta si aplicó Tope 40% UGPP), Seg. Social + Retefuente, Préstamos + Anticipo, **Neto a Pagar**, Estado Bancario y Acciones (*Editar Pre-Nómina*, *PDF*, *Enviar Email*).
   - **`ResponsiveFormDrawer` de Edición Manual de Pre-Nómina**: Muestra la radiografía completa de la liquidación del empleado (renglones agrupados por Devengos, Licencias, Deducciones y Seguridad Social, indicando en qué puesto se causó cada renglón), permite editar valores o insertar un concepto adicional y recalcula en vivo los IBCs, Seguridad Social y Neto a Pagar.
2. **Pestaña 2 — Anticipos Quincenales (Día 15)**:
   - Selector de Año/Mes, botón **"Calcular Anticipo Día 15"** (aplicando porcentaje o valor fijo y descontando ausentismos del 1 al 15), edición en línea/drawer del valor aprobado por empleado, botón **"Aprobar Lote de Anticipo"** y botón **"Descargar ACH Anticipo"**.
3. **Pestaña 3 — Dispersión Bancaria Multi-Banco (ACH)**:
   - Resumen agrupado por entidad bancaria (`Bancolombia PAB`, `Davivienda`, `Banco Caja Social`, `Banco de Bogotá`, `Efectivo / Sin Cuenta`).
   - Semáforo de validación bancaria (alertando empleados sin cuenta configurada).
   - Generación y descarga en 1 clic del archivo `.TXT` / `.CSV` por banco e historial de lotes generados (`PayrollBankDisbursementBatch`).
4. **Pestaña 4 — Emisión de Desprendibles PDF y Despacho Masivo por Email**:
   - Switch *"Agrupar Horas Extras y Recargos en un solo renglón"*, botón **"Descargar Todos los Desprendibles (PDF)"**, botón **"Enviar Desprendibles por Correo Electrónico"** y tabla de trazabilidad de envíos (`Enviado`, `Pendiente`, `Sin Correo`, fecha/hora de envío y descarga individual).

### 6.2 Ampliación del Expediente 360° en `/finance/payroll/employees/page.tsx`
1. **En Pestaña 1 (Contrato, Puesto y Salario)**:
   - El selector **Modo Salarial** incluye ahora las 3 opciones:
     - `BY_DEPENDENCY`: *Heredar del Puesto (Sueldo Garantizado / Modalidad)*
     - `MINIMUM_WAGE`: *Salario Mínimo Legal Vigente (1 SMMLV — Actualización Automática)*
     - `CUSTOM_FIXED`: *Sueldo Fijo Contractual Personalizado*
   - Bloque interactivo **"Aplicar Aumento / Ajuste Salarial Individual"**: Permite calcular e impactar un aumento por **Porcentaje (`+%`)** o **Nuevo Valor Fijo (`$ COP`)** con fecha efectiva y motivo.
2. **Nueva Pestaña 6 ("6. Desprendibles e Historial Salarial")**:
   - **Sección A — Desprendibles de Nómina Anexados al Perfil**: Lista todos los periodos liquidados del empleado con Fecha, Periodo, Días, Total Devengado, Total Deducciones, Neto Pagado y botón **"Descargar PDF"**.
   - **Sección B — Historial de Aumentos y Ajustes Salariales (`EmployeeSalaryHistory`)**: Tabla cronológica con Fecha Efectiva, Salario Anterior, Nuevo Salario, `% Variación`, Origen (`Contrato Inicial`, `Aumento Individual`, `Actualización SMMLV`) y Motivo.

### 6.3 Notificación de Nivelación Automática en `/finance/payroll/settings/page.tsx`
- Al guardar un nuevo valor de `smmlv` en `/finance/payroll/settings`, la respuesta informa cuántos empleados (`MINIMUM_WAGE` o inferiores al nuevo mínimo) y cuántas dependencias fueron nivelados automáticamente al nuevo SMMLV.

---

## 7. Permisos RBAC y Semillas (`prisma/seed.ts` y `prisma/seed-payroll.ts`)

1. **Permisos Nuevos en `prisma/seed.ts`**:
   - `payroll:settlement:read`
   - `payroll:settlement:manage`
   Asignados automáticamente a los roles `GODLIKE` y `ADMIN` de todos los tenants activos.
2. **Datos Semilla en `prisma/seed-payroll.ts`**:
   - Semilla de un `PayrollPeriod` abierto para el mes en curso y una liquidación de ejemplo en `PayrollPeriodSettlement` + `PayrollSettlementLine` + `EmployeeSalaryHistory`, garantizando que la consola de liquidación y la Pestaña 6 del perfil del empleado muestren datos reales desde el primer ingreso.

---

## 8. Criterios de Aceptación y Matriz de Verificación (Quality Gates)

- [x] **Gate 1 — Prisma Schema & Migration**: Validación `npx.cmd prisma validate` exitosa y archivo SQL de migración creado en `prisma/schema/migrations/20261030120000_payroll_settlement_advances_and_ach/migration.sql`.
- [x] **Gate 2 — Blindaje ALS (`audit-extension.ts`)**: Los 6 nuevos modelos registrados en `auditableModels`, `multiTenantModels` y `commercialAuditModels`, con `audit-extension.spec.ts` en verde.
- [x] **Gate 3 — Cobertura de Pruebas Unitarias ($\ge 80\%$)**: Suites unitarias para `PayrollLiquidationEngine`, `BankAchGeneratorEngine`, `PayrollPayslipPdfService`, `PayrollSettlementService`, `PayrollSettlementController`, `PayrollSettingsService` y `PayrollEmployeesService`.
- [x] **Gate 4 — Cero Errores de Compilación y Linter**: `npx.cmd tsc --noEmit` y `npm.cmd run lint` con `0` errores en `security-crm-backend` y `security-crm-frontend`.
- [x] **Gate 5 — Fidelidad Visual NOXIA Style Guide**: Verificación de `/finance/payroll/settlement`, la nueva Pestaña 6 de desprendibles e historial salarial en `/finance/payroll/employees` y el ítem activo en `navigationRegistry.ts`.
- [x] **Gate 6 — Prevención de Context Rot**: Actualización de `.specs/ai-decisions.log` y marcado de `[x]` en esta especificación al finalizar.

