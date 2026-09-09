# SPEC-ADM-003: Almacenamiento de Configuración Estructural (structureConfig) y Resiliencia CSV

> **Estado**: `APROBADO`  
> **Módulo**: `administrative`  
> **Autor(es)**: Antigravity Architect  
> **Fecha de Creación**: 2026-09-08  
> **Última Actualización**: 2026-09-08  

---

## 1. Contexto de Negocio e Historias de Usuario

### 1.1 Objetivo
Resolver dos inconsistencias críticas en el manejo de las propiedades de los clientes (conjuntos y empresas):
1. La información detallada (nombres de torres, variaciones de pisos, cantidad de ascensores) introducida al generar la estructura física se utilizaba para crear los registros pero no se persistía en un formato integral. Esto causaba que el formulario del Frontend perdiera su estado original al ser consultado nuevamente.
2. La importación masiva de clientes vía archivo CSV no inicializaba el registro relacional en `ClientProperties`, causando un fallo de base de datos (Error P2025) cuando los administradores intentaban editar las características del conjunto desde la UI posteriormente.

### 1.2 Historias de Usuario (User Stories)
- **US-01**: Como **Administrador**, quiero que al configurar la estructura de torres de un cliente, el sistema guarde el JSON de mi configuración exacta para que el formulario se restaure automáticamente en futuras ediciones.
- **US-02**: Como **Administrador**, quiero poder editar propiedades de un cliente que fue creado masivamente vía CSV, sin que el sistema me devuelva un error de transacción abortada.

---

## 2. Definición de Permisos y Matriz RBAC
No se añaden nuevos permisos. Se aplican las reglas vigentes para la actualización de clientes:
- Aislamiento Multi-Tenant (Inyección automática del `tenantId`).
- Permisos estándar de `client:update` o `client:manage`.

---

## 3. Modelo de Datos (Prisma Schema Specification)

### 3.1 Archivo de Esquema
Ubicación: `prisma/schema/client_properties.prisma`

```prisma
model ClientProperties {
  // ... campos existentes (towersAmount, unitsAmount, hasGym, etc.)
  
  // Nuevo campo para persistir la configuración original de la estructura
  structureConfig        Json?                  @db.JsonB
  
  // ... resto del modelo (entradas, auditoría)
}
```

---

## 4. Contrato de API REST & Backend Specification (NestJS)

### 4.1 Cambios en el Backend (Capa de Servicios)
- **`ClientStructureGeneratorService.generateStructure`**: Al finalizar la creación de torres y unidades, inyectará el parámetro `config` (o la sección pertinente del mismo) dentro del nuevo campo `structureConfig` durante la creación del registro en `clientProperties.create`.
- **`ClientService.importClientsFromCsv`**: Se ajustará la lógica del ciclo de carga para insertar automáticamente un registro básico de `ClientProperties` (`structureType: BUILDING_CLUSTER`) por cada cliente creado por CSV. Esto prevendrá el colapso de la operación `update` posterior.

---

## 5. Criterios de Aceptación y Matriz de Verificación

- [ ] **Modelado DB**: Campo `structureConfig` (`Json?`) añadido exitosamente al modelo `ClientProperties`.
- [ ] **Migración**: Reflejo del esquema en base de datos local y remota (Supabase).
- [ ] **Persistencia Estructural**: Comprobar que al enviar un payload con `structureConfig`, la base de datos registra correctamente el JSON.
- [ ] **Resiliencia CSV**: Editar propiedades de un cliente creado tras importar un CSV funciona de manera estable.
