# SPEC-ADM-013: Notificaciones Sonoras "Zero-Asset" (Web Audio API) y SSE en Módulo de PQRS

> **Estado**: `IMPLEMENTADO`  
> **Módulo**: `administrative / notifications / sse / audio`  
> **Autor(es)**: `Software Architect & Fullstack Senior Engineer`  
> **Fecha de Creación**: `2026-10-02`  
> **Última Actualización**: `2026-10-02`  

---

## 1. Contexto de Negocio e Historias de Usuario

### 1.1 Objetivo
Dotar al módulo de PQRS de un sistema de alertas sonoras y visuales en tiempo real ("Zero-Asset") en el frontend (Next.js + Material UI), aprovechando el canal unidireccional existente de Server-Sent Events (SSE). 

Para garantizar un rendimiento óptimo, cero consumo de ancho de banda adicional y evitar fallos por rutas de recursos multimedia rotas o peticiones de red bloqueadas, se utilizará exclusivamente la **Web Audio API nativa** del navegador. Los tonos son generados y sintetizados proceduralmente mediante osciladores sinusoidales y envolventes exponenciales en tiempo de ejecución.

### 1.2 Historias de Usuario (User Stories)
- **US-01**: Como **Operador de PQRS / Administrador**, quiero escuchar un tono suave distintivo cuando llegue una nueva respuesta en el chat de una PQRS de un cliente o tercero, para atender la solicitud con agilidad.
- **US-02**: Como **Operador de PQRS**, quiero escuchar un acorde ascendente tipo chime cuando se radique un nuevo ticket, se reasigne o cambie de estado, para enterarme al instante sin necesidad de refrescar la pantalla manualmente.
- **US-03**: Como **Usuario**, NO quiero que el sistema emita alertas sonoras cuando yo mismo envío un mensaje o cambio el estado de una solicitud (regla de no auto-notificación).
- **US-04**: Como **Operador**, quiero poder silenciar o reactivar las notificaciones sonoras en cualquier momento desde la cabecera del chat y desde la barra de acciones del listado general, conservando mi preferencia en el navegador (`localStorage`).
- **US-05**: Como **Operador**, si me encuentro trabajando en otra pestaña o ventana del navegador (`document.hidden === true`), quiero que la pestaña me indique visualmente con `"🔔 Nueva actividad - PQRS"` y se restaure automáticamente al volver a ella.

---

## 2. Hallazgos y Ajustes de Arquitectura

Durante la revisión técnica del requerimiento contra el código base existente, se identificaron y subsanaron las siguientes discrepancias:

| Elemento | Enfoque Original del Comando | Arquitectura Real del Proyecto y Ajuste |
| :--- | :--- | :--- |
| **Suscripción SSE** | Asumía suscripciones `EventSource` independientes en `pqrs/page.tsx` y `[id]/page.tsx`. | Existe un `SseProvider.tsx` centralizado en el layout protegido. Las páginas escuchan `CustomEvents` nativos en `window`. **Ajuste:** La reproducción de sonido se conecta centralizadamente en `SseProvider.tsx` para cubrir toda la aplicación sin duplicar listeners. |
| **Identificación de Autor (SSE)** | Asumía que el payload SSE contenía `authorId` o `triggeredById`. | En `replyTicket` de `pqrs.service.ts`, `createdById` no se pasaba a `createMessage`, quedando `null`. En `PQRS_UPDATED` no se enviaba el disparador. **Ajuste:** Enriquecer `replyTicket` y `notification.listener.ts` enviando `createdById` y `triggeredById`. |
| **Reactividad del Mute en UI** | Asumía singleton con `toggleMute()` y `getMutedState()` en `localStorage`. | Los componentes React no re-renderizan cambios en `localStorage` a menos que se notifique. **Ajuste:** Proveer el hook `useNotificationSound()` con suscripción por eventos internos para sincronizar instantáneamente los iconos de volumen en toda la UI. |
| **Web Audio API Exponencial** | Uso directo de `exponentialRampToValueAtTime`. | `exponentialRampToValueAtTime` arroja `IndexSizeError` si el valor inicial o final es `<= 0`. **Ajuste:** Emplear `0.0001` como valor de piso antes de rampa o corte. |

---

## 3. Especificación Técnica Backend

### 3.1 Corrección de Auditoría en Creación de Mensajes
**Archivo:** `src/modules/administrative/pqrs/services/pqrs.service.ts`
- En el método `replyTicket(id, dto, userPermissions, contextClientId)`:
  - Al invocar `this.repository.createMessage(...)`, incluir explícitamente `createdById: userId`.
  - En la emisión de `PqrsTicketRepliedEvent`, asegurar que el objeto `message` contenga `createdById: userId`.

### 3.2 Enriquecimiento de Eventos de Dominio
**Archivos:**
- `src/modules/administrative/pqrs/events/pqrs-ticket-replied.event.ts`: Añadir `createdById?: string` al tipado del mensaje.
- `src/modules/administrative/pqrs/events/pqrs-ticket-created.event.ts`: Incluir `triggeredById?: string`.
- `src/modules/administrative/pqrs/events/pqrs-ticket-status-changed.event.ts`: Incluir `triggeredById?: string`.

### 3.3 Propagación en SSE
**Archivo:** `src/modules/notifications/listeners/notification.listener.ts`
- En `handleTicketReplied`: Enviar en el payload SSE `{ type: 'PQRS_MESSAGE_ADDED', ticketId, code, message: { ...event.message, createdById: ... } }`.
- En `handleTicketCreated`, `handleTicketAssigned` y `handleTicketStatusChanged`: Incluir `triggeredById: event.triggeredById || ...` en el payload `{ type: 'PQRS_UPDATED', ... }`.

