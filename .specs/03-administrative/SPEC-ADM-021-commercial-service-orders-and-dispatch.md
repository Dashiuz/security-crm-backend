# `SPEC-ADM-021`: Órdenes de Servicio (Instalación), Código OMEGA, Perfil del Guarda Ideal, Dotación y Despacho a 9 Departamentos

> **Estado**: `IMPLEMENTADO Y VERIFICADO (BACKEND & FRONTEND)`  
> **Módulo Principal**: `commercial` (con integración a `administrative/clients`, `commercial/proposals`, `commercial-settings`, `mail` y `media_attachment`)  
> **Código de Especificación**: `SPEC-ADM-021-commercial-service-orders-and-dispatch`  
> **Autor**: Lead Software Architect & Principal Engineer  
> **Fecha de Creación**: 2026-10-24  
> **Ubicación Backend**:
> - `prisma/schema/commercial_service_orders.prisma`
> - `src/modules/commercial/service-orders/`
> - `src/modules/commercial/repositories/commercial-service-orders.repository.ts`
> **Ubicación Frontend**:
> - `src/app/(protected)/commercial/service-orders/`
> - `src/lib/api/commercial-service-orders.ts`
> **Aislamiento**: Multi-Tenant Estricto (`tenantId` obligatorio en todas las entidades e índices, inyección por `RequestContextService`)

---

## 1. Contexto de Negocio y Objetivos de Ingeniería

### 1.1 El Problema Operativo Histórico
En el sistema manual basado en Excel (`OS`, `F` y `ORDENES` en `PROYECTO BITACORA 2026.xlsx`):
1. **Ruptura de Comunicación Interdepartamental**: Cuando un contrato era firmado por el cliente, Comercial diligenciaba a mano un formato de Word o Excel y lo enviaba por correo desarticulado. Operaciones se enteraba tarde del número de puestos requeridos, Recursos Humanos contrataba guardias con perfiles no acordados (ej. sin curso de vigilancia actualizado o sin perfil para propiedad horizontal), y Almacén no preparaba los radios, detectores ni uniformes a tiempo.
2. **Duplicidad y Desconexión de Datos del Cliente**: Al formalizarse el servicio, se creaba un nuevo registro manual en carpetas físicas sin vincularlo al prospecto original, rompiendo la trazabilidad histórica de la cotización y los valores agregados prometidos.
3. **Falta de Trazabilidad del Código OMEGA**: El código operativo del puesto (Código OMEGA) se asignaba en libretas o tablas desalineadas, provocando colisiones de códigos entre sedes o conjuntos residenciales.
4. **UI en Roadmap Placeholder**: En el frontend de Noxia, la ruta `/commercial/service-orders` muestra actualmente una pantalla de "En Construcción / Próximamente", impidiendo la operación formal del equipo comercial y operativo.

### 1.2 Objetivos de la Especificación
1. **Puente Transaccional Atómico**: Al marcar una propuesta económica como `WON` (o al generar una orden de adición/renovación para cliente existente), ejecutar una transacción atómica inquebrantable en PostgreSQL:
   * Crear la `ServiceOrder` con su folio oficial (`orderFolioCode`) y su código permanente de puesto (`omegaCode`).
   * Transicionar el estado del cliente en `Client`: `clientStatus = ACTIVE`, asignando fechas contractuales y el código interno.
   * Congelar las líneas de puesto (`ServiceOrderPosition`) con la remuneración pactada y el **Perfil del Guarda Ideal** (insumo para reclutamiento de RRHH).
   * Congelar la dotación física requerida en puesto (`ServiceOrderEquipmentItem`) para alistamiento en Almacén.
