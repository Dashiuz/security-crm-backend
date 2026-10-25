# `SPEC-ADM-022`: CRM de Prospectos, Estrato en Wizard, Bitácora de Seguimiento, Recaptación y Cartera Legal 360°

> **Estado**: `IMPLEMENTADO Y VERIFICADO (BACKEND & FRONTEND)`  
> **Módulo Principal**: `commercial` y `administrative/clients` (con integración a `commercial/proposals`, `commercial/service-orders`, `mail`, `notifications` y `media_attachment`)  
> **Código de Especificación**: `SPEC-ADM-022-commercial-prospects-crm-and-client-legal`  
> **Autor**: Lead Software Architect & Principal Engineer  
> **Fecha de Creación**: 2026-10-24  
> **Ubicación Backend**:
> - `prisma/schema/clients.prisma` (extensión de `Client` con `stratum` y campos CRM)
> - `prisma/schema/commercial_crm.prisma` (`CommercialFollowUp`)
> - `prisma/schema/commercial_client_legal.prisma` (`ClientInsurancePolicy`, `ContractAddendum`, `ClientAnsCommitment`)
> - `src/modules/administrative/clients/` (soporte de `stratum` en DTOs y Repository)
> - `src/modules/commercial/crm/`
> - `src/modules/commercial/client-legal/`
> **Ubicación Frontend**:
> - `src/app/(protected)/administrative/prospects/new/page.tsx` (captura de `stratum` en Paso 1 del Wizard)
> - `src/app/(protected)/commercial/prospects/` (consola CRM split-pane y bitácora)
> - `src/app/(protected)/administrative/clients/[id]/legal/` (cartera legal relacional)
> **Aislamiento**: Multi-Tenant Estricto (`tenantId` obligatorio en todas las entidades e índices, inyección por `RequestContextService`)

---

## 1. Contexto de Negocio y Objetivos de Ingeniería

### 1.1 El Problema Operativo Histórico
En el sistema histórico basado en Excel (`FORMULARIO`, `RAIZ`, `0.`, `LIQ`, `SEG`, `SEGUIMIENTOS`, `CLIENTES CON PÓLIZAS`, `OSI (2)`, `LC` en `PROYECTO BITACORA 2026.xlsx`):
1. **Falta de Estratificación Temprana**: El estrato socioeconómico de la copropiedad (1 al 6) no se capturaba en la primera llamada de prospección. Cuando el comercial iba a cotizar, debía preguntar nuevamente o asumir la tarifa, generando fricción y errores en la aplicación de las tarifas mínimas de la SuperVigilancia (Decreto 4950 de 2007).
2. **Pérdida de Negocios a Ciegas y Sin Recaptación**: Cuando un cliente rechazaba la oferta, la oportunidad se abandonaba en una celda roja de Excel sin registrar la empresa ganadora ni los precios de la competencia. No existía ningún sistema de alarma para volver a llamar al cliente 11 meses después, justo antes de que se venciera el contrato con el competidor.
3. **Pólizas y Otrosíes en Documentos Planos / Desarticulados**: Los vencimientos de pólizas de salarios y prestaciones (vigencia + 3 años) y los acuerdos de reinversión en seguridad (`OSI`) se manejaban en archivos aislados, exponiendo a la empresa a siniestros no cubiertos o duplicidad en desembolsos de bonos comerciales.
4. **Almacenamiento Plano en JSONB**: En Noxia, la vista `/clients/[id]/legal` persistía archivos en un campo JSONB no estructurado (`contractMediaFiles: Json?`), impidiendo búsquedas indexadas, alertas automáticas de vencimiento y auditorías de cumplimiento BASC/SARLAFT.

### 1.2 Objetivos de la Especificación
1. **Captura Obligatoria de `stratum` en el Wizard de Prospección (Frontend + Schema)**:
   * Extender `model Client` en Prisma con la columna `stratum Int?` (valores permitidos 1 a 6, o null si es comercial/industrial).
   * Modificar el Paso 1 ("Información de Ubicación / General") de `administrative/prospects/new/page.tsx` para incorporar el selector de Estrato Socioeconómico con ayuda contextual de tarifas de ley.
   * Auto-vincular el estrato capturado con la selección automática de categoría tarifaria SVSP (`RESIDENTIAL_STRATA_1_3`, `RESIDENTIAL_STRATA_4_6`, `COMMERCIAL_PUBLIC`) en el módulo de cotizaciones.
