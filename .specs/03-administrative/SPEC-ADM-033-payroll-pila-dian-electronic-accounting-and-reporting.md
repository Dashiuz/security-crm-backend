# SPEC-ADM-033: Liquidador de Planilla Única (PILA Res. 2388), Nómina Electrónica DIAN (Estándar Nativo UBL 2.1, Dataico y The Factory HKA), Interfaz Contable (World Office y Helisa), Certificado 220 DIAN, Constancias Laborales y Centro de Reportería BI

> **Estado**: `IMPLEMENTADO Y VALIDADO (100% CUMPLIMIENTO EN BACKEND Y FRONTEND)`  
> **Módulo**: `administrative` / `payroll` (Ubicado en Dirección Financiera)  
> **Fase del Roadmap de Nómina**: **Fase 6 de 6 (+15% $\rightarrow$ 100% Completitud del Módulo Integral de Nómina)**  
> **Ubicación Frontend**:
> - `src/app/(protected)/finance/payroll/compliance/page.tsx` (Consola unificada de PILA, Nómina Electrónica DIAN, Interfaz Contable World Office/Helisa, Certificados 220/Constancias y Reportes de Acumulados BI)
> - `src/app/(protected)/finance/payroll/settings/page.tsx` (Configuración de opciones por omisión de Proveedor DIAN y Plantilla Contable + tasas de incapacidad)
> - `src/app/(protected)/finance/payroll/employees/page.tsx` (Integración en Pestaña 6 del Expediente 360° para emisión directa de Constancia Laboral PDF y Certificado 220 DIAN)
> - `src/lib/api/payroll-compliance.ts` y `src/lib/api/payroll.ts`
> - `src/config/navigationRegistry.ts` (Activación de ítem `fin-payroll-compliance` en Dirección Financiera `id: "finance"`)
> **Ubicación Backend**:
> - `prisma/schema/payroll_compliance_and_reporting.prisma`
> - `prisma/schema/payroll_foundations.prisma`
> - `prisma/schema/enums.prisma`
> - `prisma/schema/employee.prisma`
> - `prisma/schema/tenant.prisma`
> - `prisma/schema/migrations/20261031180000_payroll_pila_dian_accounting_and_reporting/migration.sql`
> - `src/common/prisma-extension/audit-extension.ts`
> - `src/modules/payroll/engines/pila-generator.engine.ts`
> - `src/modules/payroll/engines/dian-electronic-payroll.engine.ts`
> - `src/modules/payroll/engines/accounting-interface.engine.ts`
> - `src/modules/payroll/engines/form220-and-accumulated.engine.ts`
> - `src/modules/payroll/services/payroll-compliance-pdf.service.ts`
> - `src/modules/payroll/services/payroll-compliance.service.ts`
> - `src/modules/payroll/controllers/payroll-compliance.controller.ts`
> - `src/modules/payroll/dtos/payroll-compliance.dto.ts`
> - `src/modules/payroll/dtos/payroll-settings.dto.ts`
> - `src/modules/payroll/payroll.module.ts`
> - `prisma/seed.ts`
> **Fecha de Creación**: `2026-10-31`  
> **Autor**: Antigravity (Senior Software Architect & Colombian Payroll / Regulatory Specialist)  
> **Referencias Base**: `csv_templates/roadmap_nomina.md` (Submódulo 7 — Fase 6) y `csv_templates/Manual de usuario PRONOS.pdf` (Numerales `1.8`, `3.9`, `3.10`, `4.1–4.3`, `7.3–7.7`, `8.1–8.2`)

---

## 1. Contexto de Negocio, Normativo y Alineación Integral (Fases 1 a 6)

