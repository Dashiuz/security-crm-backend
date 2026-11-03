# SPEC-CORE-012: Saneamiento de Integridad, Sincronización RBAC Comercial y Calibración Grid v2

> **Estado**: `IMPLEMENTADO Y VALIDADO`  
> **Fecha**: 2026-10-31  
> **Ámbito**: Backend (`security-crm-backend`) & Frontend (`security-crm-frontend`)  
> **Autores**: Senior Software Architect & Lead Security Engineer  

---

## 1. Resumen Ejecutivo y Motivación

Durante la auditoría preventiva de integridad y consistencia transversal realizada sobre los proyectos de Backend y Frontend de NOXIA CRM, se detectaron los siguientes desfases:

1. **Catálogo RBAC y Permisos en Controladores**:
   - Varios endpoints de los módulos de Gestión Comercial (`commercial/crm`, `commercial/proposals`, `commercial/legal`, `commercial/service-orders`) requieren permisos granulares en `@RequirePermissions` (`commercial:crm:manage`, `commercial:crm:create`, `commercial:crm:update`, `commercial:crm:delete`, `commercial:proposals:manage`, `commercial:proposals:delete`, `commercial:orders:update`, `commercial:orders:dispatch`, `commercial:orders:delete`, `commercial:legal:create`, `commercial:legal:update`, `commercial:legal:delete`) que no estaban registrados en el arreglo de permisos de `prisma/seed.ts`.
   - El controlador `ProspectController` requería el permiso estricto `client:read`, el cual fue reemplazado históricamente por la taxonomía de permisos de ámbito (`client:read_all`, `client:read_assigned`, `client:read_general`).
2. **Estandarización de `Logger.error` (Regla #13)**:
   - En `PayrollBenefitsPdfService`, dos capturas de excepción en la generación vectorial de códigos QR empleaban `this.logger.warn` sin traza de error en lugar de `this.logger.error`.
3. **Compilación TypeScript en Frontend (MUI v6/v7 Grid v2)**:
   - La página de prestaciones sociales `/finance/payroll/benefits/page.tsx` contenía 34 llamadas utilizando la propiedad obsoleta `item` (`<Grid item xs={...}>`), generando 34 errores `TS2769` al compilar con `tsc --noEmit`.
4. **Política Zero-Dialog (Arquetipo E)**:
   - Formularios secundarios en `CanvasProposalWorkspace.tsx` (firmante ad-hoc) y `SalaryMatrixTab.tsx` (confirmación de eliminación de cargo) mantenían el componente modal `<Dialog>`, contraviniendo la regla canónica que exige el uso de `ResponsiveFormDrawer`.

---

## 2. Especificación Técnica de Cambios

### 2.1 Backend

1. **`prisma/seed.ts`**:
   - Registrar los 12 permisos faltantes asignándolos a los roles `ADMIN` y `GODLIKE`.
2. **`ProspectController`**:
   - Actualizar los decoradores `@RequirePermissions` en `findAll` y `findOne` para permitir `'client:manage', 'client:read_all', 'client:read_assigned', 'client:read_general'`.
3. **`PayrollBenefitsPdfService`**:
   - Cambiar `this.logger.warn` a `this.logger.error` agregando traza de pila `(e as Error).stack` en los bloques `catch`.

### 2.2 Frontend

1. **`benefits/page.tsx`**:
   - Migrar todas las propiedades `<Grid item xs={X} sm={Y} md={Z}>` a la sintaxis Grid v2: `<Grid size={{ xs: X, sm: Y, md: Z }}>`.
2. **`CanvasProposalWorkspace.tsx`**:
   - Reemplazar el `<Dialog open={adHocDialogOpen}>` por `<ResponsiveFormDrawer>`.
3. **`SalaryMatrixTab.tsx`**:
   - Reemplazar el `<Dialog open={Boolean(deleteCandidate)}>` por `<ResponsiveFormDrawer>`.

---

## 3. Criterios de Aceptación y Validación

- [x] `prisma validate` exitoso sin errores en Backend.
- [x] `tsc --noEmit` en Backend con 0 errores.
- [x] `npm run lint` en Backend con 0 errores.
- [x] `npm test` en Backend con 100% de suites y pruebas pasando en verde.
- [x] `tsc --noEmit` en Frontend con 0 errores.
- [x] `npm run lint` en Frontend con 0 errores.
- [x] Actualización de `ARCHITECTURE.md`, `backend-rules.md` y `ai-decisions.log`.