2. **Disparo Automático Asíncrono a las 9 Áreas**: Emitir el evento de dominio `commercial.service_order.dispatched` mediante `@nestjs/event-emitter`. El listener resolverá los buzones de correo configurados en `ServiceOrderDistributionRecipient` (Fase 1 / `SPEC-ADM-018`) y remitirá el acta formal de instalación a los 9 departamentos (Contratos, Operaciones, Almacén, Central, Recepción, RRHH, Calidad, Contabilidad y Tesorería), registrando el resultado en `ServiceOrderDispatchLog`.
3. **Consola Táctica Operativa**: Reemplazar la pantalla de placeholder en el frontend por una consola de mando split-pane / tabla de gestión con filtros por estado, código OMEGA y auditoría de despacho en vivo.

---

## 2. Modelo de Datos Prisma

Ubicación del archivo: `prisma/schema/commercial_service_orders.prisma`

```prisma
// =========================================================================
// ENUMS: ÓRDENES DE SERVICIO Y OPERACIÓN
// =========================================================================

enum ServiceOrderStatus {
  DRAFT_CONFIGURING        // En parametrización operativa previa
  ISSUED_DISPATCHED        // Emitida y notificada formalmente a las 9 áreas
  IN_OPERATION             // Puesto instalado y prestando servicio físico
  CANCELLED                // Cancelada antes de la instalación
}

enum ServiceOrderType {
  NEW_SITE                 // Puesto nuevo / Cliente nuevo
  CONTRACT_RENEWAL         // Renovación de contrato existente
  POSITION_ADDITION        // Adición de puestos a un servicio activo
}

enum EquipmentDeliveryStatus {
  PENDING_WAREHOUSE        // Pendiente de alistamiento en bodega
  DISPATCHED_TO_SITE       // En tránsito / Despachado al puesto
  DELIVERED_ON_SITE        // Recibido y verificado en puesto
}

// =========================================================================
// MODELOS: ÓRDENES DE SERVICIO Y PERFIL TÁCTICO DE PUESTOS
// =========================================================================

/// Orden de servicio e instalación operativa (Promesa de Compra Formalizada)
model ServiceOrder {
  id                        String                  @id @default(cuid(2))
  tenantId                  String
  tenant                    Tenant                  @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  clientId                  String
  client                    Client                  @relation(fields: [clientId], references: [id], onDelete: Restrict)

  proposalId                String?                 @unique
  proposal                  CommercialProposal?     @relation(fields: [proposalId], references: [id], onDelete: SetNull)

  orderFolioCode            String                  @db.VarChar(50)  // Ej: "OS-2026-0018"
  omegaCode                 String                  @db.VarChar(50)  // Código OMEGA asignado (ej: "OMG-042")
  orderType                 ServiceOrderType        @default(NEW_SITE)
  status                    ServiceOrderStatus      @default(DRAFT_CONFIGURING)

  // Vigencia y Fechas Operativas Clave
  installationDate          DateTime                @db.Date         // Fecha inicio del servicio
  contractEndDate           DateTime                @db.Date         // Fecha fin del contrato
  empalmeDaysPrior          Int                     @default(3)      // Días de empalme previo

  // Contactos Directos del Puesto (Snapshot Operativo)
  siteAddress               String                  @db.VarChar(255)
  siteCity                  String                  @db.VarChar(100)
  sitePhone                 String?                 @db.VarChar(50)
  legalRepName              String                  @db.VarChar(150)
  legalRepPhone             String?                 @db.VarChar(50)
  administratorName         String                  @db.VarChar(150)
  administratorPhone        String?                 @db.VarChar(50)
  administratorEmail        String?                 @db.VarChar(150)

  // Asignación de Supervisión y Comercial
  assignedCoordinatorId     String?
  assignedCoordinatorName   String?                 @db.VarChar(150)
  commercialUserId          String
  commercialUser            User                    @relation("ServiceOrderCommercial", fields: [commercialUserId], references: [id], onDelete: Restrict)

  // Resumen Económico Facturable
  totalMonthlyBeforeTax     Decimal                 @db.Decimal(14, 2)
  totalMonthlyWithTax       Decimal                 @db.Decimal(14, 2)

  // Observaciones Operativas Generales
  operationalNotes          String?                 @db.Text

  // Documento Oficial PDF Congelado en S3
  mediaAttachmentId         String?                 @unique
  mediaAttachment           MediaAttachment?        @relation(fields: [mediaAttachmentId], references: [id], onDelete: SetNull)

  // Relaciones Hijas
  positions                 ServiceOrderPosition[]
  equipment                 ServiceOrderEquipmentItem[]
  dispatchLogs              ServiceOrderDispatchLog[]

  createdAt                 DateTime                @default(now())
  updatedAt                 DateTime                @updatedAt

  @@unique([tenantId, orderFolioCode])
  @@unique([tenantId, omegaCode])
  @@index([tenantId, clientId])
  @@index([tenantId, status])
  @@index([tenantId, installationDate])
  @@map("service_orders")
}

/// Características del puesto y Perfil del Guarda Ideal (Insumo para RRHH / Nómina)
model ServiceOrderPosition {
  id                        String                  @id @default(cuid(2))
  tenantId                  String
  serviceOrderId            String
  serviceOrder              ServiceOrder            @relation(fields: [serviceOrderId], references: [id], onDelete: Cascade)

  positionTitle             String                  @db.VarChar(100) // "Guarda Recepción", "OMT", "Supervisor"
  quantityGuards            Int                     @default(1)
  scheduleType              ShiftScheduleType       // SCHEDULE_2X2X2, SCHEDULE_2X2X2_12H, etc.
  weaponModality            WeaponModality          @default(NO_WEAPON)

  // Remuneración Autorizada (Input Nómina)
  netMonthlySalaryToPay     Decimal                 @db.Decimal(12, 2) // Sueldo pactado libre

  // Perfil del Guarda Ideal (Motor de Reclutamiento de RRHH)
  minYearsExperiencePh      Int                     @default(1)
  preferredGender           String?                 @db.VarChar(20)  // "MALE", "FEMALE", "INDISTINTO"
  requiresCurrentCourse     Boolean                 @default(true)   // Curso SVSP vigente
  requiresGalaUniform       Boolean                 @default(false)
  specificProfileTraits     Json?                   @db.JsonB        // Habilidades específicas, manejo CCTV, etc.

  createdAt                 DateTime                @default(now())

  @@index([tenantId, serviceOrderId])
  @@map("service_order_positions")
}

/// Elementos de dotación física y armamento requeridos en puesto (Insumo para Almacén)
model ServiceOrderEquipmentItem {
  id                        String                  @id @default(cuid(2))
  tenantId                  String
  serviceOrderId            String
  serviceOrder              ServiceOrder            @relation(fields: [serviceOrderId], references: [id], onDelete: Cascade)

  itemName                  String                  @db.VarChar(150) // "Radio Motorola DGP8550", "Garret Detector", "Linterna LED"
  quantity                  Int                     @default(1)
  isMandatoryOnSite         Boolean                 @default(true)
  deliveryStatus            EquipmentDeliveryStatus @default(PENDING_WAREHOUSE)
  serialNumbers             String?                 @db.Text         // Números de serie asignados por bodega
  notes                     String?                 @db.Text

  createdAt                 DateTime                @default(now())
  updatedAt                 DateTime                @updatedAt

  @@index([tenantId, serviceOrderId])
  @@map("service_order_equipment_items")
}

/// Auditoría de entrega y despacho a los 9 departamentos internos
model ServiceOrderDispatchLog {
  id                        String                  @id @default(cuid(2))
  tenantId                  String
  serviceOrderId            String
  serviceOrder              ServiceOrder            @relation(fields: [serviceOrderId], references: [id], onDelete: Cascade)

  department                InternalDepartment      // CONTRACTS, OPERATIONS, WAREHOUSE, etc.
  recipientEmail            String                  @db.VarChar(150)
  dispatchedAt              DateTime                @default(now())
  wasEmailSuccess           Boolean                 @default(true)
  deliveryNotes             String?                 @db.Text

  createdAt                 DateTime                @default(now())

  @@index([tenantId, serviceOrderId])
  @@map("service_order_dispatch_logs")
}
```

