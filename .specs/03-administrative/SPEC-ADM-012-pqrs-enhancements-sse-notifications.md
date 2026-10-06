# SPEC-ADM-012: Mejoras al Módulo PQRS, Notificaciones In-App y Server-Sent Events (SSE)

> **Estado**: `IMPLEMENTADO`  
> **Módulo**: `administrative / notifications / sse`  
> **Autor(es)**: `Software Architect`  
> **Fecha de Creación**: `2026-10-01`  

---

## 1. Contexto de Negocio y Justificación

Tras la implementación exitosa del módulo B2B de PQRS, se han identificado varias áreas de mejora en la experiencia de usuario (UX) y en la arquitectura de sincronización en tiempo real. 

Actualmente, los indicadores (KPIs) no se actualizan de forma reactiva al interactuar con la tabla, los administradores de conjuntos residenciales ven conteos globales, y no existe un canal ligero y proactivo para notificar a los empleados cuando se les asigna un ticket. Además, se requiere refinar aspectos de la interfaz como bloquear reasignaciones en tickets finalizados y mostrar información visual más amigable (avatares).

Para la actualización en tiempo real, se descarta el uso de WebSockets tradicionales en favor de **Server-Sent Events (SSE)**, garantizando un menor consumo de memoria y una integración nativa sobre HTTP estándar, perfecta para nuestra necesidad unidireccional (Server -> Client).

---

## 2. Requerimientos Funcionales y Técnicos

### 2.1. Aislamiento de KPIs por Cliente (Conjunto Residencial)
- **Problema:** En la vista del usuario `RESIDENCE_MANAGER`, los KPIs (total, abiertas, etc.) no están condicionados al cliente.
- **Solución:**
  - En el backend (`PqrsRepository` / `PqrsService`), interceptar el contexto del usuario. Si el usuario pertenece a un cliente específico (`contextClientId`), inyectar en las consultas de agregación (`prisma.pqrsTicket.count()`) la cláusula `where: { clientId: contextClientId }`.
  - Asegurar que el frontend propague el contexto adecuado si la consulta se realiza vía parámetros (ej. `?clientId=...`).

### 2.2. Sistema de Notificaciones In-App
- **Problema:** Los empleados no se enteran inmediatamente dentro de la app cuando se les asigna un ticket.
- **Solución (Backend):**
  - Crear un nuevo modelo `Notification` en Prisma (ver sección de Esquema de Base de Datos).
  - Implementar un módulo `NotificationsModule` que escuche el evento `pqrs.ticket.assigned` (o `pqrs.ticket.status_changed`) y cree el registro de notificación asociado al `assignedToId`.
  - Proveer un endpoint `GET /notifications/unread` para el usuario autenticado.
- **Solución (Frontend):**
  - Implementar un componente `NotificationBell` en el header principal.
  - Mostrar un badge con el conteo de notificaciones no leídas.
  - Al hacer clic, desplegar un `Popover` con las notificaciones recientes.

### 2.3. Avatares en Tabla de PQRS
- **Problema:** La columna "Asignado A" en el `DataTable` es puro texto, disminuyendo la agilidad visual estilo "Jira".
- **Solución:**
  - En la definición de columnas (`columns` del DataTable de PQRS), crear una celda personalizada para el usuario asignado.
  - Utilizar el componente genérico de Avatar (basado en iniciales del `fullName`) renderizando un pequeño círculo coloreado junto al nombre.

### 2.4. Bloqueo de Reasignación en Tickets Cerrados
- **Problema:** Los tickets en estado terminal (`CERRADO`, `RECHAZADO`) todavía muestran la opción de asignar.
- **Solución:**
  - **Backend:** En el método de asignación de `PqrsService`, verificar si el estado actual del ticket está en un estado final. Si es así, lanzar un `BadRequestException`.
  - **Frontend:** En la configuración de acciones por fila en la vista de lista y en la vista de detalles, ocultar o deshabilitar el botón "Asignar" si `ticket.status === 'CLOSED'` o `ticket.status === 'REJECTED'`.

### 2.5. Sincronización Simultánea de Tabla y KPIs
- **Problema:** El botón "Refrescar" solo recarga los datos de la tabla, dejando los KPIs desactualizados.
- **Solución:**
  - Modificar el handler del botón `Refrescar`. Usar la función de invalidación del manejador de estado (ej. `mutate` de SWR o React Query) para invalidar *ambas* claves simultáneamente: el endpoint de la tabla y el endpoint de los KPIs.

### 2.6. Sincronización en Tiempo Real (SSE)
- **Problema:** Actualizaciones push desde el servidor a los clientes (sin WebSockets pesados).
- **Solución:**
  - **Backend:** Crear un controlador con el decorador `@Sse('events')`. Este endpoint retornará un `Observable<MessageEvent>`. Suscribirse a los eventos del sistema (ej. modificaciones en PQRS) usando el `EventEmitter2` de NestJS y empujar estos eventos al stream SSE del usuario conectado.
  - **Frontend:** Implementar un hook `useServerSentEvents` utilizando la API nativa `EventSource`. Al recibir un evento relevante (ej. `PQRS_UPDATED`), el hook invalidará las cachés de SWR/React Query de la tabla y los KPIs de forma silenciosa, forzando un re-render con los datos frescos.

---

## 3. Esquema de Base de Datos (Prisma)

Se propone el siguiente modelo general para el sistema de notificaciones:

```prisma
// prisma/schema/notification.prisma
model Notification {
  id        String   @id @default(cuid(2))
  tenantId  String
  tenant    Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  title     String
  message   String
  type      String   // ej. 'PQRS_ASSIGNED', 'PQRS_UPDATED'
  link      String?  // Opcional: URL para redireccionar al hacer clic (ej. /administrative/pqrs/{id})
  
  isRead    Boolean  @default(false)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([tenantId])
  @@index([userId, isRead])
  @@map("notifications")
}
```
*(Nota: Añadir las relaciones correspondientes en `tenant.prisma` y `user.prisma`).*

---

## 4. Estrategia de Ejecución

1. **Backend - Fase 1 (Modelos y Core):**
   - Actualizar el esquema Prisma con la tabla `Notification` y ejecutar la migración.
   - Modificar las lógicas de `PqrsService` (aislamiento por `clientId` en KPIs, bloqueo de reasignación).
2. **Backend - Fase 2 (SSE y Notificaciones):**
   - Crear el módulo `NotificationsModule` (Servicio, Controlador CRUD).
   - Implementar el controlador SSE en el `AppModule` o `NotificationsModule` para manejar streams.
   - Emitir registros de notificación tras escuchar `pqrs.ticket.assigned`.
3. **Frontend - UI/UX y Funcionalidad Básica:**
   - Implementar Avatar en las columnas del DataTable.
   - Aplicar condicionales para deshabilitar botones en tickets cerrados.
   - Sincronizar el botón "Refrescar".
4. **Frontend - SSE y Header:**
   - Crear el componente `NotificationBell`.
   - Crear e integrar el hook de `EventSource` para forzar invalidaciones locales de caché.

---
> **Aprobación Requerida:** Tras revisar esta especificación, procederemos con la ejecución paso a paso.
