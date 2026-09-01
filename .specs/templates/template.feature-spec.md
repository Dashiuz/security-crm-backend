# SPEC-[CÓDIGO_MÓDULO]-[NÚMERO]: [Nombre Completo de la Funcionalidad]

> **Estado**: `[BORRADOR / EN_REVISIÓN / APROBADO / EN_DESARROLLO / COMPLETADO]`  
> **Módulo**: `[regulation / operation / administrative]`  
> **Autor(es)**: `[Nombre/Rol]`  
> **Fecha de Creación**: `YYYY-MM-DD`  
> **Última Actualización**: `YYYY-MM-DD`  

---

## 1. Contexto de Negocio e Historias de Usuario

### 1.1 Objetivo
[Describir en 2-3 párrafos el propósito de la funcionalidad dentro del ecosistema Noxia, el problema operativo que resuelve y el valor aportado al cliente/tenant.]

### 1.2 Historias de Usuario (User Stories)
- **US-01**: Como **[Rol de Usuario]**, quiero **[Acción a realizar]** para **[Beneficio esperado]**.
- **US-02**: Como **[Supervisor de Seguridad]**, quiero **[Anular o auditar un registro]** para **[Mantener la integridad de la bitácora]**.

---

## 2. Definición de Permisos y Matriz RBAC

### 2.1 Permisos requeridos
Listar los permisos específicos que deben agregarse en `prisma/seed-features.ts` y requerirse en los controladores NestJS mediante `@RequirePermissions(...)`:

| Permiso Code | Nombre Legible | Descripción | Rol por Defecto |
| :--- | :--- | :--- | :--- |
| `[modulo]:read` | Lectura de [Recurso] | Consultar y listar registros | Guardia, Supervisor, Admin |
| `[modulo]:create` | Creación de [Recurso] | Crear nuevos registros de minuta/control | Guardia, Supervisor |
| `[modulo]:update` | Edición de [Recurso] | Modificar detalles permitidos | Supervisor, Admin |
| `[modulo]:delete` | Anulación/Eliminación | Soft-delete o anulación formal con motivo | Admin, Godlike |
| `[modulo]:manage` | Administración Total | Control completo sobre el submódulo | SuperAdmin, Godlike |

### 2.2 Reglas Multi-Tenant y Seguridad
- [ ] **Aislamiento Obligatorio**: Todo registro debe almacenar y filtrar por `tenantId`.
- [ ] **Auditoría Transversal**: Campos `createdAt`, `createdById`, `updatedAt`, `updatedById`, `deletedAt`, `deletedById`, `voidedAt`, `voidedById`.
- [ ] **Sandbox de Impersonación (`GODLIKE`)**: Validar comportamiento cuando un usuario `GODLIKE` realiza operaciones en nombre de un tenant suplantado.

---

## 3. Modelo de Datos (Prisma Schema Specification)

### 3.1 Archivo de Esquema
Ubicación: `prisma/schema/[modulo].prisma`

```prisma
// Especificación de nuevo modelo o extensión
model [NombreModelo] {
  id       String @id @default(cuid(2))
  tenantId String
  tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Restrict)

  // Campos principales de negocio
  // ...

  // Estado y Anulación
  status     RecordStatus @default(ACTIVE)
  voidReason String?
  voidedAt   DateTime?
  voidedById String?
  voidedBy   User?        @relation("[NombreModelo]VoidedBy", fields: [voidedById], references: [id], onDelete: SetNull)

  // Trazabilidad de Auditoría
  source      RecordSource @default(WEB)
  externalRef String?

  createdAt   DateTime @default(now())
  createdById String?
  createdBy   User?    @relation("[NombreModelo]CreatedBy", fields: [createdById], references: [id], onDelete: SetNull)

  updatedAt   DateTime @updatedAt
  updatedById String?
  updatedBy   User?    @relation("[NombreModelo]UpdatedBy", fields: [updatedById], references: [id], onDelete: SetNull)

  deletedAt   DateTime?
  deletedById String?
  deletedBy   User?    @relation("[NombreModelo]DeletedBy", fields: [deletedById], references: [id], onDelete: SetNull)

  @@index([tenantId])
  @@index([tenantId, createdAt])
  @@map("[nombre_tabla_snake_case]")
}
```