---

## 3. Transición Atómica de Negocio y Eventos de Dominio

### 3.1 Transacción ACID de Creación y Activación (`ServiceOrdersService`)
Al confirmar la formalización de la Orden de Servicio, el backend ejecuta una transacción atómica única:

```text
[ Confirmar Orden de Servicio ]
             │
             ▼
  ┌────────────────────────────────────────────────────────┐
  │ 1. Validar unicidad de omegaCode y orderFolioCode       │
  │ 2. Crear ServiceOrder + Positions + Equipment          │
  │ 3. Si viene de Propuesta: tx.CommercialProposal = WON   │
  │ 4. Actualizar Client:                                   │
  │      clientStatus = ACTIVE                             │
  │      internalCode = omegaCode                           │
  │      contractNumber = orderFolioCode                   │
  │      contractDate = installationDate                   │
  │      contractEndDate = contractEndDate                 │
  └────────────────────────────────────────────────────────┘
             │
             ▼
  [ tx Commit Exitoso ]
             │
             ▼
  [ Emitir Evento Asíncrono: 'commercial.service_order.dispatched' ]
             │
             ├──► Notificar a Contratos (Elaboración formal)
             ├──► Notificar a Operaciones (Programación de relevos)
             ├──► Notificar a Almacén (Preparar radios/dotación)
             ├──► Notificar a Central (Alta de cuadrante y geocerca)
             ├──► Notificar a Recepción (Registro de correspondencia)
             ├──► Notificar a RRHH (Reclutamiento de Guarda Ideal)
             ├──► Notificar a Calidad (Programar auditoría ISO)
             ├──► Notificar a Contabilidad (Creación contable)
             └──► Notificar a Tesorería (Facturación periódica)
```

