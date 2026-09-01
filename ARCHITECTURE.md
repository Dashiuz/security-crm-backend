# Documentación de Arquitectura y Patrones de Diseño - Noxia API

Este documento describe la estructura técnica, los patrones de diseño y las decisiones arquitectónicas clave implementadas en el backend de **Noxia**, con un enfoque especial en su robusto sistema Multi-Tenant de autenticación y autorización.

## 1. Estilo Arquitectónico: Monolito Modular

El proyecto sigue un enfoque de **Monolito Modular** construido sobre NestJS. El código se organiza en módulos de dominio estandarizados que agrupan lógica de negocio, promoviendo la cohesión alta y bajo acoplamiento:

- **`regulation`**: Módulo central de Identidad, Autenticación (Auth), Control de Acceso (RBAC), Empleados y Cargos.
- **`operation`**: Núcleo del negocio operativo como Control de Minutas, Correspondencia, Novedades, Visitantes y Gestión de Parqueaderos.
- **`administrative`**: Gestión comercial, Financiera y Operativa (Recursos de Seguridad).

## 2. Topología de Capas (Layered Architecture)

Se implementa una arquitectura rigurosa para separar responsabilidades y garantizar la escalabilidad:

1. **Directivas de API (Controladores)**: Localizados en `src/modules`. Reciben solicitudes, validan transformaciones (Pipes/DTOs) y orquestan la distribución.
2. **Servicios de Negocio (Use-Cases)**: Contienen las reglas centrales del producto. No ejecutan persistencia directa, sino que coordinan flujos lógicos.
3. **Capa Industrial de Repositorios**: Localizados en `src/common/repository`. Aquí se centraliza la interacción con Prisma ORM, permitiendo que todos los módulos compartan lógica de persistencia estandarizada sin reinventar la rueda (DRY).
4. **Cross-Cutting Concerns (Framework Core)**: Ubicados en `src/common`. Centraliza la seguridad, bloqueos (Guards), recolección de métricas (Interceptors), y estado global asíncrono.

## 3. Patrones de Diseño Clave

### 3.1. Industrial Repository Pattern
Abstrae la complejidad de Prisma ORM. Proporciona una interfaz limpia para el acceso a datos y permite la provisión de lógica transversal. 

### 3.2. Ambient Context & AsyncLocalStorage (ALS)
A través de `RequestContextService` en `src/common/context`, Noxia inyecta de forma invisible el `tenantId`, `userId`, e identificadores de auditoría en toda la cadena de ejecución asíncrona de NodeJS. Esto elimina el anti-patrón de *"Prop Drilling"* (arrastrar parámetros de función en función).

### 3.3. Isolation Sandbox (Extensión de Prisma)
Ubicado en `src/common/prisma-extension/audit-extension.ts`, es el motor automatizado más crítico de la arquitectura.
- **Inyección de Filtros Multi-Tenant**: Automáticamente adhiere cláusulas `AND tenantId = ?` a nivel de ORM.
- **Auditoría Invisible**: Intercepta y registra `INSERT`, `UPDATE`, y `DELETE` en la tabla global de `AuditLog`, previniendo que los desarrolladores olviden documentar eventos críticos.

## 4. Estructura de Base de Datos
Prisma está hiper-fragmentado usando bloques en `prisma/schema/*`, donde cada sub-módulo maneja sus propios modelos (`user.prisma`, `department.prisma`). NestJS orquesta la recopilación de estos esquemas evitando un archivo inmanejable de miles de líneas.

---

## 5. Arquitectura de Autenticación y Autorización Multi-Tenant

Noxia utiliza un mecanismo de seguridad **JWT (JSON Web Token)** asimétrico (o estricto por clúster), reforzado por el control de Acceso Basado en Roles (RBAC) con una característica de alta ingeniería: **Impersonation Sandbox** para el Super Administrador (`GODLIKE`). 

### Flujo Operativo: Usuarios Normales vs. GODLIKE (Tenant System)

El tenant `system` es un contenedor administrativo exclusivo. Ningún usuario Godlike puede mezclarse con tenants comerciales regulares, garantizando así una frontera dura de seguridad.

