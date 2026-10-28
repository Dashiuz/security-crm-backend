# SPEC-ADM-025: Refactorización del Motor de Cálculo Tarifario, Matriz Salarial y Variables de Cotización SVSP

> **Estado**: `IMPLEMENTADO / VERIFICADO`  
> **Módulos Backend**: `modules/commercial/settings`, `modules/commercial/proposals`  
> **Módulos Frontend**: `commercial/settings`, `commercial/proposals`  
> **Especificación Frontend Espejo**: [`SPEC-UI-007`](file:///d:/projects/security-crm-frontend/.specs/SPEC-UI-007-commercial-tariff-calculation-refactor-and-salary-matrix.md)  
> **Código de Especificación**: `SPEC-ADM-025-commercial-tariff-calculation-refactor-and-variable-matrix`  
> **Fecha de Creación**: `2026-10-27`  
> **Autor(es)**: `Antigravity Core Engineering`  

---

## 1. Contexto de Negocio y Diagnóstico de Cálculos

### 1.1 Objetivo General
Dotar de máxima flexibilidad al ecosistema de cotizaciones y parametrización de servicios de seguridad privada en NOXIA CRM, permitiendo la edición integral de todas las variables normativas y comerciales, implementando un mecanismo de confirmación regulatoria para variables de ley, configurando el multiplicador de estratos 4, 5 y 6 (SVSP 2026: 9.77 SMMLV), incorporando los días límite de pronto pago, erradicando el scroll horizontal en la Matriz Salarial y corrigiendo las discrepancias matemáticas entre la plataforma y el manual de tarifas.

---

### 1.2 Validación Matemática: Imagen #1 (Plataforma Actual) vs Imagen #2 (Manual de Tarifas)

A continuación se detalla la causa matemática exacta de la divergencia entre el cálculo observado en el simulador en vivo de NOXIA (Imagen #1) y el Escenario 1 del documento oficial `manual_de_tarifas_y_cotizaci_n_de_seguridad_privada.md` (Imagen #2):

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│               COMPARATIVA MATEMÁTICA: SIMULADOR NOXIA vs. MANUAL SVSP                  │
├──────────────────────────┬─────────────────────────────┬───────────────────────────────┤
│ Concepto                 │ Imagen #1 (Noxia Actual)    │ Imagen #2 (Manual Escenario 1)│
├──────────────────────────┼─────────────────────────────┼───────────────────────────────┤
│ Sector Económico         │ Comercial y Público         │ Residencial Estrato 5         │
│ Multiplicador SMMLV      │ 8.80 SMMLV                  │ 9.77 SMMLV (Circular 2026)    │
│ SMMLV Base               │ $ 1.750.905                 │ $ 1.750.905                   │
│ Tarifa Base 24h          │ $ 15.407.964                │ $ 17.106.341,85               │
│ Franja Horaria Evaluada  │ 13h día / 11h noche         │ 13h día / 11h noche           │
│ Marco Normativo Usado    │ Tradicional (15h día / 9h)  │ Moderno 2026 (13h día / 11h)  │
│ Costo Directo Mensual    │ $ 15.765.703 (+2.32%)       │ $ 17.106.341,85 (Exacto 100%) │
│ A&S (10%)                │ $ 1.576.570                 │ $ 1.710.634,19                │
│ Subtotal antes de IVA    │ $ 17.342.273                │ $ 18.816.976,04               │
│ Base AIU (10%)           │ $ 1.734.227                 │ $ 1.881.697,60                │
│ IVA sobre AIU (19%)      │ $ 329.503                   │ $ 357.522,54                  │
├──────────────────────────┼─────────────────────────────┼───────────────────────────────┤
│ TOTAL FACTURA MENSUAL    │ $ 17.671.776                │ $ 19.174.498,58               │
└──────────────────────────┴─────────────────────────────┴───────────────────────────────┘
```

#### Raíz Matemática del Desfase:
1. **Diferencia Primaria (Multiplicador):**
   - En la Imagen #1 se calculó con el multiplicador comercial tradicional de **$8.80\text{ SMMLV}$**.
   - En la Imagen #2 se aplicó el multiplicador de la circular anual SVSP para Residencial Estratos 4, 5 y 6 bajo la Ley 2101 (44 horas semanales), el cual es **$9.77\text{ SMMLV}$**.
2. **Diferencia Secundaria (Desfase de Franja Diurna / Nocturna):**
   - En la Imagen #1 el usuario ingresó 13h día y 11h noche. El motor aplicó la fórmula tradicional de 15h día y 9h noche:
     $$\text{Costo Directo} = \left(\frac{15.407.964 \times 0.5597}{15} \times 13\right) + \left(\frac{15.407.964 \times 0.4403}{9} \times 11\right) = \$15.765.703$$
     Esto introdujo una distorsión artificial del $+2.32\%$ sobre la base para un servicio que era de 24 horas continuas.
   - En el esquema moderno 2026 (Sección 5.3 del manual): $H_{\text{leg\_dia}} = 13\text{h}$, $H_{\text{leg\_noc}} = 11\text{h}$, $P_{\text{dia}} = 47.59\%$, $P_{\text{noc}} = 52.41\%$.
     $$\left(\frac{47.59\%}{13} \times 13\right) + \left(\frac{52.41\%}{11} \times 11\right) = 47.59\% + 52.41\% = 100\%$$
     Por tanto, para un puesto de 24h el costo directo es exactamente el $100\%$ de la base ($\$17.106.341,85$), liquidando un total mensual de **$\$19.174.498,58$**.

---

## 2. Taxonomía de Variables: Estatutarias vs. Dinámicas

Todas las variables del sistema serán configurables por el usuario, categorizadas bajo dos regímenes de interacción:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        MATRIZ DE GOBERNANZA DE VARIABLES               │
├───────────────────────────────────┬────────────────────────────────────┤
│   A. VARIABLES ESTATUTARIAS       │    B. VARIABLES DINÁMICAS          │
│   (Reguladas por Ley / SVSP)      │    (Comerciales y Operativas)      │
├───────────────────────────────────┼────────────────────────────────────┤
│ 1. SMMLV ($1.750.905 oficial 2026)│ 1. Multiplicador Libre E1-3        │
│ 2. Auxilio Transporte ($249.095)  │ 2. Horas Día del Turno (h_d)       │
│ 3. Jornada Semanal (44 Horas)     │ 3. Horas Noche del Turno (h_n)     │
│ 4. Divisor Mensual (220 Horas)    │ 4. Días Facturables Mes (30..2)    │
│ 5. Multiplicador Comercial (8.80) │ 5. Días Límite Pronto Pago         │
│ 6. Multiplicador E4-6 (9.77)      │ 6. % Descuento Pronto Pago         │
│ 7. Margen Mínimo A&S (8%, 10%, 11%)│ 7. Bonificación No Salarial       │
│ 8. Base AIU Mínima (10%)          │ 8. Rodamiento Operativo            │
│ 9. IVA sobre AIU (19%)            │ 9. Tarifas Locales ReteICA/Fuente  │
│ 10. Deducciones Nómina (4% S, 4% P)│ 10. Horas Extras Adicionales       │
│ 11. Franja Diurna/Nocturna de Ley │ 11. Bono Reinversión VAG           │
├───────────────────────────────────┴────────────────────────────────────┤
│ ⚠️ Regla de Interacción y Confirmación:                                │
│ Si el usuario modifica una variable ESTATUTARIA desviándola o bajándola │
│ de los pisos legales mínimos oficiales, el sistema NO bloquea la       │
│ operación, sino que abre el modal de "Confirmación de Excepción        │
│ Regulatoria SVSP" para asegurar consentimiento informado y trazabilidad│
│ ante posibles sanciones por precios predatorios.                       │
│ Las variables DINÁMICAS se editan de forma inmediata sin confirmación. │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Especificación de Nuevas Variables y Campos

### 3.1 Multiplicador para Estratos 4, 5 y 6 (`strata46Multiplier`)
* **Modelo**: `TariffPeriodConfig` en Prisma.
* **Valor por Omisión Oficial**: **`9.77`** SMMLV (actualizado conforme a la circular SVSP 2026 para jornada semanal de 44 horas).
* **Edición**:
  - En la pestaña *Vigencias y Tarifas SVSP*: Editable numéricamente al crear o actualizar cualquier vigencia en `TariffPeriodDrawer`.
  - En el *Simulador Tarifario en Vivo*: El selector de sector incluye `"Residencial Estratos 4, 5 y 6 (9.77 SMMLV)"` y se habilita un campo numérico directo para sobrescribir el multiplicador en tiempo real.
  - En el *Cotizador de Propuestas* (`CanvasProposalWorkspace`): La selección de un servicio con sector `RESIDENTIAL_STRATA_4_6` tomará de inmediato `9.77` como multiplicador base, permitiendo al asesor ajustarlo si existe una autorización comercial.
* **Confirmación Regulatoria**: Si se ingresa un valor menor a `9.77` (o el piso fijado para la vigencia), se solicitará confirmación de excepción tarifaria.

### 3.2 Cantidad de Días que Contemplan el Pronto Pago (`promptPaymentDaysLimit` / `promptPaymentDays`)
* **Definición de Negocio**: Plazo en días calendario durante los cuales el cliente puede cancelar la factura para hacerse acreedor al descuento financiero pactado (ej. 10 días calendario según Escenario 4 del manual).
* **Nivel Global / Tenant**:
  - Se agrega a `CommercialSettings`:
    ```prisma
    defaultPromptPaymentDays Int     @default(10) // Días calendario pactados para pronto pago
    defaultPromptPaymentDisc Decimal @default(0.00) @db.Decimal(5, 4) // % Descuento por defecto
    ```
* **Nivel Propuesta Económica**:
  - Se agrega a `CommercialProposal` y en su snapshot JSON:
    ```prisma
    promptPaymentDays Int @default(10) // Días hábiles/calendario concedidos en la oferta
    ```
* **Disponibilidad en Tokens de Redacción Documental**:
  - Token del sistema: `{{propuesta_dias_pronto_pago}}` (inyecta el número de días, ej: "10").
  - Token complementario: `{{propuesta_descuento_pronto_pago}}` (ej: "5%").
* **Interfaz de Usuario**:
  - En `/commercial/settings`: Campo en la pestaña de políticas comerciales para definir el estándar corporativo.
  - En `/commercial/proposals/new`: Campo en el bloque de ajustes financieros junto al porcentaje de descuento.

---

## 4. Rediseño de Experiencia de Usuario (UX/UI)

### 4.1 Tab "Vigencias y Tarifas SVSP"
1. **Control Dual de Multiplicador en Simulador**:
   - Selector rápido: `Comercial (8.80)`, `Residencial E4-6 (9.77)`, `Residencial Libre (7.00)`.
   - Toggle / Input directo: `Multiplicador Personalizado (SMMLV)` con step `0.01` que actualiza la tarifa instantáneamente.
2. **Rastro Matemático Interactivo (Breadcrumb de Liquidación)**:
   - Se despliega una barra de flujo visual:
     $$\text{[SMMLV: \$1.750.905] × 9.77 = \$17.106.342} \longrightarrow \text{+ A\&S (10\%): \$1.710.634} \longrightarrow \text{Subtotal: \$18.816.976} \longrightarrow \text{Base AIU (10\%): \$1.881.698} \longrightarrow \text{IVA (19\%): \$357.523} \longrightarrow \mathbf{\text{Total: \$19.174.499}}$$
3. **Selector de Régimen de Franja Horaria**:
   - Permite alternar entre **Régimen 2026 (13h diurnas / 11h nocturnas)** y **Régimen Tradicional (15h diurnas / 9h nocturnas)** para comparar vigencias históricas sin discrepancias.

---

### 4.2 Tab "Matriz Salarial y Turnos" (Resolución Integral de la Imagen #3)

#### A. Claridad de Propósito Funcional
Se añade un encabezado pedagógico y de arquitectura financiera que aclara al usuario:
> **Propósito de la Matriz Salarial**:  
> "Esta matriz calcula el **Costo Real de Mano de Obra Operativa** y el **Sueldo Neto a Transferir al Guarda** después de deducciones de ley ($-8\%$). Estos valores alimentan el análisis de **Ganancias y Pérdidas (G&P)** en las cotizaciones, garantizando que el precio facturado al cliente cubra con margen saludable los costos laborales y el factor de relevo del puesto (ej. 3 guardas para 24h rotativo)."

#### B. Erradicación Absoluta del Scroll Horizontal (Diseño Bento Cards / Master-Detail)
Se sustituye la tabla ancha de 9 columnas por una cuadrícula de **Tarjetas Modulares por Cargo Operativo** con ancho 100% responsivo:

```
┌────────────────────────────────────────────────────────────────────────┐
│  🛡️ Guarda Portero                                      [Activo] [🗑️]  │
│  Turno: [ 2x2x2 (24h Rotativo) ▼ ]    Factor Relevo: 3.0 guardas/puesto │
├───────────────────────────────────┬────────────────────────────────────┤
│ DEVENGADOS MENSUALES              │ DEDUCCIONES Y BENEFICIOS           │
│ • Sueldo Base: $ 1.750.905        │ • Salud (-4%): - $ 111.196         │
│ • Aux. Transporte: $ 249.095      │ • Pensión (-4%): - $ 111.196       │
│ • Horas Extras / Recargos:        │ • Bono No Salarial: $ 0            │
│   $ 1.029.782  [🪄 Recalcular]    │ • Rodamiento: $ 0                  │
├───────────────────────────────────┴────────────────────────────────────┤
│ RESUMEN FINANCIERO DEL PUESTO:                                         │
│ 🏦 Sueldo Neto Guarda: $ 2.807.390 (Lo que recibe en cuenta)          │
│ 💼 Costo Nómina Puesto (x3): $ 8.422.170 (Base de costo para el G&P)  │
└────────────────────────────────────────────────────────────────────────┘
```

#### C. Parametrización de las 8 Tarifas Horarias SVSP
- Encabezado con acordeón colapsable: *"Configuración de Recargos de Ley (Leyenda Oficial SVSP)"*.
- Muestra las 8 tipologías (Ord. Diurna, Ord. Nocturna, Extra Diurna, Extra Nocturna, Dominical Diurna, Dominical Nocturna, Dom. Extra Diurna, Dom. Extra Nocturna).
- Si se requiere actualizar los porcentajes ante reformas laborales (ej. recargo dominical al 100%), se permite la edición activando el modal de advertencia de ley.

---

### 4.3 Saneamiento del Cotizador de Propuestas (`CanvasProposalWorkspace.tsx`)
- Eliminar la fórmula empírica `baseCost = smmlv * 8.8;`.
- Conectar la función `calculateBilledPriceForService` con:
  - El multiplicador correspondiente al sector del servicio según el tramo tarifario activo:
    - `COMMERCIAL_PUBLIC` $\rightarrow$ `commercialMultiplier` (8.80)
    - `RESIDENTIAL_STRATA_4_6` $\rightarrow$ `strata46Multiplier` (9.77)
    - `RESIDENTIAL_STRATA_1_3` $\rightarrow$ `strata13Multiplier` (7.66)
    - O multiplicador personalizado asignado por el usuario en la línea de servicio.
  - Factor de supervisión A&S reglamentario (8%, 10%, 11%).
  - Cálculo de costo real por puesto: `unitMonthlyRealCost = grossSalary * guardsRequiredPerPost`.

---

## 5. Cambios en Modelos, DTOs y Servicios Backend

### 5.1 Prisma Schema (`commercial_settings.prisma` y `commercial_proposals.prisma`)
```prisma
// En CommercialSettings:
model CommercialSettings {
  // ...
  defaultPromptPaymentDays Int     @default(10)
  defaultPromptPaymentDisc Decimal @default(0.00) @db.Decimal(5, 4)
  // ...
}

// En CommercialProposal:
model CommercialProposal {
  // ...
  promptPaymentDays Int @default(10)
  // ...
}
```

### 5.2 DTOs (`commercial/settings/dtos/` y `commercial/proposals/dtos/`)
- `SimulateTariffDto`: Incluir `customSectorMultiplier?: number;`, `promptPaymentDays?: number;`, `manualSmmlv?: number;`.
- `CreateTariffPeriodDto` y `UpdateTariffPeriodDto`: Asegurar `@Type(() => Number)` y validaciones en `strata46Multiplier`, `commercialMultiplier`, `statutoryDayHours`, `statutoryNightHours`.
- `UpdateCommercialSettingsDto`: Soportar `defaultPromptPaymentDays` y `defaultPromptPaymentDisc`.

### 5.3 Motores de Cálculo
- `TariffCalculationEngine.calculateRate`:
  - Recibir y aplicar `statutoryDayHours` y `statutoryNightHours` del tramo tarifario en lugar de caer en las constantes por defecto (15h/9h).
  - Aplicar `strata46Multiplier` por defecto de `9.77` para el sector residencial regulado.

---

## 6. Plan de Verificación y Criterios de Aceptación

### 6.1 Pruebas Automatizadas
1. **Suite de Motor Tarifario (`tariff-calculation.service.spec.ts`)**:
   - Caso Escenario 1 (Manual SVSP): SMMLV $1.750.905, 9.77 SMMLV, 13h día / 11h noche, 10% A&S, 10% AIU, 19% IVA $\rightarrow$ Total exacto de **$19.174.498,58**.
   - Caso Escenario 2: Turno 12h diurno comercial, 26 días $\rightarrow$ Total **$7.167.385,73**.
   - Caso Escenario 4: Residencial E2 libre (7.0 SMMLV) con pronto pago 5% en 10 días $\rightarrow$ Total **$13.051.219,60**.
2. **Suite de Nómina de Guardas (`guard-salary-calculation.service.spec.ts`)**:
   - Verificación de las 8 tarifas horarias SVSP con recargos de ley.
   - Verificación de deducciones de salud (4%) y pensión (4%).
3. **Linter y Compilación**:
   - `npm.cmd run lint` con cero advertencias y cero errores en Backend y Frontend.
   - `tsc --noEmit` con cero errores de tipo.

### 6.2 Criterios de Aceptación Manual
- [x] En `/commercial/settings` (Tab Vigencias): El usuario puede editar libremente el multiplicador de estratos 4, 5 y 6 (valor sugerido 9.77) y el multiplicador comercial.
- [x] En el Simulador en vivo: Al ingresar 13h día y 11h noche con 9.77 SMMLV, el costo directo mensual coincide con la base ($17.106.342) y el total da $19.174.499.
- [x] En `/commercial/settings` (Tab Políticas): Se puede configurar los días estándar de pronto pago (ej. 10 días).
- [x] En `/commercial/settings` (Tab Matriz Salarial): La vista no tiene scroll horizontal. Cada cargo se muestra en una tarjeta responsiva con sueldo neto del guarda y costo real por puesto.
- [x] Al intentar bajar un multiplicador o A&S por debajo del piso legal, se despliega el modal de confirmación regulatoria SVSP.
- [x] En `/commercial/proposals/new`: Al cotizar un servicio residencial estrato 5, el sistema calcula con 9.77 SMMLV y expone los días de pronto pago para la redacción contractual.
