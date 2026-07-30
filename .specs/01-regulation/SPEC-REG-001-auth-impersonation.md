# SPEC-REG-001: Autenticación JWT y Sandbox de Impersonación Multi-Tenant

> **Estado**: `COMPLETADO`  
> **Módulo**: `regulation`  
> **Ubicación Backend**: `src/modules/regulation/auth`  
> **Ubicación Frontend**: `src/app/(public)/login`, `src/providers/AuthProvider`  
> **Fecha de Especificación**: 2026-07-30  

---

## 1. Contexto de Negocio e Historias de Usuario

### 1.1 Objetivo
Proporcionar un mecanismo de autenticación robusto, seguro y asimétrico mediante JSON Web Tokens (JWT) para usuarios de múltiples clientes/tenants, garantizando el aislamiento absoluto de datos y ofreciendo un **Sandbox de Impersonación** seguro para usuarios `GODLIKE` (SuperAdministradores del sistema).

### 1.2 Historias de Usuario
- **US-REG-01**: Como **Usuario del Sistema**, quiero iniciar sesión con mi correo y contraseña para obtener un token de acceso JWT y operar únicamente en mi tenant asignado.
- **US-REG-02**: Como **SuperAdministrador (`GODLIKE`)**, quiero impersonar/suplantar temporalmente el acceso a un tenant comercial específico sin perder la trazabilidad de mi identidad original de auditoría.
- **US-REG-03**: Como **Usuario Autenticado**, quiero refrescar mi token de acceso cuando expire utilizando un `refreshToken` válido sin ingresar credenciales nuevamente.

---

## 2. Definición de Permisos y Reglas de Impersonación

### 2.1 Permisos RBAC
- `auth:impersonate`: Permiso exclusivo otorgado únicamente al rol `GODLIKE` para saltar de tenant.

### 2.2 Principios de Seguridad de Impersonación
1. **Tenant Contenedor (`system`)**: Los usuarios `GODLIKE` pertenecen exclusivamente al tenant `system`.
2. **Rotación Cíclica Activa de Tokens**: Al hacer impersonación (`POST /auth/impersonate/:tenantId`), se inhabilita el token anterior (`revokedAt = Date.now()`) y se emite un nuevo JWT temporal con `tenantId` del objetivo e `isImpersonating: true`.
3. **Pivote Físico de Auditoría**: El interceptor de auditoría rastrea el UUID del usuario `GODLIKE` real para garantizar la responsabilidad legal en los `AuditLogs`.

---

## 3. Modelo de Datos (Prisma Schema Specification)

### 3.1 Modelos Asociados (`userSession.prisma`, `user.prisma`, `tenant.prisma`)

```prisma
model UserSession {
  id           String    @id @default(cuid(2))
  userId       String
  user         User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  refreshToken String    @unique
  userAgent    String?
  ipAddress    String?
  expiresAt    DateTime
  revokedAt    DateTime?
  createdAt    DateTime  @default(now())

  @@index([userId])
  @@map("user_session")
}
```

---

## 4. Contrato API REST (NestJS)

- **Controladores**:
  - `AuthController` (`src/modules/regulation/auth/auth.controller.ts`)
  - `AuthRefreshController` (`src/modules/regulation/auth/auth-refresh.controller.ts`)
- **Servicio**: `AuthService` (`src/modules/regulation/auth/auth.service.ts`)

### Endpoints
1. `POST /api/v1/auth/login`: Autenticación por email/password. Retorna `accessToken`, `refreshToken` y perfil de usuario.
2. `POST /api/v1/auth/refresh`: Refresco de JWT mediante `refreshToken`.
3. `POST /api/v1/auth/impersonate/:tenantId`: Iniciar suplantación sandbox (Solo `GODLIKE`).
4. `POST /api/v1/auth/stop-impersonation`: Cancelar suplantación y volver al tenant `system`.
5. `POST /api/v1/auth/logout`: Revocar sesión activa.

---

## 5. Especificación Frontend (Next.js)

- **Ruta Pública**: `src/app/(public)/login/page.tsx`
- **Componentes**:
  - `LoginForm`: Validación de formulario e inicio de sesión.
  - `ImpersonationBanner`: Banner flotante de advertencia cuando un usuario `GODLIKE` está en modo de impersonación activa.
