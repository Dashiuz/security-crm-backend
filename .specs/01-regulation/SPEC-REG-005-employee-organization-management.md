# SPEC-REG-005: Gestión de Empleados, Departamentos y Cargos

> **Estado**: `COMPLETADO`  
> **Módulo**: `regulation`  
> **Ubicación Backend**: `src/modules/regulation/employee`, `department`, `position`  
> **Ubicación Frontend**: `src/app/(protected)/regulation`  
> **Fecha de Especificación**: 2026-07-30  

---

## 1. Contexto de Negocio e Historias de Usuario

### 1.1 Objetivo
Administrar el talento humano operativo y administrativo de la empresa de seguridad (guardias, supervisores, coordinadores), vinculando su información laboral con la estructura organizacional de departamentos y cargos.

### 1.2 Historias de Usuario
- **US-REG-10**: Como **Gestor del HSEQ / RRHH**, quiero registrar la hoja de vida de un empleado especificando su cédula, nombres, cargo, departamento, tipo de contrato y estado activo.
- **US-REG-11**: Como **Supervisor**, quiero consultar la lista de empleados asignados a mi turno o puesto de control.

---

## 2. Modelo de Datos (Prisma Schema Specification)

### 2.1 Modelos (`employee.prisma`, `department.prisma`, `position.prisma`)

```prisma
model Employee {
  id           String      @id @default(cuid(2))
  tenantId     String
  tenant       Tenant      @relation(fields: [tenantId], references: [id], onDelete: Restrict)
  idNumber     String
  idType       String      @default("CC")
  firstName    String
  lastName     String
  email        String?
  phone        String?
  departmentId String?
  department   Department? @relation(fields: [departmentId], references: [id], onDelete: SetNull)
  positionId   String?
  position     Position?   @relation(fields: [positionId], references: [id], onDelete: SetNull)
  isActive     Boolean     @default(true)

  user         User?

  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  @@index([tenantId])
  @@index([tenantId, idNumber])
  @@map("employee")
}
```

---

## 3. Contrato API REST (NestJS)

- **Controladores**:
  - `EmployeeController` (`src/modules/regulation/employee/employee.controller.ts`)
  - `DepartmentController` (`src/modules/regulation/department/department.controller.ts`)
  - `PositionController` (`src/modules/regulation/position/position.controller.ts`)
- **Servicios**: `EmployeeService`, `DepartmentService`, `PositionService`
- **Endpoints Clave**:
  - `PATCH /employee/:id/retire`: Retira al empleado (`isRetired: true`, `isActive: false`, `retiredAt`) y desactiva en cascada su cuenta de usuario vinculada.
  - `PATCH /employee/:id/reactivate`: Reactiva al empleado (`isRetired: false`, `retiredAt: null`, `isActive: true`).

- **Asignación de Cliente y Sincronización**:
  - Al crear o actualizar un empleado seleccionando su Cliente / Conjunto Residencial (`clientId`), el `EmployeeService` busca automáticamente la cuenta de usuario vinculada (por `document`) y actualiza `user.clientId = employee.clientId`.

---

## 4. Especificación Frontend (Next.js)

- **Ruta**: `src/app/(protected)/administrative/employees`
- **Controles de Formulario & Acciones**:
  - **Campo Cliente / Conjunto**: Selector desplegable en el formulario de creación/edición de empleados.
  - **Dar de Baja**: Disponible para empleados activos. Requiere confirmación tipeando la cédula del empleado en un modal de verificación.
  - **Reactivar Empleado**: Disponible para empleados inactivos/dados de baja. Muestra un icono de persona con signo más y exige la confirmación tipeando el documento del empleado antes de reactivarlo.
