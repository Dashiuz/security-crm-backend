# SPEC-ADM-015: Refactor Modular del Módulo de Clientes, Paridad Total Creación-Edición, Carga Real de Medios y Corrección de Formato de Unidades

> **Estado**: `IMPLEMENTADO Y VALIDADO`  
> **Módulo**: `administrative / clients`  
> **Autor(es)**: `Software Architect & Senior Fullstack Engineer`  
> **Fecha de Creación**: `2026-10-14`  
> **Última Actualización**: `2026-10-14`  

---

## 1. Contexto y Objetivos

### 1.1 Diagnóstico de la Situación Actual
1. **Monolito en Creación de Clientes (`clients/new/page.tsx`)**:
   - El archivo supera las 1,950 líneas de código, centralizando 5 pasos con estados masivos, validaciones cruzadas y funciones simuladas (`dummy`).
   - Esto viola los principios de responsabilidad única y modularidad del SDD, e impide la reutilización de las secciones en las vistas de edición.
2. **Desfase Crítico entre Creación y Edición (Falta de Paridad)**:
   - Al crear un cliente, el usuario define 6 puntos de acceso, 12 áreas comunes/servicios, contactos administrativos adicionales y vocales del consejo.
   - Al editar el cliente en `clients/[id]/operations` y `clients/[id]/legal`, la interfaz se reducía drásticamente (solo 2 accesos y 10 amenidades visibles), y desaparecían por completo las secciones de contactos adicionales de administración y vocales del consejo.
3. **Cargas de Archivo "Dummy"**:
   - Tanto los accesos físicos (`entriesMediaFiles`) como los soportes contractuales (`contractMediaFiles`) asignaban nombres simulados (`foto_entrada_...jpg (adjuntada)`, `documento_...pdf (cargado)`) en lugar de interactuar con el servicio de almacenamiento existente (`StorageApi.uploadMedia`).
4. **Definición de Torres**:
   - Al agregar una nueva torre, los datos numéricos (pisos, aptos/piso, ascensores) se reiniciaban a valores fijos arbitrarios en vez de clonar los datos numéricos de la última torre configurada.
5. **Amenidades y Bicicleteros**:
   - Falta de opción para "Parqueadero de Motos".
   - Ausencia de Canchas de Squash y Baloncesto en la edición.
   - Ambigüedad en la definición de "Bicicleteros" (se requiere registrar módulos/estaciones y la capacidad de bicicletas por módulo para dar claridad al usuario).
6. **Error de Duplicidad en Directorio de Residentes**:
   - En `clients/[id]/residents/page.tsx`, la columna "Inmueble / Unidad" muestra `"Torre 3 - Torre 3 - 601"` debido a que `unit.unitName` ya contiene el prefijo de la torre y el renderizador le anteponía nuevamente `unit.tower.towerName`.

---

## 2. Requerimientos Funcionales y Técnicos

### 2.1 Requerimiento 1: Modularización de Steps / Tabs y Justificación de Datos
- **Arquitectura de Componentes**:
  - `src/components/clients/ClientLocationStep.tsx`: Información básica, sector, NIT, dirección, ciudad, CAI, cuadrante, contactos.
  - `src/components/clients/ClientStructureStep.tsx`: Tipología física, definición de torres/edificios/casas, control de accesos con carga de fotos reales y amenidades completas.
  - `src/components/clients/ClientContractStep.tsx`: Fechas contractuales, prórroga, coordinadores/comerciales y 8 tipos de adjuntos con carga y visualización real.
  - `src/components/clients/ClientAdministrationStep.tsx`: Tipo de administración (Individual vs Empresa Externa) con soporte dinámico e ilimitado para contactos adicionales.
  - `src/components/clients/ClientCouncilStep.tsx`: Presidente, Tesorero y soporte dinámico e ilimitado para otros miembros/vocales del consejo.
- **Justificación del Envío de Datos**:
  - La consolidación de datos mantiene el contrato de API existente `CreateClientDto`, `UpdateClientDto`, `UpdateClientOperationsDto` y `UpdateClientLegalDto`. Al desacoplar la lógica de presentación en componentes controlados reutilizables, las pantallas de edición consumen los mismos componentes o sub-componentes, garantizando consistencia y eliminando código duplicado.

