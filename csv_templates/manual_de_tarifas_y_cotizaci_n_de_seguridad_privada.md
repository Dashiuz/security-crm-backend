# Manual Metodológico y Guía de Cotización: Tarifas de Seguridad y Vigilancia Privada en Colombia

---

## 1. Fundamento Normativo y Marco Regulatorio

La fijación de tarifas para los servicios de vigilancia y seguridad privada en Colombia es una actividad regulada por el Estado a través de la **Superintendencia de Vigilancia y Seguridad Privada (SuperVigilancia)**. El objetivo primordial de esta regulación es garantizar un régimen de **tarifas mínimas (piso tarifario)** que impida la competencia desleal y asegure que las empresas contratistas cuenten con los recursos necesarios para cubrir el pago oportuno de los salarios, recargos y prestaciones sociales a los trabajadores de la seguridad privada, de acuerdo con la Constitución y el Código Sustantivo del Trabajo.

### 1.1. Principales Disposiciones Legales
* **Decreto Ley 356 de 1994 (Estatuto de Vigilancia y Seguridad Privada):** Regula las modalidades de prestación del servicio (vigilancia fija, móvil, escoltas, asesoría, transporte de valores y tecnología).
* **Decreto 4950 de 2007:** Establece el cálculo de tarifas mínimas fijando los multiplicadores del Salario Mínimo Mensual Legal Vigente (SMMLV) para los sectores residencial, comercial e industrial, y determina los pisos obligatorios del factor de Administración y Supervisión (A&S).
* **Decreto 1070 de 2015 (Decreto Único Reglamentario del Sector Defensa):** Compila las directrices tarifarias y operativas del sector.
* **Ley 2101 de 2021 (Reducción Gradual de la Jornada Laboral):** Afecta directamente el divisor de cálculo de la hora ordinaria laboral (de 48 horas semanales descendiendo a 47h, 46h, 44h y finalmente 42h semanales), incrementando el valor unitario de la hora de trabajo y exigiendo ajustes escalonados en las circulares tarifarias de la SuperVigilancia.
* **Artículo 462-1 del Estatuto Tributario:** Regula el régimen fiscal especial de Base Gravable Especial del IVA sobre el factor de **Administración, Imprevistos y Utilidad (AIU)** para empresas de vigilancia armada y no armada.
* **Circulares Externas Anuales de la SuperVigilancia:** Publicadas en enero de cada vigencia fiscal, fijan los multiplicadores vigentes de SMMLV por tramos del año.

---

## 2. Claridad Conceptual Crítica: A&S vs. AIU

Uno de los errores más comunes en la estructuración de cotizaciones de seguridad es confundir el factor de **Administración y Supervisión (A&S)** con la base gravable **AIU**. Aunque ambos suelen expresarse en porcentajes cercanos al 10%, operan en instancias jurídicas y financieras completamente diferentes:

```
[ Costo Directo de Personal y Operación ]
                   │
                   ▼  ← Factor Operativo A&S (8%, 10% u 11%) [SVSP]
[ Subtotal Facturable Antes de Impuestos ]
                   │
                   ▼  ← Extracción Base AIU (Mínimo 10%) [DIAN / Art. 462-1 E.T.]
[ Base Gravable AIU ]
                   │
                   ▼  ← IVA del 19% sobre la Base AIU
[ Total Facturado al Cliente ]
```

### A. Factor de Administración y Supervisión (A&S) — Nivel Regulatorio y de Costos
* **Definición:** Es un recargo técnico regulado por la SuperVigilancia que se **suma al costo directo** de mano de obra para financiar la infraestructura operativa de la empresa prestadora.
* **Destino de los fondos:** Financiamiento de las centrales de radiofrecuencia, armamento, munición, vehículos de supervisión motorizada, dotación táctica de dotación reglamentaria, pólizas de responsabilidad civil extracontractual y costos administrativos de sede.
* **Pisos Legales Mínimos:**
  * Comercial Sin Armas: **$8\%$** (Multiplicador $1.08$).
  * Comercial Con Armas: **$10\%$** (Multiplicador $1.10$).
  * Residencial Estratos 4, 5 y 6: **$10\%$** (Multiplicador $1.10$).
  * Medio Canino (Detector o Defensa): **$11\%$** (Multiplicador $1.11$).

