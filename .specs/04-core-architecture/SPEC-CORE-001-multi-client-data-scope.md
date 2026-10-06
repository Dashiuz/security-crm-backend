# SPEC-CORE-001: Implementación de Scope Validator Multi-Cliente (Data-Level Security)

## 1. Objetivo y Contexto
Actualmente, el sistema cuenta con un RBAC sólido que valida *acciones* (ej. `pqrs:manage`), y una extensión de Prisma (`audit-extension.ts`) que garantiza la segregación multi-tenant y la limitación a un único cliente (ej. para un administrador de un conjunto residencial mediante `contextService.clientId`).

Sin embargo, para los **Coordinadores Operativos o Comerciales**, que gestionan **múltiples clientes**, no existe un mecanismo transversal que limite su visibilidad. Esto provoca que si un coordinador recibe el permiso `pqrs:manage`, pueda ver las PQRS de *todos* los clientes del tenant, y no solo las de los clientes que tiene asignados.

**Objetivo:** Evolucionar `audit-extension.ts` y el `RequestContext` para que actúen como un middleware de base de datos (Row-Level Security a nivel de aplicación). Esto garantizará automáticamente que cualquier usuario (Coordinador) solo pueda consultar y modificar registros (PQRS, Minutas, Visitantes) que pertenezcan a sus clientes asignados.

---

## 2. Alcance
- Modificar la interfaz y el servicio del contexto de la petición (`RequestContextService`).
- Crear un servicio / middleware que evalúe los clientes permitidos del usuario en sesión.
- Actualizar `audit-extension.ts` para inyectar filtros automáticos basados en listas de `clientIds`.
- (Opcional/Limpieza) Retirar lógicas manuales de filtrado redundante en los servicios (como `PqrsService` o `ClientService`).

---

## 3. Arquitectura y Patrones de Diseño
Utilizaremos el patrón de **Database Middleware / Interception** a través de la API `$extends` de Prisma, alimentado por el estado inyectado en el **Request Context (AsyncLocalStorage)**.

### 3.1. Modificación del `RequestContext`
Añadiremos la propiedad `allowedClientIds` que puede ser un array de strings (los IDs permitidos) o la constante `'ALL'` para usuarios sin restricciones (Dioses o con permiso `client:read_all`).

```typescript
export interface RequestContext {
  userId?: string;
  tenantId?: string;
  clientId?: string | null; // Mantenido para relaciones 1 a 1 fijas (RESIDENCE_MANAGER)
  allowedClientIds?: string[] | 'ALL'; // <--- NUEVO: Para relaciones 1 a N
  isGodlike?: boolean;
  features: string[];
}
```

### 3.2. Middleware / Interceptor de Scope (`ClientScopeInterceptor`)
Se creará un Interceptor global (o se integrará en el guard de autenticación actual) que se ejecute en cada petición HTTP, después de validar al usuario:

1. Extrae los permisos del usuario de la request.
2. Si tiene permiso `client:read_all` o es `godlike`, establece `allowedClientIds = 'ALL'`.
3. Si tiene permiso `client:read_assigned`, consulta en Prisma (tabla `Client`):
   ```sql
   SELECT id FROM Client WHERE coordinatorInChargeId = userId OR commercialContactId = userId
   ```
4. Guarda ese arreglo de IDs en el contexto: `contextService.allowedClientIds = [ ... ]`.
5. Si no tiene ninguno de esos permisos (es un empleado de rango bajo), `allowedClientIds = []` (o se maneja según la regla de negocio).

### 3.3. Evolución del `audit-extension.ts`
En `audit-extension.ts`, donde ya validamos `clientId`, agregaremos la capa de `allowedClientIds`. 
Para evitar que un usuario "engañe" al sistema enviando un `clientId` en su petición que no le corresponde, la forma más segura de inyectarlo en Prisma es mediante un bloque `AND`.

Para operaciones como `findMany`, `findFirst`, `count`, `updateMany`, etc.:
```typescript
const allowedClientIds = contextService.allowedClientIds;

if (allowedClientIds && allowedClientIds !== 'ALL' && isMultiClient) {
  // Aseguramos que la restricción sea inquebrantable usando AND
  if (!anyArgs.where) anyArgs.where = {};
  
  const scopeCondition = { clientId: { in: allowedClientIds } };

  if (anyArgs.where.AND) {
    if (Array.isArray(anyArgs.where.AND)) {
      anyArgs.where.AND.push(scopeCondition);
    } else {
      anyArgs.where.AND = [anyArgs.where.AND, scopeCondition];
    }
  } else {
    anyArgs.where.AND = [scopeCondition];
  }
}
```
*Nota: También se deben proteger las operaciones de `create`, `update` y `upsert` verificando que el `clientId` (si es proporcionado) pertenezca al arreglo `allowedClientIds`, lanzando un `ForbiddenException` si no coincide.*

---

## 4. Respuesta a la pregunta del usuario
> *"¿Con esta solución podríamos aplicar que cada usuario con clientes determinados solo pueda ver las PQRS de dichos clientes solamente?"*

**Sí, de forma absoluta y automática.** 
Al implementar esta regla en la extensión de Prisma:
1. El `PqrsService.findAll()` hará su consulta `prisma.pqrsTicket.findMany({...})`.
2. Prisma ejecutará internamente el middleware (`audit-extension.ts`).
3. El middleware agregará: `AND clientId IN ('cliente-1', 'cliente-2')`.
4. El controlador de PQRS devolverá **solamente** las PQRS de los clientes que el coordinador tiene asignados.
5. Lo mejor de todo es que esto aplicará **inmediatamente** a la tabla de `Minuta`, `VisitorEntryControl`, `SecurityStudy`, etc., blindando el sistema entero con una sola modificación en el core.

---

## 5. Plan de Ejecución
1. Actualizar `request-context.service.ts` con `allowedClientIds`.
2. Crear `ClientScopeInterceptor` (o equivalente en `src/common/auth/`) que asigne dinámicamente estos IDs al inicio de la solicitud.
3. Actualizar `audit-extension.ts` para aplicar el filtro `{ clientId: { in: allowedClientIds } }`.
4. Registrar el nuevo interceptor globalmente en el módulo raíz (`app.module.ts`) o en el `auth.module.ts`.
5. Limpiar lógicas redundantes en `ClientService` y `PqrsService` (ej: quitar el `where.OR = [{ coordinatorInChargeId: ... }]` ya que Prisma lo hará solo).

---
**Esperando aprobación del usuario para proceder con la implementación técnica.**