### 2.2 Requerimiento 2: Paridad y Control de Accesos
- **2.1 Actualización de Opciones de Acceso**:
  - Opción 1: `"1. Entrada Principal (Peatonal)"` (con captura de evidencia fotográfica al activarse).
  - Opción 2: `"2. Vehicular separada para entrada y salida"` (con captura de evidencia fotográfica al activarse).
  - Opción 3: `"3. Vehicular compartida para entrada y salida"` (con captura de evidencia fotográfica al activarse).
  - Opción 4: `"4. Entrada exclusiva mascotas"` (con captura de evidencia fotográfica al activarse).
  - Opción 5: `"5. Entrada exclusiva domiciliarios"` (con captura de evidencia fotográfica al activarse).
  - Opción 6: `"6. Entrada compartida para mascotas y domiciliarios"` (con captura de evidencia fotográfica al activarse).
  - Opción 7 (Nueva): `"7. Sin entradas exclusivas"`. Al activarse, deshabilita y limpia automáticamente las opciones 4, 5 y 6.
  - *Regla general*: Todas las opciones de entrada (1 a 6) despliegan el botón para adjuntar su respectiva evidencia fotográfica cuando son seleccionadas.
- **2.2 Integración Real de Almacenamiento**:
  - Reemplazar funciones mock por invocaciones a `StorageApi.uploadMedia`.
  - En backend (`StorageService.uploadMedia`), permitir la subida de adjuntos temporales durante la creación sin requerir una clave foránea existente a `Client`.
  - En la interfaz, utilizar mensajes limpios orientados al usuario ("Subiendo fotografía...", "Foto adjuntada") sin revelar proveedores de infraestructura en la nube.

### 2.3 Requerimiento 3: Duplicación Inteligente en Torres
- Al presionar `+ Agregar Torre`:
  - Nombre: Autoincremental basado en la secuencia (`Torre N+1` o similar).
  - Campos Numéricos: Clonar automáticamente `floorsAmount`, `apartmentsPerFloor` y `elevators` de la última torre de la lista.

### 2.4 Requerimiento 4: Áreas Comunes, Parqueaderos y Bicicleteros
- **Parqueadero de Motos**: Agregar `hasMotorcycleParking` y `motorcycleParkingAmount`.
- **Bicicleteros (Solución UI/UX Clara)**:
  - Definir:
    - `hasBicycleRack`: Switch de activación.
    - `bicycleRackAmount`: Cantidad de áreas / módulos de bicicleteros (ej. 4).
    - `bicycleCapacityPerRack`: Capacidad en bicicletas por cada bicicletero (ej. 10).
    - Chip / Resumen visual: *"Capacidad total: 40 bicicletas (4 bicicleteros × 10 puestos c/u)"*.
- **Paridad Total de Amenidades**: 13 amenidades disponibles exactamente igual en creación y en edición (`clients/[id]/operations`).

### 2.5 Requerimiento 5: Soportes Contractuales Reales
- Soporte para subir archivos reales (PDF / imagen) en los 8 tipos de documento contractual:
  - Estados Financieros, Representación Jurídica, Orden de Servicio, Contrato, Otro Sí, BASC, Pólizas, Contratos de Tecnología.
  - Almacenar la referencia con Presigned URL para descarga o previsualización.

### 2.6 Requerimiento 6: Contactos Adicionales de Administración en Edición
- En `clients/[id]/legal`, cuando la administración es `ENTERPRISE`, habilitar la lista dinámica para agregar, editar y eliminar contactos adicionales (Cargo, Nombre, Cédula, Correo, Teléfono).

### 2.7 Requerimiento 7: Vocales del Consejo en Edición
- En `clients/[id]/legal`, habilitar la lista dinámica para agregar, editar y eliminar vocales / otros miembros del consejo (Nombre, Teléfono, Correo, Unidad).

### 2.8 Requerimiento 8: Corrección en Directorio de Residentes
- En `src/app/(protected)/administrative/clients/[id]/residents/page.tsx`, corregir el renderizado de la unidad:
  - Si `unit.unitName` ya incluye o empieza por `tower.towerName`, renderizar únicamente `unit.unitName`.
  - Si no lo contiene, concatenar `${tower.towerName} - ${unit.unitName}`.

---

## 3. Plan de Verificación y Testing

1. **Backend**:
   - `npm run test`: 27 test suites pasados, 140/140 tests unitarios y de integración exitosos (100% verde).
   - `npx prisma db push` & `npx prisma generate`: Esquema de Prisma sincronizado con soporte para `hasMotorcycleParking`, `motorcycleParkingAmount` y `bicycleCapacityPerRack`.
   - Soporte desacoplado en `StorageService` para subida de medios en `entityId === 'new'` / `'temp'`.
2. **Frontend**:
   - `npx tsc --noEmit`: 0 errores de tipado en TypeScript.
   - `npm run build`: Compilación exitosa en Turbopack de las 33 rutas de la aplicación Next.js.
   - Paridad total del 100% entre creación (`clients/new`) y edición (`clients/[id]/operations` y `clients/[id]/legal`).
   - Carga real de imágenes en las 6 opciones activas de acceso físico y en los 8 soportes contractuales sin menciones a marcas de infraestructura cloud.
