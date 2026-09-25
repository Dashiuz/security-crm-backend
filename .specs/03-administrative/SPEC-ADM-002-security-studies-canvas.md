# SPEC-ADM-002: Estudio de Seguridad con Geofencing (Canva Interactivo)

> **Estado**: `COMPLETADO`  
> **Módulo**: `administrative`  
> **Autor(es)**: Antigravity (AI Architect)  
> **Fecha de Creación**: 2026-09-23  
> **Última Actualización**: 2026-09-23  

---

## 1. Contexto de Negocio e Historias de Usuario

### 1.1 Objetivo
La implementación de la funcionalidad de "Estudio de Seguridad con Geofencing" permite a las empresas de seguridad (Tenants) realizar análisis perimetrales y de riesgos altamente visuales y precisos sobre la infraestructura física de sus clientes. Este módulo fusiona imágenes satelitales estáticas provistas por la API de Mapbox con un motor de renderizado vectorial en el navegador (Konva.js). 

Además de actuar como una herramienta de presentación visual, el sistema exporta el perímetro dibujado (polígono) y lo almacena como datos espaciales (PostGIS) vinculados directamente al Cliente (SSOT). Este geofencing será el pilar fundacional para el futuro módulo operativo de Control de Rondas, garantizando que el personal de seguridad registre sus marcaciones dentro de un perímetro físico validado matemáticamente.

### 1.2 Historias de Usuario (User Stories)
- **US-01**: Como **[Técnico/Supervisor de Seguridad]**, quiero **[ubicar la dirección del cliente en un mapa y capturar una imagen satelital]** para **[usarla como base visual del estudio de seguridad]**.
- **US-02**: Como **[Técnico/Supervisor de Seguridad]**, quiero **[dibujar un polígono perimetral sobre el mapa]** para **[establecer la frontera física (geofencing) del conjunto residencial]**.
- **US-03**: Como **[Técnico/Supervisor de Seguridad]**, quiero **[arrastrar y soltar íconos (cámaras, sensores) y trazar líneas (cercado eléctrico)]** para **[detallar el sistema de seguridad instalado]**.
- **US-04**: Como **[Técnico/Supervisor de Seguridad]**, quiero **[poder acercar (zoom) y mover (pan) el lienzo interactivo]** para **[poder trabajar con precisión en imágenes satelitales de alta resolución sin importar el tamaño de mi pantalla]**.
- **US-05**: Como **[Técnico/Supervisor de Seguridad]**, quiero **[que el sistema guarde mi progreso automáticamente mientras edito (Debounce Autosaver)]** para **[no perder información en caso de interrupción]**.
- **US-06**: Como **[Administrador]**, quiero **[descontinuar un estudio de seguridad obsoleto y crear uno nuevo conservando el polígono perimetral base]** para **[mantener un histórico auditable de las mejoras de seguridad en el cliente]**.

---

## 2. Definición de Permisos y Matriz RBAC

### 2.1 Permisos requeridos
Listar los permisos específicos que deben agregarse en `prisma/seed-features.ts` y requerirse en los controladores NestJS.

| Permiso Code | Nombre Legible | Descripción | Rol por Defecto |
| :--- | :--- | :--- | :--- |
| `sec_study:read` | Lectura de Estudios | Consultar lista y descargar archivos adjuntos | Supervisor, Admin |
| `sec_study:create` | Creación de Estudios | Crear registros base y cargar archivos | Supervisor |
| `sec_study:update` | Edición de Estudios | Modificar metadatos de archivos/estudios | Supervisor, Admin |
| `sec_study:delete` | Eliminación de Estudios | Descontinuar o anular estudios base | Admin |
| `sec_study:manage` | Admin Estudios Base | Control total sobre la gestión documental | Admin, Godlike |
| `canva:read` | Visualización de Canva | Ver estudios gráficos en modo "solo lectura" | Supervisor, Admin |
| `canva:create` | Creación en Canva | Generar imágenes de Mapbox e inicializar lienzo | Supervisor |
| `canva:update` | Edición de Canva | Editar posiciones vectoriales (Konva.js) | Supervisor, Admin |
| `canva:delete` | Eliminación de Canva | Descontinuar gráficas interactivas | Admin |
| `canva:manage` | Admin Canva | Control total sobre el módulo interactivo | Admin, Godlike |

