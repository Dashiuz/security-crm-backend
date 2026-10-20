# SPEC-REG-014: Vinculación de Administradores de Conjunto, Acceso Multi-Cliente y Modernización de Creación de Usuarios

> **Estado**: `EN_REVISIÓN`  
> **Módulo**: `regulation` / `administrative`  
> **Ubicación Frontend**: `src/app/(protected)/administrative/users/page.tsx`, `src/components/common/EmployeeAutocomplete.tsx`  
> **Ubicación Backend**: `src/modules/regulation/user`, `src/modules/administrative/client`, `src/modules/regulation/auth`  
> **Fecha de Creación**: 2026-10-16  
> **Autor(es)**: Antigravity (Software Architect & Pair Programming)  

---

## 1. Contexto de Negocio y Planteamiento del Problema

### 1.1 Diagnóstico de la Situación Actual

En la plataforma Noxia, la creación de usuarios para empleados del sistema exige que el documento de identidad esté previamente registrado y activo en la tabla `Employee`. Para los administradores de conjuntos residenciales (`RESIDENCE_MANAGER`), esta validación se omite intencionalmente (según `SPEC-ADM-004`), permitiendo crear usuarios que gestionan el módulo de residentes y PQRS de un cliente específico.

Sin embargo, el flujo actual presenta brechas operativas y de seguridad:

1. **Creación Abierta y No Validada de Administradores**:
   - Actualmente, al seleccionar `RESIDENCE_MANAGER`, el operador digita libremente cualquier "Nombre Completo" y cualquier "Documento de Identidad".
   - Esto desacopla al usuario del registro formal del cliente en **Legal y Contratos** (donde previamente se definió quién es el administrador titular, su documento, teléfono, correo, o los delegados de la empresa administradora).
   - No existe garantía de que la persona que recibe credenciales de acceso sea realmente la designada contractualmente por la copropiedad.

2. **El Problema del Administrador Multi-Cliente (Varios Conjuntos para una Misma Persona)**:
   - En el mercado de propiedad horizontal en Colombia y Latinoamérica, es sumamente habitual que un administrador profesional (persona natural) o una firma administradora gestione múltiples conjuntos residenciales (e.g. "Conjunto Bosques del Norte" y "Torres del Parque").
   - En la base de datos de Noxia:
     - El modelo `User` tiene el campo `document String @unique`.
     - El modelo `User` tiene un único campo de relación directa `clientId String?`.
   - **Conflicto Crítico**: Si el administrador "Carlos Rodríguez" (C.C. 12.345.678) ya fue creado para el Conjunto A:
     - Al intentar crear el usuario para el Conjunto B con su mismo documento, la base de datos lanza un error de colisión de unicidad (`P2002 Unique constraint failed on document`).
     - Si el sistema simplemente sobreescribiera `user.clientId = Conjunto B`, Carlos perdería inmediatamente el acceso al Conjunto A.
     - **Requerimiento**: El sistema debe permitir que una misma identidad de usuario pueda ser **habilitada y autorizada para acceder a múltiples clientes**, alternando su contexto de trabajo según corresponda.

3. **Entrada Manual en Empleados y Ausencia de Doble Factor de Contraseña**:
   - Para usuarios de tipo `EMPLOYEE`, se exige digitar el documento numérico a mano en lugar de aprovechar el componente `EmployeeAutocomplete` ya desarrollado (con debounce de 500ms y búsqueda por nombre/cédula).
   - Al crear usuarios, un único campo de contraseña genera un alto riesgo de errores tipográficos por parte del operador administrador, dejando contraseñas inaccesibles o erróneas.
   - El selector de "Asignar Roles" utiliza un componente nativo múltiple con baja intuición ergonómica.

---

## 2. Historias de Usuario (User Stories)