2. **Bitácora Cronológica de Interacciones (CRM Timeline)**:
   * Registrar llamadas, WhatsApp, visitas técnicas y reuniones en `CommercialFollowUp`.
   * En caso de pérdida (`LOST`), exigir obligatoriamente el competidor ganador, el precio rival y el motivo de pérdida.
   * Disparar automáticamente la fecha objetivo de recaptación a 11 meses ($\text{Fecha} + 335\text{ días}$) con un cron diario de recordatorios.
3. **Consola CRM Unificada (Split-Pane)**:
   * En `/commercial/prospects`, proporcionar un espacio de trabajo con panel izquierdo para la línea de tiempo interactiva y panel derecho para ficha del cliente, contactos clave con fechas de cumpleaños (para fidelización) y cotizaciones vigentes.
4. **Cartera Legal Relacional 360° en Client Workspace**:
   * Migrar de JSONB plano a modelos relacionales formales: `ClientInsurancePolicy` (con cron de alerta 30d/7d), `ContractAddendum` (control de desembolso de fondos de reinversión OSI) y `ClientAnsCommitment` (ANS de 15 días para estudio de seguridad, 3 días de empalme, 3 apoyos anuales de 12h).

---

## 2. Modelo de Datos Prisma

### 2.1 Extensión de `model Client` (`prisma/schema/clients.prisma`)
Se añaden las siguientes columnas al modelo central `Client`:

```prisma
// En prisma/schema/clients.prisma dentro de model Client:

  // =========================================================================
  // EXTENSIÓN COMERCIAL: ESTRATO SOCIOECONÓMICO Y CAPTURA CRM
  // =========================================================================
  stratum               Int?                     // Estrato socioeconómico 1 a 6 (DANE / SVSP)
  leadSource            LeadSourceChannel?       // Canal de origen del prospecto
  leadSourceDetail      String?                  @db.VarChar(255) // Ej: "Referido por residente Torre 2"
  quoteDeliveryFormat   String?                  @default("EMAIL") // "EMAIL", "PHYSICAL_DELIVERY"
  maxDeliveryDate       DateTime?                @db.Date

  // Contactos Clave y Fechas de Fidelización (Cumpleaños)
  councilPresidentName  String?                  @db.VarChar(150)
  councilPresidentPhone String?                  @db.VarChar(50)
  councilPresidentEmail String?                  @db.VarChar(150)
  councilPresidentBirth DateTime?                @db.Date

  treasurerName         String?                  @db.VarChar(150)
  treasurerPhone        String?                  @db.VarChar(50)
  treasurerBirth        DateTime?                @db.Date

  administratorBirth    DateTime?                @db.Date

  // Trazabilidad de Recaptación Comercial (Alarma 11 Meses)
  recaptationTargetDate DateTime?                @db.Date
  recaptationAlertSent  Boolean                  @default(false)

  // Relaciones Comerciales y Legales
  followUps             CommercialFollowUp[]
  proposals             CommercialProposal[]
  serviceOrders         ServiceOrder[]
  insurancePolicies     ClientInsurancePolicy[]
  contractAddendums     ContractAddendum[]
  ansCommitments        ClientAnsCommitment[]
```

### 2.2 Modelos CRM y Bitácora (`prisma/schema/commercial_crm.prisma`)