### B. AIU (Administración, Imprevistos y Utilidad) — Nivel Tributario / Fiscal
* **Definición:** Es una figura de liquidación tributaria (Art. 462-1 del Estatuto Tributario). Dado que la vigilancia privada es altamente intensiva en nómina y prestaciones sociales (conceptos no gravados con IVA y que no otorgan derecho a IVA descontable), la legislación colombiana dispone que el IVA no se cobre sobre el valor total de la factura, sino únicamente sobre el componente que retribuye la utilidad y la gestión de la empresa.
* **Mínimo Legal:** No puede ser inferior al **$10\%$** del subtotal del contrato.
* **Mecánica:** Se calcula el $10\%$ sobre el subtotal facturado y, a ese resultado, se le aplica la tarifa general de IVA del **$19\%$**. De este modo, el impacto efectivo del IVA sobre la factura total es de solo el **$1.9\%$** ($10\% \times 19\%$).

---

## 3. Matriz de Variables del Motor Tarifario

Para programar un calculador o estructurar una propuesta económica, se requiere categorizar las variables en tres niveles:

| Variable | Notación | Clasificación | Descripción / Rango habitual |
| :--- | :---: | :---: | :--- |
| **Salario Mínimo Legal Vigente** | $\text{SMMLV}$ | Normativo / Macro | Salario fijado anualmente por el Gobierno Nacional. |
| **Auxilio de Transporte Mensual** | $\text{AT}$ | Normativo / Macro | Subsidio de movilidad legal para quienes devengan hasta 2 SMMLV. |
| **Multiplicador de Sector** | $M_{\text{sector}}$ | Normativo / SVSP | Número de SMMLV según circular de la SuperVigilancia para 24h. |
| **Horas Diurnas Legales Franja** | $H_{\text{leg\_dia}}$ | Normativo / Laboral | Horas diurnas según el Código Sustantivo del Trabajo (ej. 15h o 13h). |
| **Horas Nocturnas Legales Franja** | $H_{\text{leg\_noc}}$ | Normativo / Laboral | Horas nocturnas según el Código Sustantivo del Trabajo (ej. 9h u 11h). |
| **Proporción Diurna 24h** | $P_{\text{dia}}$ | Normativo / Técnico | Ponderación del costo diurno de un puesto 24h (ej. $55.97\%$ o $47.59\%$). |
| **Proporción Nocturna 24h** | $P_{\text{noc}}$ | Normativo / Técnico | Ponderación del costo nocturno de un puesto 24h (ej. $44.03\%$ o $52.41\%$). |
| **Factor A&S** | $\%_{\text{A\&S}}$ | Operativo / SVSP | Margen de supervisión ($8\%$, $10\%$, $11\%$). |
| **Horas Diurnas del Turno** | $h_d$ | Operativo / Cliente | Cantidad de horas en franja diurna del turno a cotizar. |
| **Horas Nocturnas del Turno** | $h_n$ | Operativo / Cliente | Cantidad de horas en franja nocturna del turno a cotizar. |
| **Días Facturables al Mes** | $D_{\text{fac}}$ | Operativo / Modalidad | Días cobrados al mes ($30, 26, 24, 22, 20, 10, 8, 2$). |
| **Porcentaje Base AIU** | $\%_{\text{AIU}}$ | Fiscal / DIAN | Base mínima impositiva ($10\%$ estándar). |
| **Tarifa IVA** | $\%_{\text{IVA}}$ | Fiscal / DIAN | Tarifa general de IVA ($19\%$). |
| **Descuento Financiero** | $\%_{\text{desc}}$ | Comercial / Empresa | Porcentaje concedido por pronto pago (ej. $2\%$, $3\%$, $5\%$). |
| **Bono de Reinversión (VAG)** | $\text{VAG}$ | Comercial / Empresa | Presupuesto cedido para equipos, CCTV o adecuaciones físicas. |

---

## 4. Formulación Matemática Paso a Paso

El siguiente procedimiento detalla el orden riguroso de cálculo que debe ejecutar el cotizador para determinar el valor mensual y anual de cualquier servicio de vigilancia.

