# SPEC-REG-011: Corrección de Reactivación de Usuarios y Sincronización de Roles (Fix Error 500)

> **Estado**: `COMPLETADO`  
> **Módulo**: `regulation`  
> **Ubicación Backend**: `src/modules/regulation/user` y `src/common/repository/user`  
> **Ubicación Frontend**: `src/app/(protected)/administrative/users`  
> **Fecha de Creación**: 2026-10-15  
> **Autor**: Antigravity (Software Architect)  

---

## 1. Contexto del Problema y Causa Raíz

### 1.1 Síntoma Reportado
Al crear un usuario cuyo documento (ej. `"1001001011"`) corresponde a un empleado existente, la creación inicial es exitosa. Sin embargo, al eliminar dicho usuario (soft-delete vía `isActive = false`) e intentar crearlo nuevamente con el mismo documento, el servidor arroja un error HTTP 500 en la consola:

```text
[Nest] ERROR [ExceptionsHandler] TypeError: Cannot read properties of undefined (reading 'map')
    at UserService.createUser (user.service.ts:141:52)
```

A pesar del error 500 recibido por el cliente HTTP, el usuario resulta reactivado en la base de datos debido a que la mutación previa ya fue persistida antes del fallo.

### 1.2 Diagnóstico Técnico y Causa Raíz
1. **Falta de Eager Loading de Relación `roles` en Repositorio**:
   En `UserRepositoryService.findByDocument(document: string)` (`src/common/repository/user/user.repository.service.ts:54`), la consulta Prisma sólo incluye `{ tenant: true }`:
   ```typescript
   async findByDocument(document: string) {
     return await (this.prisma.user as any).findFirst({
       bypassTenant: true,
       where: { document },
       include: { tenant: true }, // ❌ Falta roles: { include: { role: true } }
     });
   }
   ```
   Por consiguiente, el objeto `existingUser` retornado tiene `existingUser.roles === undefined`.

2. **Acceso Inseguro a Propiedades en `UserService.createUser`**:
   En `UserService.createUser` (`src/modules/regulation/user/user.service.ts:141`), al ingresar en el bloque de reactivación:
   ```typescript
   // 4) Reactivate and update user data
   const reactivatedUser = await this.userRepository.reactivateUser(...); // ✅ Se ejecuta y persiste

   // 5) Sync roles (remove old, add new)
   if (dto.roleIds) {
     const existingRoleIds = existingUser.roles.map((r: any) => r.role.id); // 💥 TypeError: Cannot read properties of undefined (reading 'map')
   ```
   Al fallar la lectura de `.map` sobre `undefined`, NestJS interrumpe el flujo con un `500 Internal Server Error`, dejando al usuario reactivado con una contraseña nueva pero sin sincronización de roles y sin retornar el DTO de respuesta.

3. **Gobernanza de Roles en Reactivación**:
   - Si el usuario a reactivar es de tipo `RESIDENCE_MANAGER`, el bloque de reactivación ignoraba la asignación del rol `'residence-manager'`.
   - La eliminación de roles anteriores se realizaba pasando `existingRoleIds` a `deleteUserRoles(userId, existingRoleIds)`, lo cual es vulnerable a estados inconsistentes si los roles no están cargados. Debe existir un método limpio `deleteAllUserRoles(userId)` en el repositorio.

4. **Validación de Frontera Multi-Tenant**:
   Dado que `document` en el modelo `User` posee restricción global `@unique`, se debe validar que el usuario inactivo pertenezca al `tenantId` actual del contexto (`this.contextService.tenantId`) o emitir un error de negocio claro para evitar apropiaciones indebidas entre organizaciones.

---

## 2. Solución Arquitectónica Planificada

