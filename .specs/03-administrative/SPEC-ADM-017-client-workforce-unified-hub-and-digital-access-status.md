# SPEC-ADM-017: Fuerza Laboral Unificada en Sedes de Clientes (SSOT Relacional con `employeeId` y Estado de Acceso Digital)

> **Estado**: `COMPLETADO`  
> **Módulo**: `administrative` / `regulation`  
> **Ubicación Frontend**:  
> - `src/app/(protected)/administrative/clients/[id]/users/page.tsx`  
> **Ubicación Backend**:  
> - `prisma/schema/user_client_access.prisma`  
> - `prisma/schema/employee.prisma`  
> - `prisma/schema/migrations/`  
> - `src/modules/administrative/client/client.controller.ts`  
> - `src/modules/administrative/client/client.service.ts`  
> - `src/modules/administrative/client/dtos/client.dto.ts`  
> - `src/modules/regulation/employee/employee.service.ts`  
> **Fecha de Creación**: 2026-10-19  
> **Autor**: Antigravity (Software Architect & Lead Engineer)  

---

## 1. Contexto de Negocio y Diagnóstico del Problema

En las operaciones de seguridad privada y vigilancia física, existe una distinción operativa fundamental entre:
1. **El Expediente Laboral Físico (`Employee`)**: Personal operativo contratado (guardas de seguridad, vigilantes de garita, caninos, patrulleros) asignado a un puesto físico en una copropiedad (`Client`). Muchos de estos guardas prestan servicio presencial sin requerir una cuenta de usuario en el software.
2. **La Cuenta de Acceso Digital (`User`)**: Credencial informática con contraseña y roles RBAC para ingresar al sistema web o móvil.

### Diagnóstico de la Discrepancia Actual:
* La pantalla del cliente `/administrative/clients/[id]/users` (**"Equipo Asignado y Accesos Operativos"**) consulta la tabla **`UserClientAccess`** (`GET /client/:id/users`).
* Actualmente, `UserClientAccess` exige obligatoriamente un `userId` (`User`). 
* Los guardias de seguridad asignados físicamente al puesto que no tienen usuario creado en el software (**"Sin Acceso Digital"**, como Andrés Felipe y José Gregorio en "Conjunto Cerrado Las Palmas de Suba") quedan **100% invisibles** en la vista del cliente.
* En consecuencia, la administración del cliente solo ve a coordinadores y directores, pero no ve a los guardas que custodian físicamente el conjunto residencial.

---

## 2. Decisión Arquitectónica: SSOT Relacional con `employeeId` en `UserClientAccess`

En lugar de recurrir a prefijos sintéticos (como `"emp_" + id`) o uniones frágiles en memoria, la solución arquitectónica industrial consiste en **evolucionar `UserClientAccess` al Single Source of Truth (SSOT) relacional de todas las asignaciones a sedes de clientes**:

```mermaid
graph TD
    subgraph "Entidades de Dominio"
        EMP["Employee (Expediente Laboral)"]
        USR["User (Cuenta Digital)"]
        CLI["Client (Sede / Copropiedad)"]
    end

    subgraph "Registro Relacional Universal (user_client_access)"
        UCA["UserClientAccess (id: CUID puro)"]
    end

    CLI -->|1:N| UCA
    EMP -.->|0..1:N (employeeId)| UCA
    USR -.->|0..1:N (userId)| UCA

    subgraph "Los 3 Escenarios de Fuerza Laboral"
        S1["A. Guarda Físico en Garita: employeeId ✅ | userId ❌ (Sin Acceso Digital)"]
        S2["B. Personal Digitalizado: employeeId ✅ | userId ✅ (Acceso Activo)"]
        S3["C. Administrador Externo: employeeId ❌ | userId ✅ (Residence Manager)"]
    end

    UCA --> S1
    UCA --> S2
    UCA --> S3
```

### 2.1 Ventajas Arquitectónicas
1. **Un Solo ID Primario y Limpio para el Frontend**:
   - Cada fila de la tabla en el frontend cuenta con su **único ID primario (`access.id`)**, generado como CUID nativo de base de datos.
   - En React: `key={item.id}` directo y limpio.
   - Desvinculación 100% RESTful: `DELETE /client/:clientId/users/:accessId`.
2. **Consultas SQL Directas y Eficientes (Cero "Merge Maps" en Memoria)**:
   - Una sola consulta Prisma con `include: { user: true, employee: { include: { positionRef: true } } }`.
   - Permite paginación por cursor determinista, ordenamiento y filtros en base de datos sin sobrecargar la memoria de NodeJS.