```
Paso 1: Costo Directo Base 24h
       │
       ▼
Paso 2: Aplicación del Factor A&S (Subtotal 24h Base)
       │
       ▼
Paso 3: Valorización de la Hora Diurna y Nocturna Mes
       │
       ▼
Paso 4: Determinación del Costo Diario y Mensual por Modalidad de Turno
       │
       ▼
Paso 5: Ajustes Comerciales (Descuento de Pronto Pago si aplica)
       │
       ▼
Paso 6: Liquidación Tributaria Especial (Base AIU, IVA y Retenciones)
       │
       ▼
Paso 7: Proyección Presupuestal Anual (Prorrateo de Tramos)
```

### Paso 1: Tarifa Base 24 Horas (Costo Directo Mínimo Mensual)
Determina el costo directo mensual antes de supervisión para un puesto de 24 horas continuas (30 días al mes):
$$\text{Base}_{24\text{h}} = \text{SMMLV} \times M_{\text{sector}}$$

### Paso 2: Aplicación del Factor de Administración y Supervisión (A&S)
Al costo directo base se le adiciona el porcentaje reglamentario de supervisión según el medio utilizado:
$$\text{Subtotal}_{24\text{h}} = \text{Base}_{24\text{h}} \times (1 + \%_{\text{A\&S}})$$

### Paso 3: Determinación del Costo Horario al Mes (Diurno y Nocturno)
Un servicio de 24 horas no distribuye su costo de forma lineal entre las 24 horas, debido a que el trabajo nocturno genera recargos por ley. Se utilizan los coeficientes de proporcionalidad técnica ($P_{\text{dia}}$ y $P_{\text{noc}}$):
$$\text{Valor Hora Diurna Mes} = \frac{\text{Subtotal}_{24\text{h}} \times P_{\text{dia}}}{H_{\text{leg\_dia}}}$$
$$\text{Valor Hora Nocturna Mes} = \frac{\text{Subtotal}_{24\text{h}} \times P_{\text{noc}}}{H_{\text{leg\_noc}}}$$

### Paso 4: Liquidación por Tipo de Turno y Días Facturados
Conociendo la cantidad de horas diurnas ($h_d$) y nocturnas ($h_n$) que integran el turno requerido por el cliente, se liquida el valor diario del puesto y se proyecta a los días facturables pactados en el contrato ($D_{\text{fac}}$):
$$\text{Costo Diario del Turno} = (\text{Valor Hora Diurna Mes} \times h_d) + (\text{Valor Hora Nocturna Mes} \times h_n)$$
$$\text{Subtotal Mensual (Sin IVA)} = \left(\frac{\text{Costo Diario del Turno}}{30}\right) \times D_{\text{fac}}$$

### Paso 5: Ajustes Comerciales (Pronto Pago)
Si el contrato contempla un descuento por pago oportuno dentro de los primeros días del mes:
$$\text{Descuento} = \text{Subtotal Mensual} \times \%_{\text{desc}}$$
$$\text{Subtotal Neto} = \text{Subtotal Mensual} - \text{Descuento}$$

### Paso 6: Liquidación Tributaria Especial (Base AIU, IVA y Retenciones)
Aplicando el régimen del Artículo 462-1 del Estatuto Tributario:
$$\text{Base Gravable AIU} = \text{Subtotal Neto} \times \%_{\text{AIU}}$$
$$\text{Valor IVA} = \text{Base Gravable AIU} \times 19\% = \text{Subtotal Neto} \times (\%_{\text{AIU}} \times 19\%)$$
$$\text{Total Factura Mensual} = \text{Subtotal Neto} + \text{Valor IVA}$$

**Retenciones en la fuente aplicables (estimación de flujo neto de tesorería):**
* Retención en la fuente de Renta (Servicios Integrales de Vigilancia): se calcula sobre el AIU a una tarifa del $2\%$:
  $$\text{ReteFuente} = \text{Base Gravable AIU} \times 2\%$$
* Retención de Industria y Comercio (ReteICA): se aplica sobre el Subtotal Neto a la tarifa del municipio (por ejemplo, en Bogotá al $1.38\%$ o $9.66 \times 10^{-3}$ según la clasificación):
  $$\text{ReteICA} = \text{Subtotal Neto} \times \text{Tarifa}_{\text{ICA}}$$
* **Neto a Recaudar por la Empresa:**
  $$\text{Neto en Caja} = \text{Total Factura Mensual} - \text{ReteFuente} - \text{ReteICA}$$