---

## 4. Contrato de API REST & Backend Specification (NestJS)

### 4.1 Ubicación en Backend
- Módulo: `src/modules/[modulo]/[submodulo]`
- Controlador: `src/modules/[modulo]/[submodulo]/controllers/[recurso].controller.ts`
- Servicio: `src/modules/[modulo]/[submodulo]/services/[recurso].service.ts`
- DTOs: `src/modules/[modulo]/[submodulo]/dtos/[recurso].dto.ts`

### 4.2 Endpoints REST Spec

#### `POST /api/v1/[modulo]/[recurso]`
- **Guardias**: `@UseGuards(JwtAuthGuard, PermissionsGuard)`
- **Permiso**: `@RequirePermissions('[modulo]:manage', '[modulo]:create')`
- **Request Body (DTO)**:
```typescript
export class Create[Recurso]Dto {
  @ApiProperty({ description: 'Descripción o anotación principal' })
  @IsString()
  @IsNotEmpty()
  annotation: string;

  // ...otros campos con validaciones de class-validator
}
```
- **Respuestas HTTP**:
  - `201 Created`: Retorna el registro recién creado.
  - `400 Bad Request`: Error de validación en los campos del DTO.
  - `401 Unauthorized`: Token JWT ausente o expirado.
  - `403 Forbidden`: El usuario no posee los permisos RBAC requeridos.

#### `GET /api/v1/[modulo]/[recurso]`
- **Guardias**: `@UseGuards(JwtAuthGuard, PermissionsGuard)`
- **Permiso**: `@RequirePermissions('[modulo]:manage', '[modulo]:read')`
- **Query Params**: `page`, `limit`, `search`, `startDate`, `endDate`, `status`.
- **Respuesta HTTP 200**: Lista paginada del recurso filtrada automáticamente por el `tenantId` del contexto.

#### `PATCH /api/v1/[modulo]/[recurso]/:id/void`
- **Guardias**: `@UseGuards(JwtAuthGuard, PermissionsGuard)`
- **Permiso**: `@RequirePermissions('[modulo]:manage', '[modulo]:update')`
- **Request Body (DTO)**: `VoidRecordDto` (`voidReason: string`).

---

## 5. Especificación Frontend (Next.js App Router)

### 5.1 Ubicación y Rutas
- Ruta en cliente: `src/app/(protected)/[modulo]/[recurso]/page.tsx`
- Layout asociado: `src/app/(protected)/layout.tsx`

### 5.2 Componentes UI y Diseño (Estándares UI/UX Pro Max)
- **Vistas Requeridas**:
  1. **Tabla Paginada de Registros**: Con filtros dinámicos (fecha, categoría, estado) y badges de estado (`ACTIVE`, `VOIDED`).
  2. **Formulario de Registro / Modal**: Formulario reactivo con validación e indicadores de carga.
  3. **Modal de Detalle y Anulación**: Visualización limpia de trazabilidad (quién creó, cuándo, quién anuló y motivo).
- **Estilo Visual**:
  - Tema: Dark Mode / Sleek Glassmorphism acorde al sistema de diseño Noxia.
  - Micro-animaciones en transiciones de tabla y modales.

---

## 6. Criterios de Aceptación y Matriz de Verificación

- [ ] **Modelado DB**: Migración de Prisma ejecutada sin conflictos y esquema generado (`npx prisma generate`).
- [ ] **Sembrado de Permisos**: Permisos registrados en `seed-features.ts` y asignados al rol por defecto.
- [ ] **Aislamiento Multi-Tenant**: Verificado mediante pruebas donde un usuario del `tenant_A` no puede consultar ni modificar registros del `tenant_B`.
- [ ] **Auditoría Pruebas**: Confirmación de que `AuditLog` captura eventos de inserción/actualización/anulación con el UUID correspondiente.
- [ ] **OpenAPI / Swagger**: Swagger UI expone correctamente la documentación de los nuevos endpoints.
- [ ] **UI Responsiva**: Formulario y tabla probados en resoluciones desktop y tablet.
