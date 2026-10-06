# SPEC-ADM-011: Monolito Modular con Bounded Contexts Lógicos - Capa de Repositorios para PQRS y Estudios de Seguridad

> **Estado**: `APROBADO`  
> **Módulo**: `administrative`  
> **Autor(es)**: `Lead Software Architect`  
> **Fecha de Creación**: `2026-10-01`  
> **Última Actualización**: `2026-10-01`  

---

## 1. Contexto de Negocio y Justificación Arquitectónica

### 1.1 Objetivo y Diagnóstico
Durante la auditoría del monolito modular de **Noxia**, se detectó una divergencia arquitectónica en los módulos administrativos más recientes:
1. `src/modules/administrative/pqrs`
2. `src/modules/administrative/security-studies`

A diferencia de los módulos fundacionales (`department`, `position`, `role`, `user`, `employee`, `client`, `resident`, `minuta`), que delegan el acceso a datos en la capa de repositorios, estos dos módulos inyectaron directamente `PrismaService` en sus archivos de servicio (`PqrsService` y `SecurityStudiesService`).

Esta desviación ocurrió debido a la **alta complejidad no-CRUD** de ambos dominios:
- **Transacciones atómicas complejas (`prisma.$transaction`)** en aprobación de perímetros y versionado de estudios.
- **Consultas relacionales profundamente anidadas** (hilos de mensajes, evidencias con URLs prefirmadas de S3, conteos de agregación).
- **Manipulación intensiva de datos JSONB** (capas vectoriales de Konva y geocercas satelitales).
- **Filtrado dinámico contextual basado en permisos y tenencia** (`where.assignedToId = userId` vs `where.clientId = contextClientId`).

### 1.2 Decisión Arquitectónica: Bounded Contexts Lógicos Autocontenidos
Para resolver esta inconsistencia **sin caer en la trampa de un repositorio genérico plano** en `src/common/repository` que rompería la encapsulación, se adopta el patrón de **Monolito Modular con Bounded Contexts Lógicos**:

```
src/modules/administrative/[modulo]/
├── controllers/          → Directivas HTTP, Pipes, Swagger, Guards
├── services/             → Lógica de Negocio Pura, Máquina de Estados, Orquestación
├── repositories/         → Capa de Persistencia y Consultas Especializadas de Prisma
├── dtos/                 → Contratos de Transferencia de Datos
├── listeners/            → Gestión de Eventos Desacoplados
└── [modulo].module.ts    → Ensamblado del Contexto
```

**Beneficios Estratégicos:**
1. **Separación de Responsabilidades (SoC)**: El servicio de negocio desconoce la sintaxis de Prisma (`where`, `include`, `findFirst`); únicamente orquesta reglas de negocio y transiciones.
2. **Módulo 100% Autocontenido**: Cada submódulo contiene todos sus artefactos. No depende de carpetas externas en `src/common/repository`.
3. **Preparación Inmediata para Microservicios (Strangler Fig Pattern)**: Si en el futuro `PQRS` o `SecurityStudies` deben ser extraídos a microservicios independientes con base de datos propia (*Database-per-Service*), el servicio de negocio permanece intacto y solo se sustituye la implementación del repositorio local por adaptadores HTTP/gRPC.
4. **Cero Regresiones**: No se altera la API REST pública, las pruebas unitarias se vuelven más limpias y el frontend no sufre ningún cambio.

---

## 2. Matriz de Cambios por Módulo

### 2.1 Módulo PQRS (`src/modules/administrative/pqrs`)

#### Artefacto Nuevo: `repositories/pqrs.repository.ts`
Encapsula todas las operaciones de base de datos sobre los modelos `PqrsTicket` y `PqrsMessage`:
- `createTicket(data: Prisma.PqrsTicketUncheckedCreateInput): Promise<PqrsTicket>`
- `findAllTickets(where: Prisma.PqrsTicketWhereInput, skip: number, take: number): Promise<[number, PqrsTicket[]]>`
- `findTicketById(id: string, tenantId?: string): Promise<PqrsTicket | null>`
- `updateTicketStatus(id: string, status: PqrsStatus, reason?: string): Promise<PqrsTicket>`
- `assignTicket(id: string, assignedToId: string, status?: PqrsStatus): Promise<PqrsTicket>`
- `createMessage(data: Prisma.PqrsMessageUncheckedCreateInput): Promise<PqrsMessage>`
- `findMessageById(id: string): Promise<PqrsMessage | null>`

