# SPEC-CORE-002: Estabilización de Migraciones de Base de Datos, Aislamiento de Notificaciones y Reparación de Suites Unitarias de Regulación

> **Estado**: `COMPLETADO`  
> **Módulo**: `core-architecture / database / testing / regulation`  
> **Autor(es)**: `Software Architect & Senior Fullstack Engineer`  
> **Fecha de Creación**: `2026-10-09`  
> **Última Actualización**: `2026-10-09`  

---

## 1. Contexto de Negocio e Historias de Usuario

### 1.1 Objetivo
Garantizar la estabilidad, reproducibilidad y confiabilidad del backend de Noxia en tres frentes críticos del núcleo arquitectónico:
1. **Desfase de Base de Datos y Migraciones**: Sincronizar el historial oficial de migraciones de Prisma con el esquema actual de la base de datos (que incluye Canvas/Estudios de Seguridad, PQRS y Notificaciones) sin pérdida de datos ni recreación destructiva, permitiendo que cualquier entorno nuevo o pipeline de CI/CD ejecute `prisma migrate deploy` limpiamente.
2. **Aislamiento Multi-Tenant de Notificaciones**: Proteger el modelo `Notification` a nivel de ORM en `audit-extension.ts`, asegurando la inyección inquebrantable de `tenantId` sin saturar la tabla `audit_log`.
3. **Reparación Integral de Suites de Prueba en Regulación**: Resolver los errores de inyección de dependencias en las 8 suites rotas del módulo `regulation` tras la adopción de la capa industrial de repositorios, alcanzando el 100% de suites en verde.

### 1.2 Historias de Usuario (User Stories)
- **US-01**: Como **DevOps / Ingeniero de Software**, quiero que las migraciones de Prisma reflejen con fidelidad el 100% de los modelos de base de datos actuales, para que al desplegar en nuevos entornos no existan tablas o columnas faltantes.
- **US-02**: Como **Oficial de Seguridad / Arquitecto**, quiero que las consultas y mutaciones de la entidad `Notification` estén forzadas por el `tenantId` en la extensión de Prisma, para evitar cualquier fuga de información entre empresas cliente sin generar sobrecarga en el registro de auditoría.
- **US-03**: Como **Desarrollador**, quiero que toda la suite de pruebas unitarias (`npx.cmd jest`) pase al 100%, para contar con una base de desarrollo fiable bajo Spec-Driven Development.

---

## 2. Especificación Técnica

### 2.1 Estabilización de Migraciones de Base de Datos
- **Generación de migración**: Generar el script SQL exacto usando la base de datos shadow (`noxia_shadow`) mediante `prisma migrate diff` desde `prisma/schema/migrations` hasta el esquema datamodel `prisma/schema`.
- **Archivo de migración**: Registrar `prisma/schema/migrations/20261009130000_sync_security_studies_pqrs_notifications/migration.sql`.
- **Resolución sin pérdida de datos**: Ejecutar `npx.cmd prisma migrate resolve --applied 20261009130000_sync_security_studies_pqrs_notifications` para sincronizar `_prisma_migrations` en la base de datos actual.
- **Verificación**: Confirmar que `npx.cmd prisma migrate status` reporte "Database schema is up to date!".

### 2.2 Blindaje Multi-Tenant de Notificaciones en `audit-extension.ts`
- **Archivo**: `src/common/prisma-extension/audit-extension.ts`
- **Cambio**:
  - Incorporar `'Notification'` en `multiTenantModels`.
  - **No** incorporar `'Notification'` en `auditableModels` para prevenir saturación de la tabla `audit_log` por cambios de estado de lectura (`isRead: true`).
- **Pruebas**: Agregar caso en `src/common/prisma-extension/audit-extension.spec.ts` verificando que consultas sobre `Notification` aplican automáticamente `where: { tenantId }`.

### 2.3 Reparación de Suites Unitarias en `regulation`
Actualizar los archivos de prueba para mockear correctamente las dependencias inyectadas en los constructores de cada servicio y controlador:
1. `role.service.spec.ts`: Mockear `RoleRepositoryService`, `UserRepositoryService` y `RequestContextService`.
2. `role.controller.spec.ts`: Mockear `RoleService`.
3. `permission.service.spec.ts`: Mockear `PermissionRepositoryService` y `RequestContextService` (validando filtrado de permisos `godlike:*`).
4. `permission.controller.spec.ts`: Mockear `PermissionService`.
5. `user.service.spec.ts`: Mockear `UserRepositoryService`, `EmployeeRepositoryService`, `RoleRepositoryService` y `RequestContextService`.
6. `user.controller.spec.ts`: Mockear `UserService`.
7. `employee.service.spec.ts`: Mockear `EmployeeRepositoryService`, `UserRepositoryService`, `DepartmentRepositoryService`, `PositionRepositoryService` y `S3Service`.
8. `employee.controller.spec.ts`: Mockear `EmployeeService`.

---

## 3. Plan de Ejecución por Fases

### Fase 1: Base de Datos
- [x] Generar migración SQL consolidada en `prisma/schema/migrations/20261009130000_sync_security_studies_pqrs_notifications/migration.sql`.
- [x] Marcar la migración como aplicada con `prisma migrate resolve --applied`.
- [x] Validar con `prisma migrate status`.

### Fase 2: Extensión de Prisma (Notificaciones)
- [x] Agregar `'Notification'` a `multiTenantModels` en `audit-extension.ts`.
- [x] Agregar prueba en `audit-extension.spec.ts` y verificar su ejecución exitosa.

### Fase 3: Pruebas Unitarias de Regulación
- [x] Corregir mocks en `role.service.spec.ts` y `role.controller.spec.ts`.
- [x] Corregir mocks en `permission.service.spec.ts` y `permission.controller.spec.ts`.
- [x] Corregir mocks en `user.service.spec.ts` y `user.controller.spec.ts`.
- [x] Corregir mocks en `employee.service.spec.ts` y `employee.controller.spec.ts`.
- [x] Ejecutar suite completa `npx.cmd jest` y verificar 27/27 suites en verde (100%).
- [x] Validar tipos TypeScript con `npx.cmd tsc --noEmit`.

### Fase 4: Cierre y Memoria
- [x] Actualizar reglas en `backend-rules.md`.
- [x] Actualizar documentación arquitectónica en `ARCHITECTURE.md` y `README.md`.
- [x] Registrar evento en `ai-decisions.log`.