### 3.2 Listener Resiliente de Notificación a 9 Áreas (`ServiceOrderNotificationListener`)
```typescript
@OnEvent('commercial.service_order.dispatched', { async: true })
async handleServiceOrderDispatched(payload: {
  tenantId: string;
  serviceOrderId: string;
  omegaCode: string;
  clientName: string;
}): Promise<void> {
  // 1. Obtener destinatarios configurados en ServiceOrderDistributionRecipient
  const recipients = await this.settingsRepo.findRecipients(payload.tenantId);

  // 2. Iterar por cada departamento y despachar correo con plantilla Chameleon
  for (const recipient of recipients) {
    if (!recipient.isActive) continue;
    try {
      await this.mailService.sendServiceOrderNotification({
        to: recipient.recipientEmail,
        department: recipient.department,
        omegaCode: payload.omegaCode,
        clientName: payload.clientName,
      });

      // 3. Registrar log de éxito
      await this.orderRepo.createDispatchLog({
        tenantId: payload.tenantId,
        serviceOrderId: payload.serviceOrderId,
        department: recipient.department,
        recipientEmail: recipient.recipientEmail,
        wasEmailSuccess: true,
      });
    } catch (err: any) {
      this.logger.error(`Error despachando OS a ${recipient.department}: ${err.message}`, err.stack);
      await this.orderRepo.createDispatchLog({
        tenantId: payload.tenantId,
        serviceOrderId: payload.serviceOrderId,
        department: recipient.department,
        recipientEmail: recipient.recipientEmail,
        wasEmailSuccess: false,
        deliveryNotes: err.message,
      });
    }
  }
}
```

---

## 4. Contratos de API REST (NestJS)

### 4.1 Permisos RBAC
* `commercial:service_orders:read`: Consulta de órdenes, fichas tácticas y estados de despacho.
* `commercial:service_orders:create`: Creación formal y activación de puestos (`COMMERCIAL_MANAGER`, `ADMIN`).
* `commercial:service_orders:update`: Modificación de dotación y asignación de coordinador de operaciones.
* `commercial:service_orders:retry_dispatch`: Reintento individual de notificación a un departamento específico.