```prisma
// =========================================================================
// ENUMS: CRM COMERCIAL, CANALES Y MOTIVOS DE PÉRDIDA
// =========================================================================

enum LeadSourceChannel {
  RESIDENT_REFERRAL        // Referido por residente de puesto activo
  GUARD_REFERRAL           // Referido por guardia de seguridad
  ADMINISTRATOR_REFERRAL   // Administrador de otra copropiedad
  COMMERCIAL_PROSPECTION   // Gestión directa / puerta fría
  PUBLIC_TENDER            // Licitación pública / términos de referencia
  COMMERCIAL_ALLIANCE      // Alianza inmobiliaria / constructora
  WEBSITE_INBOUND          // Formulario web o canales digitales
  OTHER
}

enum InteractionChannel {
  PHONE_CALL               // Llamada telefónica
  WHATSAPP_MESSAGE         // Mensaje por WhatsApp
  EMAIL                    // Correo electrónico
  IN_PERSON_MEETING        // Reunión presencial
  VIDEO_CONFERENCE         // Videollamada (Zoom, Meet, Teams)
  TECHNICAL_VISIT          // Visita técnica de seguridad / riesgos
}

enum FollowUpMilestoneStatus {
  PENDING                  // Seguimiento en curso
  WON                      // Aceptada -> Pasa a Orden de Servicio
  LOST                     // Oportunidad perdida ante competidor
  REJECTED                 // Descartado por viabilidad legal / SARLAFT
}

enum DealLossReasonCategory {
  COMPETITOR_PRICE         // Tarifa más baja del competidor
  AUTOMATIC_RENEWAL        // Prórroga automática con empresa actual
  PERMANENCE_CLAUSE        // Cláusula de permanencia vigente
  HIGHER_VALUE_ADDED       // Competencia ofreció mayor reinversión / comodato
  BUDGET_LIMITATION        // Presupuesto insuficiente en asamblea
  PREFERS_CONCIERGE        // Prefieren conserjería sin credencial SVSP
  NO_DECISION_CANCELLED    // Proceso suspendido o cancelado
  FAILED_COMPLIANCE        // Antecedentes legales o listas restrictivas (SARLAFT)
  OTHER
}

// =========================================================================
// MODELO: LÍNEA DE TIEMPO CRM (BITÁCORA INMUTABLE)
// =========================================================================

/// Registro cronológico de interacciones comerciales e inteligencia de competidores
model CommercialFollowUp {
  id                      String                  @id @default(cuid(2))
  tenantId                String
  tenant                  Tenant                  @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  clientId                String
  client                  Client                  @relation(fields: [clientId], references: [id], onDelete: Cascade)

  // Datos de la Interacción
  interactionDate         DateTime                @default(now())
  contactChannel          InteractionChannel
  contactPersonName       String                  @db.VarChar(150)
  contactPersonRole       String?                 @db.VarChar(100) // "Administradora", "Presidente de Consejo"
  managementSummary       String                  @db.Text

  // Compromiso y Próximo Contacto
  nextContactDate         DateTime?               @db.Date
  statusAfterFollowUp     FollowUpMilestoneStatus @default(PENDING)

  // Inteligencia de Mercado y Competencia (Obligatorio si status = LOST)
  lossReasonCategory      DealLossReasonCategory?
  lossReasonDescription   String?                 @db.Text
  winningCompetitorName   String?                 @db.VarChar(150) // Empresa que ganó el contrato
  competitorPriceQuoted   Decimal?                @db.Decimal(12, 2)
  competitorGuardsSalary  Decimal?                @db.Decimal(12, 2)

  // Comercial que gestiona
  assignedCommercialId    String
  assignedCommercial      User                    @relation("FollowUpCommercial", fields: [assignedCommercialId], references: [id], onDelete: Restrict)

  createdAt               DateTime                @default(now())
  updatedAt               DateTime                @updatedAt

  @@index([tenantId, clientId])
  @@index([tenantId, interactionDate])
  @@index([tenantId, statusAfterFollowUp])
  @@map("commercial_follow_ups")
}
```

### 2.3 Modelos de Cartera Legal Relacional (`prisma/schema/commercial_client_legal.prisma`)

