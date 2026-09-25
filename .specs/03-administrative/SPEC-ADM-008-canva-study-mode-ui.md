# SPEC-ADM-008: Canva Study Mode UI/UX Enhancements

## 1. Contexto y Justificación
Durante el proceso de diseño y validación del lienzo de seguridad (`SecurityCanvasEditor`), se identificaron varias oportunidades de mejora en la Experiencia de Usuario (UX) y en la visualización de la información para el modo "Estudio de Seguridad" (`mode="study"`).
Actualmente, el lienzo presenta los siguientes retos:
1. **Saturación Visual:** Los nombres de los dispositivos (labels) se renderizan de forma permanente, lo que oculta partes importantes del mapa cuando hay alta densidad de elementos.
2. **Falta de Estado Operativo:** Los colores actuales de los íconos representan el tipo de dispositivo (ej. cámara ptz vs bala) en lugar de representar su estado operativo (ej. existente, dañado, proyectado). Esto limita la utilidad del mapa para diagnósticos rápidos.

## 2. Requerimientos

### 2.1. Ocultamiento Dinámico de Etiquetas (Labels)
- Por defecto, los componentes `Text` o `Label` de los dispositivos no deben ser visibles en el lienzo.
- El texto solo debe aparecer bajo dos condiciones:
  1. Cuando el dispositivo está **seleccionado** (`selectedElement`).
  2. Cuando el usuario hace **hover** (pasa el ratón) sobre el ícono.
- *Nota técnica:* Se debe implementar un estado temporal (ej. `hoveredDeviceId`) controlado por eventos `onMouseEnter` y `onMouseLeave` del grupo de Konva.

### 2.2. Implementación de Estado Operativo (Status)
- Se debe extender el modelo/interfaz de `CanvasDevice` para incluir un campo `status`.
  ```typescript
  status: "EXISTING" | "DAMAGED" | "PLANNED";
  ```
- **Código de Colores:** Los íconos base deben usar un fondo circular que responda al estado del equipo, y no a su tipo.
  - `EXISTING` (Existente): Verde (`#10b981` o color success de la paleta).
  - `DAMAGED` (Dañado/Inoperativo): Rojo (`#ef4444` o color error).
  - `PLANNED` (A implementar): Azul (`#3b82f6` o color primary/info).

### 2.3. Interfaz de Selección de Estado
- **En la Barra de Herramientas (Creación):** Agregar un selector (radio buttons, tabs, o paleta de colores pequeña) debajo de los tipos de equipo. Al hacer clic en el mapa para añadir un equipo, este debe tomar el estado seleccionado por el usuario.
- **En el Dispositivo Seleccionado (Edición):** Cuando un dispositivo esté seleccionado (el mismo estado que muestra la "x" de eliminación), se debe permitir cambiar su estado a través de pequeños botones cerca del ícono o dentro de un pequeño menú contextual.

### 2.5. Estado Operativo y Nuevos Trazos en Cerramientos (Facilities)
- Extender la interfaz `CanvasFacilityLine` para incluir el estado operativo `status`:
  ```typescript
  export interface CanvasFacilityLine {
    id: string;
    type: "electric_fence" | "perimeter_wall" | "motion_barrier";
    status?: DeviceStatus;
    points: number[];
  }
  ```
- **Diferenciación de tipos de trazo por patrón de línea (`dash`):**
  - `perimeter_wall` (Muro / Cerramiento físico): **Línea sólida**.
  - `electric_fence` (Cercado eléctrico): **Línea de rayas** (`dash: [14, 7]`).
  - `motion_barrier` (Sensor de movimiento / barrera fotoeléctrica perimetral por trazos): **Línea de puntitos** (`dash: [4, 8]`).
- **Colorimetría de trazos dictada por el estado operativo:**
  - 🟢 Verde (`#10B981`): Existente.
  - 🔵 Azul (`#3B82F6`): A implementar / Nuevo negocio.
  - 🔴 Rojo (`#EF4444`): Dañado / Inoperativo.
