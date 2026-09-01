# SPEC-OPE-006: Integración con AWS S3 y Gestión de Archivos Multi-Tenant

> **Estado**: `APROBADO`  
> **Módulo**: `operation / administrative (Transversal)`  
> **Autor(es)**: Antigravity  
> **Fecha de Creación**: 2026-08-31  
> **Última Actualización**: 2026-09-01  

---

## 1. Contexto de Negocio e Historias de Usuario

### 1.1 Objetivo
Implementar un sistema centralizado y robusto para la subida, almacenamiento y gestión de archivos estáticos (fotografías, avatares, documentos) en AWS S3. Se asegura el aislamiento Multi-Tenant exigiendo que todas las rutas (S3 Keys) y metadatos en base de datos estén atados al `tenantId`. Esto permitirá adjuntar evidencia gráfica a minutas operativas y asignar avatares a empleados de forma estructurada.

### 1.2 Historias de Usuario (User Stories)
- **US-01**: Como **Guardia**, quiero **tomar una fotografía en vivo o subir un archivo** al registrar una minuta (General, Visitantes, Correspondencia, Parqueadero) para **tener evidencia gráfica de novedades e incidentes**.
- **US-02**: Como **Administrador**, quiero **subir la foto de perfil (avatar) de un empleado** para **facilitar su identificación visual dentro del CRM**.
- **US-03**: Como **Sistema (Backend)**, quiero **eliminar físicamente de S3 los archivos** cuando un registro asociado sea destruido, para **optimizar costos de almacenamiento**.

---

## 2. Definición de Permisos y Seguridad Multi-Tenant

### 2.1 Permisos requeridos
La subida de archivos se tratará como un servicio transversal (Utility). Para subir un archivo relacionado a una minuta, el usuario simplemente debe poseer el permiso de creación de dicha minuta (ej. `minuta:create`). El backend validará la sesión vía JWT.

### 2.2 Reglas Multi-Tenant
- [x] **Aislamiento S3**: Las llaves generadas siempre usarán el prefijo del tenant (`tenants/{tenantId}/...`).
- [x] **Aislamiento DB**: El registro insertado en `MediaAttachment` captura el `tenantId` desde el `RequestContextService` (AsyncLocalStorage).
- [x] **Auditoría**: El campo `uploadedById` rastreará qué usuario subió el archivo.

---

## 3. Modelo de Datos (Prisma Schema Specification)

Se actualizarán `media_attachment.prisma` y `employee.prisma` para incluir la relación:

### 3.1 Modificaciones a `media_attachment.prisma`
```prisma
  // Añadir dentro de "Foreign Key Relations"
  employeeId         String?
  employee           Employee?                       @relation(fields: [employeeId], references: [id], onDelete: Cascade)
```

### 3.2 Modificaciones a `employee.prisma`
```prisma
  mediaAttachments MediaAttachment[]
```

### 3.3 Patrón de Llaves S3 (S3 Keys)
Implementaremos las siguientes rutas estandarizadas, usando `cuid()` o UUID para el sufijo:
- **Minutas (Con Cliente)**: `tenants/{tenantId}/clients/{clientId}/minutas/{minutaType}/{entityId}/{uuid}-{filename}`
- **Minutas (Sin Cliente)**: `tenants/{tenantId}/minutas/{minutaType}/{entityId}/{uuid}-{filename}`
- **Empleados**: `tenants/{tenantId}/employees/{employeeId}/avatar/{uuid}-{filename}`
- **Clientes (Documentos)**: `tenants/{tenantId}/clients/{clientId}/documents/{uuid}-{filename}`
- **Inventarios**: `tenants/{tenantId}/inventories/{itemId}/{uuid}-{filename}`
- **Documentos varios**: `tenants/{tenantId}/documents/{category}/{uuid}-{filename}`

*(Nota: `{minutaType}` será uno de los 4 tipos: `general`, `visitor`, `correspondence`, `parking`)*

---

## 4. Contrato de API REST & Backend Specification (NestJS)

### 4.1 Instalación de Dependencias
Se requerirán las siguientes librerías de AWS:
```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
npm install -D @types/multer
```

### 4.2 Ubicación en Backend
Crearemos un módulo centralizado para almacenamiento:
- Módulo: `src/modules/storage/storage.module.ts`
- Servicio AWS S3: `src/modules/storage/services/s3.service.ts`
- Controlador: `src/modules/storage/controllers/storage.controller.ts`

### 4.3 Endpoints REST Spec

#### `POST /api/v1/storage/upload`
- **Guardias**: `@UseGuards(JwtAuthGuard)`
- Se utilizará `FileInterceptor('file')` para procesar el form-data multipart.
- **Request Body (FormData)**:
  - `file`: (Binario)
  - `entityType`: Enum (`MINUTA`, `EMPLOYEE`, `CLIENT`, etc.)
  - `entityId`: UUID del registro al cual se atará.
- **Flujo interno**:
  1. Extraer `tenantId` del contexto.
  2. Generar S3 Key basado en el `entityType`.
  3. Subir a AWS S3.
  4. Guardar registro en la tabla `MediaAttachment` (vía prisma).
- **Respuesta 201**: Retorna el objeto `MediaAttachment`.

#### `DELETE /api/v1/storage/:id`
- Elimina el registro de base de datos y ejecuta el comando de borrado físico en S3.

#### `GET /api/v1/storage/:id/presigned-url`
- **Obligatorio**: Dado que el bucket S3 es privado, el frontend debe invocar este endpoint para visualizar las imágenes.
- **Flujo interno**:
  1. Extrae el `tenantId` del contexto.
  2. Valida la existencia del `MediaAttachment` filtrando por `id` y `tenantId`.
  3. Genera una Presigned URL usando `s3-request-presigner` con validez de 15 minutos.
  4. Retorna la URL al cliente.

---

## 5. Especificación Frontend (Next.js App Router)

### 5.1 Componente: CameraUploader UI
Se creará un componente reutilizable de subida de fotos, adaptado para móvil y web, que ofrezca las opciones:
1. Tomar fotografía con la cámara en vivo.
2. Seleccionar archivo de la galería.

### 5.2 Integración en Módulos
1. **Minutas Operativas (4 tipos)**: Se inyectará el `CameraUploader` al final del flujo de registro. Una vez enviada la minuta (y obtenido su UUID), se lanzará la petición secundaria de subida adjuntándole el `entityId`.
2. **Módulo de Empleados**: En el modal o vista de Detalles del Empleado, se añadirá el uploader circular para foto de perfil.

---

## 6. Criterios de Aceptación
- [ ] Prisma migrado exitosamente con las nuevas relaciones de Empleados.
- [ ] Archivos físicos subidos a AWS S3 bajo la ruta con el formato correcto del tenant.
- [ ] Eliminar una minuta borra automáticamente su registro visual en AWS (Cascade & S3 API Delete).
- [ ] UI de toma de fotos operativa en Frontend.