3. **Ciclo de Vida Integrado con "Habilitar Cuenta Digital"**:
   - Cuando se le habilita cuenta digital a un guarda preexistente (`EmployeeService.enableUser`), simplemente se actualiza `user_client_access.userId = newUser.id` donde `employeeId = employee.id`, enriqueciendo su acceso sin alterar su ID de asignación.
4. **Integridad Relacional con Cascade Delete**:
   - Si se retira/elimina un empleado o usuario, la base de datos mantiene integridad referencial automática.

---

## 3. Especificación de Base de Datos y Prisma

### 3.1 Esquema `prisma/schema/user_client_access.prisma`

```prisma
model UserClientAccess {
  id         String    @id @default(cuid(2))
  tenantId   String
  tenant     Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  // Acceso de Usuario Digital (opcional si es personal sin cuenta digital)
  userId     String?
  user       User?     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Expediente Laboral de Empleado (opcional si es usuario sin nómina, ej: Residence Manager)
  employeeId String?
  employee   Employee? @relation(fields: [employeeId], references: [id], onDelete: Cascade)

  clientId   String
  client     Client    @relation(fields: [clientId], references: [id], onDelete: Cascade)

  roleName   String?
  isActive   Boolean   @default(true)

  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  @@unique([userId, clientId])
  @@unique([employeeId, clientId])
  @@index([tenantId])
  @@index([userId])
  @@index([employeeId])
  @@index([clientId])
  @@map("user_client_access")
}
```

### 3.2 Relación Inversa en `prisma/schema/employee.prisma`

```prisma
model Employee {
  // ... campos existentes ...
  clientAccesses UserClientAccess[]
  // ...
}
```

### 3.3 Migración SQL y Backfill de Datos (`20261019190000_add_employee_to_user_client_access`)
La migración ejecutará de forma atómica:
1. `ALTER TABLE "user_client_access" ALTER COLUMN "user_id" DROP NOT NULL;`
2. `ALTER TABLE "user_client_access" ADD COLUMN "employee_id" TEXT;`
3. `ALTER TABLE "user_client_access" ADD CONSTRAINT "user_client_access_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;`
4. `CREATE UNIQUE INDEX "user_client_access_employee_id_client_id_key" ON "user_client_access"("employee_id", "client_id");`
5. **Backfill automático**:
   ```sql
   -- Vincular employeeId en los accesos existentes buscando por documento coincidente
   UPDATE "user_client_access" uca
   SET "employee_id" = e.id
   FROM "user" u
   JOIN "employee" e ON e.document = u.document AND e."tenantId" = u."tenantId"
   WHERE uca.user_id = u.id AND uca."employee_id" IS NULL;

   -- Crear accesos para empleados asignados a sedes que actualmente no tenían UserClientAccess
   INSERT INTO "user_client_access" ("id", "tenantId", "client_id", "employee_id", "user_id", "roleName", "isActive", "createdAt", "updatedAt")
   SELECT 
     'uca_' || substr(md5(random()::text), 1, 20),
     e."tenantId",
     e."clientId",
     e.id,
     u.id, -- null si no tiene usuario
     COALESCE(p.name, 'GUARDIA DE SEGURIDAD'),
     true,
     NOW(),
     NOW()
   FROM "employee" e
   LEFT JOIN "position" p ON p.id = e."positionId"
   LEFT JOIN "user" u ON u.document = e.document AND u."tenantId" = e."tenantId"
   WHERE e."clientId" IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM "user_client_access" existing 
       WHERE existing."client_id" = e."clientId" 
         AND (existing."employee_id" = e.id OR (u.id IS NOT NULL AND existing.user_id = u.id))
     );
   ```

---

## 4. Especificación Técnica Backend

### 4.1 DTO de Salida Estandarizado (`ClientWorkforceItemDto`)

