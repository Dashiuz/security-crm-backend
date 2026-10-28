# SPEC-ADM-024: Reestructuración de Cotizaciones Comerciales y Universal Document Studio

> **Estado**: `APROBADO`  
> **Módulo**: `administrative / commercial / format-engine / signatures`  
> **Autor(es)**: `Antigravity Core Engineering`  
> **Fecha de Creación**: `2026-10-26`  
> **Última Actualización**: `2026-10-26`  

---

## 1. Contexto de Negocio e Historias de Usuario

### 1.1 Objetivo
Transformar la experiencia de generación documental y comercial en Noxia mediante una reestructuración profunda de dos pilares clave:
1. **Creador de Cotizaciones Comerciales**: Reordenar el flujo situando la redacción de cláusulas en el Paso 2 con bloques dinámicos reordenables (estilo Notion con guardrails corporativos), habilitar prospectos en el selector de destinatarios con badges visuales, eliminar la selección redundante de membrete, permitir la selección de Valores Agregados (VAG) desde el catálogo configurado y conectar de forma transversal el módulo de firmas digitales (`signatures`).
2. **Universal Document Studio (Format Builder)**: Implementar una arquitectura de estudio con 3 paneles funcionales (Barra de herramientas -> Lienzo de bloques modulares -> Vista previa A4 en vivo), erradicar la terminología y switches rígidos "Lego", compactar la zona de importación de Word/Excel, estandarizar los códigos de formatos con consecutivos departamentales (`FOR-{DEP}-{NUM}`), resolver el desbordamiento de tablas de Excel pegadas mediante sanitización inteligente A4 y permitir el consumo e inserción de imágenes tanto fijas como dinámicas desde AWS S3 vía tokens.

---

### 1.2 Historias de Usuario (User Stories)

- **US-01 (Comercial / Prospectos)**: Como asesor comercial, quiero poder seleccionar un prospecto registrado en el CRM directamente en el selector de clientes y distinguirlo visualmente de un cliente activo para dirigirle cotizaciones formales.
- **US-02 (Cláusulas Flexibles Tipo Notion)**: Como asesor comercial o redactor jurídico, quiero estructurar el documento mediante cláusulas y bloques independientes que pueda titular, reordenar arrastrando verticalmente y alimentar con variables del sistema sin romper los márgenes de impresión A4.
- **US-03 (Firmas Transversales Noxia Sign)**: Como creador de una cotización o contrato, quiero seleccionar usuarios existentes del sistema (ej: Director de Operaciones, Representante Legal) para estampar su firma digitalizada precargada o disparar una solicitud formal de firma digital con token de auditoría.
- **US-04 (VAG desde Catálogo)**: Como asesor comercial, quiero agregar valores agregados (comodatos, dotaciones) eligiendo directamente desde el catálogo de VAG de la empresa con sus costos internos ya calculados.
- **US-05 (Tablas de Excel sin Desbordamiento)**: Como usuario que pega tablas complejas desde Excel, quiero que el sistema ajuste automáticamente el ancho de las columnas y el tamaño tipográfico para que la tabla nunca se salga de la hoja A4 ni corte texto.
- **US-06 (Imágenes Dinámicas desde S3)**: Como redactor de formatos, quiero insertar tokens como `{{empresa_logo}}`, `{{cliente_logo}}`, `{{empleado_foto}}` o `{{estudio_plano_cad}}` para que el sistema inyecte la imagen real almacenada en AWS S3 con URLs prefirmadas en la vista previa y en el PDF emitido.
- **US-07 (Codificación Estandarizada SGC)**: Como administrador de calidad, quiero que los formatos universales adopten automáticamente una nomenclatura estandarizada `FOR-{DEP}-{CONSECUTIVO}` según el departamento.

---

## 2. Definición de Permisos y Matriz RBAC

