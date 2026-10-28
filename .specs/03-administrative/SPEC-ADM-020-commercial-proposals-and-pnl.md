# `SPEC-ADM-020`: Constructor de Propuestas, Cotizaciones, Valores Agregados (VAG) y Semáforo P&L

> **Estado**: `IMPLEMENTADO Y VERIFICADO (BACKEND & FRONTEND)`  
> **Módulo Principal**: `commercial` (con integración a `commercial-settings`, `document-engine`, `storage` y `mail`)  
> **Código de Especificación**: `SPEC-ADM-020-commercial-proposals-and-pnl`  
> **Autor**: Lead Software Architect & Principal Engineer  
> **Fecha de Creación**: 2026-10-24  
> **Ubicación Backend**:
> - `prisma/schema/commercial_proposals.prisma`
> - `src/modules/commercial/proposals/`
> - `src/modules/commercial/repositories/commercial-proposals.repository.ts`
> **Ubicación Frontend**:
> - `src/app/(protected)/commercial/proposals/`
> - `src/app/(protected)/commercial/proposals/create/`
> - `src/app/(protected)/commercial/proposals/[id]/`
> - `src/lib/api/commercial-proposals.ts`
> **Aislamiento**: Multi-Tenant Estricto (`tenantId` obligatorio en todas las entidades e índices, inyección por `RequestContextService`)

---

## 1. Contexto de Negocio y Diagnóstico

### 1.1 El Problema Operativo Histórico
En el sistema legado basado en Excel (`PROYECTO BITACORA 2026.xlsx`), la elaboración de ofertas económicas sufría de deficiencias críticas:
1. **Pérdidas y Ganancias (P&L) Ciego**: Los comerciales otorgaban descuentos por pronto pago o beneficios en especie (lockers, hornos, apoyos de guardia de 12 horas, bonos de reinversión en efectivo) sin calcular en vivo el impacto en el margen neto del contrato. Muchos contratos se firmaban con márgenes inferiores al 5%, comprometiendo la liquidez de la empresa de seguridad.
2. **Desconexión con las Tarifas de Ley (SVSP)**: Al calcular cotizaciones multicargo (ej. 2 puestos 24h con arma + 1 puesto 12h diurno sin arma + 1 conserje), el comercial debía consultar hojas estáticas con fórmulas frágiles de `BUSCARV`, provocando errores aritméticos en la base gravable AIU (10%) y el IVA (19% sobre AIU).
3. **Mocks en Frontend sin Persistencia**: En Noxia, la vista `/commercial/proposals` opera actualmente con un array de objetos estáticos (`MOCK_PROPOSALS`), impidiendo el guardado de borradores, la edición colaborativa y la trazabilidad de ofertas enviadas.

### 1.2 Objetivos de la Especificación
1. **Persistencia Relacional Completa**: Modelar en PostgreSQL (`commercial_proposals.prisma`) la cabecera de cotización (`CommercialProposal`), las líneas de puesto (`ProposalServiceItem`) y los valores agregados ofrecidos (`ProposalValueAddedItem`).
2. **Motor Financiero y Semáforo P&L en Tiempo Real**: Computar automáticamente la utilidad neta mensual del contrato:
   $$\text{Ingreso Bruto} = \text{Facturación Mensual Antes de IVA} - \text{Descuento Pronto Pago}$$
   $$\text{Costo Real de Puestos} = \sum (\text{Costo Nómina Real Puesto}_i \times \text{Cantidad}_i)$$
   $$\text{Amortización Mensual VAG} = \frac{\sum \text{Costo Interno de Valores Agregados}}{\text{Meses del Contrato (12 o 24)}}$$
   $$\text{Utilidad Neta Mensual} = \text{Ingreso Bruto} - (\text{Costo Real de Puestos} + \text{Amortización Mensual VAG})$$
   $$\text{Margen Neto \%} = \frac{\text{Utilidad Neta Mensual}}{\text{Ingreso Bruto}}$$
3. **Semáforo Institucional**:
   * 🟢 **`PROFITABLE` (Margen $\ge 15.0\%$)**: Emisión inmediata autorizada.
   * 🟡 **`WARNING_LOW_MARGIN` ($8.0\% \le \text{Margen} < 15.0\%$)**: Requiere visto bueno digital de Dirección Comercial (`commercial:proposals:approve_pnl`).
   * 🔴 **`DEFICIT_BLOCKED` (Margen $< 8.0\%$)**: Bloqueo estricto contra operaciones a pérdida.