### 1.1 El Cierre del Ciclo de Nómina en Empresas de Vigilancia y Seguridad Privada
Con las Fases 1 a 5 completadas y en producción (`SPEC-ADM-028` a `SPEC-ADM-032`), el motor de NOXIA CRM ya parametriza conceptos, modalidades garantizadas, puestos operativos vinculados a órdenes de servicio OMEGA, expediente 360° con RENOVA, malla de turnos 24/7, incapacidades CIE-10, préstamos, pre-nómina mensual base 30, anticipos del día 15, dispersión bancaria ACH, vacaciones, primas, cesantías/intereses y liquidación definitiva de contrato.

La **Fase 6 (`SPEC-ADM-033`)** culmina el 100% del roadmap convirtiendo los datos liquidados en **cumplimiento legal externo auditable e inteligencia financiera**:

1. **Planilla Integrada de Liquidación de Aportes — PILA (Resolución 2388 de 2016 MinSalud — Numerales 3.9 y 3.10 Pronos)**:
   - Sincronización automática de Ingresos Base de Cotización (`ibcEps`, `ibcAfp`, `ibcArl`, `ibcCcf`) eliminando el paso manual propenso a olvidos de *"3.9 Actualización de IBCs"* en Pronos.
   - **Partición Automática de Novedades en Múltiples Líneas Tipo 2**: Cuando un guarda presenta en un mismo mes días trabajados ordinarios junto con incapacidades (`IGE`, `IRL`), licencias (`LMA`, `SLN`) o vacaciones (`VAC`), el motor genera líneas Tipo 2 independientes por cada tramo con sus respectivas tarifas y topes, asegurando que la suma de días cotizados cuadre a $30$ días (o proporcional si tiene novedad `ING` / `RET`).
   - Aplicación estricta de la **Exoneración de Aportes Parafiscales y Salud Patronal (Art. 114-1 del Estatuto Tributario — Ley 1607 de 2012)** para trabajadores que devenguen menos de $10\text{ SMMLV}$ (Salud Empleador $0\%$, SENA $0\%$, ICBF $0\%$).
   - Exportación dual: **Archivo Plano `.TXT` Posicional Estándar Resolución 2388** (para cargue directo en SOI, Enlace Operativo, Aportes en Línea, MiPlanilla, Asopagos) y **Archivo `.CSV` de Auditoría (`REPSUP` / `SS`)** para soporte de facturación a clientes B2B y RENOVA.

2. **Nómina Electrónica DIAN (Resolución 000013 de 2021 — Numerales 4.1, 4.2 y 4.3 Pronos) con 3 Opciones Seleccionables**:
   - Consolida mensualmente por trabajador todos los pagos y deducciones agrupados por código oficial **NIE** (`NIE070..NIE198` parametrizados en `PayrollConcept.dianNieCode`).
   - Ejecuta el **Validador Previo de Reglas DIAN** (identificando trabajadores sin municipio DANE, sin documento válido, sin EPS/AFP o con conceptos huérfanos de código NIE) y alimenta la **Bandeja de Rechazos** antes de transmitir.
   - **Arquitectura Multi-Proveedor con Valor por Omisión Configurable y Selector Explícito en UI**:
     El usuario puede elegir en `PayrollSettings` cuál es su opción por omisión (`defaultDianProviderMode`) y cambiarla explícitamente mediante un selector `<Select>` en la consola de Nómina Electrónica entre las **3 opciones autorizadas**:
     1. **`INTERNAL_DIAN_STANDARD` (Estándar Nativo DIAN — UBL 2.1 + CUNE SHA-384)**: Calcula el **CUNE** oficial mediante hash criptográfico `SHA-384`, genera el documento **XML UBL 2.1** (`NominaIndividual` y `NominaIndividualDeAjuste`) y el **Soporte Gráfico PDF con Código QR DIAN**.
     2. **`DATAICO` (Proveedor Tecnológico Dataico API)**: Construye y transmite/exporta el payload JSON estructurado bajo la especificación oficial de la API de Nómina Electrónica de **Dataico**, registrando el CUNE y estado retornado.
     3. **`THE_FACTORY_HKA` (Proveedor Tecnológico The Factory HKA Colombia API)**: Construye y transmite/exporta el payload estructurado bajo la especificación oficial de **The Factory HKA Colombia (TFHKA)** para Documento Soporte de Pago de Nómina Electrónica y Notas de Ajuste.

