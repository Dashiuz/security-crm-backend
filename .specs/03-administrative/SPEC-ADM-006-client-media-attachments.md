# SPEC-ADM-006: Sincronización de Archivos Multimedia en Clientes (AWS S3)

> **Estado**: `IMPLEMENTADO`  
> **Módulo**: `administrative`  
> **Autor(es)**: Antigravity  
> **Fecha de Creación**: 2026-09-17  
> **Última Actualización**: 2026-09-17  

---

## 1. Contexto de Negocio e Historias de Usuario

### 1.1 Objetivo
El objetivo de esta funcionalidad es reemplazar las cargas simuladas (dummy functions) de imágenes y documentos en el módulo de clientes, por integraciones reales con el módulo de almacenamiento en AWS S3 del backend. Adicionalmente, se agrega la capacidad de subir múltiples "Otros Archivos" contractuales.

### 1.2 Historias de Usuario (User Stories)
- **US-01**: Como **Administrador/Coordinador**, quiero **subir fotos de las entradas y áreas comunes** para **tener evidencia física del esquema del cliente guardada en la nube**.
- **US-02**: Como **Administrador/Coordinador**, quiero **subir el contrato principal, RUT, Cámara de Comercio, Póliza y otros documentos múltiples** para **centralizar toda la documentación legal del cliente en un solo lugar**.
- **US-03**: Como **Administrador/Coordinador**, quiero **poder visualizar y eliminar los documentos adjuntos antes de guardar los cambios** para **corregir errores durante la creación o edición del cliente sin dejar archivos huérfanos en S3**.

---

## 2. Definición de Permisos y Matriz RBAC

### 2.1 Permisos requeridos
No se requieren permisos nuevos. Se reutilizan los permisos existentes de lectura, creación y actualización de clientes (`client:create`, `client:update`) combinados con la validación de JWT (`JwtAuthGuard`) para acceder a `/storage/upload`.

### 2.2 Reglas Multi-Tenant y Seguridad
- [x] **Aislamiento Obligatorio**: Al usar `/storage/upload`, el backend automáticamente inyecta el `tenantId` en el `MediaAttachment` en Prisma, de modo que cada archivo pertenece de manera rígida al Tenant logueado.
- [x] **Borrado Físico S3**: Cuando un usuario elimina un archivo de la UI usando el ícono de basura, se invocará `DELETE /storage/:id`, el cual eliminará el `MediaAttachment` de la base de datos y borrará físicamente el objeto de S3 mediante el `S3Service`.

---

## 3. Modelo de Datos (Prisma Schema Specification)

No hay modificaciones estructurales a los esquemas de Prisma porque la relación polimórfica en `MediaAttachment` y los campos de `JsonB` ya existen:
- `Client.contractMediaFiles` (JsonB)
- `ClientProperties.entriesMediaFiles` (JsonB)

### 3.1 Estructura del JSON en UI y Prisma
Los campos JsonB guardarán los metadatos de los archivos cargados.

**Ejemplo `entriesMediaFiles`:**
```json
{
  "mainEntry": {
    "mediaId": "cuid123...",
    "fileName": "entrada_principal.jpg",
    "presignedUrl": "https://..."
  }
}
```

**Ejemplo `contractMediaFiles`:**
```json
{
  "contractMain": { "mediaId": "...", "fileName": "...", "presignedUrl": "..." },
  "otherFiles": [
    { "mediaId": "...", "fileName": "...", "presignedUrl": "..." },
    { "mediaId": "...", "fileName": "...", "presignedUrl": "..." }
  ]
}
```

---

## 4. Contrato de API REST & Backend Specification (NestJS)

No se requiere crear nuevos Endpoints, sino consumir los existentes de `StorageController`:

#### `POST /storage/upload` (Form-Data)
- **Cuerpo (FormData)**:
  - `file`: (Binary)
  - `entityType`: "CLIENT"
  - `entityId`: (El ID del cliente actual)
- **Respuesta Esperada**: Objeto de tipo `MediaAttachment` con el ID generado y el `presignedUrl`.

#### `DELETE /storage/:id`
- **Uso**: Se llama cuando el usuario hace clic en el ícono de basurero para un archivo previamente adjunto, para borrarlo permanentemente de S3 y liberar la cuota de almacenamiento.

---

## 5. Especificación Frontend (Next.js App Router)

### 5.1 Ubicación
- `src/app/(protected)/administrative/clients/[id]/page.tsx`

### 5.2 Componentes UI Requeridos
- **Botonera de Subida Oculta**: Sustituir el actual `<Button onClick={handleImagePlaceholder}>` por un mecanismo de `<input type="file" hidden />` gestionado mediante una referencia (`useRef`).
- **Spinner de Carga (Loading)**: Mostrar un indicador mientras el archivo se está enviando a S3 para informar al usuario de la actividad asíncrona.
- **Visualización Rica de Archivos**: Al tener éxito la subida, reemplazar el botón "ANEXAR" por un `<Chip>` o un componente que muestre el nombre real del archivo, un ícono de ojo para abrir el `presignedUrl` en una pestaña nueva, y un icono de "X" o basura para invocar la eliminación (`DELETE`).
- **Multiple Upload Component para "Otros Archivos"**: Un bloque en la pestaña de Contratos que permita iterar sobre `otherFiles`, habilitando subidas repetitivas sin límite.

---

## 6. Criterios de Aceptación y Matriz de Verificación

- [x] Un usuario puede subir fotos a las Entradas y ver el componente actualizado en la UI.
- [x] Un usuario puede subir múltiples "Otros Archivos" en la sección de documentos contractuales.
- [x] El Frontend almacena correctamente el ID del archivo, el nombre y la url temporal de S3 en el estado interno (JSON).
- [x] Al guardar los cambios del cliente, la base de datos registra este JSON actualizado en la tabla `Client` y `ClientProperties`.
- [x] Si un usuario decide borrar un archivo adjunto usando el icono de eliminación, el archivo desaparece del bucket de S3 instantáneamente.