### 2.1 Capa de Repositorio (`src/common/repository/user/user.repository.service.ts`)
1. **Actualizar `findByDocument`**:
   Incorporar la relación `roles` con su respectivo `role`:
   ```typescript
   async findByDocument(document: string) {
     return await (this.prisma.user as any).findFirst({
       bypassTenant: true,
       where: { document },
       include: {
         tenant: true,
         roles: {
           include: { role: true },
         },
       },
     });
   }
   ```
2. **Agregar `deleteAllUserRoles`**:
   Proveer un método explícito y atómico para purgar todos los roles asignados a un usuario:
   ```typescript
   async deleteAllUserRoles(userId: string) {
     return this.prisma.userRole.deleteMany({
       where: { userId },
     });
   }
   ```

### 2.2 Capa de Servicio (`src/modules/regulation/user/user.service.ts`)
1. **Validación de Seguridad Multi-Tenant**:
   Verificar que si existe el usuario, pertenezca al mismo `tenantId` (o que el llamante sea `system`):
   ```typescript
   if (existingUser.tenantId !== this.contextService.tenantId && !isSystemTenant) {
     throw new BadRequestException('El documento ya se encuentra registrado en otra organización.');
   }
   ```
2. **Defensiva de Mapeo y Sincronización Limpia de Roles**:
   - Reemplazar la lectura insegura por `(existingUser.roles || []).map(...)`.
   - Limpiar roles previos de forma confiable con `deleteAllUserRoles(existingUser.id)`.
   - Soportar tanto usuarios estándar (`dto.roleIds`) como `RESIDENCE_MANAGER` (asignación automática del rol `'residence-manager'`).
   - Retornar la entidad completa mediante `this.userRepository.getMe(reactivatedUser.id)`.

### 2.3 Cobertura de Pruebas Unitarias (`src/modules/regulation/user/user.service.spec.ts`)
Desarrollar una suite completa de pruebas unitarias en Jest cubriendo:
1. Creación exitosa de un nuevo usuario con empleado activo.
2. Reactivación exitosa de un usuario inactivo (`isActive = false`) con sincronización de nuevos `roleIds`.
3. Reactivación exitosa cuando `existingUser.roles` es `undefined` o vacío (resiliencia ante regresiones).
4. Reactivación de un usuario de tipo `RESIDENCE_MANAGER`.
5. Rechazo con `BadRequestException` cuando el usuario ya se encuentra activo (`isActive = true`).
6. Rechazo cuando el empleado asociado no existe o está inactivo.
7. Rechazo cuando el usuario inactivo pertenece a otro tenant.

---

## 3. Plan de Implementación Paso a Paso

- [x] **Paso 1**: Modificar `src/common/repository/user/user.repository.service.ts` para incluir `roles` en `findByDocument` y añadir `deleteAllUserRoles`.
- [x] **Paso 2**: Refactorizar el bloque de reactivación en `src/modules/regulation/user/user.service.ts` con validación multi-tenant, manejo seguro de roles y soporte para `RESIDENCE_MANAGER`.
- [x] **Paso 3**: Extender `src/modules/regulation/user/user.service.spec.ts` con pruebas unitarias exhaustivas para todos los caminos de ejecución de creación y reactivación.
- [x] **Paso 4**: Validar compilación estricta de TypeScript (`npx.cmd tsc --noEmit`), linter (`npm.cmd run lint`) y ejecución de todas las pruebas (`npm.cmd test`).
- [x] **Paso 5**: Registrar la decisión y resolución técnica en `.specs/ai-decisions.log`.

---

## 4. Criterios de Aceptación
1. Al crear un usuario que fue previamente inhabilitado (soft-deleted), el endpoint responde HTTP 201/200 con el DTO `UserResponseDto` completo, sin generar errores 500 en consola.
2. Los roles del usuario reactivado se sincronizan fielmente con los especificados en el formulario de creación.
3. El frontend de `administrative/users` recibe la respuesta esperada y refresca la lista reflejando al usuario en estado activo y con su rol asignado.
4. Las pruebas unitarias de Jest pasan al 100% (27/27 suites o 28/28 suites pasando).
