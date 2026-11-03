# SPEC-ADM-029: Expediente Laboral 360° de Nómina, Requisitos de Contratación, Cumplimiento SVSP (RENOVA) y Capacitaciones (Cap/SOMA)

> **Estado**: `IMPLEMENTADO`  
> **Módulo**: `administrative` / `payroll` (Ubicado en Dirección Financiera)  
> **Fase del Roadmap de Nómina**: **Fase 2 de 6 (30% Acumulado del Módulo Integral)**  
> **Ubicación Frontend**:
> - `src/app/(protected)/finance/payroll/employees/page.tsx`
> - `src/lib/api/payroll-employees.ts`
> - `src/config/navigationRegistry.ts` (Dirección Financiera `id: "finance"`)
> **Ubicación Backend**:
> - `prisma/schema/payroll_employees.prisma`
> - `prisma/schema/enums.prisma`
> - `prisma/schema/employee.prisma`
> - `prisma/schema/tenant.prisma`
> - `prisma/schema/payroll_foundations.prisma`
> - `src/common/prisma-extension/audit-extension.ts`
> - `src/modules/payroll/repositories/payroll-employees.repository.ts`
> - `src/modules/payroll/services/payroll-employees.service.ts`
> - `src/modules/payroll/services/renova-excel-exporter.service.ts`
> - `src/modules/payroll/controllers/payroll-employees.controller.ts`
> - `src/modules/payroll/dtos/payroll-employee-dossier.dto.ts`
> - `prisma/seed.ts` y `prisma/seed-payroll.ts`
> **Fecha de Creación**: `2026-10-29`  
> **Autor**: Antigravity (Senior Software Architect, Legal/Labor & Accounting Specialist)  
> **Referencias Base**: `csv_templates/roadmap_nomina.md` (Fase 2) y `csv_templates/Manual de usuario PRONOS.pdf` (Numerales `1.12`, `1.14`, `1.16`, `2.1`, `2.2`, `2.3`, `2.4`, `5.2` y `5.3`)

---

## 1. Contexto de Negocio, Jurídico, Contable y Diagnóstico

### 1.1 Diagnóstico Operativo en Pronos (Numerales 1.16 y 2.1 a 2.4)
En la operación real de una empresa de vigilancia y seguridad privada en Colombia (regulada por el **Código Sustantivo del Trabajo**, la **Ley 100 de 1993**, la **Ley 789 de 2002**, el **Decreto Ley 356 de 1994** y las circulares de **RENOVA / APO de la SuperVigilancia**), el expediente del guarda o trabajador administrativo determina cómo se liquida su nómina, a qué entidades va su Planilla PILA, a qué cuenta ACH se dispersa su pago y si está legalmente habilitado para prestar servicio armado o sin arma.

Al auditar el manual de usuario de **Pronos**, identificamos cinco cuellos de botella operativos que esta Fase 2 resuelve de raíz:

1. **Fragmentación en 5 Ventanas Inconexas (Págs. 16-24 del Manual de Pronos)**:
   - En Pronos, para matricular y parametrizar a un empleado, el analista debe abrir **cinco pantallas distintas** ubicadas en menús separados:
     - *1.16 Actualización de Empleados*: Sueldo, dependencia, fechas de ingreso/retiro, EPS, AFP, CCF y cuenta bancaria.
     - *2.1 Hoja de Vida*: Libreta militar, distrito, ubicación geográfica DANE, estado civil y grupo familiar.
     - *2.2 Datos Adicionales*: Tallas de dotación, estrato, tipo de vivienda y medio de transporte.
     - *2.3 Cursos de Vigilancia*: Nivel SVSP (`1101`, `1201`, etc.), academia de seguridad y número de registro (`NRO`).
     - *2.4 Capacitaciones (Cap/SOMA)*: Charlas internas, polígonos y calificaciones de $1$ a $5$.
2. **Ausencia de Soportes Digitales en Requisitos de Contratación (Numeral 1.5 y 1.16)**:
   - Pronos solo permite marcar si el requisito (`1..10`) fue entregado en físico, sin almacenar el PDF/imagen en la nube ni controlar el vencimiento anual crítico del **Certificado de Aptitud Psicofísica para Porte de Armas** o los antecedentes judiciales.
3. **Falta de Semáforos Preventivos en Cursos SVSP y Contratos a Término Fijo**:
   - Según la **SuperVigilancia**, las credenciales y cursos de fundamentación/reentrenamiento tienen una vigencia estricta de **un (1) año ($365$ días)** contado desde la fecha de grado. Programar a un guarda con el curso vencido expone a la empresa a multas institucionales severas.
   - Asimismo, según el **Art. 46 del CST**, los contratos a término fijo requieren un **preaviso escrito no inferior a treinta (30) días** antes de la fecha de vencimiento (`contractEndDate`); de lo contrario, se prorrogan automáticamente.
4. **Control Pasivo de la Base de Datos Negativa — B.D.N (Numeral 1.14)**:
   - Cuando un guarda es retirado por abandono de puesto, hurto o sanción disciplinaria grave, Pronos registra el código de causal (`1..9`), pero requiere que el analista revise manualmente el histórico antes de recontratarlo.

