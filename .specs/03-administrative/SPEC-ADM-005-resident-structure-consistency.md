# SPEC-ADM-005: Consistencia de Datos en Estructura y Residentes

> **Estado**: `COMPLETADO`  
> **Módulo**: `administrative`  
> **Autor(es)**: `AI Architect`  
> **Fecha de Creación**: `2026-09-16`  
> **Fecha de Finalización**: `2026-09-16`  

---

## 1. Contexto de Negocio e Historias de Usuario

### 1.1 Objetivo
Garantizar la consistencia de los datos relacionales entre las Unidades Habitacionales (Apartamentos/Casas) y los Residentes, particularmente durante el proceso de importación masiva CSV. Asimismo, unificar el origen de datos para los filtros de Torres en el frontend, asegurando que utilicen la base de datos relacional y reflejen la realidad operativa del conjunto.

### 1.2 Historias de Usuario (User Stories)
- **US-01**: Como **Administrador**, quiero **que el sistema rechace la importación de residentes si no he creado la estructura física del conjunto**, para **evitar la creación de residentes huérfanos o con unidades inconsistentes**.
- **US-02**: Como **Administrador**, quiero **que el filtro de torres funcione correctamente en todas las vistas**, para **encontrar rápidamente a los residentes de una torre específica**.

---

## 2. Definición de Permisos y Matriz RBAC
- Se mantienen los permisos actuales (`resident:create`, `resident:manage`, `client:manage`). No se requieren nuevos permisos en la matriz.

---

## 3. Modelo de Datos (Prisma Schema Specification)
- No hay cambios estructurales en el esquema de Prisma.
- Se mantiene el uso del campo `structureConfig` (`JsonB`) en el modelo `ClientProperties`, pero se modificará el proceso de guardado para inyectarle el `tower.id` (CUID generado por la tabla `Tower`) durante su construcción, manteniendo así la consistencia bidireccional de datos.

---

## 4. Contrato de API REST & Backend Specification (NestJS)

### 4.1 Cambios en `ResidentService` (`src/modules/administrative/resident/services/resident.service.ts`)
- **Validación de Existencia de Estructura**: Al iniciar la importación CSV, se validará si `existingUnits.length === 0`. De ser cierto, se lanzará una `BadRequestException` bloqueando la importación de tajo.
- **Strict Matching de Unidades**: Al recorrer el CSV, se buscará una coincidencia estricta (ignorando espacios en blanco) del nombre provisto en el archivo con los existentes en la base de datos.
- **Eliminación de Auto-creación ("Strict Mode")**: Se removerá la lógica de conveniencia que crea unidades en caliente (`this.prisma.unit.create(...)`). Si la unidad no existe en la base de datos previamente generada, se emitirá un error específico para esa fila indicando la inconsistencia tipográfica o de pre-existencia.

### 4.2 Cambios en `ClientStructureGeneratorService` (`src/modules/administrative/client/services/client-structure-generator.service.ts`)
- **Inyección de ID Relacional al JSON**: Durante la iteración de creación de torres (instrucciones `tx.tower.create`), se asignará el CUID generado a la definición temporal del objeto JSON que terminará guardándose en el campo `structureConfig` (ej. asignando `tDef.id = tower.id`).
- Esto asegura que el JSON de configuración posea la llave relacional que apunta a la tabla SQL, cumpliendo con la necesidad de consistencia solicitada.

---

## 5. Especificación Frontend (Next.js App Router)

### 5.1 Cambios en Filtros UI (`src/app/(protected)/administrative/clients/[id]/page.tsx` y `my-residents/page.tsx`)
- Se homologó el origen de los datos del selector de Torres.
- En vez de acceder ciegamente al JSON de configuración (`data.properties.structureConfig.towers`), se extrae la lista de torres directamente de los modelos SQL traídos desde el backend (`data.towers`), alineando su comportamiento al de la vista `my-residents/page.tsx`.
- Esto habilita el funcionamiento del filtro, ya que la condición lógica `r.unit?.tower?.towerName` compara contra entidades SQL reales de forma case y whitespace-insensitive.

---

## 6. Criterios de Aceptación y Matriz de Verificación
- [x] La carga de un CSV de residentes en un conjunto sin estructura arroja una excepción 400 antes de procesar ninguna fila.
- [x] Si el CSV contiene unidades con errores tipográficos, la carga masiva falla para esa fila específica y reporta el error sin crear apartamentos fantasmas.
- [x] El JSON `structureConfig` guardado en la base de datos tras generar la estructura de un cliente contiene los atributos `"id": "cuid..."` en cada objeto de torre.
- [x] El filtro de Torres en `/administrative/clients/[id]` se llena con los datos provenientes de la relación SQL.
- [x] Al seleccionar una torre, el frontend oculta a los residentes que no pertenecen a esa torre, confirmando el arreglo del bug en ambas interfaces.