```prisma
// =========================================================================
// ENUMS: GESTIÓN LEGAL, PÓLIZAS Y COMPROMISOS ANS
// =========================================================================

enum PolicyType {
  COMPLIANCE               // Póliza de Cumplimiento
  WAGES_AND_BENEFITS       // Salarios y Prestaciones Sociales (Vigencia + 3 años)
  SERVICE_QUALITY          // Calidad del Servicio
  CIVIL_LIABILITY_PLO      // Responsabilidad Civil Extracontractual (PLO)
  GLOBAL_THEFT             // Póliza Global de Hurto
}

enum PolicyStatus {
  ACTIVE                   // Vigente
  EXPIRING_SOON            // Vence en <= 30 días
  EXPIRED                  // Vencida
  CANCELLED                // Anulada
}

enum AnsCommitmentType {
  SECURITY_STUDY_DELIVERY  // Entrega del estudio de seguridad (máximo 15 días)
  PRIOR_TAKEOVER_EMPALME   // Empalme previo operativo (3 días antes)
  FREE_GUARD_SUPPORT_12H   // Turno de apoyo de 12h sin costo (hasta 3 por año)
  QUARTERLY_MANAGEMENT_REP // Informe trimestral de gestión de seguridad
}

enum AnsCommitmentStatus {
  PENDING                  // En plazo
  FULFILLED                // Entregado / Cumplido
  BREACHED                 // Vencido sin cumplimiento
}

// =========================================================================
// MODELOS: PÓLIZAS, OTROSÍES (OSI) Y COMPROMISOS ANS
// =========================================================================

/// Control de pólizas de seguros contractuales con trazabilidad de alertas
model ClientInsurancePolicy {
  id                        String              @id @default(cuid(2))
  tenantId                  String
  tenant                    Tenant              @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  clientId                  String
  client                    Client              @relation(fields: [clientId], references: [id], onDelete: Cascade)

  policyType                PolicyType
  insuranceCompanyName      String              @db.VarChar(150) // "Seguros del Estado", "Seguros Bolívar"
  policyCertificateNumber   String              @db.VarChar(100)
  insuredAmount             Decimal             @db.Decimal(14, 2)
  effectiveStartDate        DateTime            @db.Date
  effectiveEndDate          DateTime            @db.Date
  status                    PolicyStatus        @default(ACTIVE)

  // Archivo PDF de la póliza en AWS S3
  mediaAttachmentId         String?             @unique
  mediaAttachment           MediaAttachment?    @relation(fields: [mediaAttachmentId], references: [id], onDelete: SetNull)

  alertSent30Days           Boolean             @default(false)
  alertSent7Days            Boolean             @default(false)

  createdAt                 DateTime            @default(now())
  updatedAt                 DateTime            @updatedAt

  @@unique([tenantId, policyCertificateNumber])
  @@index([tenantId, clientId, status])
  @@index([tenantId, effectiveEndDate])
  @@map("client_insurance_policies")
}

/// Otrosíes, adiciones contractuales y desembolso de reinversión (OSI)
model ContractAddendum {
  id                        String              @id @default(cuid(2))
  tenantId                  String
  tenant                    Tenant              @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  clientId                  String
  client                    Client              @relation(fields: [clientId], references: [id], onDelete: Cascade)

  addendumNumber            String              @db.VarChar(50)  // "OSI-001", "OTROSI-2026-01"
  title                     String              @db.VarChar(200) // "Otrosí adición cámaras y reinversión"
  effectiveStartDate        DateTime            @db.Date
  effectiveEndDate          DateTime            @db.Date
  durationYears             Int                 @default(1)

  // Fondos de Reinversión y Valores Agregados Pactados
  reinvestmentAmountPact    Decimal             @default(0) @db.Decimal(14, 2)
  disbursedAmount           Decimal             @default(0) @db.Decimal(14, 2)
  disbursementDate          DateTime?           @db.Date
  disbursementReceiptS3Key  String?

  description               String?             @db.Text

  // Archivo PDF firmado en AWS S3
  mediaAttachmentId         String?             @unique
  mediaAttachment           MediaAttachment?    @relation(fields: [mediaAttachmentId], references: [id], onDelete: SetNull)

  createdAt                 DateTime            @default(now())
  updatedAt                 DateTime            @updatedAt

  @@unique([tenantId, clientId, addendumNumber])
  @@index([tenantId, clientId])
  @@map("contract_addendums")
}

/// Acuerdos de Niveles de Servicio asumidos contractualmente
model ClientAnsCommitment {
  id                        String              @id @default(cuid(2))
  tenantId                  String
  tenant                    Tenant              @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  clientId                  String
  client                    Client              @relation(fields: [clientId], references: [id], onDelete: Cascade)

  commitmentType            AnsCommitmentType
  title                     String              @db.VarChar(200)
  dueDate                   DateTime            @db.Date
  deliveredDate             DateTime?           @db.Date
  status                    AnsCommitmentStatus @default(PENDING)
  evidenceNotes             String?             @db.Text

  createdAt                 DateTime            @default(now())
  updatedAt                 DateTime            @updatedAt

  @@index([tenantId, clientId, status])
  @@index([tenantId, dueDate])
  @@map("client_ans_commitments")
}
```

