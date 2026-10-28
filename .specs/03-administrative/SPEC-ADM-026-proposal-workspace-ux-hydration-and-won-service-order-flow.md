# SPEC-ADM-026: Optimización de UX de Barra de Herramientas de Cotizador, Hidratación de Canvas en Edición, Corrección de Precios NaN en Vista Previa y Flujo de Aprobación a Orden de Servicio (WON -> OS)

> **Estado**: `IMPLEMENTADO Y VALIDADO`
> **Módulos Backend**: `modules/commercial/proposals`, `modules/commercial/service-orders`
> **Módulos Frontend**: `commercial/proposals`, `commercial/proposals/components`, `commercial/service-orders`
> **Código de Especificación**: `SPEC-ADM-026-proposal-workspace-ux-hydration-and-won-service-order-flow`
> **Fecha de Creación**: `2026-10-28`
> **Autor(es)**: `Antigravity Core Engineering`

---

## 1. Diagnóstico Técnico y Causas Raíz

### 1.1 Problema 1: Barra de Formato con Scroll Horizontal y Botones Saturados (Imagen 1)

- **Manifestación**: La barra secundaria del espacio de trabajo (`CanvasProposalWorkspace.tsx`) agrupa 14 controles heterogéneos sin envoltura ni agrupación responsiva (`overflowX: "auto"`). En monitores estándar (1280px-1440px), los chips de cliente se truncan ("Valles d..."), los botones quedan cortados y se fuerza un incómodo scroll horizontal.
- **Causa Raíz**: Contenedor flex sin jerarquía visual que coloca en un solo nivel plano herramientas de inserción, metadatos de contexto (badges de puestos, VAG y firmantes) y acciones de vista previa/guardado.
- **Solución UI/UX**:
  - Reorganizar la barra en clusters funcionales con control segmentado.
  - Consolidar los contadores sueltos (`1 Puesto SVSP`, `2 Beneficios VAG`, `0 Firmantes`) en una **píldora compacta unificada de métricas** `[ 🛡️ 1 | 🎁 2 | ✍️ 0 ]` con tooltips independientes y acceso directo al tab correspondiente del drawer.
  - Truncar limpiamente el selector de cliente con tooltip del nombre completo y ancho adaptativo.
  - Eliminar de raíz el scroll horizontal (`overflowX: "visible"` o `"hidden"`) garantizando adaptabilidad fluida.

---

### 1.2 Problema 2: Canvas Aparece Vacío al Abrir Propuesta Existente para Edición (Imagen 3)

- **Manifestación**: Tras crear una propuesta con puestos y VAGs (Imagen 2), al pulsar "Editar en Canvas" (o entrar a `/commercial/proposals/[id]/edit`), el lienzo muestra únicamente el párrafo introductorio de texto. Las tablas de cotización económica y valores agregados han desaparecido del lienzo, a pesar de que los badges superiores indican que sí existen puestos y beneficios.
- **Causa Raíz**:
  - En `CanvasProposalWorkspace.tsx`, los estados `showServiceTable` y `showVags` se inicializan en `false`.
  - En la rutina `loadInitialData()` (líneas 470-520), al cargar `loaded = await commercialProposalsApi.getProposalById(proposalId)`, se mapean `servicePositions` y `valueAddedItems`, pero **nunca se invocan `setShowServiceTable` ni `setShowVags`**.
  - En la función generadora `allDocItems` (líneas 761-787), las secciones `section_tariffs` y `section_vags` solo se incorporan al documento si `showServiceTable === true` y `showVags === true`.
  - En `handleSaveProposal` (líneas 1135-1156), siempre se invocaba `commercialProposalsApi.createProposal` en vez de bifurcar con `commercialProposalsApi.updateProposal(proposalId, payload)` cuando se está editando una propuesta preexistente.
- **Solución**:
  - En `loadInitialData()`, restaurar de forma reactiva:

    ```typescript
    setShowServiceTable(loaded.draftSnapshotJson?.showServiceTable ?? (loaded.items && loaded.items.length > 0));
    setShowVags(loaded.draftSnapshotJson?.showVags ?? (loaded.valueAddedItems && loaded.valueAddedItems.length > 0));
    if (loaded.draftSnapshotJson?.showSignatures !== undefined) {
      setShowSignatures(loaded.draftSnapshotJson.showSignatures);
    }
    ```

  - En `handleSaveProposal()`, si `proposalId` existe, invocar `updateProposal` en lugar de `createProposal`.

---

### 1.3 Problema 3: Vista Previa Muestra Valores en `$ NaN` (Imagen 4)