4. **Filosofía Zero-Bloat en AWS S3**:
   * Los borradores (`DRAFT`, `UNDER_REVIEW`) no suben ningún archivo a AWS S3 (0 KB consumidos). Toda la estructura reside en `draftSnapshotJson` (JSONB) en PostgreSQL y se previsualiza en memoria con `@react-pdf/renderer` en el navegador.
   * Solo al ejecutar la acción formal de emisión (`SENT_TO_CLIENT`), el backend compila el PDF vectorial oficial con la identidad de marca (`TenantDocumentSkin`), calcula el hash criptográfico SHA-256 (Ley 527 de 1999) y lo congela en S3 vinculado a `MediaAttachment`.

---

## 2. Modelo de Datos Prisma

Ubicación: `prisma/schema/commercial_proposals.prisma`

```prisma
// =========================================================================
// ENUMS: CICLO DE VIDA DE PROPUESTAS Y EVALUACIÓN FINANCIERA
// =========================================================================

enum ProposalStatus {
  DRAFT                    // En elaboración (0 bytes en S3, solo JSONB)
  UNDER_REVIEW             // Margen en semáforo ámbar: requiere aprobación
  APPROVED_INTERNAL        // Aprobada internamente para despacho al cliente
  SENT_TO_CLIENT           // Emitida oficialmente, PDF congelado en S3 y enviado
  WON                      // Aceptada por el cliente -> Habilita Orden de Servicio (OS)
  LOST                     // Descartada / Rechazada por el cliente
  VOIDED                   // Anulada administrativamente
}

enum ProposalContractType {
  NEW_CONTRACT             // Cliente nuevo
  RENEWAL                  // Renovación de contrato existente
  ADDITION                 // Adición de puestos a contrato activo
}

enum PnlHealthStatus {
  PROFITABLE               // Margen >= 15% (Verde)
  WARNING_LOW_MARGIN       // Margen entre 8% y 14.99% (Ámbar - Requiere aprobación)
  DEFICIT_BLOCKED          // Margen < 8% (Rojo - Bloqueado para emisión)
}

// =========================================================================
// MODELOS: PROPUESTAS Y LÍNEAS COTIZADAS
// =========================================================================

/// Cabecera de propuesta económica y cotización
model CommercialProposal {
  id                        String                @id @default(cuid(2))
  tenantId                  String
  tenant                    Tenant                @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  clientId                  String
  client                    Client                @relation(fields: [clientId], references: [id], onDelete: Cascade)

  tariffPeriodId            String
  tariffPeriod              TariffPeriodConfig    @relation(fields: [tariffPeriodId], references: [id], onDelete: Restrict)

  proposalFolioCode         String                @db.VarChar(50) // Ej: "COT-2026-0042"
  versionNumber             Int                   @default(1)
  status                    ProposalStatus        @default(DRAFT)
  contractType              ProposalContractType  @default(NEW_CONTRACT)
  contractDurationMonths    Int                   @default(12)    // 12 o 24 meses

  // Flags Modulares del Dossier (Switches)
  includeCoverLetter        Boolean               @default(true)
  includeGuardSalary        Boolean               @default(true)
  includeValuesAdded        Boolean               @default(true)
  includeProntoPagoDiscount Boolean               @default(false)
  includeTechQuoteAnnex     Boolean               @default(false)

  // Resumen Económico Mensual (Facturable al Cliente)
  currency                  String                @default("COP") @db.VarChar(10)
  subtotalMonthlyBeforeTax  Decimal               @db.Decimal(14, 2)
  prontoPagoDiscountPct     Decimal               @default(0) @db.Decimal(5, 4) // Ej: 0.05
  prontoPagoDiscountAmount  Decimal               @default(0) @db.Decimal(14, 2)
  subtotalMonthlyAfterDisc  Decimal               @db.Decimal(14, 2)
  aiuBaseAmount             Decimal               @db.Decimal(14, 2) // 10%
  ivaAmount                 Decimal               @db.Decimal(14, 2) // 19% sobre AIU
  totalMonthlyWithTax       Decimal               @db.Decimal(14, 2) // Total factura mensual

  // Viabilidad Financiera y Semáforo P&L
  pnlMonthlyGrossRevenue    Decimal               @db.Decimal(14, 2)
  pnlMonthlyDirectPayroll   Decimal               @db.Decimal(14, 2)
  pnlMonthlyVagAmortized    Decimal               @db.Decimal(14, 2)
  pnlMonthlyEquipmentCost   Decimal               @default(0) @db.Decimal(14, 2)
  pnlMonthlyNetMargin       Decimal               @db.Decimal(14, 2)
  pnlNetMarginPct           Decimal               @db.Decimal(5, 4)
  pnlHealthStatus           PnlHealthStatus       @default(PROFITABLE)
  pnlSpecialApprovalById    String?
  pnlSpecialApprovalAt      DateTime?

  // Concepto de Seguridad y Verificación SARLAFT (CM-F-001)
  sarlaftPoliceClearance    Boolean               @default(false)
  sarlaftComptrollerClear   Boolean               @default(false)
  sarlaftProsecutorClear    Boolean               @default(false)
  sarlaftOfacListClear      Boolean               @default(false)
  sarlaftVerifiedById       String?
  sarlaftVerifiedAt         DateTime?
  sarlaftObservation        String?               @db.Text

  // Zero-Bloat Storage (Snapshot JSONB en borrador / S3 en emisión)
  draftSnapshotJson         Json?                 @db.JsonB
  mediaAttachmentId         String?               @unique
  mediaAttachment           MediaAttachment?      @relation(fields: [mediaAttachmentId], references: [id], onDelete: SetNull)

  // Despacho Oficial
  sentToClientAt            DateTime?
  sentToEmail               String?               @db.VarChar(150)
  validUntilDate            DateTime?             @db.Date // Vencimiento de la cotización

  // Auditoría
  createdById               String
  createdBy                 User                  @relation("ProposalCreatedBy", fields: [createdById], references: [id], onDelete: Restrict)
  updatedById               String?
  updatedBy                 User?                 @relation("ProposalUpdatedBy", fields: [updatedById], references: [id], onDelete: SetNull)

  items                     ProposalServiceItem[]
  valuesAdded               ProposalValueAddedItem[]
  serviceOrder              ServiceOrder?

  createdAt                 DateTime              @default(now())
  updatedAt                 DateTime              @updatedAt

  @@unique([tenantId, proposalFolioCode, versionNumber])
  @@index([tenantId, clientId, status])
  @@index([tenantId, pnlHealthStatus])
  @@map("commercial_proposals")
}

/// Líneas de servicio de seguridad incluidas en la cotización
model ProposalServiceItem {
  id                        String                @id @default(cuid(2))
  tenantId                  String
  proposalId                String
  proposal                  CommercialProposal    @relation(fields: [proposalId], references: [id], onDelete: Cascade)

  serviceCatalogId          String?
  serviceCatalog            SecurityServiceCatalog? @relation(fields: [serviceCatalogId], references: [id], onDelete: SetNull)

  quantity                  Int                   @default(1)
  description               String                @db.VarChar(255)
  targetPosition            String                // "Guarda Portero", "Supervisor"
  scheduleType              ShiftScheduleType
  daysModality              WorkingDaysModality
  dailyTotalHours           Int

  // Precios SVSP de Línea
  unitDirectCost            Decimal               @db.Decimal(12, 2)
  unitAdminSupervisionRate  Decimal               @db.Decimal(5, 4)
  unitAdminSupervisionValue Decimal               @db.Decimal(12, 2)
  unitSubtotalBeforeTax     Decimal               @db.Decimal(12, 2)

  lineSubtotalBeforeTax     Decimal               @db.Decimal(14, 2)
  lineAiuBase               Decimal               @db.Decimal(14, 2)
  lineIva                   Decimal               @db.Decimal(14, 2)
  lineTotalWithTax          Decimal               @db.Decimal(14, 2)

  // Costo Real para P&L
  guardsRequiredCount       Decimal               @db.Decimal(4, 2)
  monthlyGrossPayrollPerPost Decimal              @db.Decimal(12, 2)
  guardNetTakeHomePay       Decimal               @db.Decimal(12, 2)

  createdAt                 DateTime              @default(now())
  updatedAt                 DateTime              @updatedAt

  @@index([tenantId, proposalId])
  @@map("proposal_service_items")
}

/// Valores agregados y beneficios pactados en la propuesta
model ProposalValueAddedItem {
  id                        String                @id @default(cuid(2))
  tenantId                  String
  proposalId                String
  proposal                  CommercialProposal    @relation(fields: [proposalId], references: [id], onDelete: Cascade)

  catalogItemId             String?
  catalogItem               ValueAddedCatalogItem? @relation(fields: [catalogItemId], references: [id], onDelete: SetNull)

  name                      String                @db.VarChar(150)
  category                  ValueAddedCategory
  quantity                  Int                   @default(1)
  unitInternalCost          Decimal               @db.Decimal(12, 2)
  totalInternalCost         Decimal               @db.Decimal(12, 2)
  customerDescription       String?               @db.Text

  createdAt                 DateTime              @default(now())

  @@index([tenantId, proposalId])
  @@map("proposal_value_added_items")
}
```