- **US-01 (Vincular Administrador desde Legal)**: Como **Administrador de Seguridad / RRHH**, quiero seleccionar un cliente y elegir al administrador desde los contactos legales ya registrados (Persona Natural o Empresa), para asegurar que solo personas autorizadas contractualmente tengan acceso al sistema.
- **US-02 (Gestión Multi-Cliente de Administradores)**: Como **Administrador de Conjunto**, quiero gestionar múltiples copropiedades bajo una sola cuenta y contraseña, pudiendo cambiar de conjunto activo sin necesidad de mantener múltiples credenciales.
- **US-03 (Habilitación Idempotente de Accesos)**: Como **Operador de Usuarios**, cuando seleccione un conjunto y elija a un administrador que ya cuenta con usuario activo en otro conjunto, quiero que el sistema me permita habilitarle el acceso a la nueva copropiedad sin pedir una nueva contraseña ni generar errores de documento duplicado.
- **US-04 (Búsqueda Ergonómica de Empleados)**: Como **Operador de Usuarios**, quiero buscar empleados mediante un buscador con autocompletado en tiempo real (por nombre o cédula) para asignarle usuario sin tener que copiar/pegar documentos manualmente.
- **US-05 (Confirmación de Contraseña Segura)**: Como **Operador de Usuarios**, quiero confirmar la contraseña antes de crear la cuenta para prevenir equivocaciones al otorgar accesos.

---

## 3. Arquitectura y Solución Técnica

### 3.1 Solución al Acceso Multi-Cliente para Administradores

Para resolver la multiplicidad de clientes sin romper la integridad referencial ni la compatibilidad regresiva, se adopta el patrón **Multi-Client Access con Context Switching Activo**:

```
                       ┌──────────────────────────────────────────────┐
                       │                   User                       │
                       │  - id: cuid                                  │
                       │  - document: unique (Identidad Nacional)     │
                       │  - fullName: string                          │
                       │  - passwordHash: string                      │
                       │  - clientId: activeClientId (Retrocompatible)│
                       │  - userType: RESIDENCE_MANAGER               │
                       └──────────────────────┬───────────────────────┘
                                              │ 1
                                              │
                                              │ N
                       ┌──────────────────────▼───────────────────────┐
                       │             UserClientAccess                 │
                       │  - id: cuid                                  │
                       │  - userId -> User.id                         │
                       │  - clientId -> Client.id                     │
                       │  - roleName: "Titular" | "Delegado"          │
                       │  - isActive: true                            │
                       │  - createdAt: DateTime                       │
                       └──────────────────────▲───────────────────────┘
                                              │ N
                                              │
                                              │ 1
                       ┌──────────────────────┴───────────────────────┐
                       │                   Client                     │
                       │  - id: cuid                                  │
                       │  - name: string                              │
                       │  - administrationType: INDIVIDUAL/ENTERPRISE │
                       │  - administrationCompanyData: Json           │
                       └──────────────────────────────────────────────┘
```

#### A. Principios de Diseño:
1. **Identidad Única vs Autorizaciones Múltiples**:
   - Una persona física tiene exactamente un registro en `User` (clave única `document`).
   - Sus autorizaciones a clientes residenciales se modelan a través de la tabla relacional `UserClientAccess`.
2. **Compatibilidad Regresiva Absoluta**:
   - Se preserva el campo `User.clientId` como el **cliente activo o por defecto** (`activeClientId`).
   - Todos los servicios existentes (`resident.service.ts`, `pqrs.service.ts`, etc.) que consultan `where: { clientId: user.clientId }` continúan operando al 100% sin necesidad de refactorizar decenas de archivos.
3. **Flujo de Creación / Habilitación en Frontend**:
   - **Caso A (Usuario Nuevo)**: Se crea el registro `User`, se asigna su `clientId` principal y se crea el primer registro en `UserClientAccess`.
   - **Caso B (Usuario Existente)**: Si el documento del administrador seleccionado ya existe en `User`:
     - El backend detecta la cuenta existente.
     - Si ya tiene acceso al cliente seleccionado, responde informando que el acceso ya está activo.
     - Si no tiene acceso a este cliente, se crea un nuevo registro en `UserClientAccess`.
     - En la UI, los campos de contraseña se ocultan automáticamente y el botón cambia a *"Habilitar Acceso a Conjunto"*, eliminando cualquier riesgo de colisión `P2002`.

