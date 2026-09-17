# SPEC-OPE-007: Mejoras Avanzadas en Minutas y Controles (Filtros, Debounce y Novedades)

> **Estado**: `COMPLETADO`  
> **Módulo**: `operation`  
> **Autor(es)**: `Arquitecto AI`  
> **Fecha de Creación**: `2026-09-09`  
> **Última Actualización**: `2026-09-10`  

---

## 1. Contexto de Negocio e Historias de Usuario

### 1.1 Objetivo
Esta especificación define la implementación de filtros avanzados (por fecha, unidad, residente y texto libre seguro), la optimización de carga mediante autocompletado con `debounce` bidireccional para Unidades y Residentes, y la ampliación de campos de recolección en Minuta General (puesto y origen) y Parqueaderos (confirmación de salida y registro relacional de unidad/residente). Esto asegura que el sistema escale eficientemente al manejar miles de residentes sin degradar el rendimiento del frontend ni del backend.

### 1.2 Historias de Usuario (User Stories)
- **US-01**: Como **Guardia de Seguridad**, quiero registrar el `puesto/ubicación` y `origen de la novedad` en la Minuta General, vinculándolo opcionalmente a un residente, para tener un contexto exacto del incidente.
- **US-02**: Como **Guardia de Seguridad**, quiero tener confirmación y la opción de adjuntar otra foto al marcar la salida en Visitas y Parqueaderos para evitar cierres accidentales y mantener evidencia.
- **US-03**: Como **Guardia de Seguridad o Usuario Administrativo**, quiero buscar y filtrar novedades por fecha y texto, o filtrar controles por residente/unidad, para auditar, consultar y generar reportes precisos en tiempo real desde el puesto o la administración.
- **US-04**: Como **Sistema**, quiero cargar la lista de apartamentos y residentes dinámicamente según lo que escribe el guardia (debounce), para evitar bloqueos por sobrecarga de datos.

---

## 2. Definición de Permisos y Matriz RBAC

No se requieren permisos nuevos. Se reutilizan los permisos existentes `minuta:create`, `minuta:read`, `minuta:update`, y los permisos de lectura de administrativos subyacentes donde sea necesario o delegado por `minuta:create`.

---

## 3. Modelo de Datos (Prisma Schema Specification)

### 3.1 `minuta.prisma`
```prisma
  // Nuevos campos
  guardPost        String?  // Ej: 'Recepción', 'Vehicular', etc.
  isResidentLinked Boolean  @default(false)
  noveltySource    String?  // Para cuando NO está vinculado a un residente
  
  unitId     String?
  unit       Unit?      @relation(fields: [unitId], references: [id], onDelete: SetNull)
  residentId String?
  resident   Resident?  @relation(fields: [residentId], references: [id], onDelete: SetNull)
  
  // Índices sugeridos para filtrado rápido
  @@index([tenantId, unitId])
  @@index([tenantId, residentId])
```

### 3.2 `parking_resident_vehicle_control.prisma`
```prisma
  // Nuevos campos relacionales
  unitId     String?
  unit       Unit?      @relation(fields: [unitId], references: [id], onDelete: SetNull)
  residentId String?
  resident   Resident?  @relation(fields: [residentId], references: [id], onDelete: SetNull)

  @@index([tenantId, unitId])
  @@index([tenantId, residentId])
```

---

## 4. Contrato de API REST & Backend Specification (NestJS)

### 4.1 Endpoints de Autocompletado (Debounce)
- **`GET /api/v1/administrative/unit/autocomplete`**
  - Query: `q` (texto), `limit` (default 15).
  - Incluye: `residents: { select: { id, firstName, lastName, document } }`.
- **`GET /api/v1/administrative/resident/autocomplete`**
  - Query: `q` (texto), `limit` (default 15).
  - Incluye: `unit: { select: { id, unitName } }`.

### 4.2 Actualización de DTOs
- `CreateMinutaDto`: Añadir `guardPost` (IsString, IsOptional), `isResidentLinked` (IsBoolean), `noveltySource` (IsString, IsOptional), `unitId` (IsUUID, IsOptional), `residentId` (IsUUID, IsOptional).
- `CreateParkingControlDto`: Añadir `unitId`, `residentId`.
- Query DTOs (para `findAll`): Añadir `startDate`, `endDate`, `search` (para texto), `unitId`, `residentId`.

---

## 5. Especificación Frontend (Next.js App Router)

### 5.1 Minuta General
- **Modal de Registro**:
  - Dropdown `Puesto / Ubicación`.
  - Toggle `¿Novedad vinculada a un residente?`.
  - Si Toggle=On: Componente `AsyncAutocomplete` buscando en `/autocomplete` de Units/Residents. Sincronización cruzada.
  - Si Toggle=Off: Input de texto plano "Fuente / Origen".

### 5.2 Control Visitas y Parqueaderos (Salida)
- **Modal de Confirmación de Salida**: Un diálogo `AlertDialog` que pregunta "¿Estás seguro de marcar la salida?".
- **Modal de Foto de Salida**: Si el usuario acepta, se muestra un paso opcional para tomar/subir foto de salida (reutilizando `<ImageUploadCapture />`).

### 5.3 Tabla Parqueadero
- Añadir columna **Fecha** (formateando el campo `date`).
- Añadir columnas **Unidad** y **Residente** resueltas de las nuevas relaciones.

---

## 6. Criterios de Aceptación y Matriz de Verificación
- [x] Base de Datos: `prisma generate` y migraciones ejecutadas con índices optimizados sin dañar datos existentes.
- [x] Rendimiento: Peticiones de autocomplete implementadas con debounce de 500ms y límite de 15 resultados.
- [x] Sinergia UI: Selección bidireccional entre Unidades y Residentes con precarga sin peticiones redundantes.
- [x] Filtrado: Barra de búsqueda y filtros reactiva disponible tanto para Guardas de Seguridad como para Usuarios Administrativos.
- [x] Flujos de Salida: Modal de confirmación y captura opcional de fotografía de salida en Visitas y Parqueaderos.
- [x] Compilación: Backend y Frontend compilados con 0 errores de TypeScript y empaquetado Next.js verificado.