### 2.2 Reglas Multi-Tenant, Arquitectura y Seguridad
- [ ] **Aislamiento S3 Seguro**: La imagen estática generada por Mapbox debe subirse al bucket S3 en la ruta `tenants/{tenantId}/clients/{clientId}/studies/mapbox_{uuid}.jpg`. El frontend **nunca** debe acceder directamente al bucket público; el backend proveerá **Signed URLs** de corta duración (ej. 15 minutos).
- [ ] **Restricción Mapbox Token**: El token público de Mapbox expuesto en el Frontend (`pk...`) debe configurarse en el dashboard de Mapbox con restricciones de HTTP Referrer para evitar robo de cuota.
- [ ] **Aislamiento Obligatorio de Prisma**: El schema `SecurityStudy` obliga al uso de `tenantId` para el *Isolation Sandbox*.
- [ ] **Single Source of Truth (SSOT)**: El polígono geofencing se extrae del estudio aprobado y se guarda en el schema `Client` (PostGIS) para que otros módulos (Rondas) consulten directamente al cliente y no al estudio.
- [ ] **Auditoría**: Modificaciones al geofencing en el cliente y creación/descontinuación de estudios deben rastrearse con el `AuditInterceptor`.

---

## 3. Modelo de Datos (Prisma Schema Specification)

### 3.1 Archivo de Esquemas a Modificar

#### `prisma/schema/clients.prisma` (Modificación)
Añadimos la información espacial y la referencia a la imagen base si se desea que el cliente tenga un perímetro sin requerir un estudio formal completo, o como SSOT cuando se aprueba un estudio.
```prisma
model Client {
  // ... campos existentes ...
  
  // Geofencing & Mapbox Base (SSOT)
  mapboxBaseImageS3Key String? // Si se captura un área pero aún no hay estudio
  // boundary Unsupported("geometry(Polygon, 4326)")? // POSTGIS -> Agregado vía migración raw SQL
  
  // Relaciones
  securityStudies SecurityStudy[]
}
```

#### `prisma/schema/security_studies.prisma` (Nuevo Archivo)
```prisma
model SecurityStudy {
  id              String   @id @default(uuid())
  tenantId        String   
  tenant          Tenant   @relation(fields: [tenantId], references: [id], onDelete: Restrict)
  
  clientId        String
  client          Client   @relation(fields: [clientId], references: [id], onDelete: Restrict)

  // Referencias a la Imagen Base (Generada por Mapbox API)
  baseImageS3Key  String   
  mapboxCenterLat Float
  mapboxCenterLng Float
  mapboxZoom      Float
  
  // Bounding Box para los cálculos Matemáticos del Canva (Vital)
  mapboxBboxMinLat Float
  mapboxBboxMinLng Float
  mapboxBboxMaxLat Float
  mapboxBboxMaxLng Float

  // El motor vectorial
  canvasState     Json     @db.JsonB 
  
  status          SecurityStudyStatus @default(CURRENT) // CURRENT | DISCONTINUED
  version         Int                 @default(1)

  // Trazabilidad Estándar
  createdAt       DateTime @default(now())
  createdById     String?
  createdBy       User?    @relation("StudyCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)

  updatedAt       DateTime @updatedAt
  updatedById     String?
  updatedBy       User?    @relation("StudyUpdatedBy", fields: [updatedById], references: [id], onDelete: SetNull)

  @@index([tenantId])
  @@index([clientId])
  @@map("security_studies")
}

enum SecurityStudyStatus {
  CURRENT
  DISCONTINUED
}
```
*Nota: La activación de la extensión PostGIS y la columna `boundary geometry(Polygon, 4326)` en la tabla `Client` requerirán una migración SQL en crudo (`npx prisma migrate dev --create-only`).*

---

## 4. Contrato de API REST & Backend Specification (NestJS)

### 4.1 Ubicación en Backend
- Módulo: `src/modules/administrative/security-studies`
- Integraciones: Uso del `S3KeyFactory` y el servicio de AWS S3 existente.