#### B. Context Switching en Sesión / Frontend:
- Cuando un `RESIDENCE_MANAGER` inicia sesión:
  - El backend retorna `accessibleClients: Array<{ id, name, internalCode, roleName }>`.
  - Si tiene **1 solo cliente**, la interfaz permanece idéntica a la actual (sin selectores adicionales).
  - Si tiene **2 o más clientes**, la barra superior de navegación (`Header` / `Navbar`) renderiza un selector desplegable de contexto activo:
    `[ 🏢 Conjunto Bosques del Norte ▾ ]`.
  - Al seleccionar otro conjunto:
    - Se invoca `POST /auth/switch-client/:clientId`.
    - El backend actualiza `user.clientId = targetClientId` en sesión y emite un nuevo JWT refrescado.
    - El frontend invalida la caché de consultas y recarga la vista de residentes con los datos del nuevo conjunto activo.

---

## 4. Especificación del Modelo de Datos (Prisma Schema)

### 4.1 Nuevo Modelo `UserClientAccess` (`prisma/schema/user.prisma`)

```prisma
model UserClientAccess {
  id        String   @id @default(cuid(2))
  tenantId  String
  tenant    Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  clientId  String
  client    Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)

  roleName  String?  // e.g. "Administrador Titular", "Representante Legal", "Delegado Operativo"
  isActive  Boolean  @default(true)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([userId, clientId])
  @@index([tenantId])
  @@index([userId])
  @@index([clientId])
  @@map("user_client_access")
}
```

### 4.2 Actualización al Modelo `User` (`user.prisma`)

```prisma
model User {
  // ... campos existentes se conservan intactos
  clientId String?
  client   Client? @relation(fields: [clientId], references: [id], onDelete: SetNull)

  // Nueva relación multi-cliente
  clientAccesses UserClientAccess[]

  // ... demás relaciones
}
```

---

## 5. Especificación de Endpoints REST & Backend (NestJS)

### 5.1 Consulta de Administradores Registrados de un Cliente

Permite al frontend obtener la lista consolidada de personas físicas facultadas para ser usuarios administradores de un conjunto residencial, extrayéndolas de los datos de **Legal y Contratos** del cliente.

#### `GET /api/v1/client/:id/administrators`
- **Guardias**: `@UseGuards(JwtAuthGuard, PermissionsGuard)`
- **Permisos**: `@RequirePermissions('user:create', 'client:read', 'client:read_legal')` (al menos uno)
- **Lógica de Extracción**:
  1. Consulta el `Client` verificando que pertenezca al `tenantId` del usuario autenticado.
  2. Si `administrationType === 'INDIVIDUAL'`:
     - Extrae el titular: `name: client.administrator`, `phone: client.administratorPhone`, `email: client.administratorEmail`.
     - Documento: `client.administrationCompanyData?.identificationNumber || client.administrationCompanyData?.representativeDocument || ''`.
     - `roleName: 'Administrador Titular'`.
  3. Si `administrationType === 'ENTERPRISE'`:
     - Extrae al Representante Legal: `name: legalRepName`, `document: legalRepId`, `phone: legalRepPhone`, `email: email`, `roleName: 'Representante Legal'`.
     - Itera sobre `additionalContacts`: cada uno con `name`, `document`, `phone`, `email`, `roleName` (e.g. "Administrador Delegado", "Contador").
  4. Para cada persona identificada:
     - Ejecuta una búsqueda rápida en `User` por `document`.
     - Incluye flags: `isAlreadyUser: boolean`, `hasAccessToThisClient: boolean`, `userId?: string`.