### Paso 7: Proyección Presupuestal Anual (Prorrateo de Tramos)
Si el año contiene diferentes tramos tarifarios debido a modificaciones de la jornada laboral a mitad de año, el contrato de 12 meses se prorratea ponderando los días de vigencia de cada tramo:
$$\text{Costo Anual} = \sum_{k=1}^{n} \left(\frac{\text{Subtotal Mensual}_{k}}{30} \times \text{Días Vigencia Tramo}_{k}\right)$$

---

## 5. Tablas Maestras de Parametrización Rápida

### 5.1. Multiplicadores por Sector y Estrato

| Segmento de Mercado | Mínimo Legal Base (SMMLV) | Margen A&S Mínimo | Notas de Regulación |
| :--- | :---: | :---: | :--- |
| **Comercial, Industrial, Entidades Públicas y Financiero** | **$8.80$** a **$10.21$** SMMLV | $8\%$ (Sin arma)<br>$10\%$ (Con arma)<br>$11\%$ (Canino) | Regulado de forma estricta. Su omisión acarrea sanciones por competencia desleal. |
| **Residencial Estratos 4, 5 y 6 (Estrato A)** | **$8.60$** a **$9.85$** SMMLV | $10\%$ | Mínimo legal vigilado por la SuperVigilancia. |
| **Residencial Estratos 1, 2 y 3 (Estrato B)** | **Tarifa Libre**<br>*(Ref: $7.0$ a $7.66$ SMMLV)* | Libre / Autonomía comercial | La ley autoriza fijación por libre competencia para proteger la asequibilidad comunitaria. |

### 5.2. Tabla de Días Facturables al Mes ($D_{\text{fac}}$)
Un mes estándar de nómina en Colombia se calcula sobre **30 días**. Dependiendo de la cobertura operativa del puesto contratado, el factor de días cambia:

| Modalidad de Cobertura | Abreviatura | Días Facturados / Mes | Composición Operativa |
| :--- | :---: | :---: | :--- |
| **Lunes a Domingo (Permanente)** | **L-D** | **30 días** | 30 días continuos (1 mes completo). |
| **Lunes a Sábado con Festivos** | **L-S CF** | **26 días** | 4 lunes a viernes (20) + 4 sábados (4) + 2 festivos promedio. |
| **Lunes a Sábado sin Festivos** | **L-S SF** | **24 días** | Excluye domingos y festivos calendario. |
| **Lunes a Viernes con Festivos** | **L-V CF** | **22 días** | 4 semanas de L-V (20) + 2 festivos en días hábiles. |
| **Lunes a Viernes sin Festivos** | **L-V SF** | **20 días** | Solo días hábiles de oficina tradicional. |
| **Sábados, Domingos y Festivos** | **SB, DO y F** | **10 días** | Fines de semana y feriados. |
| **Sábados y Domingos (Sin Festivos)** | **SB y DO** | **8 días** | 4 sábados y 4 domingos del mes. |
| **Solo Festivos** | **SOLO F** | **2 días** | Cobertura exclusiva en días festivos calendario. |

### 5.3. Factores de Proporcionalidad Horaria de la Jornada
Dependiendo de la normativa de jornada nocturna aplicable en la vigencia, se aplican los siguientes coeficientes:

| Parámetro Horario | Esquema Tradicional (06:00 a 21:00 diurno) | Esquema Modernizado / 2026 (06:00 a 19:00 diurno) |
| :--- | :---: | :---: |
| **Horas Diurnas Legales ($H_{\text{leg\_dia}}$)** | $15\text{ horas}$ | $13\text{ horas}$ |
| **Horas Nocturnas Legales ($H_{\text{leg\_noc}}$)** | $9\text{ horas}$ | $11\text{ horas}$ |
| **Ponderación Diurna ($P_{\text{dia}}$)** | $55.97\%$ ($0.5597$) | $47.59\%$ ($0.4759$) |
| **Ponderación Nocturna ($P_{\text{noc}}$)** | $44.03\%$ ($0.4403$) | $52.41\%$ ($0.5241$) |

---

## 6. Escenarios Reales y Casos de Uso