- **Manifestación**: Al abrir el modal de Vista Previa PDF (`ChameleonPdfPreview`), las columnas "Tarifa Mes (COP)", "Subtotal Antes de Impuestos", "IVA sobre AIU" y "TOTAL FACTURADO CON IVA" presentan el texto literal `$ NaN`.
- **Causa Raíz**:
  - En el backend (`commercial-proposals.repository.ts`, método `findPaginated`), la selección de campos para `items` solo pedía `{ id, positionTitle, quantity, totalMonthlyBilledPrice }`. Los campos `unitMonthlyBilledPrice`, `scheduleType` y `weaponModality` no eran devueltos en la lista paginada.
  - En la tabla de propuestas de frontend (`proposals/page.tsx`), al pulsar el botón de vista previa rápida, se le pasaba el objeto de la fila directamente calculando:
    `monthlyTotal: it.unitMonthlyBilledPrice * it.quantity`. Al ser `it.unitMonthlyBilledPrice` `undefined`, la multiplicación resultaba en `NaN`.
  - En `ChameleonPdfPreview.tsx`, el `reduce` acumulaba `NaN`, propagándose a toda la liquidación impositiva.
- **Solución**:
  - En backend: incluir en `findPaginated` los campos completos del ítem (`unitMonthlyBilledPrice`, `totalMonthlyBilledPrice`, `scheduleType`, `weaponModality`, `tariffCategory`).
  - En `proposals/page.tsx`: consultar `getProposalById(id)` al abrir el modal de vista previa para contar con el snapshot 360° íntegro (con cláusulas, bloques y firmantes), y calcular defensivamente:
    `monthlyTotal: Number(it.totalMonthlyBilledPrice) || (Number(it.unitMonthlyBilledPrice) || 0) * (Number(it.quantity) || 1)`.
  - En `ChameleonPdfPreview.tsx`: implementar coerción y fallback numérico robusto en el cálculo y formato de moneda:
    `$ ${(Number(subtotal) || 0).toLocaleString("es-CO")}`.

---

### 1.4 Problema 4 / Flujo Solicitado: Proceso de Aprobación (WON) y Generación de Orden de Servicio

- **Pregunta del Usuario**: "¿cómo sería el proceso para marcar una propuesta como ganada y así generarle la orden de servicio?"
- **Arquitectura de Negocio y Transición Operativa**:
  1. **Regla de Negocio**: Una cotización pasa por el ciclo: `Borrador (DRAFT)` / `Aprobada Internamente (APPROVED_INTERNAL)` / `Enviada al Cliente (SENT_TO_CLIENT)`. Una vez el cliente acepta la oferta o firma el contrato, la propuesta debe marcarse como **`WON (Aceptada / Ganada)`**.
  2. **Gatillador de Orden de Servicio**:
     - Las órdenes de servicio (`ServiceOrder`) con código OMEGA estatutario y perfil de guarda ideal requieren legalmente una propuesta comercial ganada como antecedente vinculante.
     - En `proposals/page.tsx`, las propuestas con estado elegible (`DRAFT`, `APPROVED_INTERNAL`, `SENT_TO_CLIENT`) dispondrán de una acción intuitiva:
       - **Botón / Menú de Acción**: `🏆 Marcar como Ganada`.
       - **Modal / Drawer de Transición Asistida**:
         - Presenta resumen de la propuesta (Folio, Cliente, Valor Mensual COP, Margen P&L).
         - Pregunta al usuario:
           1. *Solo Marcar como Ganada (Cerrar Negocio)* -> Invoca `commercialProposalsApi.updateStatus(id, 'WON')`.
           2. *Marcar como Ganada y Generar Orden de Servicio Inmediata* -> Actualiza a `'WON'` y navega a `/commercial/service-orders?fromProposalId=[id]`.
     - Si la propuesta ya está en estado `WON`:
       - Si aún no tiene OS asociada, muestra el botón de alta visibilidad: **`⚡ Generar Orden de Servicio`**.
       - Si ya tiene OS asociada, muestra el chip interactivo con enlace directo: **`Ver OS: {omegaCode}`**.
  3. **Auto-población en `commercial/service-orders`**:
     - La página de órdenes de servicio (`service-orders/page.tsx`) ya cuenta con la función `handleProposalSelection(id)`. Al recibir el query param `fromProposalId`, se abre automáticamente el `ResponsiveFormDrawer`, se selecciona la propuesta ganada, y se transfieren automáticamente:
       - Cliente y NIT.
       - Montos facturados con y sin impuestos.
       - Todos los puestos de vigilancia con franjas horarias y modalidades de armas listos para configuración de perfil de guarda y dotación.

---

## 2. Plan de Pruebas y Validación (Coverage >= 80%)

1. **Backend**:
   - `commercial-proposals.repository.spec.ts` / `commercial-proposals.service.spec.ts`:
     - Test unitario verificando que `findPaginated` retorna `unitMonthlyBilledPrice`, `scheduleType`, `weaponModality`.
     - Test unitario validando transición a `WON` y generación de orden de servicio vinculada.
2. **Frontend**:
   - Verificación visual y funcional de que el toolbar secundario no presenta scroll horizontal en resoluciones 1280px-1920px.
   - Verificación de que al recargar una propuesta existente con puestos y VAGs, el canvas renderiza inmediatamente las tablas.
   - Verificación de que la vista previa PDF muestra valores numéricos colombianos exactos sin `$ NaN`.
   - Verificación del flujo de un solo clic desde propuesta ganada hacia la creación asistida de Orden de Servicio.
