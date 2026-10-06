# Especificación SDD - Módulo PQRS (B2B)

## 1. Información General
* **Módulo:** Administrative / PQRS
* **Identificador:** SPEC-ADM-008
* **Objetivo:** Implementar un sistema de Peticiones, Quejas, Reclamos, Sugerencias y Felicitaciones (PQRS+F) exclusivo para comunicación B2B entre la Empresa de Seguridad (Tenant) y el Administrador del Conjunto Residencial (Client).
* **Canal:** Exclusivo Vía Web (Frontend Vercel). No aplica Email-to-Ticket.

---

## 2. Definición del Modelo de Datos (Prisma)
Se crearán dos nuevos modelos `PqrsTicket` y `PqrsMessage`, respetando la frontera de aislamiento `tenantId` y la segregación por `clientId`. Además, se ampliará `MediaAttachment`.

### `prisma/schema/pqrs.prisma` (Nuevo archivo)

```prisma
enum PqrsType {
  PETICION
  QUEJA
  RECLAMO
  SUGERENCIA
  FELICITACION
}

enum PqrsStatus {
  OPEN
  ASSIGNED
  IN_PROGRESS
  RESOLVED
  CLOSED
  REJECTED
}

enum PqrsPriority {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

model PqrsTicket {
  id          String   @id @default(cuid(2))
  tenantId    String
  tenant      Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  clientId    String
  client      Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)
  
  code        String   // Identificador amigable, ej. PQRS-2026-0001
  subject     String
  description String   @db.Text
  status      PqrsStatus @default(OPEN)
  priority    PqrsPriority @default(MEDIUM)
  type        PqrsType

  // Asignación interna
  assignedToId String?
  assignedTo   User?    @relation("TicketAssignedTo", fields: [assignedToId], references: [id], onDelete: SetNull)

  messages    PqrsMessage[]
  attachments MediaAttachment[] // Relación para evidencias

  createdById String?
  createdBy   User?    @relation("TicketCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)
  updatedById String?
  updatedBy   User?    @relation("TicketUpdatedBy", fields: [updatedById], references: [id], onDelete: SetNull)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([tenantId, code])
  @@index([tenantId])
  @@index([clientId])
  @@index([assignedToId])
}

model PqrsMessage {
  id          String   @id @default(cuid(2))
  tenantId    String
  tenant      Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  clientId    String
  client      Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)
  
  ticketId    String
  ticket      PqrsTicket @relation(fields: [ticketId], references: [id], onDelete: Cascade)

  content     String   @db.Text
  isFromClient Boolean @default(false) // True = Adm. Conjunto, False = Empresa Seguridad

  attachments MediaAttachment[] // Relación para evidencias de este mensaje

  createdById String?
  createdBy   User?    @relation("MessageCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)
  updatedById String?
  updatedBy   User?    @relation("MessageUpdatedBy", fields: [updatedById], references: [id], onDelete: SetNull)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([tenantId])
  @@index([clientId])
  @@index([ticketId])
}
```

---

## 3. Aislamiento, Lógica de Estados y Auditoría

### 3.1. Máquina de Estados Secuencial
Los tickets solo pueden cambiar de estado siguiendo un flujo estricto validado en el servicio:
1. `OPEN` -> Único salto permitido a `ASSIGNED` o `REJECTED`.
2. `ASSIGNED` -> Único salto permitido a `IN_PROGRESS` o `REJECTED`.
3. `IN_PROGRESS` -> Único salto permitido a `RESOLVED`.
4. `RESOLVED` -> Único salto permitido a `CLOSED` o regresión a `IN_PROGRESS` (si el cliente apela).
5. `REJECTED` y `CLOSED` son estados terminales.

### 3.2. Reglas de Visibilidad y Asignación (RBAC)
* Un administrador con el permiso `pqrs:manage` puede ver todos los tickets del tenant y usar el endpoint de asignación (`PATCH /:id/assign`).
* Un operador/usuario estándar del tenant con el permiso `pqrs:read` (o un permiso derivado) solo podrá ver los tickets donde `assignedToId === req.user.id`.
* Los usuarios asignados tienen permiso para avanzar el status del ticket.

---

## 4. Gestión de Evidencias (S3KeyFactory)
Al cargar archivos asociados a un ticket o mensaje de PQRS, se debe extender la utilidad `S3KeyFactory` para generar claves organizadas bajo la siguiente jerarquía:
```typescript
// S3 Path: tenants/{tenantId}/clients/{clientId}/pqrs/{ticketId}/{uuid}-{filename}
const key = S3KeyFactory.generate(tenantId, { type: 'pqrs', ticketId, clientId }, file.originalname);
```

---

## 5. Event-Driven Architecture y MailService (Notificaciones)

Para desacoplar el envío de notificaciones y no bloquear el request HTTP, usaremos **@nestjs/event-emitter** combinado con un **MailService** global basado en el Adapter Pattern.

### 5.1. MailService (Adapter Pattern)
Se creará `src/common/mail/mail.service.ts` importado en un `@Global() MailModule`. Utilizará Resend por defecto pero su contrato (`sendMail`) ignorará la implementación subyacente. Los errores serán envueltos en `try/catch` con Logger, retornando un booleano para no derribar transacciones de Prisma.

### 5.2. Desacoplamiento (Event Emitter)
En lugar de inyectar el `MailService` directamente en `PqrsService` e invocar `void this.mailService...`, lo cual sigue acoplando dominios, se emitirán eventos:
```typescript
// En PqrsService:
this.eventEmitter.emit('pqrs.ticket.replied', new PqrsRepliedEvent(payload));
```
Un Listener dedicado (`pqrs.listener.ts`) escuchará este evento e inyectará el `MailService` para ejecutar el envío en background.

---

## 6. Contratos API REST (Endpoints)

**Prefijo:** `/administrative/pqrs`

| Método | Endpoint | Permiso RBAC | Descripción | Request Body |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/` | `pqrs:create` | Radica un nuevo ticket. (Asigna `clientId` automáticamente). | `{ subject, description, type, priority? }` |
| `GET` | `/` | `pqrs:read` | Lista tickets. Si el user es Tenant (sin `manage`), filtra por `assignedToId`. Si es Cliente, filtra por `clientId`. | `QueryParams: { status, type, search }` |
| `GET` | `/:id` | `pqrs:read` | Obtiene el ticket con `messages`, `attachments` y `assignedTo`. | - |
| `PATCH` | `/:id/status`| `pqrs:update`| Avanza el estado según la máquina secuencial. | `{ status: PqrsStatus }` |
| `PATCH` | `/:id/assign`| `pqrs:manage`| Asigna el ticket a un empleado/usuario. | `{ assignedToId: string }` |
| `POST` | `/:id/messages`| `pqrs:update`| Agrega respuesta. Emite evento para Email. | `{ content: string }` |

---

## 7. UI/UX Frontend (Next.js)

1. **Gestor de PQRS (Tenant Admin)**: Vista completa, tabla con columna de "Asignado A", y acciones de reasignación.
2. **Mis Tickets Asignados (Tenant Operador)**: Vista filtrada, solo puede ver y responder los suyos.
3. **Mis Recursos > PQRS (Cliente)**: Mantiene la vista exclusiva para que el Administrador del Conjunto radique y consulte sus tickets.
4. **Validación de UI**: El desplegable de cambio de estatus se habilitará o inhabilitará calculando las transiciones permitidas según el estatus actual de la máquina de estados secuencial.