---

## 3. Contratos de API REST (NestJS)

Prefijo: `@Controller('commercial/proposals')`  
Seguridad: `@UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGuard)`, `@RequireFeature('commercial')`

### 3.1 Catálogo de Endpoints
* `POST /commercial/proposals`: Iniciar un nuevo borrador (`DRAFT`) asignando folio correlativo automático.
* `GET /commercial/proposals`: Listado paginado con cursor, filtros por cliente, estado (`DRAFT`, `SENT_TO_CLIENT`, `WON`, etc.) y semáforo P&L.
* `GET /commercial/proposals/:id`: Detalle completo con ítems, valores agregados, snapshot JSON y estado P&L.
* `PATCH /commercial/proposals/:id`: Actualizar borrador (ítems, cantidades, switches y recalcular P&L).
* `POST /commercial/proposals/:id/simulate-pnl`: Simulación en memoria sin persistir para alimentar la barra en tiempo real.
* `POST /commercial/proposals/:id/approve-pnl`: Aprobación digital de cotizaciones en semáforo ámbar (`commercial:proposals:approve_pnl`).
* `POST /commercial/proposals/:id/issue-and-send`: Congelar PDF vectorial oficial en S3, calcular hash SHA-256 y despachar correo al cliente.

---

## 4. Especificación Frontend (Next.js 16 + MUI)