3. **Interfaz Contable por Terceros y Centros de Costo (Numeral 1.8 Pronos) con 2 Plantillas Oficiales Exclusivas**:
   - Clasifica automáticamente cada renglón liquidado entre **Gasto Administrativo (Cuenta PUC `5105xx`)** y **Costo Operativo de Vigilancia (Cuenta PUC `7205xx`)** según la naturaleza del puesto (`PayrollDependency.isInternal`), imputando el **Centro de Costo Contable (`accountingCostCenter`)** del cliente/puesto y el **NIT del Tercero afectado** (cédula del empleado para devengos y neto a pagar, NIT de la EPS/AFP afiliada para aportes de seguridad social, o `thirdPartyNit` fijo para libranzas/cooperativas).
   - Valida en tiempo real la **Partida Doble exacta** ($\sum \text{Débitos} = \sum \text{Créditos}$) contra la cuenta de pasivo `250505` (Salarios por Pagar).
   - **Selector Explícito en UI y Valor por Omisión Configurable (`defaultAccountingFormat`)** exclusivamente para las **2 plantillas oficiales requeridas**:
     1. **`WORLD_OFFICE` (Plantilla Oficial World Office `.CSV`)**: Estructura canónica de importación de comprobantes contables de World Office (Encabezado y Detalle con Cuenta PUC, Tercero NIT, Centro de Costo, Débito, Crédito, Detalle y Fecha).
     2. **`HELISA` (Plantilla Oficial Helisa `.CSV` / `.TXT`)**: Estructura canónica de importación de asientos contables de Helisa (Tipo Documento, Número, Fecha, Cuenta, Centro de Costo, NIT Tercero, Naturaleza D/C, Valor y Concepto).

4. **Certificados Tributarios (Formulario 220 DIAN), Constancias Laborales PDF y Centro de Reportería BI (Numerales 7.3 a 7.7 y 8.2 Pronos)**:
   - **Constancias Laborales en PDF con Código QR (`LaborCertificatePdfService`)**: Para personal activo o retirado, con opción de certificar solo **Sueldo Básico** o **Salario Promedio Mensual**, conversión automática de valores a letras (`monto_en_letras`), afiliaciones vigentes y firma autorizada parametrizada.
   - **Certificado Anual de Ingresos y Retenciones — Formulario 220 DIAN**: Consolidación automática anual ($1$ de enero a $31$ de diciembre) mapeada a los renglones oficiales $36$ a $55$ del Formato 220 DIAN, con vista previa/edición en `ResponsiveFormDrawer` y descarga en PDF oficial.
   - **Matriz Anual de Acumulados (12 Meses Enero–Diciembre + Total)**: Filtrable por empleado, cliente, dependencia y tabla de conceptos (`LIQ`, `PRI`, `CES`, `VAC`, `IBC`), más **Informe de Costos por Dependencia/Cliente** y **Bitácora de Auditoría de Nómina**.

5. **Saneamiento de Integración Transversal (Cero Código Huérfano entre Fases 1 a 6)**:
   - Sincronización completa de `UpdatePayrollSettingsDto` (`payroll-settings.dto.ts`) para incluir los porcentajes de incapacidad de Fase 3 (`employerSickLeaveRatePct`, `epsSickLeaveRateDays3To90Pct`, `epsSickLeaveRateDays91To180Pct`) y los valores por omisión de Fase 6 (`defaultDianProviderMode`, `defaultAccountingFormat`, `dianEnvironment`, `dianPrefix`, `dianSoftwareId`, `dianSoftwarePin`, `dianApiToken`).
   - Registro uniforme de todos los motores matemáticos en `PayrollModule`.
   - Conexión directa en la **Pestaña 6 del Expediente 360° del Empleado (`/finance/payroll/employees`)** para emitir Constancias Laborales y descargar el Certificado 220 DIAN del trabajador con un solo clic.