A continuación se presentan 5 casos prácticos detallados. Para efectos de ilustración comparativa y unificada, se adoptan los siguientes parámetros base (adaptables a cualquier vigencia):
* $\text{SMMLV Base} = \$1.750.905$
* Esquema horario de 13 horas diurnas y 11 horas nocturnas ($P_{\text{dia}} = 47.59\%$, $P_{\text{noc}} = 52.41\%$).
* Base AIU fiscal del $10\%$ e IVA del $19\%$ sobre AIU ($1.9\%$ efectivo).

---

### Escenario 1: Conjunto Residencial Estrato 5 — Puesto 24 Horas Permanente con Arma (L-D, 30 Días)

* **Sector:** Residencial Estrato 5 (Regulado).
* **Multiplicador de Ley:** $9.77\text{ SMMLV}$.
* **Medio:** Con Arma de fuego ($\%_{\text{A\&S}} = 10\%$).
* **Horario:** Turno continuo 24 horas (13 horas diurnas, 11 horas nocturnas).
* **Periodicidad:** Lunes a Domingo ($30\text{ días}$).

```
[SMMLV: $1.750.905] × 9.77 = Costo Directo: $17.106.341,85
             │
             ▼  + A&S (10%): $1.710.634,19
   Subtotal Mensual: $18.816.976,04
             │
             ▼  Base AIU (10%): $1.881.697,60
          IVA 19%: $357.522,54
             │
             ▼
   TOTAL FACTURA MENSUAL: $19.174.498,58
```

#### Paso a Paso:
1. **Costo Directo:**
   $$\text{Base}_{24\text{h}} = \$1.750.905 \times 9.77 = \$17.106.341,85$$
2. **Subtotal con A&S ($10\%$):**
   $$\text{Subtotal}_{24\text{h}} = \$17.106.341,85 \times 1.10 = \$18.816.976,04$$
3. **Cálculo Tributario:**
   $$\text{Base Gravable AIU} = \$18.816.976,04 \times 10\% = \$1.881.697,60$$
   $$\text{IVA (19\% sobre AIU)} = \$1.881.697,60 \times 19\% = \$357.522,54$$
   $$\text{Total Factura Mensual} = \$18.816.976,04 + \$357.522,54 = \mathbf{\$19.174.498,58}$$

---

### Escenario 2: Parque Empresarial / Comercial — Turno 12 Horas Diurno Sin Arma (L-S CF, 26 Días)

* **Sector:** Comercial (Regulado).
* **Multiplicador de Ley:** $9.77\text{ SMMLV}$.
* **Medio:** Sin Arma ($\%_{\text{A\&S}} = 8\%$).
* **Horario:** 12 Horas Diurnas (ej. 06:00 a 18:00, dentro del bloque diurno de 13h $\rightarrow h_d = 12$, $h_n = 0$).
* **Periodicidad:** Lunes a Sábado con Festivos ($D_{\text{fac}} = 26\text{ días}$).

#### Paso a Paso:
1. **Base 24h Comercial con A&S ($8\%$):**
   $$\text{Base}_{24\text{h}} = \$1.750.905 \times 9.77 = \$17.106.341,85$$
   $$\text{Subtotal}_{24\text{h}} = \$17.106.341,85 \times 1.08 = \$18.474.849,20$$
2. **Valor Hora Diurna Mes:**
   $$\text{Valor Hora Diurna} = \frac{\$18.474.849,20 \times 0.4759}{13} = \frac{\$8.792.180,73}{13} = \$676.321,59$$
3. **Costo por Día de 12 Horas Diurnas:**
   $$\text{Costo Día} = \$676.321,59 \times 12 = \$8.115.859,13\text{ (expresado a mes base 30d)}$$
4. **Subtotal Mensual para 26 Días:**
   $$\text{Subtotal Mensual} = \left(\frac{\$8.115.859,13}{30}\right) \times 26 = \mathbf{\$7.033.744,58}$$
5. **Liquidación Tributaria:**
   $$\text{Base AIU} = \$7.033.744,58 \times 10\% = \$703.374,46$$
   $$\text{IVA (19\% sobre AIU)} = \$703.374,46 \times 19\% = \$133.641,15$$
   $$\text{Total Factura Mensual} = \$7.033.744,58 + \$133.641,15 = \mathbf{\$7.167.385,73}$$

---

### Escenario 3: Centro Logístico / Bodega — Turno 12 Horas Nocturno con Medio Canino (L-D, 30 Días)