- **Formato de Respuesta (200 OK)**:
```json
[
  {
    "name": "Carlos Rodríguez",
    "document": "12345678",
    "email": "carlos.admin@gmail.com",
    "phone": "3001234567",
    "roleName": "Administrador Titular",
    "administrationType": "INDIVIDUAL",
    "isAlreadyUser": true,
    "hasAccessToThisClient": false,
    "userId": "cuid_user_123"
  }
]
```

---

### 5.2 Creación y Habilitación de Usuarios en `UserService`

#### `POST /api/v1/user`
- **Modificación en `createUser(dto: CreateUserDto)`**:
  1. Si `userType === 'RESIDENCE_MANAGER'`:
     - Valida obligatoriamente `clientId`.
     - Consulta los administradores legales válidos del cliente mediante `getClientAdministrators(dto.clientId)`.
     - **Regla de Integridad**: El `dto.document` DEBE coincidir con el documento de alguno de los administradores registrados del cliente. Si no coincide, lanza `BadRequestException('El documento no corresponde a ningún administrador registrado en los datos legales del cliente.')`.
     - **Verificación de Usuario Existente**:
       - Si existe un `User` con ese documento:
         - Si `existingUser.isActive === true`:
           - Verifica si ya existe registro en `UserClientAccess` para ese `clientId`.
           - Si ya existe: lanza `BadRequestException('Este administrador ya tiene acceso activo a este conjunto residencial.')`.
           - Si no existe: inserta en `UserClientAccess`, actualiza `roles` si fuera necesario y retorna el usuario con status de éxito (sin requerir nueva contraseña).
         - Si `existingUser.isActive === false`: reactiva al usuario, actualiza su `clientId` y registra en `UserClientAccess`.
       - Si NO existe: crea el nuevo `User`, inicializa `UserClientAccess` y asigna el rol inmutable `residence-manager`.

---

### 5.3 Context Switching para Administradores de Conjunto

#### `POST /api/v1/auth/switch-client/:clientId`
- **Guardias**: `@UseGuards(JwtAuthGuard)`
- **Validación**:
  - Verifica que `req.user.userType === 'RESIDENCE_MANAGER'`.
  - Verifica en `UserClientAccess` que el usuario tenga acceso activo a `:clientId`.
  - Actualiza `user.clientId = :clientId`.
  - Emite un nuevo access token JWT firmado con el nuevo `clientId`.
- **Respuesta (200 OK)**:
```json
{
  "accessToken": "ey...",
  "activeClientId": "client_abc",
  "clientName": "Torres del Parque"
}
```

---

## 6. Especificación de Frontend e Interfaz de Usuario (UI/UX)

### 6.1 Rediseño del `UserCreateDrawer` (`administrative/users/page.tsx`)

#### A. Selector de Tipo de Usuario y Encadenamiento Reactivo
- **Campo 1**: `Tipo de Usuario` (`EMPLOYEE` | `RESIDENCE_MANAGER`).
- **Comportamiento para `RESIDENCE_MANAGER`**:
  1. **Campo 2 (Obligatorio Inicial)**: `ClientAutocomplete` ("Conjunto Residencial / Cliente").
  2. **Estado Vacío / Alerta Suave**:
     - Si el cliente seleccionado **NO tiene administradores configurados**:
       - Se deshabilita el selector de administrador.
       - Se muestra un banner informativo con estilo neutro/slate (cero tonos rojos agresivos):
         > ℹ️ *El cliente seleccionado no cuenta con datos de administración registrados en el módulo Legal y Contratos. Para otorgar accesos, primero configure la administración en la ficha del cliente.*
       - El botón "Crear Usuario" permanece bloqueado.
  3. **Campo 3 (Buscador/Selector de Administrador)**:
     - Se habilita inmediatamente al seleccionar un cliente con datos de administración.
     - Componente `Autocomplete` o `Select` con tarjetas estilizadas:
       - Muestra el nombre, documento y cargo formal (`"Representante Legal"`, `"Administrador Titular"`, `"Delegado Operativo"`).
     - Al seleccionar un administrador de la lista:
       - Se autocompletan y bloquean los campos: `Nombre Completo`, `Documento de Identidad`, `Teléfono`, `Correo Electrónico`.
       - Se elimina/oculta el input editable manual de "Documento de Identidad".