---

## 4. Especificación Técnica Frontend

### 4.1 Gestor de Sonido Sintetizado (`NotificationSoundManager`)
**Archivo:** `src/utils/notification-sound.ts` (o `src/lib/sound/notification-sound.ts`)
- **Instancia Lazy de `AudioContext`:** Inicialización segura evitando advertencias de SSR en Next.js (`typeof window !== 'undefined'`).
- **Desbloqueo de Autoplay:** Listeners con `{ once: true }` para `click`, `keydown` y `touchstart` en `window` para invocar `audioCtx.resume()`.
- **Anti-Spam Cooldown:** Intervalo mínimo entre reproducciones de `cooldownMs = 1500`.
- **Persistencia Mute:** Clave en `localStorage`: `'noxia_pqrs_mute'`.
- **Hook React:** `useNotificationSound()` que expone `{ isMuted, toggleMute, playSound }` y sincroniza el estado entre componentes mediante el evento personalizado `window.dispatchEvent(new CustomEvent('noxia:sound_mute_changed'))`.

#### Parámetros Acústicos de Síntesis:
1. **Tipo `'message'` (Pop/Burbuja):**
   - Onda sinusoidal (`oscillator.type = 'sine'`).
   - Tono 1: Frecuencia 587.33 Hz (Re5), duración 0.12s. Rampa de ganancia: 0.0001 -> 0.25 -> 0.0001.
   - Tono 2: Frecuencia 880.00 Hz (La5), inicio a `+0.08s`, duración 0.18s. Rampa de ganancia: 0.0001 -> 0.25 -> 0.0001.
2. **Tipo `'ticket'` (Chime Ascendente):**
   - Tono 1: Frecuencia 523.25 Hz (Do5), duración 0.15s.
   - Tono 2: Frecuencia 659.25 Hz (Mi5), inicio a `+0.12s`, duración 0.15s.
   - Tono 3: Frecuencia 783.99 Hz (Sol5), inicio a `+0.24s`, duración 0.30s.

### 4.2 Integración en `SseProvider.tsx` e Indicador de Pestaña
**Archivo:** `src/providers/SseProvider.tsx`
- Al procesar el evento SSE `PQRS_MESSAGE_ADDED`:
  - Validar regla de auto-notificación: si `payload.message?.createdById === session?.user?.id`, omitir sonido.
  - De lo contrario, invocar `notificationSound.play('message')`.
- Al procesar el evento SSE `PQRS_UPDATED`:
  - Validar si `payload.triggeredById === session?.user?.id`. Si es igual, omitir sonido.
  - De lo contrario, invocar `notificationSound.play('ticket')`.
- **Indicador de Pestaña en Segundo Plano:**
  - Si `document.hidden === true` al recibir un evento de otro usuario:
    - Respaldar `originalTitle = document.title`.
    - Establecer `document.title = "🔔 Nueva actividad - PQRS"`.
  - En el listener `visibilitychange`, si `!document.hidden`, restaurar automáticamente `document.title = originalTitle`.

### 4.3 Botón de Silencio / Activación en la UI (Material UI)
1. **Cabecera de Historial de Conversación (`src/app/(protected)/administrative/pqrs/[id]/page.tsx`):**
   - En la barra del chat (junto al chip de conteo de mensajes), agregar `<Tooltip title={isMuted ? "Activar notificaciones sonoras" : "Silenciar notificaciones sonoras"}>`.
   - Botón `<IconButton size="small">` con icono `VolumeUpRounded` (activo) o `VolumeOffRounded` (silenciado).
   - Al activar el sonido, reproducir un sonido de prueba tipo `'message'` como feedback inmediato.
2. **Barra de Acciones del Listado General (`src/app/(protected)/administrative/pqrs/page.tsx`):**
   - Integrar el mismo botón de control en la barra superior junto al botón de refrescar.

---

## 5. Plan de Implementación por Fases

- [x] **Fase 1: Backend - Auditoría y Payloads SSE**
  - [x] Enriquecer `replyTicket` en `pqrs.service.ts` con `createdById`.
  - [x] Actualizar firmas de eventos `PqrsTicketRepliedEvent`, `PqrsTicketCreatedEvent`, `PqrsTicketStatusChangedEvent`, `PqrsTicketAssignedEvent`.
  - [x] Añadir `createdById` y `triggeredById` a los payloads emitidos en `notification.listener.ts`.
- [x] **Fase 2: Frontend - Gestor Web Audio API y Hook React**
  - [x] Crear `src/utils/notification-sound.ts` con el singleton, síntesis sinusoidal, cooldown, localStorage y hook `useNotificationSound`.
- [x] **Fase 3: Frontend - Integración Global y Pestaña en Segundo Plano**
  - [x] Integrar el gestor en `SseProvider.tsx` con la regla de No Auto-Notificación.
  - [x] Implementar el actualizador reactivo de `document.title` ante `document.hidden` y `visibilitychange`.
- [x] **Fase 4: Frontend - Componentes de UI (Material UI)**
  - [x] Insertar el botón con `VolumeUpRounded` / `VolumeOffRounded` en la cabecera de chat de `[id]/page.tsx`.
  - [x] Insertar el botón en la barra de herramientas de `pqrs/page.tsx`.
  - [x] Probar feedback sonoro de prueba al desmutear.
- [x] **Fase 5: Validación y Control de Calidad**
  - [x] Verificar que no haya clics ni saturación de audio.
  - [x] Comprobar que las acciones propias no suenan.
  - [x] Comprobar sincronización en vivo y restauración del título al volver a la pestaña.