#### Refactorización de `services/pqrs.service.ts`:
- **Remover** la inyección directa de `PrismaService`.
- **Inyectar** `PqrsRepository`.
- Mantener intactas las validaciones de máquina de estados secuencial (`OPEN` $\to$ `ASSIGNED` $\to$ `IN_PROGRESS` $\to$ `RESOLVED` $\to$ `CLOSED` / `REJECTED`), la emisión de eventos de email (`@nestjs/event-emitter`) y la resolución de URLs prefirmadas en S3.

#### Actualización de `pqrs.module.ts`:
- Declarar y exportar `PqrsRepository` en la sección de `providers`.

---

### 2.2 Módulo Security Studies (`src/modules/administrative/security-studies`)

#### Artefacto Nuevo: `repositories/security-studies.repository.ts`
Encapsula todas las operaciones relacionales, JSONB y transacciones sobre `SecurityStudy`, `Client` (geocerca) y `MediaAttachment`:
- `findStudyById(id: string, tenantId?: string): Promise<any>`
- `findStudiesByClient(clientId: string, tenantId?: string): Promise<any[]>`
- `findCurrentStudyByClient(clientId: string, tenantId?: string): Promise<any>`
- `createStudy(data: any): Promise<any>`
- `updateStudy(id: string, data: any): Promise<any>`
- `updateStudyCanvas(id: string, canvasData: any): Promise<any>`
- `discontinueStudy(id: string, reason?: string): Promise<any>`
- `approvePerimeterAndDiscontinuePrevious(params: { clientId: string; tenantId: string; studyId?: string; perimeterData: any; baseImageS3Key: string; bbox: any; center: any; zoom: number }): Promise<any>` *(Encapsula la transacción atómica `prisma.$transaction`)*
- `getClientGeofence(clientId: string, tenantId?: string): Promise<any>`
- `updateClientGeofence(clientId: string, tenantId: string, data: any): Promise<any>`
- `findAttachmentsByStudy(studyId: string, tenantId: string): Promise<any[]>`
- `deleteAttachment(attachmentId: string, tenantId: string): Promise<any>`

#### Refactorización de `services/security-studies.service.ts`:
- **Remover** la inyección directa de `PrismaService`.
- **Inyectar** `SecurityStudiesRepository`.
- Mantener intactas las integraciones de Mapbox Static API, cálculos matemáticos de Mercator (`MapboxMathUtil`), subida de buffers a S3 y lógica de negocio.

#### Actualización de `security-studies.module.ts`:
- Declarar y exportar `SecurityStudiesRepository` en la sección de `providers`.

---

## 3. Plan de Pruebas y Validación de No-Regresión

1. **Pruebas Unitarias del Servicio PQRS (`pqrs.service.spec.ts`)**:
   - Actualizar el testing suite para mockear `PqrsRepository` en lugar de `PrismaService`.
   - Verificar el 100% de los 12 casos de prueba (transiciones secuenciales, control de acceso por cliente/tenant, asignación, emisión de eventos).
2. **Pruebas Unitarias del Controlador PQRS (`pqrs.controller.spec.ts`)**:
   - Verificar 6/6 tests pasando sin alteraciones.
3. **Pruebas Unitarias de Security Studies (`security-studies.service.spec.ts` y utils)**:
   - Validar ejecución de la suite completa asegurando 100% de aprobación.
4. **Compilación y Build de Producción**:
   - Ejecutar `npm run build` en backend asegurando 0 errores de TypeScript.
   - Ejecutar `npm run build` en frontend asegurando que no exista impacto colateral.
5. **Auditoría e Historial de Decisiones**:
   - Registrar la refactorización a Monolito Modular con Bounded Contexts en `ai-decisions.log`.

---

## 4. Criterios de Aceptación

- [ ] `PqrsService` no contiene ninguna referencia directa a `PrismaService` ni al cliente Prisma.
- [ ] `SecurityStudiesService` no contiene ninguna referencia directa a `PrismaService` ni al cliente Prisma.
- [ ] Toda persistencia, consulta relacional y transacción atómica reside en `PqrsRepository` y `SecurityStudiesRepository` respectivamente.
- [ ] Ambos repositorios residen dentro del propio módulo en su subdirectorio `repositories/`, conformando un Bounded Context cerrado.
- [ ] Todos los endpoints REST mantienen sus contratos de entrada/salida idénticos (100% retrocompatible).
- [ ] El 100% de las pruebas unitarias del backend pasan exitosamente.
- [ ] `npm run build` en backend compila con 0 errores.