### 4.2 Endpoints del Módulo (`@Controller('commercial/service-orders')`)
* `POST /api/v1/commercial/service-orders`: Creación atómica formal y despacho a 9 áreas.
* `GET /api/v1/commercial/service-orders`: Listado paginado con búsqueda por folio, código OMEGA o cliente.
* `GET /api/v1/commercial/service-orders/:id`: Ficha 360° de la orden (datos contractuales, perfiles de guardia, dotación de almacén y log de los 9 departamentos).
* `PATCH /api/v1/commercial/service-orders/:id/equipment`: Actualización del estado de entrega de dotación (`EquipmentDeliveryStatus`).
* `POST /api/v1/commercial/service-orders/:id/dispatch/retry`: Reintento de envío de correo a un departamento específico con fallo previo.

### 4.3 DTOs Principales (`class-validator`)
* `CreateServiceOrderDto`:
  * `clientId: string` (`@IsNotEmpty`, `@IsString`)
  * `proposalId?: string` (`@IsOptional`, `@IsString`)
  * `omegaCode: string` (`@IsNotEmpty`, `@IsString`, `@Length(3, 50)`)
  * `orderType: ServiceOrderType` (`@IsEnum(ServiceOrderType)`)
  * `installationDate: string` (`@IsDateString`)
  * `contractEndDate: string` (`@IsDateString`)
  * `empalmeDaysPrior?: number` (`@IsOptional`, `@IsInt`, `@Min(0)`)
  * `siteAddress: string`, `siteCity: string`, `legalRepName: string`, `administratorName: string`
  * `positions: CreateOrderPositionDto[]` (`@IsArray`, `@ValidateNested({ each: true })`)
  * `equipment: CreateOrderEquipmentDto[]` (`@IsArray`, `@ValidateNested({ each: true })`)

---

## 5. Arquitectura Frontend (UI/UX)

### 5.1 Reemplazo del Roadmap Placeholder
* **Ruta**: `src/app/(protected)/commercial/service-orders/page.tsx`.
* **Diseño Visual**: Estilo "Deep Violet Tactical Enterprise", tarjetas de métricas superiores (Órdenes Activas, Puestos en Instalación, Empalmes Próximos, Despachos con Alerta).
* **Consola de Gestión**: Tabla con búsqueda reactiva, filtro por tipo (`NEW_SITE`, `RENEWAL`, `ADDITION`) y chips tácticos con el código OMEGA en color violeta vibrante.

### 5.2 Vista de Detalle y Panel de Auditoría de 9 Departamentos
* **Arquetipo Split-Pane**:
  * **Columna Izquierda (60%)**: Ficha contractual, lista de puestos requeridos con el "Perfil del Guarda Ideal" (badges de curso de vigilancia, género sugerido, uniforme de gala) y checklist de dotación de almacén (radios, detectores, linternas).
  * **Columna Derecha (40%)**: Matriz de Estado de Despacho a las 9 Áreas. Lista interactiva de los 9 departamentos con estado en tiempo real (🟢 Enviado con éxito, 🔴 Falló envío). Cada fila con fallo ofrece un botón "Reintentar Despacho" con feedback inmediato vía snackbar.

---

## 6. Plan de Pruebas Unitarias y Cobertura ($\ge 80\%$)

1. **`ServiceOrdersService.createAndDispatch`**:
   * Valida unicidad de `omegaCode` antes de la transacción.
   * Ejecuta `$transaction` y verifica que `Client.clientStatus` pase a `ACTIVE`.
   * Verifica que si se asocia una propuesta, su estado pase a `WON`.
   * Verifica que se emita el evento `commercial.service_order.dispatched`.
   * Simula error en base de datos y comprueba que se ejecute `this.logger.error` conforme a la Regla 13.
2. **`ServiceOrderNotificationListener.handleServiceOrderDispatched`**:
   * Simula el evento y valida que se consulten los buzones de `ServiceOrderDistributionRecipient`.
   * Verifica que ante fallo de envío en 1 departamento, los otros 8 continúen su despacho y se registre el error en `ServiceOrderDispatchLog`.