---

## 3. Lógica de Negocio y Tareas Programadas (Crons)

### 3.1 Captura del Estrato en Wizard y Mapeo Tarifario
1. **Paso 1 del Wizard (`administrative/prospects/new/page.tsx`)**:
   * Se agrega el campo `stratum` en `locationForm`.
   * En la interfaz se renderiza un `TextField` con `select` (Opciones: Estrato 1, Estrato 2, Estrato 3, Estrato 4, Estrato 5, Estrato 6, o "Sin Estrato / No Aplica").
   * Al seleccionar Estratos 1 a 3, se muestra un chip informativo: `Tarifa SVSP: Residencial Estratos 1, 2 y 3`.
   * Al seleccionar Estratos 4 a 6, se muestra un chip informativo: `Tarifa SVSP: Residencial Estratos 4, 5 y 6`.
   * El valor se envía como entero (`1` a `6`) en el cuerpo del `POST /administrative/clients`.
2. **Consistencia en Backend**:
   * En `CreateClientDto`:
     ```typescript
     @ApiPropertyOptional({ example: 4, description: 'Estrato socioeconómico residencial (1 al 6)' })
     @IsOptional()
     @IsInt()
     @Min(1)
     @Max(6)
     stratum?: number | null;
     ```

### 3.2 Cron de Recaptación Comercial (335 Días / 11 Meses)
* **Servicio**: `CommercialRecaptationCronService`.
* **Frecuencia**: Se ejecuta diariamente a las 06:00 AM (`@Cron('0 6 * * *')`).
* **Lógica**:
  1. Busca en PostgreSQL clientes con `clientStatus = 'LOST'`, `recaptationAlertSent = false` y `recaptationTargetDate <= new Date()`.
  2. Genera una notificación de alta prioridad para la Dirección Comercial:  
     `"Oportunidad de Recaptación: El contrato de [Nombre Cliente] con [Competidor Ganador] vence en 30 días. Inicie contacto preventivo."`
  3. Actualiza `recaptationAlertSent = true` y registra la alerta en el log del sistema.

### 3.3 Cron de Alertas de Vencimiento de Pólizas (30 Días y 7 Días)
* **Servicio**: `PolicyExpirationCronService`.
* **Frecuencia**: Se ejecuta diariamente a las 07:00 AM (`@Cron('0 7 * * *')`).
* **Lógica**:
  1. Identifica pólizas con $\text{effectiveEndDate} \le \text{Hoy} + 30\text{ días}$ y `alertSent30Days = false` $\rightarrow$ Marca `EXPIRING_SOON`, envía correo a Jurídica y marca `alertSent30Days = true`.
  2. Identifica pólizas con $\text{effectiveEndDate} \le \text{Hoy} + 7\text{ días}$ y `alertSent7Days = false` $\rightarrow$ Envía notificación urgente a Operaciones y Dirección Financiera.
  3. Identifica pólizas vencidas ($\text{effectiveEndDate} < \text{Hoy}$) y las actualiza automáticamente a `EXPIRED`.

---

## 4. Contratos de API REST (NestJS)

### 4.1 Permisos RBAC
* `commercial:crm:read`: Consulta del pipeline, prospectos y bitácora.
* `commercial:crm:create_followup`: Registro de nuevas interacciones o registro de pérdida de oportunidad.
* `commercial:legal:read`: Consulta de pólizas, otrosíes y compromisos ANS del cliente.
* `commercial:legal:manage`: Creación y actualización de pólizas, desembolsos de reinversión y cumplimiento de ANS.

### 4.2 Endpoints CRM (`@Controller('commercial/crm')`)
* `GET /api/v1/commercial/crm/prospects`: Listado de prospectos con resumen del último contacto, estrato y estado.
* `GET /api/v1/commercial/crm/prospects/:id/timeline`: Historial cronológico de interacciones de un prospecto.
* `POST /api/v1/commercial/crm/prospects/:id/follow-up`: Registro de una nueva gestión comercial (llamada, reunión, etc.).
* `POST /api/v1/commercial/crm/prospects/:id/mark-lost`: Cierre por pérdida con datos obligatorios de la competencia ganadora y programación de recaptación.