En [`client.dto.ts`](file:///d:/projects/security-crm-backend/src/modules/administrative/client/dtos/client.dto.ts):

```typescript
export enum DigitalAccountStatus {
  ACTIVE = 'ACTIVE',         // Cuenta digital activa (puede ingresar al software)
  DISABLED = 'DISABLED',     // Cuenta digital suspendida
  NO_ACCOUNT = 'NO_ACCOUNT', // Solo puesto físico, sin credenciales creadas
}

export class ClientWorkforceItemDto {
  id: string; // CUID real nativo de UserClientAccess
  userId: string | null;
  employeeId: string | null;
  clientId: string;
  roleName: string | null;
  isActive: boolean;
  hasDigitalAccess: boolean;
  digitalAccountStatus: DigitalAccountStatus;
  createdAt: Date | string;
  user: {
    id: string | null;
    fullName: string;
    document: string;
    department?: string | null;
    position?: string | null;
    email: string | null;
    phone: string | null;
    isActive: boolean;
    roles?: Array<{
      role: {
        id: string;
        name: string;
      };
    }>;
  };
}
```

### 4.2 Endpoint `GET /client/:id/users` en [`ClientService.getClientUsers`](file:///d:/projects/security-crm-backend/src/modules/administrative/client/client.service.ts)

```typescript
async getClientUsers(clientId: string, user: UserContext): Promise<ClientWorkforceItemDto[]> {
  await this.findOne(clientId, user);

  const accesses = await this.prisma.userClientAccess.findMany({
    where: {
      clientId,
      tenantId: user.tenantId,
      isActive: true,
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          document: true,
          department: true,
          position: true,
          isActive: true,
          roles: { include: { role: { select: { id: true, name: true } } } },
        },
      },
      employee: {
        select: {
          id: true,
          fullName: true,
          document: true,
          email: true,
          phone: true,
          isActive: true,
          positionRef: { select: { name: true, operationalCategory: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return accesses.map((acc) => {
    const hasDigitalAccess = Boolean(acc.user && acc.user.isActive);
    let digitalAccountStatus = DigitalAccountStatus.NO_ACCOUNT;
    if (acc.user) {
      digitalAccountStatus = acc.user.isActive
        ? DigitalAccountStatus.ACTIVE
        : DigitalAccountStatus.DISABLED;
    }

    const fullName = acc.user?.fullName || acc.employee?.fullName || 'Personal Asignado';
    const document = acc.user?.document || acc.employee?.document || '';
    const email = acc.employee?.email || null;
    const phone = acc.employee?.phone || null;
    const roleName = acc.roleName || acc.employee?.positionRef?.name || acc.user?.position || 'OPERATIVO';

    return {
      id: acc.id,
      userId: acc.userId,
      employeeId: acc.employeeId,
      clientId: acc.clientId,
      roleName,
      isActive: acc.isActive,
      hasDigitalAccess,
      digitalAccountStatus,
      createdAt: acc.createdAt,
      user: {
        id: acc.user?.id || null,
        fullName,
        document,
        email,
        phone,
        isActive: acc.user?.isActive ?? false,
        department: acc.user?.department || null,
        position: roleName,
        roles: acc.user?.roles || [],
      },
    };
  });
}
```

### 4.3 Endpoint de Desvinculación `DELETE /client/:id/users/:accessId`

En [`ClientService.unassignUser`](file:///d:/projects/security-crm-backend/src/modules/administrative/client/client.service.ts#L1333):
- Recibe el `accessId` (CUID real de `UserClientAccess`).
- Marca `userClientAccess.isActive = false`.
- Si `userClientAccess.employeeId` está presente, sincroniza el cierre en `employee.clientHistory` (`unassignedAt = todayStr`).

### 4.4 Sincronización en `EmployeeService.assignClient` y `unassignClient`
- En [`EmployeeService.assignClient`](file:///d:/projects/security-crm-backend/src/modules/regulation/employee/employee.service.ts#L740):
  - Hace `upsert` en `UserClientAccess` vinculando `employeeId: employee.id` y `userId: user?.id || null`.
  - ¡Así los guardias quedan vinculados de inmediato a la vista del cliente incluso si no tienen usuario digital!
- En [`EmployeeService.enableUser`](file:///d:/projects/security-crm-backend/src/modules/regulation/employee/employee.service.ts#L1038):
  - Al crearse el usuario, ejecuta:
    ```typescript
    await this.prisma.userClientAccess.updateMany({
      where: { employeeId: employee.id },
      data: { userId: newUser.id },
    });
    ```

---

## 5. Especificación Frontend (`administrative/clients/[id]/users/page.tsx`)

### 5.1 Renderizado de la Columna "ACCESO DIGITAL"

```tsx
<TableCell sx={{ fontWeight: 700, fontSize: "0.75rem" }}>
  ACCESO DIGITAL
</TableCell>
```

#### Renderizado Visual de Chips:
1. **`ACTIVE` (`hasDigitalAccess: true`)**:
   - `<Chip icon={<VpnKeyIcon sx={{ fontSize: 13 }} />} label="Acceso Activo" color="success" size="small" variant="outlined" sx={{ fontWeight: 600, fontSize: "0.72rem" }} />`
2. **`DISABLED`**:
   - `<Chip icon={<LockIcon sx={{ fontSize: 13 }} />} label="Suspendido" color="warning" size="small" variant="outlined" sx={{ fontWeight: 600, fontSize: "0.72rem" }} />`
3. **`NO_ACCOUNT` (`hasDigitalAccess: false`)**:
   - `<Tooltip title="Personal físico sin credenciales de inicio de sesión. Haz clic en su ficha para habilitar acceso."><Chip icon={<BadgeIcon sx={{ fontSize: 13 }} />} label="Sin Cuenta Digital" size="small" sx={{ fontWeight: 600, fontSize: "0.72rem", bgcolor: "action.hover", color: "text.secondary", border: "1px dashed", borderColor: "divider" }} /></Tooltip>`

### 5.2 Conteo Dinámico en Cabecera
El resumen de cabecera agrupa dinámicamente sobre la lista `team`:
- `Total: 4`
- `SUPERVISOR MOTORIZADO: 1`
- `DIRECTOR_OPERACIONES: 1`
- `GUARDIA DE SEGURIDAD: 2` (¡Los guardias físicos Andrés y José ahora suman al equipo de la sede!)

### 5.3 Diálogo de Desvinculación Unificado
- La acción de eliminar llama a `DELETE /client/${clientId}/users/${item.id}` enviando el CUID nativo de la fila.
- Funciona uniformemente tanto para guardas físicos como para supervisores y directores.

---

## 6. Estrategia y Cobertura de Pruebas Unitarias ($\ge 80\%$)

| Archivo de Prueba | Escenario a Evaluar | Resultado Esperado |
| :--- | :--- | :--- |
| `client.service.spec.ts` | `getClientUsers` con guardas físicos (`employeeId` sin `userId`) y directores (`userId` + `employeeId`) | Retorna lista unificada con IDs limpios, `hasDigitalAccess` correcto y datos de contacto enriquecidos. |
| `client.service.spec.ts` | `unassignUser` por `accessId` con `employeeId` vinculado | Marca `UserClientAccess.isActive: false` y cierra la fecha en `employee.clientHistory`. |
| `client.controller.spec.ts` | `getClientUsers` y `unassignUser` | Verifica paso de parámetros `id` y `accessId` al servicio. |
| `employee.service.spec.ts` | `assignClient` para empleado sin cuenta de usuario | Crea `UserClientAccess` con `employeeId` y `userId: null`. |
| `employee.service.spec.ts` | `enableUser` para empleado con asignaciones previas | Actualiza `UserClientAccess.userId` con el nuevo `User.id`. |

---

## 7. Plan de Implementación por Pasos

1. **Paso 1: Esquema Prisma & Migración**:
   - Modificar `prisma/schema/user_client_access.prisma` y `prisma/schema/employee.prisma`.
   - Crear migración SQL formal con script de backfill y aplicar con `npx.cmd prisma migrate dev`.
2. **Paso 2: DTOs & Backend Services**:
   - Actualizar `ClientWorkforceItemDto` en `client.dto.ts`.
   - Adaptar `ClientService.getClientUsers` y `unassignUser`.
   - Adaptar `EmployeeService.assignClient`, `unassignClient` y `enableUser`.
3. **Paso 3: Pruebas Unitarias**:
   - Actualizar mocks y pruebas en `client.service.spec.ts`, `client.controller.spec.ts` y `employee.service.spec.ts`.
   - Ejecutar `npm.cmd test -- --coverage` verificando $\ge 80\%$.
4. **Paso 4: Frontend UI**:
   - Actualizar interfaz `ClientUserAccessItem` y renderizado de tabla en `clients/[id]/users/page.tsx`.
   - Agregar columna "ACCESO DIGITAL", chips de estado y cálculo de cabecera.
5. **Paso 5: Calidad y Cierre**:
   - `npm.cmd run lint` en backend y frontend (0 errores).
   - `npx.cmd tsc --noEmit` y `npm.cmd run build` (0 errores).
   - Registrar la decisión en `ai-decisions.log`.

---

## 8. Criterios de Aceptación

| ID | Criterio de Aceptación | Método de Verificación |
| :--- | :--- | :--- |
| **CA-01** | `user_client_access` almacena `employee_id` y `user_id` como claves foráneas opcionales con restricciones únicas. | Inspección de esquema Prisma y consulta SQL a la tabla. |
| **CA-02** | Todo el personal asignado físicamente (guardias de seguridad) figura en la vista del cliente con un solo ID CUID nativo. | Consulta visual en `/administrative/clients/[id]/users`. |
| **CA-03** | La columna "ACCESO DIGITAL" muestra con precisión los chips `Acceso Activo`, `Suspendido` y `Sin Cuenta Digital`. | Verificación visual de los 3 estados en la tabla. |
| **CA-04** | Los chips superiores de conteo contabilizan exactamente a toda la fuerza laboral de la sede. | Verificación de coincidencia entre totales y filas renderizadas. |
| **CA-05** | Desvincular un registro funciona de manera unificada mediante `DELETE /client/:clientId/users/:accessId`. | Ejecución en UI y verificación de desactivación en BD e historial. |
| **CA-06** | Las pruebas unitarias de los módulos modificados superan el 80% de cobertura. | Reporte Jest `--coverage`. |