---

## 2. Diseño de Base de Datos (`prisma/schema`)

### 2.1 Nuevos Enums en `prisma/schema/enums.prisma`

```prisma
// ============================================================================
// SPEC-ADM-033: ENUMS PARA PILA, NÓMINA ELECTRÓNICA DIAN, CONTABILIDAD Y BI
// ============================================================================

enum PilaBatchStatus {
  DRAFT                       // Generada en borrador / pre-liquidación
  VALIDATED                   // Validada sin inconsistencias de IBC
  EXPORTED                    // Archivo plano .TXT / .CSV descargado
  PAID_FILED                  // Planilla radicada y pagada en operador PILA
}

enum DianProviderMode {
  INTERNAL_DIAN_STANDARD      // Estándar Nativo DIAN (XML UBL 2.1 + CUNE SHA-384)
  DATAICO                     // Proveedor Tecnológico Dataico API
  THE_FACTORY_HKA             // Proveedor Tecnológico The Factory HKA Colombia API
}

enum DianEnvironmentType {
  HABILITACION_2              // Ambiente de Pruebas / Habilitación DIAN (TipoAmb = 2)
  PRODUCCION_1                // Ambiente de Producción DIAN (TipoAmb = 1)
}

enum ElectronicPayrollStatus {
  DRAFT                       // Consolidado pendiente de validar
  VALIDATED                   // Validado sin errores de estructura NIE
  TRANSMITTED_ACCEPTED        // Emitido con CUNE válido y aceptado
  REJECTED                    // Rechazado por validación DIAN / Proveedor Tecnológico
  REPLACED_BY_NOTE            // Reemplazado o anulado por Nota de Ajuste (103)
}

enum ElectronicDocumentType {
  INDIVIDUAL_PAYROLL          // Documento Soporte de Pago de Nómina Electrónica (Código 102)
  ADJUSTMENT_NOTE_REPLACE     // Nota de Ajuste de Nómina Electrónica - Reemplazar (Código 103 - Tipo 1)
  ADJUSTMENT_NOTE_DELETE      // Nota de Ajuste de Nómina Electrónica - Eliminar (Código 103 - Tipo 2)
}

enum AccountingExportFormat {
  WORLD_OFFICE                // Plantilla Oficial World Office (.CSV / .XLSX)
  HELISA                      // Plantilla Oficial Helisa (.CSV / .TXT)
}
```

### 2.2 Ampliación de `PayrollSettings` en `prisma/schema/payroll_foundations.prisma`

Se agregan los campos de preferencia por omisión y credenciales de transmisión electrónica:

```prisma
  // Preferencias por Omisión de Cumplimiento Externo (Fase 6 - SPEC-ADM-033)
  defaultDianProviderMode        DianProviderMode        @default(INTERNAL_DIAN_STANDARD)
  defaultAccountingFormat        AccountingExportFormat  @default(WORLD_OFFICE)
  dianEnvironment                DianEnvironmentType     @default(HABILITACION_2)
  dianPrefix                     String                  @default("NE") @db.VarChar(10)
  dianAdjustmentPrefix           String                  @default("NA") @db.VarChar(10)
  dianNextConsecutive            Int                     @default(1)
  dianSoftwareId                 String?                 @db.VarChar(120)
  dianSoftwarePin                String?                 @db.VarChar(30)
  dianApiToken                   String?                 @db.VarChar(255)
```

### 2.3 Nuevos Modelos en `prisma/schema/payroll_compliance_and_reporting.prisma`