### 4.1 Componentes Principales
1. **Listado Principal (`/commercial/proposals/page.tsx`)**:
   * Sustituir `MOCK_PROPOSALS` por [`ResponsiveDataView`](file:///d:/projects/security-crm-frontend/src/components/common/ResponsiveDataView.tsx).
   * Columnas: Folio, Cliente, Vigencia, Facturación Mensual, Margen P&L (Chip verde/ámbar/rojo), Estado y Menú Kebab.
2. **Constructor a Pantalla Dividida (`SplitScreenProposalWorkspace.tsx`)**:
   * **Panel Izquierdo**: Formulario reactivo con selector de Cliente/Prospecto (usando `ClientAutocomplete`), selección de puestos del catálogo, selector de Valores Agregados y switches modulares (Pronto Pago, Transparencia Salarial, Carta).
   * **Barra Superior**: Semáforo métrico P&L en tiempo real (`PnlLiveStatusBar`).
   * **Panel Derecho**: Visor vectorial en memoria [`ChameleonPdfPreview.tsx`](file:///d:/projects/security-crm-frontend/src/app/(protected)/commercial/proposals/components/ChameleonPdfPreview.tsx) renderizando al vuelo con `@react-pdf/renderer` (0 llamadas a S3).

---

## 5. Criterios de Aceptación y Quality Gate
1. **Aislamiento Multi-Tenant**: Inyección automática de `tenantId` en queries mediante `audit-extension.ts`. Registrar `CommercialProposal`, `ProposalServiceItem` y `ProposalValueAddedItem` en `multiTenantModels` y `auditableModels`.
2. **Zero-Bloat S3 Verificado**: Las propuestas en `DRAFT` no generan archivos en S3; solo se crea el registro en `MediaAttachment` en `issue-and-send`.
3. **Bloqueo Mandatorio de Margen**: La API rechaza con código HTTP 422 cualquier intento de emitir propuestas con margen menor a 8% (`DEFICIT_BLOCKED`).
4. **Pruebas Unitarias**: Cobertura $\ge 80\%$ en controlador, servicio y repositorio con Jest.