#### B. Detección Inteligente de Cuenta Existente (Multi-Cliente)
- Si el administrador seleccionado ya posee cuenta en Noxia (`isAlreadyUser: true`):
  - Se presenta una tarjeta informativa sutil (borde azul/gris neutro, fondo suave):
    > 👤 **Cuenta Existente Detectada**  
    > *Carlos Rodríguez ya tiene una cuenta activa en el sistema. Al confirmar, se le habilitará el acceso para administrar este conjunto residencial manteniendo sus credenciales de acceso actuales.*
  - Los campos de **Contraseña** y **Confirmar Contraseña** se ocultan automáticamente.
  - El botón principal cambia dinámicamente su texto a:
    `"Habilitar Acceso al Conjunto"`.
- Si el administrador NO tiene cuenta previa (`isAlreadyUser: false`):
  - Se muestran los campos de **Contraseña** y **Confirmar Contraseña**.
  - El botón principal muestra: `"Crear Usuario Administrador"`.

#### C. Creación de Usuario para Empleados (`EMPLOYEE`)
- **Buscador con Autocompletado**:
  - Se sustituye el campo de texto simple por `EmployeeAutocomplete`.
  - Búsqueda en tiempo real con debounce de 500ms por Cédula o Nombre.
  - Al seleccionar el empleado, se previsualiza una tarjeta compacta y elegante con su avatar/badge, cargo (`positionRef`), departamento (`departmentRef`) y documento validado.

#### D. Doble Input de Contraseña y Seguridad
- Campo `Contraseña` y campo `Confirmar Contraseña`:
  - Ambos con iconos independientes para alternar visibilidad (mostrar/ocultar).
  - Validación cliente en tiempo real:
    - Longitud mínima: 8 caracteres.
    - Coincidencia exacta entre ambos campos.
  - Indicador visual sutil de coincidencia (borde primario sutil, sin alarmas rojas).

#### E. Rediseño del Selector de Roles (`Asignar Roles`)
- **Para `RESIDENCE_MANAGER`**:
  - Se oculta el dropdown de roles.
  - Se muestra una tarjeta informativa con chip bloqueado:
    `Rol Asignado: Administrador de Conjunto (residence-manager)`
    *(Rol del sistema con permisos específicos para residentes y PQRS)*.
- **Para `EMPLOYEE`**:
  - Sustituir el `<TextField select multiple>` nativo por un `<Autocomplete multiple>` moderno con checkboxes (`Checkbox`), buscador integrado y chips removibles.

---

### 6.2 Paleta Visual y Reglas Estéticas ("Easy to Track > Easy to Read")

1. **Erradicación de Rojos Agresivos en Errores y Validaciones**:
   - Sustituir fondos o bordes rojo chillón (`#d32f2f`, `rgb(239, 68, 68)`) por tonos neutros refinados:
     - Avisos de advertencia/validación: Ámbar suave (`#f59e0b` / `rgba(245, 158, 11, 0.08)`).
     - Bloqueos informativos: Gris pizarra / Slate (`#64748b` / `rgba(100, 116, 139, 0.08)`).
     - Enfoques activos: Azul corporativo Noxia (`#0284c7`).
2. **Simetría y Micro-Interacciones**:
   - Altura de inputs unificada a `size="small"` (40px de altura estándar).
   - Transiciones suaves (`transition: all 0.2s ease-in-out`) en cards y badges.

---

## 7. Plan de Pruebas Unitarias Exhaustivas (Backend)

Conforme a la política de máxima cobertura y confiabilidad en backend, se implementarán pruebas unitarias exhaustivas en NestJS/Jest cubriendo todos los escenarios posibles:

