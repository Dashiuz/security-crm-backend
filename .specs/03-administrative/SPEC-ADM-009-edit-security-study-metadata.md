# SPEC-ADM-009: Edición de Nombre y Descripción en Estudios de Seguridad

## 1. Contexto y Justificación
Actualmente, los estudios de seguridad permiten crear títulos y descripciones al momento de su inicialización, pero no existía un mecanismo para que los técnicos o administradores editaran estos datos posteriormente en caso de correcciones, cambios de alcance o notas periciales adicionales.
Adicionalmente, se requiere remover el botón de "Aprobar Geofencing" en el modo estudio del Canva para consolidar la separación de responsabilidades con el módulo de Geofencing del Cliente.

## 2. Requerimientos

### 2.1. Backend: Endpoint de Actualización Parcial
- **DTO (`UpdateSecurityStudyDto`):**
  ```typescript
  export class UpdateSecurityStudyDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    description?: string;
  }
  ```
- **Controlador (`SecurityStudiesController`):**
  - Endpoint: `PATCH administrative/security-studies/:id`
  - Decoradores de seguridad:
    - `@RequireFeature('sec_study')`
    - `@RequirePermissions('sec_study:manage', 'sec_study:update')`
- **Servicio (`SecurityStudiesService`):**
  - Método `update(id: string, dto: UpdateSecurityStudyDto)`
  - Validar que el estudio exista y no esté eliminado suavemente (`deletedAt: null`).
  - Actualizar `name` (si se envía y no está vacío) y `description`.
  - Retornar el estudio actualizado con su `baseImageUrl` prefirmada.

### 2.2. Frontend: Interfaz de Edición de Información
- En la página de estudios de seguridad del cliente (`/administrative/clients/[id]/security-studies`):
  - Añadir botón o ícono de edición junto al título de cada tarjeta de estudio o en su barra de acciones.
  - Abrir un modal (`Dialog`) precargado con el nombre y descripción actuales.
  - Al guardar: consumir el endpoint `PATCH /administrative/security-studies/:id`.
  - Notificar éxito y actualizar el estado local (`fetchStudies()`).

### 2.3. Frontend: Canva Study Mode
- En `SecurityCanvasEditor.tsx`, el botón `Aprobar Geofence` solo debe renderizarse cuando `mode === "geofence"`, manteniéndose oculto en `mode === "study"`.

## 3. Criterios de Aceptación
1. **CA1:** En `SecurityCanvasEditor` con `mode="study"`, no aparece el botón verde de "Aprobar Geofencing".
2. **CA2:** El endpoint `PATCH administrative/security-studies/:id` permite actualizar el nombre y la descripción de un estudio existente.
3. **CA3:** Si se intenta enviar un nombre vacío o con puros espacios, el backend rechaza la solicitud con un error 400 (`BadRequestException`).
4. **CA4:** El usuario puede hacer clic en "Editar" en cualquier tarjeta de estudio para modificar su nombre y descripción en un diálogo modal.
5. **CA5:** Tras guardar los cambios, la tarjeta del estudio refleja inmediatamente el nuevo título y descripción sin recargar la página.

## 4. Archivos Impactados
* **Backend:**
  - `src/modules/administrative/security-studies/dtos/update-security-study.dto.ts` (Nuevo)
  - `src/modules/administrative/security-studies/services/security-studies.service.ts`
  - `src/modules/administrative/security-studies/controllers/security-studies.controller.ts`
  - Pruebas unitarias correspondientes (`.spec.ts`).
* **Frontend:**
  - `src/components/security-studies/SecurityCanvasEditor.tsx` (Remoción del botón en mode study - Completado).
  - `src/app/(protected)/administrative/clients/[id]/security-studies/page.tsx` (Modal y botón de edición).

## 5. Estado de Implementación
- [x] Remover botón "Aprobar Geofence" en `mode="study"` en [SecurityCanvasEditor.tsx](file:///d:/projects/security-crm-frontend/src/components/security-studies/SecurityCanvasEditor.tsx).
- [x] Crear DTO [update-security-study.dto.ts](file:///d:/projects/security-crm-backend/src/modules/administrative/security-studies/dtos/update-security-study.dto.ts).
- [x] Implementar método `update` en [security-studies.service.ts](file:///d:/projects/security-crm-backend/src/modules/administrative/security-studies/services/security-studies.service.ts).
- [x] Implementar endpoint `PATCH :id` en [security-studies.controller.ts](file:///d:/projects/security-crm-backend/src/modules/administrative/security-studies/controllers/security-studies.controller.ts).
- [x] Actualizar e incorporar pruebas unitarias en servicio y controlador backend (25/25 tests passing).
- [x] Integrar botón de edición modal y lógica de guardado en [page.tsx](file:///d:/projects/security-crm-frontend/src/app/(protected)/administrative/clients/[id]/security-studies/page.tsx).
- [x] Validación estática en Frontend con TypeScript (`npx tsc --noEmit` exitoso con 0 errores).