* **Sector:** Comercial / Industrial.
* **Multiplicador de Ley:** $9.77\text{ SMMLV}$.
* **Medio:** Guía Canino ($\%_{\text{A\&S}} = 11\%$).
* **Horario:** Turno de 12 horas de 18:00 a 06:00.
  * **Composición horaria:**
    * De 18:00 a 19:00: **1 hora diurna** ($h_d = 1$).
    * De 19:00 a 06:00: **11 horas nocturnas** ($h_n = 11$).
* **Periodicidad:** Lunes a Domingo ($30\text{ días}$).

#### Paso a Paso:
1. **Subtotal 24 Horas Canino ($11\%$ A&S):**
   $$\text{Subtotal}_{24\text{h}} = (\$1.750.905 \times 9.77) \times 1.11 = \$17.106.341,85 \times 1.11 = \$18.988.039,45$$
2. **Valorización Horaria Mes:**
   $$\text{Valor Hora Diurna} = \frac{\$18.988.039,45 \times 0.4759}{13} = \frac{\$9.036.408,00}{13} = \$695.108,31$$
   $$\text{Valor Hora Nocturna} = \frac{\$18.988.039,45 \times 0.5241}{11} = \frac{\$9.951.631,48}{11} = \$904.693,77$$
3. **Costo Mensual del Turno Mixto (1h diurna + 11h nocturnas):**
   $$\text{Subtotal} = (\$695.108,31 \times 1) + (\$904.693,77 \times 11) = \$695.108,31 + \$9.951.631,48 = \mathbf{\$10.646.739,79}$$
4. **Liquidación Tributaria:**
   $$\text{Base AIU (10\%)} = \$10.646.739,79 \times 10\% = \$1.064.673,98$$
   $$\text{IVA (19\% sobre AIU)} = \$1.064.673,98 \times 19\% = \$202.288,06$$
   $$\text{Total Factura Mensual} = \$10.646.739,79 + \$202.288,06 = \mathbf{\$10.849.027,85}$$

---

### Escenario 4: Conjunto Residencial Estrato 2 — Tarifa Libre con Descuento por Pronto Pago

* **Sector:** Residencial Estrato 2 (Tarifa no sujeta al piso de 8.8 SMMLV; se negocia según la capacidad de pago de la copropiedad).
* **Parámetro pactado:** Multiplicador comercial libre de **$7.0\text{ SMMLV}$**.
* **Medio:** Sin Arma (pero con factor de administración del $10\%$ para cobertura de supervisor motorizado).
* **Horario:** Turno continuo 24 horas permanente ($30\text{ días}$).
* **Condición Financiera:** Descuento de pronto pago del **$5\%$** si cancelan en los primeros 10 días calendario.

#### Paso a Paso:
1. **Base Pactada 24 Horas:**
   $$\text{Base}_{24\text{h}} = \$1.750.905 \times 7.0 = \$12.256.335,00$$
   $$\text{Subtotal Antes de Descuento} = \$12.256.335,00 \times 1.10 = \$13.481.968,50$$
2. **Aplicación del Descuento por Pronto Pago ($5\%$):**
   $$\text{Descuento (5\%)} = \$13.481.968,50 \times 0.05 = \$674.098,43$$
   $$\text{Subtotal Neto Facturable} = \$13.481.968,50 - \$674.098,43 = \mathbf{\$12.807.870,07}$$
3. **Liquidación Tributaria sobre el Neto:**
   $$\text{Base Gravable AIU (10\%)} = \$12.807.870,07 \times 10\% = \$1.280.787,01$$
   $$\text{IVA (19\% sobre AIU)} = \$1.280.787,01 \times 19\% = \$243.349,53$$
   $$\text{Total Factura con Descuento} = \$12.807.870,07 + \$243.349,53 = \mathbf{\$13.051.219,60}$$

---

### Escenario 5: Paquete Corporativo Anual, Análisis de Margen y Bono de Reinversión (VAG)

Una empresa contratante solicita una propuesta anual de 12 meses para una sede que requiere:
* **2 Puestos de 24 Horas** Con Arma permanentes (L-D, 30 días).
* **1 Puesto de 12 Horas Diurno** Con Arma (Lunes a Viernes con festivos, 22 días).
* El cliente exige como condición de adjudicación un **Bono de Reinversión en Tecnología (VAG)** consistente en un circuito cerrado de televisión (CCTV) con 8 cámaras y control de acceso peatonal, valorado en **$\$15.000.000$**.