### 4.3 Endpoints Cartera Legal (`@Controller('commercial/clients/:clientId/legal')`)
* `GET /api/v1/commercial/clients/:clientId/legal/policies`: Listado de pólizas de seguro vigentes e históricas.
* `POST /api/v1/commercial/clients/:clientId/legal/policies`: Registro de póliza con subida de PDF a S3.
* `GET /api/v1/commercial/clients/:clientId/legal/addendums`: Listado de otrosíes (OSI) y balance de fondos de reinversión.
* `POST /api/v1/commercial/clients/:clientId/legal/addendums`: Creación de otrosí y registro de desembolso pactado.
* `GET /api/v1/commercial/clients/:clientId/legal/ans`: Cronómetro de acuerdos ANS y estado de entrega.
* `PATCH /api/v1/commercial/clients/:clientId/legal/ans/:id/fulfill`: Registro de cumplimiento de compromiso ANS.

---

## 5. Arquitectura Frontend (UI/UX)

### 5.1 Captura del Estrato en Wizard de Creación
* **Archivo**: `src/app/(protected)/administrative/prospects/new/page.tsx`.
* **Ubicación en UI**: En el Paso 0 ("Información de Ubicación"), en la fila junto a "Sector", se añade:
  * Campo: `Estrato Socioeconómico (1 - 6)`.
  * Validación: Requerido si el sector es `RESIDENTIAL`.
  * Elemento visual: Chip táctico con el rango tarifario estimado SVSP para brindar retroalimentación inmediata al comercial.

### 5.2 Consola CRM Split-Pane (`/commercial/prospects`)
* **Panel Izquierdo (55%)**: Línea de tiempo cronológica con tarjetas de colores según canal (WhatsApp verde, Llamada azul, Reunión violeta, Pérdida rojo). Botón superior "Registrar Gestión".
* **Panel Derecho (45%)**:
  * Ficha rápida del cliente: Nombre, NIT, Dirección, Estrato con badge.
  * Tarjeta de Fidelización: Cumpleaños del Administrador, Presidente de Consejo y Tesorero (con alerta si el cumpleaños es en los próximos 15 días).
  * Cotizaciones Asociadas y Semáforo P&L.
  * Si la oportunidad se marcó como `LOST`: Banner táctico con el competidor ganador, precio rival y cuenta regresiva hacia la fecha de recaptación anual.

### 5.3 Pestaña Legal Relacional en Client Workspace (`/clients/[id]/legal`)
* **Tarjetas de Semáforo Superior**: Total Asegurado Vigente, Fondos de Reinversión Desembolsados vs. Saldo, Compromisos ANS Pendientes.
* **3 Secciones Tabulares**:
  1. *Pólizas de Seguros*: Con semáforo de vigencia (Verde, Ámbar, Rojo) y botón de descarga directa de S3.
  2. *Otrosíes y Reinversión (OSI)*: Tabla de adiciones con barra de progreso de desembolsos.
  3. *Acuerdos ANS (SLA)*: Lista de verificación con fechas límite y estado de cumplimiento.

---

## 6. Plan de Pruebas Unitarias y Cobertura ($\ge 80\%$)

1. **`AdministrativeClientsService` & `CreateClientDto`**:
   * Validar que acepte valores válidos de `stratum` (1 a 6) y rechace números fuera de rango (`0`, `7`, etc.).
   * Validar que el repositorio persista correctamente el `stratum` en PostgreSQL.
2. **`CommercialCrmService.recordFollowUp`**:
   * Registrar interacción y verificar que actualice `updatedAt` del prospecto.
   * Simular marcado como `LOST` y verificar que calcule exactamente $\text{recaptationTargetDate} = \text{interactionDate} + 335\text{ días}$.
3. **`CommercialRecaptationCronService`**:
   * Simular ejecución y validar que detecte clientes vencidos, emita notificación y marque `recaptationAlertSent = true`.
4. **`PolicyExpirationCronService`**:
   * Verificar que detecte pólizas próximas a vencer ($\le 30$ días) y actualice su estado a `EXPIRING_SOON`.
   * Verificar que registre excepciones mediante `this.logger.error` conforme a la Regla 13.
