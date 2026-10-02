# SPEC-ADM-014: Gestión y Control de Prioridad de PQRS (Restricción Residence-Manager y Reclasificación por Operador)

> **Estado**: `IMPLEMENTADO`  
> **Módulo**: `administrative / pqrs / priority`  
> **Autor(es)**: `Software Architect & Senior Fullstack Engineer`  
> **Fecha de Creación**: `2026-10-02`  
> **Última Actualización**: `2026-10-02`  

---

## 1. Contexto de Negocio e Historias de Usuario

### 1.1 Objetivo
Garantizar la correcta triada y clasificación operativa de las solicitudes PQRS en el sistema Noxia. 

En la operativa real, los administradores de conjuntos residenciales (`RESIDENCE_MANAGER`) tienden a marcar todas sus solicitudes como "Alta" o "Crítica" por sesgo de urgencia individual, lo que distorsiona los Acuerdos de Nivel de Servicio (SLA), los KPIs y la priorización de la empresa de seguridad.

Por ello, se establece la regla de negocio donde:
1. Las solicitudes radicadas por un `RESIDENCE_MANAGER` se crean automáticamente con **Prioridad MEDIA** por omisión.
2. El selector de prioridad se oculta en la vista del administrador del conjunto para simplificar su formulario y evitar expectativas falsas.
3. El **Operador de la empresa de seguridad** es el único facultado para reclasificar o establecer la prioridad real (`BAJA`, `MEDIA`, `ALTA`, `CRÍTICA`) tras evaluar el mérito del ticket, tanto al momento de radicar internamente como en la vista de detalle y/o en la asignación del ticket.

### 1.2 Historias de Usuario (User Stories)
- **US-01**: Como **Administrador de Conjunto Residencial (`RESIDENCE_MANAGER`)**, quiero un formulario ágil de radicación sin selector de prioridad, para que el sistema asigne automáticamente prioridad "Media" y sea la empresa de seguridad quien determine la urgencia operativa.
- **US-02**: Como **Operador de Seguridad**, quiero tener la potestad de seleccionar la prioridad inicial al radicar solicitudes creadas internamente por la empresa.
- **US-03**: Como **Operador de Seguridad**, quiero poder cambiar y reclasificar la prioridad de cualquier ticket existente desde la vista de detalle (o al asignarlo), registrando el cambio y notificando en tiempo real vía SSE.
- **US-04**: Como **Sistema**, debo rechazar o sobreescribir cualquier intento en API de asignar una prioridad diferente a `MEDIUM` cuando la petición provenga de un usuario de tipo cliente o `RESIDENCE_MANAGER`.

---

## 2. Definición Técnica Backend

### 2.1 Enmascaramiento y Regla de Creación en Backend
**Archivo:** `src/modules/administrative/pqrs/services/pqrs.service.ts`
- En el método `create(dto: CreatePqrsTicketDto)`:
  - Verificar el contexto del creador:
    ```ts
    const isClientUser = Boolean(this.contextService.clientId);
    // Si es residence-manager / cliente, la prioridad forzada es MEDIUM
    const effectivePriority = isClientUser 
      ? PqrsPriority.MEDIUM 
      : (dto.priority || PqrsPriority.MEDIUM);
    ```
  - Guardar el ticket con `effectivePriority`.

### 2.2 Nuevo Endpoint de Actualización de Prioridad
**Archivos a crear / modificar:**
1. **DTO `UpdatePqrsPriorityDto`:**
   - Ubicación: `src/modules/administrative/pqrs/dtos/update-pqrs-priority.dto.ts`
   ```ts
   import { ApiProperty } from '@nestjs/swagger';
   import { IsEnum, IsNotEmpty } from 'class-validator';
   import { PqrsPriority } from '@prisma/client';

   export class UpdatePqrsPriorityDto {
     @ApiProperty({
       enum: PqrsPriority,
       description: 'Nueva prioridad asignada al ticket',
       example: PqrsPriority.HIGH,
     })
     @IsEnum(PqrsPriority, { message: 'Prioridad no válida' })
     @IsNotEmpty({ message: 'La prioridad es obligatoria' })
     priority: PqrsPriority;
   }
   ```
2. **Método en Repositorio (`pqrs.repository.ts`):**
   ```ts
   async updateTicketPriority(id: string, priority: PqrsPriority): Promise<any> {
     return this.prisma.pqrsTicket.update({
       where: { id },
       data: { priority },
       include: {
         client: { select: { id: true, name: true } },
         assignedTo: { select: { id: true, fullName: true } },
       },
     });
   }
   ```