#### A. Cálculo de Tarifas Unitarias Mensuales:
1. **Puesto 24h Con Arma (Comercial, 9.77 SMMLV):**
   $$\text{Subtotal 24h} = (\$1.750.905 \times 9.77) \times 1.10 = \$18.816.976,04$$
2. **Puesto 12h Diurno Con Arma 22 Días:**
   $$\text{Valor Hora Diurna} = \frac{\$18.816.976,04 \times 0.4759}{13} = \$688.846,07$$
   $$\text{Subtotal 12h Diurno (22d)} = \left(\frac{\$688.846,07 \times 12}{30}\right) \times 22 = \$6.061.845,41$$
3. **Facturación Mensual Consolidada (Sin IVA):**
   $$\text{Factura Mes} = (\$18.816.976,04 \times 2) + \$6.061.845,41 = \$37.633.952,08 + \$6.061.845,41 = \mathbf{\$43.695.797,49}$$

#### B. Facturación Anual del Contrato (12 Meses):
$$\text{Ingreso Anual Antes de IVA} = \$43.695.797,49 \times 12 = \mathbf{\$524.349.569,88}$$

#### C. Viabilidad del Bono de Reinversión (VAG):
En la industria, el límite máximo prudencial de reinversión para contratos a 1 año se establece comúnmente entre el **$60\%$ y el $100\%$ de la primera factura mensual** (o un factor no superior a 4 veces el AIU mensual), a fin de evitar comprometer el flujo de caja operativo:
* **Tope Máximo Permitido (100% de 1 factura mensual):** $\$43.695.797,49$.
* **Valor Solicitado por el Cliente:** $\$15.000.000,00$.
* **Porcentaje que Representa:**
  $$\frac{\$15.000.000,00}{\$43.695.797,49} = \mathbf{34.33\%}\text{ de una mensualidad}$$
* **Impacto sobre el Contrato Anual:**
  $$\frac{\$15.000.000,00}{\$524.349.569,88} = \mathbf{2.86\%}\text{ del total anual}$$

**Dictamen Financiero:** La entrega del sistema CCTV por $\$15.000.000$ es **plenamente viable** y financieramente saludable para la empresa de seguridad, ya que se encuentra muy por debajo del techo del $100\%$ de una mensualidad y preserva más del $7\%$ de rentabilidad neta operativa antes de impuestos.

---

## 7. Lista de Chequeo (Checklist) para el Director Comercial

Antes de radicar formalmente una cotización o propuesta económica, verifique los siguientes 8 puntos de control:

- [ ] **1. Verificación del Salario Mínimo Vigente:** Comprobar que el valor del SMMLV corresponda al decreto oficial del año en curso.
- [ ] **2. Consulta de Circular de la SuperVigilancia:** Asegurar que los multiplicadores ($9.77$, $9.85$, $10.21$, etc.) coincidan exactamente con la vigencia o el tramo del año en que iniciará la ejecución del contrato.
- [ ] **3. Clasificación Correcta del Sector:** Verificar si el cliente es regulado (Estratos 4, 5, 6, Comercial, Industrial, Estatal) o no regulado (Estratos 1, 2, 3), evitando incurrir en precios predatorios ilegales.
- [ ] **4. Composición Exacta del Turno:** Para turnos de 12 horas nocturnas, no multiplicar todas las horas por la tarifa nocturna; desglosar las horas correspondientes a la franja diurna (ej. de 18:00 a 19:00).
- [ ] **5. Asignación del Factor A&S:** Validar que no se aplique un porcentaje inferior al $8\%$ para servicios sin armas, $10\%$ con armas o $11\%$ para caninos.
- [ ] **6. Base Gravable AIU en la Oferta:** Asegurar que el IVA esté calculado únicamente sobre el $10\%$ del valor del contrato y no sobre el $100\%$, salvo en los ítems de venta o arrendamiento de equipos electrónicos de seguridad.
- [ ] **7. Periodicidad y Días Reales:** Confirmar si el servicio operará festivos o si requiere una tabla de 26, 24, 22 o 20 días al mes.
- [ ] **8. Amortización del Bono VAG:** En caso de ofrecer valores agregados en especie, certificar que el valor no exceda el $100\%$ de la primera facturación mensual para contratos de 12 meses.