### 7.1 Pruebas en `ClientService` (`client.service.spec.ts`)
1. **`getClientAdministrators` - Caso Persona Natural (INDIVIDUAL)**:
   - Debe retornar correctamente al titular con documento, nombre, teléfono, email y rol "Administrador Titular".
2. **`getClientAdministrators` - Caso Empresa (ENTERPRISE)**:
   - Debe retornar al Representante Legal y a todos los contactos adicionales registrados en `additionalContacts`.
3. **`getClientAdministrators` - Cliente sin Administradores**:
   - Debe retornar un arreglo vacío `[]` sin lanzar excepciones no controladas.
4. **`getClientAdministrators` - Marcado de Usuarios Existentes (`isAlreadyUser`)**:
   - Debe marcar `isAlreadyUser: true` si el documento coincide con un registro en `User`.
   - Debe marcar `hasAccessToThisClient: true` si ya está registrado en `UserClientAccess`.

### 7.2 Pruebas en `UserService` (`user.service.spec.ts`)
1. **`createUser` - RESIDENCE_MANAGER con Documento Válido**:
   - Debe crear exitosamente el usuario con departamento `ADMINISTRACION CLIENTE` y rol `residence-manager`.
2. **`createUser` - RESIDENCE_MANAGER con Documento No Registrado en el Cliente**:
   - Debe rechazar con `BadRequestException` si el documento no existe en los administradores del cliente.
3. **`createUser` - RESIDENCE_MANAGER Multi-Cliente (Usuario ya Existente)**:
   - Debe vincular el nuevo cliente en `UserClientAccess` sin error de colisión de documento único y sin requerir nueva contraseña.
4. **`createUser` - RESIDENCE_MANAGER Duplicado en el Mismo Cliente**:
   - Debe rechazar con `BadRequestException` informando que el acceso a esa copropiedad ya está activo.
5. **`createUser` - EMPLOYEE con Employee Inactivo o No Existente**:
   - Debe rechazar si no existe un empleado activo con dicho documento.

### 7.3 Pruebas en `AuthService` (`auth.service.spec.ts`)
1. **`switchClient` - Cambio de Conjunto Autorizado**:
   - Debe emitir un nuevo token JWT con el nuevo `clientId` cuando el usuario tiene acceso en `UserClientAccess`.
2. **`switchClient` - Intento de Acceso a Conjunto No Asignado**:
   - Debe lanzar `ForbiddenException` si el usuario intenta cambiar a un cliente donde no tiene permiso.

---

## 8. Matriz de Verificación y Criterios de Aceptación

- [ ] **Esquema DB**: Modelo `UserClientAccess` registrado en Prisma y migrado limpiamente.
- [ ] **Endpoint Administradores**: `GET /client/:id/administrators` funcionando y probado.
- [ ] **Integridad en Creación**: `POST /user` valida que los administradores pertenezcan a los datos legales del conjunto.
- [ ] **Soporte Multi-Cliente**: Un mismo administrador puede ser asociado a 2 o más conjuntos sin errores de documento único.
- [ ] **Frontend Chaining**: El selector de administrador se activa solo al escoger cliente; si no hay administradores, se informa limpiamente.
- [ ] **Soporte Empresa Administradora**: Todos los miembros/delegados de la empresa pueden ser seleccionados individualmente.
- [ ] **EmployeeAutocomplete**: Implementado en la creación de empleados con 500ms de debounce y renderizado de chips.
- [ ] **Confirmar Contraseña**: Campo con validación visual y de igualdad antes del submit.
- [ ] **Selector de Roles Moderno**: Autocomplete múltiple con checkboxes para empleados y badge informativo para administradores de conjunto.
- [ ] **Paleta Visual Conforme**: Cero tonos rojos agresivos en advertencias y validaciones.
- [ ] **Suite de Pruebas**: 100% de pruebas unitarias ejecutadas y aprobadas en backend.