- **Cambio de estado:** Permitir alternar el estado de cualquier tramo seleccionado desde la barra superior de acciones contextuales.
- **Herramienta en Toolbar:** Añadir el botón para trazar "Sensor de Movimiento (Trazos)" en la barra lateral izquierda.

### 2.6. Unificación Visual de Tooltips en Toolbar
- Unificar el color del título de todos los tooltips de las herramientas CAD de la barra lateral al color amarillo/ámbar de `warning.light` (el mismo tono del cercado eléctrico), logrando una estética coherente y profesional.

## 3. Criterios de Aceptación
1. **CA1:** Al cargar un mapa denso, el canvas se ve limpio y solo muestra los círculos de colores.
2. **CA2:** Al pasar el ratón sobre un círculo o al seleccionarlo, aparece el nombre del dispositivo.
3. **CA3:** Los equipos nuevos se insertan con el estado (y color) que esté seleccionado en la barra de herramientas.
4. **CA4:** Se puede cambiar el estado de un equipo existente seleccionándolo en el lienzo.
5. **CA5:** La leyenda inferior refleja en tiempo real las cantidades exactas de los equipos en el mapa.
6. **CA6:** Compatibilidad hacia atrás: Cualquier dispositivo cargado del backend que no posea la propiedad `status` debe asumir automáticamente `"EXISTING"` por defecto.
7. **CA7:** Los tooltips de las herramientas en la barra lateral muestran su título en amarillo uniforme (`warning.light`).
8. **CA8:** Los muros, cercas eléctricas y el nuevo sensor de movimiento por trazos soportan estados (Existente, A Implementar, Dañado) y su color en el plano responde a dicho estado.
9. **CA9:** Los trazos se diferencian claramente por estilo de línea: sólida (muro), rayas (cerca eléctrica) y puntitos (sensor de movimiento por trazos).
10. **CA10:** Al seleccionar un tramo en el mapa, es posible cambiar su estado directamente desde la barra contextual superior.

## 4. Archivos Impactados Estimados
* **Frontend:**
  - `src/components/security-studies/SecurityCanvasEditor.tsx` (Lógica principal del canvas, renderizado, interacciones).
  - Componentes o estilos relacionados en la barra de herramientas (Toolbar).
* **Backend:**
  - A confirmar si es necesario actualizar algún validador DTO si la estructura de JSON que se guarda en Prisma valida estrictamente los campos (ej. en `SecurityStudy` la propiedad `devices`). No debería haber impacto mayor si el campo JSON es flexible, pero hay que asegurar que no se pierda al guardar.

## 5. Estado de la Implementación
- [x] **Completado**: Implementado en `SecurityCanvasEditor.tsx`.
  - Soporte de tipo `DeviceStatus` (`"EXISTING" | "DAMAGED" | "PLANNED"`).
  - Ocultamiento de nombres por defecto, visible únicamente en `hover` o `selected`.
  - Colorimetría unificada por estado (Verde: Existente `#10B981`, Azul: A Implementar `#3B82F6`, Rojo: Dañada `#EF4444`).
  - Selector de estado activo en la barra de herramientas lateral.
  - Selector rápido de estado en la barra contextual superior al seleccionar un dispositivo o tramo.
  - Muros, cercados eléctricos y sensor de movimiento por trazos con cambio de estado e identificación por estilos de línea (sólida, rayas, puntitos).
  - Unificación de títulos de tooltips al color amarillo de `warning.light`.
  - Widget flotante de resumen y leyenda estadística en la esquina inferior derecha.
  - Compatibilidad hacia atrás garantizada asignando `"EXISTING"` a cualquier dispositivo o cerramiento que carezca de estado.
  - Validación de TypeScript ejecutada con 0 errores.
  - Pruebas unitarias de Security Studies en backend ejecutadas con 21/21 pasando exitosamente.


