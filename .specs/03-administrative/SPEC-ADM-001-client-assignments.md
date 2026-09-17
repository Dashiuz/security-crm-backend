# SPEC-ADM-001: Asignación de Clientes y Control de Acceso Basado en Alcance (Scope-based RBAC)

> **Estado**: `APROBADO`  
> **Módulo**: `administrative`  
> **Autor(es)**: `AI Architect`  
> **Fecha de Creación**: `2026-09-15`  
> **Última Actualización**: `2026-09-15`  

---

## 1. Contexto de Negocio e Historias de Usuario

### 1.1 Objetivo
El objetivo de esta funcionalidad es asegurar el correcto aislamiento y control de acceso a la información de los Clientes dentro de un Tenant. Se busca evolucionar la asignación de clientes para que dependa directamente del modelo `User` en lugar de `Employee`, optimizando el rendimiento y simplificando la seguridad. Además, se implementa un sistema Híbrido de RBAC con ABAC para que administradores vean todos los clientes, pero coordinadores y comerciales vean únicamente su propia cartera de clientes asignada.

### 1.2 Historias de Usuario (User Stories)
- **US-01**: Como **Administrador/Director**, quiero **ver todos los clientes** para **tener control total sobre las operaciones**.
- **US-02**: Como **Coordinador o Comercial**, quiero **ver únicamente los clientes que tengo asignados** para **centrarme en mi cartera y mantener la privacidad de la data**.
- **US-03**: Como **Guardia de Seguridad**, quiero **ver únicamente el cliente asociado a mi lugar de trabajo** para **registrar minutas sin ver clientes externos**.
- **US-04**: Como **Usuario Administrativo**, quiero **asignar un cliente a un Coordinador o Comercial desde la UI buscando por su nombre (con debounce y límite de 15)** para **agilizar la asignación sin sobrecargar el sistema**.

---

## 2. Definición de Permisos y Matriz RBAC

### 2.1 Permisos requeridos
Se crearán nuevos permisos con alcances (scopes) específicos para reemplazar/complementar al `client:read` genérico.

| Permiso Code | Nombre Legible | Descripción | Rol por Defecto |
| :--- | :--- | :--- | :--- |
| `client:read_all` | Lectura Global | Consultar todos los clientes del tenant | Admin, Godlike |
| `client:read_assigned` | Lectura Asignada | Consultar solo clientes donde es coordinador o comercial | Comercial, Coordinador |
| `client:read_workplace`| Lectura Operativa | Consultar solo el cliente asociado a su lugar de trabajo | Guardia |

### 2.2 Reglas Multi-Tenant y Seguridad
- [x] **Aislamiento Obligatorio**: Todo registro debe almacenar y filtrar por `tenantId`.
- [x] **Inyección de Filtro en Servicio**: El `findAll` interceptará el JWT para anexar la cláusula `WHERE` dependiendo de cuál de los 3 permisos posea el usuario actual.

---

## 3. Modelo de Datos (Prisma Schema Specification)

### 3.1 Modificaciones en `clients.prisma`, `user.prisma` y `employee.prisma`

En `clients.prisma`:
```prisma
  coordinatorInChargeId String?
  coordinatorInCharge   User? @relation("ClientCoordinator", fields: [coordinatorInChargeId], references: [id], onDelete: SetNull)

  commercialContactId String?
  commercialContact   User? @relation("ClientCommercialContact", fields: [commercialContactId], references: [id], onDelete: SetNull)
```

En `user.prisma`:
```prisma
  coordinatedClients Client[] @relation("ClientCoordinator")
  commercialClients  Client[] @relation("ClientCommercialContact")
```

En `employee.prisma`:
Se eliminarán las relaciones inversas `coordinatedClients` y `commercialClients`.

---

## 4. Contrato de API REST & Backend Specification (NestJS)

### 4.1 Endpoints REST Spec

#### Nuevos Endpoints para poblar inputs en UI
- `GET /api/v1/regulation/user/coordinators`
- `GET /api/v1/regulation/user/commercials`
  - **Propósito**: Devolver la lista de usuarios con rol/perfil de Coordinador y Comercial respectivamente.
  - **Query Params**: `search` (para búsqueda por nombre), `limit=15`.
  - **Formato esperado**: Arreglo de usuarios con `id`, `fullName`, `position`.

#### Modificación de Endpoint de Lectura
- `GET /api/v1/administrative/client`
  - **Guardias**: `@UseGuards(JwtAuthGuard, PermissionsGuard)`
  - **Permiso**: `@RequirePermissions('client:read_all', 'client:read_assigned', 'client:read_workplace')`
  - **Lógica de Servicio**:
    ```typescript
    if (permissions.includes('client:read_all')) {
       // where: {} (Prisma extension hace el filtro tenantId)
    } else if (permissions.includes('client:read_assigned')) {
       // where: { OR: [{ coordinatorInChargeId: userId }, { commercialContactId: userId }] }
    } else if (permissions.includes('client:read_workplace')) {
       // where: { id: user.clientId }
    }
    ```

---

## 5. Especificación Frontend (Next.js App Router)

### 5.1 Componentes UI
- **Formulario de Cliente (`new` y `edit`)**:
  - Los componentes tipo `Select` / `Combobox` para `Coordinador a Cargo` y `Contacto Comercial Asignado` consumirán los nuevos endpoints `/users/coordinators` y `/users/commercials`.
  - **Debounce**: Se implementará un retardo de `500ms` en la captura del teclado antes de disparar el request (búsqueda).
  - **Formato Visual**: `{fullName} ({position})`.
  - **Carga inicial**: Limitada a `15` resultados por defecto para mantener rendimiento.

---

## 6. Criterios de Aceptación y Matriz de Verificación

- [ ] Las modificaciones en Prisma se reflejan correctamente tras `npx prisma migrate dev`.
- [ ] `seed.ts` se ejecuta exitosamente añadiendo los nuevos permisos.
- [ ] Un usuario con `client:read_assigned` no puede ver los clientes asignados a otros comerciales.
- [ ] El frontend llama a los nuevos endpoints con `search` debounced a 500ms.