### 1.2 Mejoras Estructurales de la Fase 2 en NOXIA CRM
1. **Entidad Única `Employee` con Perfil Satélite 1:1 (`EmployeePayrollProfile`) — Cero Doble Digitación**:
   - No duplicamos la tabla de empleados entre Recursos Humanos y Finanzas/Nómina. El modelo existente [`Employee`](file:///d:/projects/security-crm-backend/prisma/schema/employee.prisma) actúa como raíz única del trabajador y se extiende mediante el perfil 1:1 `EmployeePayrollProfile` y cuatro colecciones relacionales (`EmployeeFamilyMember`, `EmployeeRequirementCheck`, `EmployeeSvspCourse`, `EmployeeInternalTraining`).
2. **Expediente 360° en un Solo Drawer Maestro-Detalle (`ResponsiveFormDrawer`)**:
   - Unifica en 5 pestañas tácticas e instantáneas toda la información contractual, salarial, PILA, bancaria ACH, DANE, libreta militar, dotación, grupo familiar, checklist documental con soporte S3, cursos SVSP y capacitaciones Cap/SOMA.
3. **Triple Semáforo Normativo Automatizado**:
   - **Semáforo SVSP (RENOVA)**: Calcula en tiempo real los días restantes del curso actual (`VALID` $> 30$ días, `EXPIRING_SOON` $1 \dots 30$ días, `EXPIRED` $\le 0$ días, `MISSING` sin curso registrado).
   - **Semáforo de Preaviso Contractual (Art. 46 CST)**: Detecta contratos a término fijo con vencimiento en los próximos $35$ días (`EXPIRING_SOON`) o ya vencidos (`EXPIRED`).
   - **Semáforo de Carpeta de Ingreso ($0\% - 100\%$)**: Calcula el porcentaje de requisitos obligatorios (`PayrollHiringRequirement.isMandatory = true`) que se encuentran en estado `VERIFIED` y vigentes.
4. **Bloqueo Activo B.D.N (Base de Datos Negativa)**:
   - Al retirar un empleado con causal grave o marcar `isBlockedForRehire = true`, el sistema despliega una alerta de bloqueo en la tabla y en la cabecera del expediente.
5. **Motor de Exportación Directa Excel RENOVA (SuperVigilancia)**:
   - Generación en 1 clic del archivo `.xlsx` con las columnas reglamentarias exigidas por la plataforma **RENOVA / APO de la SuperVigilancia**, listo para cargue masivo.

### 1.3 Historias de Usuario (User Stories)
- **US-PAY-05 (Expediente Laboral 360° Unificado)**: Como *Jefe de Nómina / Director Financiero*, quiero consultar y editar en un solo lugar el contrato, modalidad salarial (por dependencia o sueldo fijo), afiliaciones PILA (EPS, AFP, Cesantías, CCF, ARL), cuenta bancaria ACH, datos DANE, libreta militar, tallas de dotación y grupo familiar de cada empleado.
- **US-PAY-06 (Gestor Documental de Requisitos de Contratación 1..10)**: Como *Analista de Contratación / Nómina*, quiero verificar el checklist de los 10 requisitos de ingreso del trabajador, adjuntar los archivos soporte en S3 y controlar sus fechas de vencimiento (especialmente el examen psicofísico de porte de armas).
- **US-PAY-07 (Control de Cursos SVSP, Academias y Exportación RENOVA)**: Como *Coordinador de Cumplimiento SVSP*, quiero registrar el historial de cursos de vigilancia (`1101`, `1201`, `1301..4205`), academia certificadora y código `NRO`, recibir alertas automáticas cuando un curso esté a $\le 30$ días de cumplir sus $365$ días de vigencia, y exportar el archivo Excel oficial **RENOVA**.
- **US-PAY-08 (Capacitaciones Internas Cap/SOMA)**: Como *Coordinador de Calidad / HSE*, quiero registrar las capacitaciones internas, polígonos e inducciones recibidas por el trabajador con su calificación de $1.0$ a $5.0$ y calcular su promedio histórico de formación.

---

## 2. Definición de Permisos y Matriz RBAC

### 2.1 Feature Flag Asociado (`prisma/seed-features.ts`)
Se reutiliza el feature flag maestro del módulo de nómina registrado en la Fase 1:
```typescript
{
  key: 'payroll',
  name: 'Nómina y Liquidación Laboral',
  description: 'Motor de nómina para vigilancia privada, dependencias operativas, turnos, PILA y Nómina Electrónica DIAN',
}
```

### 2.2 Nuevos Permisos RBAC en `prisma/seed.ts`

| Permiso Code | Nombre Legible | Descripción en Español | Roles por Defecto |
| :--- | :--- | :--- | :--- |
| `payroll:employees:read` | Consultar Expedientes Laborales y SVSP | Consultar hojas de vida 360° de nómina, afiliaciones PILA, requisitos de ingreso, cursos SVSP y capacitaciones | `GODLIKE`, `ADMIN` |
| `payroll:employees:manage` | Administrar Expedientes Laborales y SVSP | Actualizar fichas contractuales, afiliaciones PILA, cuentas bancarias, grupo familiar, checklist de ingreso, cursos SVSP y Cap/SOMA | `GODLIKE`, `ADMIN` |
| `payroll:svsp:export` | Exportar Informe RENOVA SuperVigilancia | Generar y descargar la plantilla oficial en Excel de acreditaciones y cursos SVSP para RENOVA | `GODLIKE`, `ADMIN` |

> **Regla de Semilla RBAC**: Al igual que en la Fase 1, `prisma/seed.ts` asignará automáticamente estos 3 nuevos permisos al rol `GODLIKE` y a todos los roles `ADMIN` de todos los tenants activos en la base de datos.

### 2.3 Blindaje Multi-Tenant y Auditoría (`src/common/prisma-extension/audit-extension.ts`)
Los 5 nuevos modelos de base de datos incluyen `tenantId` obligatorio y campos de auditoría (`createdById`, `updatedById`), y deben registrarse en [`src/common/prisma-extension/audit-extension.ts`](file:///d:/projects/security-crm-backend/src/common/prisma-extension/audit-extension.ts) dentro de:
1. `auditableModels`:
   - `'EmployeePayrollProfile'`
   - `'EmployeeFamilyMember'`
   - `'EmployeeRequirementCheck'`
   - `'EmployeeSvspCourse'`
   - `'EmployeeInternalTraining'`
2. `multiTenantModels`:
   - `'EmployeePayrollProfile'`
   - `'EmployeeFamilyMember'`
   - `'EmployeeRequirementCheck'`
   - `'EmployeeSvspCourse'`
   - `'EmployeeInternalTraining'`
3. `commercialAuditModels` (los modelos que usan `createdById` y `updatedById`):
   - `'EmployeePayrollProfile'`
   - `'EmployeeFamilyMember'`
   - `'EmployeeRequirementCheck'`
   - `'EmployeeSvspCourse'`
   - `'EmployeeInternalTraining'`

---

## 3. Modelo de Datos Completo (Prisma Schema Specification)

### 3.1 Nuevos Enums en `prisma/schema/enums.prisma`

```prisma
// ============================================================================
// SPEC-ADM-029: ENUMS PARA EXPEDIENTE LABORAL 360°, CONTRATACIÓN Y SVSP
// ============================================================================

enum EmploymentContractType {
  FIXED_TERM             // Contrato a Término Fijo (requiere control de preaviso 30 días Art. 46 CST)
  INDEFINITE             // Contrato a Término Indefinido
  WORK_OR_LABOR          // Contrato por Obra o Labor Contratada
  APPRENTICE_LECTIVE     // Aprendiz SENA - Etapa Lectiva (Cotizante PILA 12)
  APPRENTICE_PRODUCTIVE  // Aprendiz SENA - Etapa Productiva (Cotizante PILA 19)
}

enum EmployeeSalaryMode {
  BY_DEPENDENCY          // Liquida según el Valor Pagado / Modalidad de la Dependencia donde labore
  CUSTOM_FIXED           // Liquida según el Sueldo Básico Fijo pactado en la Hoja de Vida
}

enum BankAccountType {
  SAVINGS                // Cuenta de Ahorros
  CHECKING               // Cuenta Corriente
  ELECTRONIC_DEPOSIT     // Depósito Electrónico (Nequi, Daviplata, Dale)
  CASH_OR_CHECK          // Pago por Ventanilla / Efectivo / Cheque
}

enum MilitaryCardClass {
  FIRST_CLASS            // Libreta Militar de Primera Clase
  SECOND_CLASS           // Libreta Militar de Segunda Clase
  PROVISIONAL            // Tarjeta Provisional
  NOT_APPLICABLE         // No Aplica / Exento
}

enum MaritalStatus {
  SINGLE                 // Soltero(a)
  MARRIED                // Casado(a)
  FREE_UNION             // Unión Libre / Compañero(a) Permanente
  DIVORCED               // Divorciado(a) / Separado(a)
  WIDOWED                // Viudo(a)
}

enum EducationLevel {
  PRIMARY                // Básica Primaria
  HIGH_SCHOOL            // Bachiller Académico / Técnico
  TECHNICAL              // Técnico Profesional
  TECHNOLOGIST           // Tecnólogo
  PROFESSIONAL           // Profesional Universitario
  POSTGRADUATE           // Especialización / Maestría
}

enum HousingType {
  OWN                    // Propia
  RENTED                 // Arrendada
  FAMILY                 // Familiar
  MORTGAGED              // En pago de hipoteca
}

enum FamilyRelationship {
  SPOUSE                 // Cónyuge / Compañero(a) Permanente
  CHILD                  // Hijo(a)
  PARENT                 // Padre / Madre
  SIBLING                // Hermano(a)
  OTHER                  // Otro dependiente económico
}

enum HiringRequirementStatus {
  PENDING                // Pendiente por entregar
  VERIFIED               // Entregado, validado y vigente
  EXPIRED                // Documento vencido (ej. Psicofísico o Antecedentes)
  WAIVED                 // Exonerado / No aplica para este cargo
}
```

### 3.2 Nuevo Archivo de Esquema: `prisma/schema/payroll_employees.prisma`

```prisma
// ============================================================================
// SPEC-ADM-029: EXPEDIENTE LABORAL 360°, CUMPLIMIENTO SVSP Y CAP/SOMA
// ============================================================================

/// 1. Perfil Contractual, Salarial, PILA, Bancario y Demográfico del Empleado (Numerales 1.16, 2.1 y 2.2 Pronos)
model EmployeePayrollProfile {
  id                        String                   @id @default(cuid(2))
  tenantId                  String
  tenant                    Tenant                   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  employeeId                String                   @unique
  employee                  Employee                 @relation(fields: [employeeId], references: [id], onDelete: Cascade)

  // 1.1 Asignación Operativa y Contractual (Numeral 1.16 Pronos)
  branchId                  String?
  branch                    PayrollBranch?           @relation(fields: [branchId], references: [id], onDelete: SetNull)
  primaryDependencyId       String?
  primaryDependency         PayrollDependency?       @relation(fields: [primaryDependencyId], references: [id], onDelete: SetNull)

  contractType              EmploymentContractType   @default(FIXED_TERM)
  contractNumber            String?                  @db.VarChar(50)
  contractEndDate           DateTime?                @db.Date // Fecha fin para alerta de preaviso (30 días antes)
  probationEndDate          DateTime?                @db.Date

  // 1.2 Esquema Salarial y Anticipo Quincenal
  salaryMode                EmployeeSalaryMode       @default(BY_DEPENDENCY)
  customBaseSalary          Decimal                  @default(1750905.00) @db.Decimal(14, 2)
  hasTransportAllowance     Boolean                  @default(true)
  customAdvanceValue        Decimal?                 @db.Decimal(14, 2) // Si define un anticipo fijo personalizado el día 15
  isIntegralSalary          Boolean                  @default(false)

  // 1.3 Afiliaciones a Seguridad Social PILA
  pilaContributorType       String                   @default("01") @db.VarChar(5) // "01" Dependiente, "12" Aprendiz Lectiva, "19" Productiva
  pilaContributorSubtype    String                   @default("00") @db.VarChar(5) // "00" Ninguno, "01" Dependiente pensionado activo
  isPensioner               Boolean                  @default(false)
  arlRiskClass              ArlRiskClass             @default(RISK_IV)

  epsEntityId               String?
  epsEntity                 PayrollEntity?           @relation("EmployeeEps", fields: [epsEntityId], references: [id], onDelete: SetNull)
  afpEntityId               String?
  afpEntity                 PayrollEntity?           @relation("EmployeeAfp", fields: [afpEntityId], references: [id], onDelete: SetNull)
  cesantiasEntityId         String?
  cesantiasEntity           PayrollEntity?           @relation("EmployeeCesantias", fields: [cesantiasEntityId], references: [id], onDelete: SetNull)
  ccfEntityId               String?
  ccfEntity                 PayrollEntity?           @relation("EmployeeCcf", fields: [ccfEntityId], references: [id], onDelete: SetNull)

  // 1.4 Dispersión Bancaria ACH
  bankId                    String?
  bank                      PayrollBank?             @relation(fields: [bankId], references: [id], onDelete: SetNull)
  bankAccountType           BankAccountType          @default(SAVINGS)
  bankAccountNumber         String?                  @db.VarChar(50)

  // 1.5 Datos Demográficos DANE, Libreta Militar y Dotación (Numerales 2.1 y 2.2 Pronos)
  daneBirthCityCode         String?                  @db.VarChar(10)
  daneBirthCityName         String?                  @db.VarChar(100)
  daneCityCode              String?                  @default("11001") @db.VarChar(10)
  daneCityName              String?                  @default("BOGOTÁ D.C.") @db.VarChar(100)
  neighborhood              String?                  @db.VarChar(120)
  stratum                   Int?                     @default(2)
  maritalStatus             MaritalStatus            @default(SINGLE)
  bloodType                 String?                  @db.VarChar(10) // Ej: "O+", "A+", "B-"
  educationLevel            EducationLevel           @default(HIGH_SCHOOL)
  housingType               HousingType              @default(RENTED)
  transportMeans            String?                  @db.VarChar(80) // Ej: "Transporte Público", "Motocicleta", "Bicicleta"

  militaryCardNumber        String?                  @db.VarChar(40)
  militaryCardClass         MilitaryCardClass        @default(NOT_APPLICABLE)
  militaryDistrict          String?                  @db.VarChar(40)

  shirtSize                 String?                  @db.VarChar(15) // Ej: "M", "L", "XL"
  pantsSize                 String?                  @db.VarChar(15) // Ej: "32", "34"
  footwearSize              String?                  @db.VarChar(15) // Ej: "40", "41"

  // 1.6 Retiro y Base de Datos Negativa — B.D.N (Numeral 1.14 Pronos)
  exitReasonId              String?
  exitReason                PayrollExitReason?       @relation(fields: [exitReasonId], references: [id], onDelete: SetNull)
  exitNotes                 String?                  @db.Text
  isBlockedForRehire        Boolean                  @default(false)

  createdAt                 DateTime                 @default(now())
  updatedAt                 DateTime                 @updatedAt
  createdById               String?
  updatedById               String?

  @@index([tenantId])
  @@index([tenantId, primaryDependencyId])
  @@index([tenantId, branchId])
  @@index([tenantId, contractEndDate])
  @@map("employee_payroll_profiles")
}

/// 2. Grupo Familiar y Beneficiarios del Trabajador (Numeral 2.1 Pronos)
model EmployeeFamilyMember {
  id                        String                   @id @default(cuid(2))
  tenantId                  String
  tenant                    Tenant                   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  employeeId                String
  employee                  Employee                 @relation(fields: [employeeId], references: [id], onDelete: Cascade)

  fullName                  String                   @db.VarChar(160)
  relationship              FamilyRelationship
  documentType              String                   @default("TI") @db.VarChar(10) // RC, TI, CC, CE
  document                  String?                  @db.VarChar(30)
  birthdate                 DateTime?                @db.Date
  gender                    String?                  @db.VarChar(20)
  phone                     String?                  @db.VarChar(30)
  isDependentForSubsidy     Boolean                  @default(true)  // Causa cuota monetaria en Caja de Compensación
  isScholar                 Boolean                  @default(false) // Acredita certificado de escolaridad
  notes                     String?                  @db.VarChar(250)

  createdAt                 DateTime                 @default(now())
  updatedAt                 DateTime                 @updatedAt
  createdById               String?
  updatedById               String?

  @@index([tenantId, employeeId])
  @@map("employee_family_members")
}

/// 3. Checklist Documental de Requisitos de Contratación (Numerales 1.5 y 1.16 Pronos)
model EmployeeRequirementCheck {
  id                        String                   @id @default(cuid(2))
  tenantId                  String
  tenant                    Tenant                   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  employeeId                String
  employee                  Employee                 @relation(fields: [employeeId], references: [id], onDelete: Cascade)

  requirementId             String
  requirement               PayrollHiringRequirement @relation(fields: [requirementId], references: [id], onDelete: Cascade)

  status                    HiringRequirementStatus  @default(PENDING)
  issueDate                 DateTime?                @db.Date
  expiryDate                DateTime?                @db.Date
  verifiedAt                DateTime?
  s3Key                     String?                  @db.VarChar(500)
  fileName                  String?                  @db.VarChar(255)
  notes                     String?                  @db.VarChar(300)

  createdAt                 DateTime                 @default(now())
  updatedAt                 DateTime                 @updatedAt
  createdById               String?
  updatedById               String?

  @@unique([tenantId, employeeId, requirementId])
  @@index([tenantId, employeeId])
  @@map("employee_requirement_checks")
}

/// 4. Historial de Cursos de Vigilancia SVSP y Registro RENOVA (Numerales 2.3, 5.2 y 5.3 Pronos)
model EmployeeSvspCourse {
  id                        String                   @id @default(cuid(2))
  tenantId                  String
  tenant                    Tenant                   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  employeeId                String
  employee                  Employee                 @relation(fields: [employeeId], references: [id], onDelete: Cascade)

  svspLevelId               String
  svspLevel                 PayrollSvspLevel         @relation(fields: [svspLevelId], references: [id], onDelete: Restrict)

  academyId                 String
  academy                   PayrollSecurityAcademy   @relation(fields: [academyId], references: [id], onDelete: Restrict)

  nroCode                   String                   @db.VarChar(60) // Código NRO oficial asignado por SuperVigilancia
  certificateNumber         String?                  @db.VarChar(60) // Acta / Diploma de grado de la academia
  issueDate                 DateTime                 @db.Date        // Fecha de grado / acreditación
  expiryDate                DateTime                 @db.Date        // Fecha de vencimiento (issueDate + validityDays, usualmente 365 días)
  s3Key                     String?                  @db.VarChar(500)
  fileName                  String?                  @db.VarChar(255)
  isCurrent                 Boolean                  @default(true)
  notes                     String?                  @db.VarChar(300)

  createdAt                 DateTime                 @default(now())
  updatedAt                 DateTime                 @updatedAt
  createdById               String?
  updatedById               String?

  @@index([tenantId, employeeId])
  @@index([tenantId, expiryDate])
  @@map("employee_svsp_courses")
}

/// 5. Capacitaciones Internas Cap/SOMA (Numeral 2.4 Pronos)
model EmployeeInternalTraining {
  id                        String                   @id @default(cuid(2))
  tenantId                  String
  tenant                    Tenant                   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  employeeId                String
  employee                  Employee                 @relation(fields: [employeeId], references: [id], onDelete: Cascade)

  title                     String                   @db.VarChar(180)
  topic                     String                   @db.VarChar(120) // Ej: "Atención al Usuario", "Polígono", "SG-SST", "BASC / SARLAFT"
  instructorName            String                   @db.VarChar(150)
  trainingDate              DateTime                 @db.Date
  durationHours             Decimal                  @default(2.00) @db.Decimal(5, 2)
  score                     Decimal                  @default(5.00) @db.Decimal(3, 2) // Calificación escala Pronos 1.00 a 5.00
  approved                  Boolean                  @default(true)
  notes                     String?                  @db.VarChar(300)

  createdAt                 DateTime                 @default(now())
  updatedAt                 DateTime                 @updatedAt
  createdById               String?
  updatedById               String?

  @@index([tenantId, employeeId])
  @@map("employee_internal_trainings")
}
```

### 3.3 Relaciones Inversas en Modelos Existentes
1. En [`prisma/schema/employee.prisma`](file:///d:/projects/security-crm-backend/prisma/schema/employee.prisma) dentro de `model Employee`:
   ```prisma
   // SPEC-ADM-029: Expediente Laboral 360° y Cumplimiento SVSP
   payrollProfile        EmployeePayrollProfile?
   familyMembers         EmployeeFamilyMember[]
   requirementChecks     EmployeeRequirementCheck[]
   svspCourses           EmployeeSvspCourse[]
   internalTrainings     EmployeeInternalTraining[]
   ```
2. En [`prisma/schema/tenant.prisma`](file:///d:/projects/security-crm-backend/prisma/schema/tenant.prisma) dentro de `model Tenant`:
   ```prisma
   // Payroll Phase 2 Relations (SPEC-ADM-029)
   employeePayrollProfiles   EmployeePayrollProfile[]
   employeeFamilyMembers     EmployeeFamilyMember[]
   employeeRequirementChecks EmployeeRequirementCheck[]
   employeeSvspCourses       EmployeeSvspCourse[]
   employeeInternalTrainings EmployeeInternalTraining[]
   ```
3. En [`prisma/schema/payroll_foundations.prisma`](file:///d:/projects/security-crm-backend/prisma/schema/payroll_foundations.prisma):
   - En `PayrollEntity`:
     ```prisma
     epsProfiles       EmployeePayrollProfile[] @relation("EmployeeEps")
     afpProfiles       EmployeePayrollProfile[] @relation("EmployeeAfp")
     cesantiasProfiles EmployeePayrollProfile[] @relation("EmployeeCesantias")
     ccfProfiles       EmployeePayrollProfile[] @relation("EmployeeCcf")
     ```
   - En `PayrollBank`: `employeeProfiles EmployeePayrollProfile[]`
   - En `PayrollExitReason`: `employeeProfiles EmployeePayrollProfile[]`
   - En `PayrollHiringRequirement`: `employeeChecks EmployeeRequirementCheck[]`
   - En `PayrollSvspLevel`: `employeeCourses EmployeeSvspCourse[]`
   - En `PayrollSecurityAcademy`: `employeeCourses EmployeeSvspCourse[]`
   - En `PayrollBranch`: `employeeProfiles EmployeePayrollProfile[]`
   - En `PayrollDependency`: `employeeProfiles EmployeePayrollProfile[]`

---

## 4. Motores de Reglas Normativas y Exportador Oficial RENOVA

### 4.1 Reglas de Cálculo de Semáforos Normativos (`PayrollEmployeesService`)

1. **Semáforo de Vigencia SVSP (`svspStatus` y `svspDaysRemaining`)**:
   - Se evalúa el curso más reciente marcado como `isCurrent = true` (o el de mayor `expiryDate`):
     - Si el empleado no posee ningún curso registrado $\rightarrow$ `svspStatus = 'MISSING'`, `svspDaysRemaining = null`.
     - Se calcula $\Delta_{\text{días}} = \left\lceil \frac{\text{expiryDate} - \text{hoy}}{86.400.000\text{ ms}} \right\rceil$:
       - Si $\Delta_{\text{días}} < 0 \rightarrow$ `svspStatus = 'EXPIRED'` (Rojo Crítico).
       - Si $0 \le \Delta_{\text{días}} \le 30 \rightarrow$ `svspStatus = 'EXPIRING_SOON'` (Ámbar Preventivo).
       - Si $\Delta_{\text{días}} > 30 \rightarrow$ `svspStatus = 'VALID'` (Verde Óptimo).
2. **Cálculo Automático de Vencimiento al Registrar Curso SVSP**:
   - Al registrar un `EmployeeSvspCourse`, si el usuario no especifica manualmente `expiryDate`, el sistema consulta `svspLevel.validityDays` (por defecto $365$ días) y calcula:
     $$\text{expiryDate} = \text{issueDate} + \text{validityDays}$$
3. **Semáforo de Preaviso Contractual Art. 46 CST (`contractAlertStatus`)**:
   - Aplica cuando `contractType === 'FIXED_TERM'` y `contractEndDate !== null` en empleados activos (`isActive === true`):
     - Se calcula $\Delta_{\text{contrato}} = \left\lceil \frac{\text{contractEndDate} - \text{hoy}}{86.400.000\text{ ms}} \right\rceil$:
       - Si $\Delta_{\text{contrato}} < 0 \rightarrow$ `contractAlertStatus = 'EXPIRED'`.
       - Si $0 \le \Delta_{\text{contrato}} \le 35 \rightarrow$ `contractAlertStatus = 'PREAVISO_REQUIRED'` (Alerta para enviar preaviso legal antes del día 30).
       - Si $\Delta_{\text{contrato}} > 35 \rightarrow$ `contractAlertStatus = 'OK'`.
4. **Porcentaje de Cumplimiento de Carpeta de Contratación (`folderCompletionPct`)**:
   - Sea $M$ el conjunto de requisitos activos del tenant con `isMandatory = true` en `PayrollHiringRequirement`.
   - Sea $V$ el subconjunto de dichos requisitos donde el empleado tiene un `EmployeeRequirementCheck` con `status IN ('VERIFIED', 'WAIVED')` (y si `hasExpiry = true`, cuya `expiryDate` no esté vencida).
   - Entonces:
     $$\text{folderCompletionPct} = \text{round}\left(\frac{|V|}{\max(1, |M|)} \times 100\right)$$

### 4.2 Motor Exportador Excel RENOVA (`RenovaExcelExporterService`)
Ubicado en `src/modules/payroll/services/renova-excel-exporter.service.ts`, utiliza `exceljs` para construir el libro oficial **RENOVA — Superintendencia de Vigilancia y Seguridad Privada** con las siguientes columnas reglamentarias:

| Columna | Encabezado Oficial RENOVA | Origen del Dato en NOXIA | Formato |
| :---: | :--- | :--- | :--- |
| **A** | `NIT_EMPRESA` | `PayrollSettings.companyNit` | Texto numérico sin DV |
| **B** | `RAZON_SOCIAL` | `PayrollSettings.companyLegalName` | Texto Mayúsculas |
| **C** | `TIPO_DOCUMENTO` | `Employee.documentType` (`CC`, `CE`, `PEP`, `PPT`) | Código 2-3 letras |
| **D** | `NUMERO_DOCUMENTO` | `Employee.document` | Texto numérico |
| **E** | `PRIMER_APELLIDO` | `Employee.lastName` | Texto Mayúsculas |
| **F** | `SEGUNDO_APELLIDO` | `Employee.maternalSurname ?? ''` | Texto Mayúsculas |
| **G** | `PRIMER_NOMBRE` | `Employee.firstName` | Texto Mayúsculas |
| **H** | `SEGUNDO_NOMBRE` | `Employee.secondName ?? ''` | Texto Mayúsculas |
| **I** | `GENERO` | `Employee.gender` (`M` / `F`) | 1 carácter |
| **J** | `FECHA_NACIMIENTO` | `Employee.birthdate` | `YYYY-MM-DD` |
| **K** | `FECHA_VINCULACION` | `Employee.entryDate` | `YYYY-MM-DD` |
| **L** | `CODIGO_CIUDAD_DANE` | `EmployeePayrollProfile.daneCityCode ?? '11001'` | 5 dígitos (`11001`) |
| **M** | `CIUDAD_SERVICIO` | `EmployeePayrollProfile.daneCityName ?? 'BOGOTÁ D.C.'` | Texto Mayúsculas |
| **N** | `DEPENDENCIA_PUESTO` | `PayrollDependency.name ?? 'DISPONIBLE'` | Texto Mayúsculas |
| **O** | `CODIGO_CURSO_SVSP` | `PayrollSvspLevel.code` (`1101`, `1201`, etc.) | Código 4 dígitos |
| **P** | `NIVEL_CURSO_SVSP` | `PayrollSvspLevel.name` | Texto Mayúsculas |
| **Q** | `NIT_ESCUELA_CAPACITACION` | `PayrollSecurityAcademy.nit` | Texto numérico |
| **R** | `NOMBRE_ESCUELA` | `PayrollSecurityAcademy.name` | Texto Mayúsculas |
| **S** | `NRO_REGISTRO_SVSP` | `EmployeeSvspCourse.nroCode` | Alfanumérico (`NRO`) |
| **T** | `FECHA_GRADO_CURSO` | `EmployeeSvspCourse.issueDate` | `YYYY-MM-DD` |
| **U** | `FECHA_VENCIMIENTO_CURSO` | `EmployeeSvspCourse.expiryDate` | `YYYY-MM-DD` |
| **V** | `ESTADO_VIGENCIA` | Calculado (`VIGENTE`, `POR VENCER`, `VENCIDO`, `SIN CURSO`) | Semáforo de color |

---

## 5. Contrato de API REST & Backend Specification (NestJS)

### 5.1 Estructura de Archivos del Módulo (`src/modules/payroll/`)

```text
src/modules/payroll/
├── payroll.module.ts                              # Registra los nuevos controladores, servicios y repositorios
├── repositories/
│   └── payroll-employees.repository.ts            # Consultas Prisma optimizadas con aislamiento tenantId
├── services/
│   ├── payroll-employees.service.ts               # Orquestación de Expediente 360°, KPIs y Semáforos
│   ├── payroll-employees.service.spec.ts          # Suite unitaria >= 80% cobertura
│   ├── renova-excel-exporter.service.ts           # Generación binaria Excel RENOVA con exceljs
│   └── renova-excel-exporter.service.spec.ts      # Suite unitaria del exportador RENOVA
├── controllers/
│   ├── payroll-employees.controller.ts            # Endpoints REST con Guards y Swagger
│   └── payroll-employees.controller.spec.ts       # Suite unitaria del controlador
└── dtos/
    └── payroll-employee-dossier.dto.ts            # DTOs de entrada/salida con class-validator
```

### 5.2 Especificación de Endpoints (`PayrollEmployeesController`)

Controlador base: `@Controller('payroll/employees')`, protegido con `@UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGuard)` y `@RequireFeature('payroll')`.

| Método | Ruta | Permiso Requerido | Descripción |
| :---: | :--- | :--- | :--- |
| `GET` | `/payroll/employees` | `payroll:employees:read` | Lista empleados con su perfil de nómina, dependencia, EPS/AFP, semáforo SVSP, % de carpeta y alertas contractuales. Soporta filtros `search`, `branchId`, `dependencyId`, `svspStatus`, `onlyActive`. |
| `GET` | `/payroll/employees/kpis` | `payroll:employees:read` | Retorna los 5 KPIs ejecutivos: `totalActiveEmployees`, `svspValidCount`, `svspAlertCount`, `contractsExpiringSoonCount` e `incompleteFoldersCount`. |
| `GET` | `/payroll/employees/svsp/export-renova` | `payroll:svsp:export` | Descarga el archivo `.xlsx` oficial **RENOVA SuperVigilancia** (`Content-Disposition: attachment`). |
| `GET` | `/payroll/employees/:employeeId/dossier` | `payroll:employees:read` | Obtiene el Expediente 360° completo de un empleado (`employee`, `payrollProfile`, `familyMembers`, `requirementChecks` cruzados con `PayrollHiringRequirement`, `svspCourses`, `internalTrainings`). |
| `PUT` | `/payroll/employees/:employeeId/profile` | `payroll:employees:manage` | Crea o actualiza (`upsert`) el `EmployeePayrollProfile` y sincroniza datos base del `Employee` (ingreso, retiro, causal B.D.N). |
| `POST` | `/payroll/employees/:employeeId/family-members` | `payroll:employees:manage` | Agrega un integrante al grupo familiar (`EmployeeFamilyMember`). |
| `DELETE` | `/payroll/employees/family-members/:id` | `payroll:employees:manage` | Elimina un integrante del grupo familiar verificando pertenencia al `tenantId`. |
| `PUT` | `/payroll/employees/:employeeId/requirements/:requirementId` | `payroll:employees:manage` | Actualiza el estado (`PENDING`, `VERIFIED`, `EXPIRED`, `WAIVED`), fechas y soporte S3 (`s3Key`, `fileName`) de un requisito de contratación. |
| `POST` | `/payroll/employees/:employeeId/svsp-courses` | `payroll:employees:manage` | Registra un nuevo curso SVSP, calcula `expiryDate` a $+365$ días por defecto y marca cursos previos como históricos (`isCurrent = false`). |
| `DELETE` | `/payroll/employees/svsp-courses/:id` | `payroll:employees:manage` | Elimina un curso SVSP registrado por error. |
| `POST` | `/payroll/employees/:employeeId/trainings` | `payroll:employees:manage` | Registra una capacitación interna Cap/SOMA con calificación entre $1.0$ y $5.0$. |
| `DELETE` | `/payroll/employees/trainings/:id` | `payroll:employees:manage` | Elimina un registro de capacitación interna. |

---

## 6. Especificación Frontend y UI/UX en Dirección Financiera (`security-crm-frontend`)

### 6.1 Cumplimiento Estricto de `frontend-noxia-style-guide.md`
1. **Estética "Deep Violet Tactical Enterprise" (Light Mode Corporativo)**:
   - Lienzo principal en `#F8FAFC` (`background.default`), tarjetas y contenedores de tabla en `#FFFFFF` (`background.paper`), bordes sutiles `#E2E8F0` y acento primario `#7C3AED` (`noxiaPalette.primary.main`).
   - Encabezados de tabla en `#F8FAFC` con texto `#475569` (`fontWeight: 700`, `fontSize: '0.72rem'`, `letterSpacing: '0.05em'`).
2. **Zero-Dialog Policy**:
   - Ningún formulario usa `<Dialog>` modal. El Expediente 360° completo se despliega en un `<ResponsiveFormDrawer widthPreset="wide" />` lateral con cabecera táctica y pestañas.
3. **Tipografía Monoespaciada Tabular**:
   - Cédulas, códigos de dependencia, cuentas bancarias, códigos `NRO` de SuperVigilancia, códigos `DANE`, fechas y valores en pesos (COP) utilizan `'JetBrains Mono', monospace` con `fontVariantNumeric: 'tabular-nums'`.

### 6.2 Registro en `src/config/navigationRegistry.ts` (Dirección Financiera `id: "finance"`)
Se incorpora como primer ítem operativo junto a `Puestos y Dependencias` y `Configuración y Catálogos`:
```typescript
{
  id: "fin-payroll-employees",
  title: "Expediente Laboral y SVSP",
  description: "Hoja de vida 360°, afiliaciones PILA, requisitos de ingreso, cursos SVSP y exportación RENOVA",
  status: "ACTIVE",
  path: "/finance/payroll/employees",
  iconName: "BadgeOutlined",
  permissions: ["payroll:employees:read", "payroll:employees:manage"],
  features: ["payroll"],
  bulletColor: "#7C3AED",
}
```

### 6.3 Diseño de la Vista `/finance/payroll/employees/page.tsx`
1. **Cabecera Ejecutiva**:
   - Icono y título `"Expediente Laboral 360° y Cumplimiento SVSP"`, subtítulo descriptivo y botones de acción:
     - Botón secundario con icono Excel: `"Exportar Informe RENOVA (.xlsx)"` (ejecuta descarga directa desde `/payroll/employees/svsp/export-renova`).
     - Botón de acceso directo a `"Padrón General RR.HH."` (`/administrative/employees`).
2. **Banda de 4 Tarjetas KPI (`#FFFFFF` con borde `#E2E8F0`)**:
   - **Personal Activo en Nómina**: Total trabajadores activos (`#7C3AED`).
   - **Cursos SVSP Vigentes**: Guardas con acreditación al día (`#059669`).
   - **Alertas SVSP (Vencidos / $\le 30$ días)**: Personal que requiere reentrenamiento o registro de curso (`#D97706` / `#DC2626`).
   - **Preavisos Contractuales ($\le 35$ días)**: Contratos a término fijo próximos a vencer (`#0284C7`).
3. **Barra de Filtros Tácticos**:
   - Buscador rápido por nombre, apellido, documento o código `NRO`.
   - Selector de **Dependencia / Puesto de Trabajo**.
   - Selector de **Estado SVSP** (`Todos`, `Vigentes`, `Por Vencer <= 30d`, `Vencidos`, `Sin Curso`).
   - Selector de **Estado Laboral** (`Activos`, `Retirados`, `Bloqueados B.D.N`).
4. **Tabla Táctica de Empleados**:
   - **Trabajador**: Avatar + Nombre completo + Tipo y Nro. de Documento en `JetBrains Mono` + Badge rojo si está bloqueado en `B.D.N`.
   - **Puesto / Dependencia**: Código y nombre de la dependencia asignada + Sucursal.
   - **Contrato y Salario**: Tipo de contrato, fecha de vencimiento (con chip de alerta si requiere preaviso) y sueldo base / modalidad.
   - **Seguridad Social (PILA)**: Chips compactos con su EPS, AFP y clase de riesgo ARL (`IV` / `V`).
   - **Acreditación SVSP (RENOVA)**: Badge semáforo (`Vigente`, `Por Vencer`, `Vencido`, `Sin Curso`), código de nivel (`1101`/`1201`), código `NRO` y días restantes.
   - **Carpeta Ingreso**: Barra de progreso + porcentaje ($0\% - 100\%$).
   - **Acciones**: Botón `"Expediente 360°"` que abre el Drawer lateral con toda la ficha del trabajador.
5. **Drawer Maestro-Detalle (`ResponsiveFormDrawer`) con 5 Pestañas**:
   - **Pestaña 1 — Contrato, Salario, PILA y Banco (ACH)**:
     - Selección de Sucursal y Dependencia Principal (`0 - DISPONIBLE`, `100 - RELEVANTE` o puesto operativo de cliente).
     - Tipo de contrato, número de contrato, fecha de ingreso y fecha de vencimiento de contrato.
     - Modo salarial (`Por Dependencia` vs `Sueldo Fijo Personalizado`), sueldo básico, switch de auxilio de transporte y anticipo quincenal personalizado.
     - Afiliaciones PILA: EPS, Fondo de Pensión, Fondo de Cesantías, Caja de Compensación, Tipo de Cotizante (`01`, `12`, `19`), Riesgo ARL (`Clase I` a `Clase V`) y switch de Pensionado.
     - Dispersión ACH: Banco, tipo de cuenta (`Ahorros`, `Corriente`, `Depósito Electrónico Nequi/Daviplata`, `Efectivo`) y número de cuenta.
     - Bloque de Retiro y **Base de Datos Negativa (B.D.N)**: Causal de retiro (`PayrollExitReason`), switch de bloqueo para recontratación (`isBlockedForRehire`) y observaciones.
   - **Pestaña 2 — Datos DANE, Libreta Militar, Dotación y Grupo Familiar**:
     - Ciudad de residencia y nacimiento DANE, barrio, estrato (`1..6`), estado civil, grupo sanguíneo RH, nivel educativo, tipo de vivienda y medio de transporte.
     - Libreta militar (Número, Clase y Distrito Militar).
     - Tallas de dotación (Camisa, Pantalón y Calzado).
     - Tabla y formulario integrado para agregar/eliminar miembros del **Grupo Familiar** (Cónyuge, Hijos, Padres) con fecha de nacimiento, documento y switches de subsidio familiar y escolaridad.
   - **Pestaña 3 — Checklist de Contratación (`1..10`) y Soportes S3**:
     - Lista los 10 requisitos parametrizados en `PayrollHiringRequirement` con su estado (`Pendiente`, `Verificado`, `Vencido`, `No Aplica`), fecha de expedición, fecha de vencimiento, botón para adjuntar archivo PDF/Imagen en S3 (`StorageApi`) y botón para visualizar soporte cargado.
   - **Pestaña 4 — Cursos SVSP y Registro RENOVA**:
     - Formulario para registrar un curso de vigilancia seleccionando Nivel SVSP (`1101 Fundamentación`, `1201 Reentrenamiento`, etc.), Academia de Seguridad (`PayrollSecurityAcademy`), Código oficial `NRO`, número de acta/certificado, fecha de grado y fecha de vencimiento calculada automáticamente a $+365$ días.
     - Tabla histórica de cursos del guarda con semáforo de vigencia y eliminación de registros erróneos.
   - **Pestaña 5 — Capacitaciones Internas (Cap/SOMA)**:
     - Formulario para registrar charlas, polígonos e inducciones con título, tema, instructor, fecha, intensidad horaria y calificación de $1.0$ a $5.0$.
     - Resumen del promedio histórico de calificación e historial completo.

---

## 7. Plan de Semillas (`prisma/seed.ts` y `prisma/seed-payroll.ts`)

1. En [`prisma/seed.ts`](file:///d:/projects/security-crm-backend/prisma/seed.ts):
   - Se agregan los permisos `payroll:employees:read`, `payroll:employees:manage` y `payroll:svsp:export` al catálogo global de permisos y se vinculan automáticamente a los roles `GODLIKE` y `ADMIN` de todos los tenants.
2. En [`prisma/seed-payroll.ts`](file:///d:/projects/security-crm-backend/prisma/seed-payroll.ts):
   - Para los empleados existentes del tenant, se inicializa de forma idempotente su `EmployeePayrollProfile` (vinculado a la sucursal principal, dependencia, EPS, AFP, CCF y Banco), ejemplos de verificación en `EmployeeRequirementCheck`, un curso `1101 / 1201` en `EmployeeSvspCourse` con su código `NRO` y una capacitación en `EmployeeInternalTraining`.

---

## 8. Criterios de Aceptación y Matriz de Verificación (Quality Gates)

- [x] **Gate 1 — Prisma Schema & Migration**: Validación `npx.cmd prisma validate` exitosa y archivo SQL de migración creado en `prisma/schema/migrations/20261029190000_payroll_employee_dossier_and_svsp/migration.sql`.
- [x] **Gate 2 — Blindaje ALS (`audit-extension.ts`)**: Los 5 nuevos modelos registrados en `auditableModels`, `multiTenantModels` y `commercialAuditModels`, con `audit-extension.spec.ts` en verde.
- [x] **Gate 3 — Cobertura de Pruebas Unitarias ($\ge 80\%$)**: Suites unitarias completas para `PayrollEmployeesService`, `RenovaExcelExporterService` y `PayrollEmployeesController` verificando cálculo de vigencias SVSP, preavisos contractuales, porcentajes de carpeta y generación del buffer `.xlsx` de RENOVA (68/68 tests en verde).
- [x] **Gate 4 — Cero Errores de Compilación y Linter**: `npx.cmd tsc --noEmit` y `npm.cmd run lint` con `0` errores en `security-crm-backend` y `security-crm-frontend`.
- [x] **Gate 5 — Fidelidad Visual NOXIA Style Guide**: Verificación de paleta clara (`#F8FAFC` / `#FFFFFF`), acento `#7C3AED`, tipografía `JetBrains Mono` y `ResponsiveFormDrawer` en `/finance/payroll/employees`.
- [x] **Gate 6 — Prevención de Context Rot**: Registro detallado de las decisiones arquitectónicas de la Fase 2 en `.specs/ai-decisions.log` (Entrada 117).