1. **`PayrollPilaBatch`**: Cabecera de liquidación de Planilla Única PILA por periodo y sucursal (operador, totales de IBC, salud empleado/empleador, pensión empleado/empleador, FSP, ARL, CCF, SENA, ICBF, total exonerado Ley 1607 y gran total a pagar).
2. **`PayrollPilaRecordLine`**: Registro detallado Tipo 2 por trabajador y novedad (secuencia, documento, tipo/subtipo cotizante, códigos PLU de EPS/AFP/CCF/ARL, días cotizados por subsistema, IBCs, tarifas, aportes y banderas de novedad `isIng`, `isRet`, `isVsp`, `isVst`, `isSln`, `isIge`, `isLma`, `isVacLr`, `isIrl`).
3. **`PayrollElectronicBatch`**: Lote mensual de Nómina Electrónica DIAN (año, mes, `providerMode` seleccionado, `environment`, contadores de documentos totales, validados, aceptados con CUNE y rechazados).
4. **`PayrollElectronicDocument`**: Documento electrónico individual por trabajador (`consecutivo`, `documentType`, `providerMode`, `status`, `cune`, `qrUrl`, `workedDays`, `totalAccrued`, `totalDeductions`, `netAmount`, `nieBreakdownJson`, `xmlContent`, `providerPayloadJson`, `rejectionErrorsJson`, `predecessorDocId` para Notas de Ajuste).
5. **`PayrollAccountingBatch`**: Cabecera de comprobante de interfaz contable por periodo (`exportFormat` `WORLD_OFFICE` o `HELISA`, número de documento, fecha contable, `totalDebit`, `totalCredit`, `isBalanced`).
6. **`PayrollAccountingLine`**: Renglón de asiento contable (`sequence`, `pucAccount`, `accountName`, `thirdPartyNit`, `thirdPartyName`, `costCenterCode`, `costCenterName`, `dependencyCode`, `conceptCode`, `debitAmount`, `creditAmount`, `description`).
7. **`PayrollTaxCertificate220`**: Certificado Anual de Ingresos y Retenciones Formulario 220 DIAN por trabajador y año gravable (`year`, `employeeId`, `row36Salaries`, `row38SocialBenefits`, `row39AllowancesNonSalarial`, `row41Indemnifications`, `row46SeverancePaid`, `row49TotalGrossIncome`, `row50HealthDeduction`, `row51PensionAndFspDeduction`, `row55WithholdingTax`).

---

## 3. Especificación de Motores Matemáticos y Traductores (`src/modules/payroll/engines`)

### 3.1 `PilaGeneratorEngine` (`pila-generator.engine.ts`)
- **Entrada**: Liquidaciones del periodo (`PayrollPeriodSettlement` + `lines`), ausentismos/incapacidades del mes (`PayrollLeaveAndAbsence`), perfil PILA del empleado (`EmployeePayrollProfile`) y parámetros legales (`PayrollSettings`).
- **Reglas de Partición Multi-Línea (Resolución 2388)**:
  - Si el trabajador laboró los $30$ días sin ausencias ni licencias: genera **1 línea Tipo 2** con `isVst = true` si tuvo recargos/horas extras.
  - Si el trabajador tuvo incapacidades (`SICK_LEAVE_EG` $\rightarrow$ `isIge = true`, `WORK_ACCIDENT_AT` $\rightarrow$ `isIrl = true`), licencia de maternidad (`MATERNITY_PATERNITY_LMA` $\rightarrow$ `isLma = true`), vacaciones en tiempo (`VACATION_TIME_VAC` $\rightarrow$ `isVacLr = true`) o licencia no remunerada/sanción (`UNPAID_LEAVE_LNR` / `DISCIPLINARY_SUSPENSION_SAN` $\rightarrow$ `isSln = true`):
    - Genera **1 línea Tipo 2** por los días efectivamente laborados en puesto (cotizando Salud, Pensión, ARL según clase de riesgo IV/V y CCF).
    - Genera **1 línea Tipo 2 adicional** por cada novedad de tiempo con sus días exactos y tarifa ARL $0\%$ durante los días de incapacidad/vacaciones/licencia, garantizando el cumplimiento exacto del validador de operadores PILA.