```mermaid
sequenceDiagram
    actor Godlike (Tenant: system)
    actor Empleado (Tenant: comercial_01)
    participant NestJS (AuthGuard)
    participant Prisma Interceptor
    participant Base de Datos

    %% === Flujo Empleado Estándar ===
    Note over Empleado, Base de Datos: Flujo Empleado Estándar (Aislamiento Nativo)
    Empleado->>NestJS (AuthGuard): GET /employees (Header: Bearer JWT)
    NestJS (AuthGuard)->>Prisma Interceptor: Extrae (tenantId: 'comercial_01')
    Prisma Interceptor->>Base de Datos: SELECT * FROM Employee WHERE tenantId = 'comercial_01'
    Base de Datos-->>Empleado: Retorna solo Empleados del Tenant

    %% === Flujo Godlike Impersonation ===
    Note over Godlike, Base de Datos: Flujo de Salto Multitenant (Impersonation)
    Godlike->>NestJS (AuthGuard): POST /auth/impersonate/nuevo_tenant (JWT: system)
    NestJS (AuthGuard)->>Base de Datos: Valida Role 'GODLIKE:MANAGE'
    Base de Datos-->>Godlike: Emite nuevo JWT Temporal (tenantId: 'nuevo_tenant', isImpersonating: true)
    
    %% Godlike Administrando el Nuevo Tenant
    Godlike->>NestJS (AuthGuard): GET /employees (Header: Bearer JWT Temporal)
    NestJS (AuthGuard)->>Prisma Interceptor: Extrae e impone frontera segura (tenantId: 'nuevo_tenant')
    Prisma Interceptor->>Base de Datos: SELECT * FROM Employee WHERE tenantId = 'nuevo_tenant'
    Base de Datos-->>Godlike: Sandbox Cerrado: Retorna solo Empleados del nuevo_tenant
```

### Principios de Seguridad del Sistema `Impersonation`
1. **Prevención de Fuga Cruzada (Cross-Tenant Bleed)**: La extensión de Prisma jamás desactiva la obligación de `tenantId` basada en el contexto. El usuario Godlike se somete a las mismas leyes de aislamiento que un usuario regular mientras está suplantando (impersonando) a otro tenant, mitigando cualquier vulnerabilidad de lectura lateral.
2. **Rotación Cíclica Activa**: Por cada transición entre empresas, el `AuthService` emite un nuevo `Access Token` y `Refresh Token`, neutralizando instantáneamente (`revokedAt = Date.now()`) los tokens de transición anteriores para prevenir una saturación y vectores de acumulación maliciosa de sesiones Zombie.
3. **Pivote Físico de Auditoría**: Cuando un usuario Godlike opera sobre un tenant suplantado, el `AuditInterceptor` rastrea y reporta su UUID original, y no el del tenant en cuestión, garantizando una trazabilidad legal perfecta en los `Audit Logs`.

---

## 6. Evolución de Módulos y Funcionalidades Recientes

A medida que el proyecto ha ido escalando, se han implementado e integrado nuevos submódulos que refuerzan tanto la parte administrativa como operativa del CRM de seguridad:

### 6.1. Módulo Administrativo (`administrative`)
Este módulo se ha expandido para gestionar la estructura física y humana de los conjuntos residenciales o corporativos:
- **Client y Prospect**: Gestión de clientes actuales (con contrato firmado) y prospectos (clientes potenciales). Se manejan bajo una arquitectura similar pero con ciclos de vida de venta distintos.
- **Unit (Unidades Habitacionales)**: Provee una estructura jerárquica física (Bloque/Torre -> Piso -> Apartamento/Oficina).
- **Resident (Residentes)**: Vincula a las personas físicas (propietarios, arrendatarios, empleados) con una `Unit` específica, permitiendo un control granular de quién habita o labora en cada espacio.

### 6.2. Módulo de Operaciones - Minutas (`operation/minuta`)
El núcleo operativo de los guardas de seguridad se ha robustecido con 4 submódulos principales, todos estandarizados bajo un mismo estilo de arquitectura en backend y frontend (con soporte de filtros por cliente para roles globales):
- **Minuta General**: Registro cronológico de novedades e incidentes generales del turno.
- **Control de Parqueaderos**: Registro de entrada/salida de vehículos (placas, marca, estado de ingreso) vinculados al recinto.
- **Control de Visitas**: Gestión de acceso de visitantes. Permite vincular el ingreso de un visitante directamente a una `Unit` y a un `Resident` (quien autoriza), registrando hora de entrada, salida y datos del vehículo si aplica.
- **Control de Correspondencia (Paquetería)**: Flujo de recepción de paquetes en portería y su posterior entrega física al residente. Cuenta con validación estricta de tipos de correspondencia (`BOX`, `ENVELOPE`, `OTHER`) controlada desde Prisma, e incluye un flujo interactivo de comprobación de entrega con evidencia fotográfica (preparado para integración con Amazon S3).

### 6.3. Sinergia de Permisos y Roles (RBAC Operativo)
Se ha refinado el modelo de seguridad para adaptar la realidad operativa en porterías:
- **Aislamiento Operativo vs. Administrativo**: Un usuario con rol operativo (ej. `GUARDA`) requiere registrar minutas (`minuta:create`), lo cual inevitablemente implica consultar listas de apartamentos (`Units`) y `Residentes`.
- **Resolución de Mínimo Privilegio**: Para evitar otorgar permisos administrativos puros de lectura (`client:read` o `resident:read`) a los guardas, los endpoints de consulta operativa en el backend (`GET /client/:id` y `GET /resident/by-client/:clientId`) fueron autorizados explícitamente para aceptar el permiso transversal `minuta:create`. De esta forma, el frontend puede poblar sus desplegables operativos (UI) sin romper el encapsulamiento de datos administrativos sensibles.