| Permiso Code | Nombre Legible | Descripción | Rol por Defecto |
| :--- | :--- | :--- | :--- |
| `commercial:proposals:create` | Crear Propuestas Comerciales | Elaborar cotizaciones y ofertas | Comercial, Director Comercial, Admin |
| `commercial:proposals:manage` | Administrar Propuestas | Aprobación, anulación y emisión oficial | Director Comercial, Admin, Godlike |
| `format:manage` | Gestión de Formatos | Diseñar plantillas universales y variables | Admin, HSEQ, Legal, Godlike |
| `signatures:request` | Solicitar Firmas Noxia Sign | Generar tokens de firma para usuarios/clientes | Comercial, Jurídico, Admin |

---

## 3. Arquitectura del Modelo de Datos y Contratos Backend

### 3.1 Endpoint de Autocomplete con Inclusión de Prospectos
**Archivo**: `src/modules/administrative/client/client.controller.ts` y `client.service.ts`
- Modificar `autocomplete(query, user, limit, includeProspects?: boolean)`:
  ```typescript
  // Si includeProspects es true (o contexto comercial):
  const where: any = {
    tenantId: user.tenantId,
    deletedAt: null,
    isActive: true,
    ...(includeProspects ? {} : { clientStatus: { not: ClientStatus.PROSPECT } }),
  };
  ```
- Retornar en el `select`: `id`, `name`, `internalCode`, `nit`, `clientStatus`.

### 3.2 Servicio de Generación de Consecutivos para Formatos
**Archivo**: `src/modules/format-engine/services/format-engine.service.ts`
- Implementar `getNextFormatCode(category: FormatCategory, tenantId: string): Promise<string>`:
  - Mapeo de prefijos:
    - `COMMERCIAL` -> `FOR-COM-`
    - `OPERATIONS` -> `FOR-OPE-`
    - `HUMAN_RESOURCES` -> `FOR-TH-`
    - `QUALITY_HSEQ` -> `FOR-CAL-`
    - `LEGAL` -> `FOR-JUR-`
    - `GENERAL` -> `FOR-GEN-`
  - Consulta en base de datos el último consecutivo existente con ese prefijo para el tenant y sugiere el siguiente número con padding de 3 dígitos (ej: `FOR-COM-004`).

### 3.3 Catálogo del Sistema Extendido con Tokens de Imagen
**Archivo**: `src/modules/format-engine/services/system-catalog.service.ts`
- Extender el tipo `dataType` para incluir `'IMAGE'`:
  ```typescript
  export interface SystemCatalogField {
    systemPath: string;
    label: string;
    token: string;
    dataType: 'TEXT' | 'DATE' | 'CURRENCY' | 'NUMBER' | 'IMAGE';
    example: string;
  }
  ```
- Incorporar los campos de imágenes de S3:
  - `tenant.logoUrl` -> `empresa_logo` (IMAGE)
  - `client.logoUrl` -> `cliente_logo` (IMAGE)
  - `employee.photoUrl` -> `empleado_foto` (IMAGE)
  - `securityStudy.baseImageS3Key` -> `estudio_plano_cad` (IMAGE)
  - `user.signatureUrl` -> `usuario_firma` (IMAGE)

### 3.4 Resolución de Tokens de Imagen en Interpolación
**Archivo**: `src/modules/commercial/document-engine/services/snippet-interpolation.service.ts` y `chameleon-document.service.ts`
- Al interpolar, si el valor corresponde a una clave S3 o URL de imagen, transformar el token en una etiqueta HTML segura:
  ```html
  <img src="${presignedUrl}" alt="${label}" class="noxia-interpolated-image" style="max-width: 100%; height: auto; display: block; margin: 12px auto; border-radius: 4px;" />
  ```

### 3.5 Integración Transversal de Firmas (`SignaturesModule`)
**Archivo**: `src/modules/commercial/proposals/services/commercial-proposals.service.ts`
- Vincular con `SignatureRequestService` para permitir:
  1. Si el firmante es un usuario del sistema (`systemUserId`), recuperar su firma precargada de `User.signatureUrl`.
  2. Si se marca "Solicitar firma digital", invocar `createRequest(...)` enlazando el `documentType = 'PROPOSAL'` y `documentId = proposal.id`.

---

## 4. Especificación Frontend (Next.js App Router)

### 4.1 Creador de Cotizaciones Comerciales (`SplitScreenProposalWorkspace.tsx`)