- **Redondeo Legal PILA**: IBCs redondeados al peso más cercano y valores de cotización redondeados al múltiplo de $\$100$ superior.

### 3.2 `DianElectronicPayrollEngine` (`dian-electronic-payroll.engine.ts`)
- **Cálculo Criptográfico Oficial del CUNE (`SHA-384`)**:
  $$\text{CUNE} = \text{SHA384}(\text{NumNE} + \text{FecNE} + \text{HorNE} + \text{ValDev} + \text{ValDed} + \text{ValTol} + \text{NitNIE} + \text{DocEmp} + \text{TipoXML} + \text{SoftwarePin} + \text{TipoAmb})$$
- **3 Adaptadores de Proveedor (`DianProviderMode`)**:
  1. `INTERNAL_DIAN_STANDARD`: Genera el XML UBL 2.1 oficial (`NominaIndividual` / `NominaIndividualDeAjuste`) con namespaces DIAN, QR de consulta en `https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=${cune}` y validación estricta de campos.
  2. `DATAICO`: Construye el objeto JSON bajo el contrato oficial de Dataico (`actions: { send_dian: true }`, `payroll: { number, prefix, issue_date, accruals, deductions, employee }`) listo para transmisión REST o descarga de payload.
  3. `THE_FACTORY_HKA`: Construye el objeto estructurado bajo la especificación oficial de The Factory HKA Colombia (`cabecera`, `trabajador`, `devengados`, `deducciones`, `fechasPagos`) listo para transmisión o descarga.

### 3.3 `AccountingInterfaceEngine` (`accounting-interface.engine.ts`)
- **Formatos Soportados Exclusivos (`AccountingExportFormat`)**:
  1. **`WORLD_OFFICE`**:
     - Columnas oficiales: `Empresa`, `Tipo_Documento` (`NM`), `Numero_Documento`, `Fecha`, `Tercero_Inicial`, `Cuenta_Contable`, `Tercero_Detalle`, `Nombre_Tercero`, `Centro_Costo`, `Detalle_Concepto`, `Debito`, `Credito`, `Base_Retencion`.
  2. **`HELISA`**:
     - Columnas oficiales: `Tipo_Comprobante`, `Numero_Documento`, `Fecha_Asiento`, `Cuenta_PUC`, `Centro_Costo`, `Subcentro_Costo`, `NIT_Tercero`, `Digito_Verificacion`, `Nombre_Tercero`, `Naturaleza` (`D`/`C`), `Valor`, `Concepto_Detalle`.

---

## 4. Criterios de Aceptación y Validación

- [x] Migración SQL generada y validada con `npx.cmd prisma validate` (0 errores).
- [x] Los 7 nuevos modelos registrados en `src/common/prisma-extension/audit-extension.ts` pasando el 100% de las pruebas de aislamiento multi-tenant.
- [x] Selectores explícitos en Frontend (`/finance/payroll/settings` y `/finance/payroll/compliance`) para `DianProviderMode` (`INTERNAL_DIAN_STANDARD`, `DATAICO`, `THE_FACTORY_HKA`) y `AccountingExportFormat` (`WORLD_OFFICE`, `HELISA`).
- [x] Cero código huérfano y sincronización total con las Fases 1 a 5 (incluyendo botones de Constancia Laboral y Certificado 220 en el Expediente 360° del empleado).
- [x] Cobertura de pruebas unitarias $\ge 80\%$ en todos los nuevos motores, servicios y controladores (36 suites, 215 tests 100% verdes).
- [x] `npx.cmd tsc --noEmit` y `npm.cmd run lint` con **0 errores** en Backend y Frontend.