3. **Servicio (`pqrs.service.ts`):**
   - Método `updatePriority(id: string, dto: UpdatePqrsPriorityDto, userPermissions: string[])`:
     - Validar que el usuario no sea cliente (`contextClientId` prohibido).
     - Validar que tenga permisos `pqrs:update` o `pqrs:manage`.
     - Validar que el ticket no se encuentre en estado terminal `CLOSED` o `REJECTED`.
     - Si la prioridad es idéntica a la actual, retornar sin cambios.
     - Actualizar en base de datos.
     - Emitir evento SSE `PQRS_UPDATED` a través de `sseService.emitToTenant`:
       ```ts
       this.sseService.emitToTenant(
         updated.tenantId,
         {
           type: 'PQRS_UPDATED',
           ticketId: updated.id,
           code: updated.code,
           priority: updated.priority,
           triggeredById: this.contextService.userId,
         },
         updated.clientId,
       );
       ```
4. **Controlador (`pqrs.controller.ts`):**
   - `@Patch(':id/priority')`
   - `@RequirePermissions('pqrs:update', 'pqrs:manage')`
   - `updatePriority(@Req() req: any, @Param('id') id: string, @Body() dto: UpdatePqrsPriorityDto)`

5. **Extensión en Asignación (`AssignPqrsTicketDto`):**
   - Opcionalmente permitir `priority?: PqrsPriority` en `assign-pqrs-ticket.dto.ts` y en `PqrsService.assign(...)` para que el operador pueda cambiar funcionario y prioridad en el mismo modal si lo desea.

---

## 3. Definición Técnica Frontend

### 3.1 Cliente API Frontend
**Archivo:** `src/lib/api/pqrs.ts`
- Agregar método en `PqrsApi`:
  ```ts
  static async updatePriority(id: string, priority: PqrsPriority): Promise<PqrsTicket> {
    return HttpClient.patch<PqrsTicket>(`/administrative/pqrs/${id}/priority`, { priority });
  }
  ```

### 3.2 Modal de Radicación (`CreatePqrsDialog.tsx`)
**Archivo:** `src/components/pqrs/CreatePqrsDialog.tsx`
- Si `isResidenceManager === true`:
  - Ocultar por completo el `FormControl` de Prioridad.
  - El selector de `Tipo de Solicitud` ocupará el 100% del ancho del renglón (`width: "100%"`).
  - Al hacer `handleSubmit`, enviar `priority: PqrsPriority.MEDIUM`.

### 3.3 Reclasificación en la Vista de Detalle (`[id]/page.tsx`)
**Archivo:** `src/app/(protected)/administrative/pqrs/[id]/page.tsx`
- En la cabecera del ticket, donde se muestra `<PqrsPriorityChip priority={ticket.priority} />`:
  - Si el usuario es operador (`canManagePqrs || canUpdateStatus` y `!isResidenceManager` y `!isTerminal`):
    - Envolver el chip o agregar un botón interactivo (ej. menú contextual o click en el chip con icono desplegable) que abra un menú con las 4 prioridades (`Baja`, `Media`, `Alta`, `Crítica`).
    - Al hacer clic en una opción, llama a `PqrsApi.updatePriority(ticket.id, newPriority)`.
    - Actualiza el estado local inmediatamente y muestra notificación `showSuccess("Prioridad actualizada a: Alta")`.

### 3.4 Modal de Asignación (`AssignPqrsDialog.tsx`)
- Incluir un selector opcional de prioridad:
  - Al abrir el modal, preselecciona la prioridad actual del ticket.
  - Al confirmar la asignación, si la prioridad cambió, se actualiza simultáneamente.

---

## 4. Plan de Implementación por Fases

### Fase 1: Backend
- [x] Crear DTO `src/modules/administrative/pqrs/dtos/update-pqrs-priority.dto.ts`.
- [x] Actualizar `PqrsRepository` con `updateTicketPriority` y soporte de prioridad en `assignTicket`.
- [x] Actualizar `PqrsService.create` para forzar `priority = PqrsPriority.MEDIUM` cuando `contextClientId` existe.
- [x] Implementar `PqrsService.updatePriority` y extender `PqrsService.assign`.
- [x] Agregar evento y manejador `pqrs.ticket.priority_changed` para sincronización en tiempo real vía SSE en `notification.listener.ts`.
- [x] Agregar endpoint `@Patch(':id/priority')` en `PqrsController`.
- [x] Actualizar pruebas unitarias en `pqrs.service.spec.ts` (19 pruebas superadas).

### Fase 2: Frontend
- [x] Actualizar `src/lib/api/pqrs.ts` con `updatePriority` y extender `AssignPqrsTicketPayload`.
- [x] Modificar `CreatePqrsDialog.tsx` para ocultar el selector de prioridad en `RESIDENCE_MANAGER` y enviar `MEDIUM`.
- [x] Modificar `[id]/page.tsx` para permitir al operador cambiar la prioridad con menú interactivo sobre el chip.
- [x] Agregar selector de prioridad en `AssignPqrsDialog.tsx`.
- [x] Validar con TypeScript (`tsc --noEmit`).