#### Flujo Reestructurado de 5 Pasos:
1. **Paso 1: Destinatario y Parámetros Comerciales**
   - Selector con `ClientAutocomplete(includeProspects=true)`.
   - Renderizado con Chips: `[● Cliente Activo]` (Verde esmeralda) vs `[★ Prospecto Comercial]` (Ámbar corporativo).
   - Datos base: Ciudad sede, vigencia cotización, duración contrato, descuento pronto pago.
2. **Paso 2: Redacción de Cláusulas (Reordenables Tipo Notion con Guardrails)**
   - Bloques modulares de cláusula: Cada cláusula es una tarjeta independiente con número secuencial automático.
   - Acciones por bloque: Mover arriba/abajo (o Drag & Drop con manija `⋮⋮`), eliminar, contraer/expandir.
   - Barra de inserción rápida de Variables Dinámicas del sistema (`{{cliente_nombre}}`, `{{empresa_nit}}`, `{{empresa_logo}}`).
   - Botón: `+ Agregar Cláusula` y `Elegir del Catálogo de Minutas`.
3. **Paso 3: Estructura Económica y Puestos de Vigilancia**
   - Botón `+ Agregar Puesto` con menú dual: "Elegir del Catálogo de Servicios" (tarifa oficial SVSP) o "Puesto Manual".
   - Vinculación automática con costo de la matriz salarial vigente.
4. **Paso 4: Valores Agregados Gratuitos (VAG) y Semáforo P&L**
   - Menú dual en VAG:
     - `Elegir del Catálogo VAG`: Lista modal de dotaciones y comodatos configurados con su costo de referencia P&L.
     - `Beneficio Personalizado`: Fila en blanco manual.
   - Semáforo P&L en vivo (Margen bruto, costo laboral, amortización VAG).
5. **Paso 5: Firmantes Autorizados (Noxia Sign Transversal)**
   - Pestaña / Buscador de "Usuarios del Sistema": Autocomplete conectado a `users/me` y lista de personal del tenant.
   - Si el usuario tiene firma registrada, muestra badge `[Firma Digitalizada OK]`.
   - Opción de firmantes ad-hoc externos para el cliente.

*(Nota: Se elimina por completo la sección "5. Diseño de Membrete Institucional" del formulario; el membrete se hereda de la configuración corporativa).*

---

### 4.2 Universal Document Studio (`UniversalFormatDrawer.tsx` / `UniversalFormatsPage.tsx`)

#### Arquitectura SplitScreen de 3 Paneles:
```
┌───────────────────────────┬──────────────────────────────────────────┬─────────────────────────────┐
│ 1. BARRA DE HERRAMIENTAS  │ 2. LIENZO CENTRAL DE ESTRUCTURACIÓN      │ 3. VISTA PREVIA A4 EN VIVO  │
│ (Ancho: 240px)            │ (Flexible / Scroll)                      │ (Hoja de Papel Proporcional)│
├───────────────────────────┼──────────────────────────────────────────┼─────────────────────────────┤
│ ＋ COMPONENTES            │ [ Encabezado Institucional         ≡ ⋮ ] │ ┌─────────────────────────┐ │
│ [ T ] Cláusula de Texto   │ [ Cláusula 1: Objeto               ≡ ⋮ ] │ │ [MEMBRETE CORPORATIVO]  │ │
│ [ ⊞ ] Tabla de Datos      │   Editor TipTap con estilos corporativos │ │                         │ │
│ [ 📷 ] Imagen / Anexo     │ [ Cláusula 2: Especificaciones     ≡ ⋮ ] │ │ 1. OBJETO DEL CONTRATO  │ │
│ [ 🗂 ] Puestos Vigilancia │ [ Cuadro Resumen Económico         ≡ ⋮ ] │ │ ...texto interpolado... │ │
│ [ ✍ ] Bloque de Firmas   │ [ Bloque de Firmas Noxia Sign      ≡ ⋮ ] │ │                         │ │
│                           │                                          │ │ [TABLA EXCEL AJUSTADA]  │ │
│ ⚡ VARIABLES DEL SISTEMA   │                                          │ │                         │ │
│ {{cliente_nombre}}        │                                          │ │ 2. FIRMAS               │ │
│ {{empresa_logo}}          │                                          │ │ [Firma S3]   [Firma S3] │ │
│ {{empleado_foto}}         │                                          │ └─────────────────────────┘ │
└───────────────────────────┴──────────────────────────────────────────┴─────────────────────────────┘
```

