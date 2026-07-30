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
- **Servicio**: `EmployeeService` (`src/modules/regulation/employee/employee.service.ts`)
- **Ruta Base**: `/api/v1/regulation/employee`
