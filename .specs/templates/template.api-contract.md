# CONTRATO API REST: [Nombre del Servicio / Recurso]

> **Especificación asociada**: `[SPEC-OPE-XXX / SPEC-REG-XXX / SPEC-ADM-XXX]`  
> **Base Path**: `/api/v1/[modulo]/[recurso]`  
> **Módulo NestJS**: `[NombreModule]`  

---

## 1. Esquemas de Seguridad y Encabezados Globales

- **Autenticación**: HTTP Bearer JWT (`Authorization: Bearer <token>`)
- **Tenant Context**: Inyectado de forma implícita desde las claims del JWT (`tenantId`) vía `RequestContextService`.
- **Encabezados Requeridos**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <JWT_ACCESS_TOKEN>`

---

## 2. Definición de Endpoints

### 2.1 Crear Registro (`POST /`)

- **Descripción**: Registra una nueva entrada en el sistema asociada al tenant activo.
- **Permisos RBAC**: `[modulo]:manage`, `[modulo]:create`
- **Request DTO (`Create[Recurso]Dto`)**:

```json
{
  "annotation": "Texto descriptivo de la anotación",
  "category": "CATEGORIA_OPCIONAL",
  "priority": 1,
  "tags": ["seguridad", "recorrido"],
  "isConfidential": false
}
```

- **Respuestas Esperadas**:

#### `201 Created`
```json
{
  "id": "clx1234567890",
  "tenantId": "tenant_abc123",
  "date": "2026-07-30T00:00:00.000Z",
  "time": "1970-01-01T17:30:00.000Z",
  "occurredAt": "2026-07-30T17:30:00.000Z",
  "annotation": "Texto descriptivo de la anotación",
  "category": "CATEGORIA_OPCIONAL",
  "priority": 1,
  "tags": ["seguridad", "recorrido"],
  "isConfidential": false,
  "status": "ACTIVE",
  "source": "WEB",
  "createdAt": "2026-07-30T17:30:00.000Z",
  "createdById": "usr_998877",
  "updatedAt": "2026-07-30T17:30:00.000Z",
  "updatedById": "usr_998877"
}
```

#### `400 Bad Request`
```json
{
  "statusCode": 400,
  "message": [
    "annotation must be a string",
    "annotation should not be empty"
  ],
  "error": "Bad Request"
}
```

#### `403 Forbidden`
```json
{
  "statusCode": 403,
  "message": "Forbidden resource: Requires permission [modulo]:create",
  "error": "Forbidden"
}
```

---

### 2.2 Listar Registros Paginados (`GET /`)

- **Descripción**: Obtiene la lista de registros pertenecientes al tenant del usuario autenticado.
- **Permisos RBAC**: `[modulo]:manage`, `[modulo]:read`
- **Query Parameters**:

| Param | Tipo | Requerido | Descripción | Ejemplo |
| :--- | :--- | :--- | :--- | :--- |
| `page` | `number` | No | Número de página (default: 1) | `1` |
| `limit` | `number` | No | Cantidad de registros por página (default: 20) | `20` |
| `search` | `string` | No | Término de búsqueda en anotación | `"novedad"` |
| `startDate` | `string` | No | Fecha filtro inicial (ISO 8601) | `"2026-07-01"` |
| `endDate` | `string` | No | Fecha filtro final (ISO 8601) | `"2026-07-31"` |

- **Respuesta `200 OK`**:

```json
{
  "data": [
    {
      "id": "clx1234567890",
      "annotation": "Texto descriptivo",
      "status": "ACTIVE",
      "createdAt": "2026-07-30T17:30:00.000Z",
      "createdBy": {
        "id": "usr_998877",
        "firstName": "Juan",
        "lastName": "Pérez"
      }
    }
  ],
  "meta": {
    "total": 45,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

---

### 2.3 Obtener Registro por ID (`GET /:id`)

- **Descripción**: Obtiene el detalle completo de un registro por su ID único.
- **Permisos RBAC**: `[modulo]:manage`, `[modulo]:read`
- **Respuesta `200 OK`**: Objeto del recurso completo.
- **Respuesta `404 Not Found`**:
```json
{
  "statusCode": 404,
  "message": "Registro no encontrado en el tenant actual",
  "error": "Not Found"
}
```

---

### 2.4 Anular Registro (`PATCH /:id/void`)

- **Descripción**: Marca un registro como anulado (`VOIDED`), registrando el motivo y el usuario que realiza la acción.
- **Permisos RBAC**: `[modulo]:manage`, `[modulo]:update`
- **Request DTO (`VoidRecordDto`)**:

```json
{
  "voidReason": "Motivo detallado de la anulación del registro en la minuta"
}
```

- **Respuesta `200 OK`**: Objeto actualizado con `status: "VOIDED"`, `voidedAt` y `voidedById`.