#### Mejoras Específicas del Studio:
1. **Erradicación de "Lego"**: Reemplazar todo texto y switch por "Componentes de Plantilla" integrados visualmente en la barra de herramientas.
2. **Importación Word/Excel Compacta**: Sustituir la caja dashed gigante por un botón compacto en la cabecera:
   `[ CloudUpload ] Importar Word / Excel` con tooltip informativo.
3. **Consecutivo Automático**: Al seleccionar la Categoría (ej: Operaciones), el campo "Código" se autocompleta con `FOR-OPE-001` editable.
4. **Inserción de Imágenes**:
   - Botón `[ 📷 Imagen / Anexo ]` en la barra para cargar archivos locales o pegar capturas vía `Ctrl+V`.
   - Inserción de imágenes dinámicas desde S3 mediante tokens.

---

### 4.3 Sanitización y Auto-Ajuste de Tablas de Excel Desbordadas en A4

#### Reglas de Normalización (TipTap & CSS A4):
1. **Filtro de Pegado (Paste Rule)**:
   Al interceptar una tabla pegada desde Excel/Word:
   - Eliminar atributos rígidos en línea: `width: ...px`, `style="width: ...px; white-space: nowrap"`.
   - Establecer `width: 100%` en la etiqueta `<table>`.
   - Inyectar `table-layout: auto` y `word-break: break-word` en todas las celdas `<td>` y `<th>`.
2. **Acción de Barra de Tabla**:
   - Botón `[ FitScreen ] Ajustar a Hoja A4`: Recalcula proporcionalmente los anchos de columna al 100% del área útil (640px).
3. **Escalado Automático para Tablas Densas ($\ge 6$ columnas)**:
   - Clase `.table-dense-a4`: Reduce padding a `4px 6px` y aplica `font-size: clamp(0.70rem, 0.85vw, 0.82rem)` para garantizar legibilidad sin sangrado fuera de la hoja.

---

## 5. Criterios de Aceptación y Matriz de Verificación

- [ ] **Autocomplete de Clientes/Prospectos**: Los prospectos aparecen con su badge distintivo y pueden seleccionarse como destinatarios de cotizaciones.
- [ ] **Secuencia de Pasos en Cotización**: La redacción de cláusulas es el Paso 2; la selección de membrete está ausente del formulario y se aplica automáticamente.
- [ ] **Cláusulas Reordenables**: Se pueden agregar múltiples cláusulas, titularlas, moverlas arriba/abajo y eliminarlas individualmente.
- [ ] **Variables Dinámicas en Editor**: Los tokens transversales del sistema pueden insertarse dentro del texto y dentro de las tablas con un clic.
- [ ] **VAG desde Catálogo**: El usuario puede escoger beneficios configurados con sus costos reales de P&L o crearlos manualmente.
- [ ] **Firmas Noxia Sign**: Los usuarios del sistema con firma digitalizada pueden seleccionarse como firmantes estampa directa o solicitud de firma.
- [ ] **Tablas de Excel**: Al pegar tablas anchas de 8+ columnas, se adaptan a la hoja A4 sin desbordarse lateralmente.
- [ ] **Imágenes y S3**: Se pueden insertar imágenes locales por botón/pegar y tokens de imagen que se renderizan desde S3 en la vista previa A4 y PDF.
- [ ] **Cero "Lego" y Consecutivo**: La palabra "Lego" desaparece por completo y el código de formato sugiere `FOR-{DEP}-{NUM}`.
- [ ] **SplitScreen Funcional**: Tanto en cotizaciones como en format builder, el usuario visualiza en tiempo real los cambios en la hoja A4 a la derecha.
- [ ] **TypeScript y Pruebas**: Compilación con 0 errores en frontend y backend (`tsc --noEmit`), manteniendo cobertura $\ge 80\%$.
