# SPEC-ADM-016: Desacoplamiento de Coordinador/Comercial en Clientes, Sección Hub & Spoke de Equipo Asignado y Migración de Base de Datos

> **Estado**: `EN_REVISIÓN`  
> **Módulo**: `administrative` / `regulation`  
> **Ubicación Frontend**: `src/app/(protected)/administrative/clients/[id]/users/`, `src/components/clients/`  
> **Ubicación Backend**: `src/modules/administrative/client`, `src/modules/operation/minuta`, `src/common/interceptors`  
> **Fecha de Creación**: 2026-10-17  
> **Autor(es)**: Antigravity (Software Architect & Pair Programming)  

---

## 1. Contexto de Negocio y Planteamiento del Problema

### 1.1 Diagnóstico de la Situación Actual

En el modelo [clients.prisma](file:///d:/projects/security-crm-backend/prisma/schema/clients.prisma), la asignación de responsables operativos y comerciales sobre una copropiedad o sede se encontraba modelada mediante dos columnas fijas de clave foránea singular:
* `coordinatorInChargeId String?`: Un único usuario coordinador asignado a la sede.
* `commercialContactId String?`: Un único usuario de contacto comercial asignado a la sede.

### 1.2 Limitaciones del Modelo Rígido

1. **Incapacidad de Gestionar Múltiples Responsables**:
   * En la operación real de seguridad privada, un cliente de gran envergadura (por ejemplo, un centro comercial o un complejo residencial de múltiples torres) cuenta frecuentemente con **dos o más coordinadores** (titular, suplente, coordinador nocturno/fin de semana) y un equipo de supervisores zonales.
   * Dos columnas singulares en `Client` no permiten modelar esta realidad sin provocar sobreescrituras destructivas.

2. **Invisibilidad del Equipo Operativo en la Ficha del Cliente**:
   * En la arquitectura Hub & Spoke actual de clientes (`/overview`, `/legal`, `/operations`, `/residents`, `/security-studies`), **no existe una sección dedicada** que permita ver el listado consolidado del personal y usuarios vinculados a esa copropiedad.
   * El operador no puede saber con certeza desde la ficha del cliente qué vigilantes, supervisores o administradores tienen acceso operativo al puesto.

3. **Duplicidad y Rigidez en Formularios**:
   * En la vista de Operaciones y Dotación del cliente (Imagen #1 del usuario), se mantenían selectores estáticos para "Coordinador a Cargo" y "Contacto Comercial" que no reflejan la naturaleza dinámica de los relevos de personal.

---

## 2. Decisiones Arquitectónicas y Solución Técnica

### 2.1 Eliminación de Columnas y Migración de Base de Datos

Se procede con la eliminación formal de ambas columnas en la tabla `clients` de PostgreSQL:
* Eliminación de `coordinatorInChargeId` y su relación `@relation("ClientCoordinator")`.
* Eliminación de `commercialContactId` y su relación `@relation("ClientCommercialContact")`.
* Eliminación de los campos inversos correspondientes en el modelo `User` ([user.prisma](file:///d:/projects/security-crm-backend/prisma/schema/user.prisma)).

#### Script de Migración SQL (Prisma Migration):
```sql
-- AlterTable: Drop foreign key constraints and columns from clients
ALTER TABLE "clients" DROP CONSTRAINT IF EXISTS "clients_coordinatorInChargeId_fkey";
ALTER TABLE "clients" DROP CONSTRAINT IF EXISTS "clients_commercialContactId_fkey";

ALTER TABLE "clients" DROP COLUMN IF EXISTS "coordinatorInChargeId";
ALTER TABLE "clients" DROP COLUMN IF EXISTS "commercialContactId";
```

> **Nota sobre integridad de datos**: El negocio confirma explícitamente que estos dos campos no contienen datos críticos de producción y pueden removerse directamente mediante la migración formal sin requerir scripts complejos de preservación.

---

### 2.2 Nueva Sección Hub & Spoke: `/administrative/clients/[id]/users` ("Equipo Asignado")

Se incorpora un nuevo Spoke en la navegación secundaria del cliente:

```
/administrative/clients/[id]/
   ├── overview/page.tsx               (Visión general)
   ├── legal/page.tsx                  (Legal y Contratos)
   ├── operations/page.tsx             (Operaciones y Dotación técnica, sin campos obsoletos)
   ├── users/page.tsx                  (NUEVO: Spoke de Equipo Asignado y Usuarios)
   ├── residents/page.tsx              (Residentes y Unidades)
   └── security-studies/page.tsx       (Estudios de Seguridad)
```

#### Características del Spoke `/users`:
1. **DataTable Interactivo**:
   * Lista todos los registros activos vinculados al cliente en `UserClientAccess`.
   * **Columnas**:
     * `Nombre / Identidad`: Avatar, Nombre Completo, Documento de Identidad.
     * `Rol en el Cliente`: Badge contextual (`Coordinador`, `Supervisor`, `Vigilante`, `Administrador de Conjunto`).
     * `Rol del Sistema`: Perfil RBAC (`EMPLOYEE`, `RESIDENCE_MANAGER`, `GODLIKE`, etc.).
     * `Contacto`: Teléfono y correo electrónico.
     * `Fecha de Vinculación`: Timestamp de asignación.
     * `Acciones`: Menú de desvinculación rápida o cambio de rol contextual.
2. **Acción Principal "Vincular Usuario"**:
   * Botón superior que abre un modal con buscador de usuarios del sistema (mediante autocompletado reactivo) y selector de función (`roleName`).
   * Al confirmar, crea o reactiva el registro en `UserClientAccess`.

---

### 2.3 Actualización de Servicios y Lógica de Negocio

#### A. Escalamiento de Alertas Operativas en `MinutaGeneralService`
* **Anteriormente**: Se consultaba `client.coordinatorInChargeId` para notificar minutas de alta prioridad.
* **Nuevo comportamiento**: Se consulta la tabla relacional:
  ```ts
  const alertRecipients = await this.prisma.userClientAccess.findMany({
    where: {
      clientId,
      isActive: true,
      OR: [
        { roleName: { in: ['COORDINADOR', 'COORDINATOR', 'SUPERVISOR'] } },
        { user: { roles: { some: { role: { name: { in: ['COORDINATOR', 'SUPERVISOR', 'DIRECTOR'] } } } } } }
      ]
    },
    include: { user: true }
  });
  ```
* **Impacto Positivo**: Todas las personas a cargo del cliente reciben la alerta de forma simultánea y transparente.

#### B. Filtro de Seguridad en `AuditInterceptor` y `ClientService`
* La evaluación del permiso `client:read_assigned` ahora consulta:
  ```ts
  const accesses = await this.prisma.userClientAccess.findMany({
    where: { tenantId: user.tenantId, userId, isActive: true },
    select: { clientId: true },
  });
  allowedClientIds = accesses.map(a => a.clientId);
  ```

---

## 3. Historias de Usuario (User Stories)

* **US-01 (Gestión de Personal desde la Sede)**: Como **Director de Operaciones**, quiero ver la lista completa de todos los coordinadores, supervisores y vigilantes asignados a un cliente específico dentro de su ficha Hub & Spoke, para auditar rápidamente quiénes tienen presencia en la copropiedad.
* **US-02 (Asignación Multirresponsable)**: Como **Coordinador Zonal**, quiero vincular múltiples supervisores o coordinadores a una misma sede, para reflejar fielmente la estructura de turnos y relevos sin restricciones artificiales.
* **US-03 (Desacoplamiento Limpio de Formularios)**: Como **Operador de Contratos**, quiero registrar datos operativos de armamento y tecnología sin campos obsoletos de coordinadores individuales en la vista general.

---

## 4. Criterios de Aceptación

1. Las columnas `coordinatorInChargeId` y `commercialContactId` son eliminadas de la base de datos y del schema de Prisma mediante una migración oficial.
2. Los formularios de cliente (`ClientContractStep`, `ClientOperations`, etc.) ya no muestran los selectores obsoletos de coordinador individual.
3. El Hub & Spoke del cliente incluye la nueva pestaña interactiva `/administrative/clients/[id]/users`.
4. El DataTable de usuarios del cliente permite vincular y desvincular recursos en tiempo real.
5. El sistema de notificaciones de minutas críticas despacha alertas a los coordinadores y supervisores asignados en `UserClientAccess`.
6. Las 30 suites de prueba del backend y la compilación de Next.js se mantienen con 100% de éxito.