### 4.2 Lógica de Negocio Crítica (Cálculo Web Mercator / Bounding Box)
El servicio backend que recibe las coordenadas desde la "Mapbox Geocoding API" del frontend debe solicitar la imagen estática a Mapbox utilizando un **Bounding Box** en lugar de un `center+zoom`, o calcular matemáticamente las 4 esquinas generadas por el `center+zoom` y las dimensiones `(Width x Height)`. Estas 4 coordenadas se guardan en el schema `SecurityStudy` (`mapboxBbox...`) para que el frontend pueda interpolar píxeles a GPS con exactitud.

### 4.3 Endpoints REST Principales

#### `POST /api/v1/administrative/security-studies/generate-base`
- **Permiso**: `canva:create`
- **Body**: `{ clientId, lat, lng, zoom, width, height }`
- **Flujo**: 
  1. Descarga imagen desde API Mapbox.
  2. Calcula Bounding Box si es necesario.
  3. Sube a S3 y retorna la clave y las coordenadas.

#### `PATCH /api/v1/administrative/security-studies/:id/canvas`
- **Permiso**: `canva:update`
- **Body**: `{ canvasState: JSON }`
- **Flujo**: Actualiza el campo `JSONB`. Este endpoint será golpeado por el **Debounce Autosaver**.

#### `POST /api/v1/administrative/security-studies/:id/approve-perimeter`
- **Permiso**: `canva:manage`
- **Flujo**: Extrae el polígono del `canvasState`, lo transforma a una sentencia SQL PostGIS (`ST_GeomFromGeoJSON`) y actualiza la tabla `Client` en su columna `boundary`.

#### `GET /api/v1/administrative/security-studies/:id/image-url`
- **Permiso**: `canva:read`
- **Flujo**: Retorna una URL prefirmada de S3 válida por 15 minutos para que Konva.js pueda instanciar la imagen de fondo sin exponer el bucket.

---

## 5. Especificación Frontend (Next.js App Router)

### 5.1 Componentes UI/UX Críticos
- **Motor de Renderizado**: Se utilizará `react-konva`.
- **Estructura de Capas**:
  1. `Layer Base`: Contiene la imagen de Mapbox.
  2. `Layer Geofencing`: Polígono perimetral con cálculo de coordenadas.
  3. `Layer Instalaciones`: Polígonos de cerca eléctrica o muros.
  4. `Layer Dispositivos`: Nodos arrastrables (Cámaras, Sensores, Porterías).
- **Sistema de Paneo/Zoom**: 
  - La herramienta implementará `draggable` en el `Stage` de Konva.
  - El scroll del ratón modificará la propiedad `scaleX` y `scaleY` del Stage, no de la imagen. La interpolación de coordenadas entre la pantalla y la imagen se ajustará usando la fórmula `(pointerPosition - stagePosition) / stageScale`.
- **Debounce Autosaver**: Hook custom de React (`useDebounce`) que dispare el `PATCH /canvas` 1.5 a 2 segundos después de la última modificación en Konva. Mostrará un indicador "Guardando..." -> "Guardado en la nube" para tranquilidad del usuario.
- **Acceso Modular**: En la tabla del componente "Clientes", la columna de "Acciones" revelará si el cliente tiene estudios vigentes o si requiere un Setup inicial. Si el estudio está `DISCONTINUED`, se pasa un prop `isReadOnly={true}` al componente de Konva, que remueve los listeners de drag&drop y apaga la barra de herramientas.

---

## 6. Criterios de Aceptación y Matriz de Verificación

- [x] **Precisión Matemática**: Al posicionar un ícono en un extremo de la imagen, su coordenada calculada `(Lat/Lng)` corresponde con alta precisión a la realidad de Mapbox (Validado con suite de tests unitarios Web Mercator).
- [x] **Persistencia y Responsividad**: El `JSONB` se guarda correctamente con el Autosaver y al recargar la página, el lienzo se restaura idéntico. Paneo y zoom aplicados al Stage de Konva.
- [x] **Seguridad Mapbox**: Token configurado para entorno controlado y referrers.
- [x] **Seguridad S3**: Todas las descargas de imágenes se hacen a través de Signed URLs de 15 minutos generadas dinámicamente por el backend.
- [x] **Integridad SSOT (PostGIS / Client)**: El guardado del perímetro perimetral se inyecta como GeoJSON y columna PostGIS en la base de datos PostgreSQL, garantizando la fuente única de verdad para el futuro módulo de Rondas.
