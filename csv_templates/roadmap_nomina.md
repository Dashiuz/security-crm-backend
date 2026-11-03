# Diseño de Módulo de Nómina para Empresas de Vigilancia y Seguridad Privada

El análisis del manual de usuario de **Pronos** y de las capturas de operación real en terreno revela que un sistema de nómina para empresas de vigilancia privada en Colombia es, en realidad, un **sistema híbrido de Control Operativo de Puestos + Liquidación Laboral + Cumplimiento Regulatorio**.

A continuación, se presenta la radiografía técnica de cómo opera este esquema, la arquitectura de componentes necesarios para construir un módulo propio moderno (superando las limitaciones de Pronos) y el plan de desarrollo distribuido por fases.

---

## 1. Diagnóstico del Sistema Actual (Pronos) y las Imágenes de Operación

Del manual y de las dos capturas reales de trabajo se extraen las reglas de negocio críticas que hacen único al sector vigilancia:

### A. El Puesto de Trabajo («Dependencia») manda sobre el Sueldo
* A diferencia de una empresa convencional donde el salario está atado únicamente al contrato del empleado, en vigilancia el empleado gana según el **puesto (Dependencia)** donde esté asignado.
* Como se observa en el numeral *1.11.3 Dependencias*, cada puesto tiene configurado su *Valor Mensual Pagado*, *Monto Prestacional*, *Valor Diario*, *Modalidad de Turno* (ej. 24 Horas, 12H Nocturno) y *Tipo de Liquidación* (ej. «Por Promedio / Salario Garantizado» vs. «Por Programación real»).
* En el numeral *1.12 Modalidades*, el sistema utiliza una regla contable/operativa muy común en vigilancia: cuando se pacta un «sueldo garantizado o promedio» por puesto, la modalidad desglosa porcentualmente qué parte corresponde a recargo nocturno, extra nocturna, festivos y dominicales para que todo sume el $100\%$ del valor prometido al guarda.

### B. Análisis de las Imágenes Añadidas (El Día a Día del Analista de Nómina)
* **Trabajo Multi-Ventana Simultáneo:** En ambas capturas se observa que el operador mantiene abiertas al mismo tiempo las ventanas de **Hoja de Vida**, **Manejo y Liquidación de Licencias (Novedades)** y **Asignación de Empleados a Puestos de Trabajo**. Esto ocurre porque en Pronos la información está fragmentada: la Hoja de Vida no permite cambiar el puesto ni ver el historial de novedades de forma integrada.
* **Impacto del Cambio de SMMLV en Novedades (Imagen 1 - Guarda Beleño Brayan):** En la grilla de licencias e incapacidades se ve cómo el *Salario Promedio* evoluciona con los años: en 2024 su turno no laborado (concepto `504`) se liquidó sobre una base de $\$1.300.000$; en 2025 el Día de la Familia (`110`) sobre $\$1.423.500$; y en febrero/julio de 2026 sobre $\$1.750.905$ (valor diario de $\$58.364$).
* **Alta Rotación entre Puestos y Roles (Imagen 2 - Guarda Mosquera Brayner):** En la ventana derecha (*Asignación de Dependencias Operativas*) se evidencia que un mismo vigilante rota constantemente de puesto e incluso de función dentro de un mismo cliente o entre clientes: pasó por *Agrupación San Marcos* (`10290`), *Argenta 138 24 Horas* (`10670`), *Conjunto Matisse* (`1121`), *Matisse Medios Tecnológicos* (`1122`) y *Matisse Supervisor* (`1120`). **Conclusión clave:** El motor de nómina debe liquidar por tramos de días según los puestos por los que pasó el guarda en el mes.

### C. Fricciones y Deuda Técnica de Pronos que NO se deben replicar
* **Procesos manuales en cascada:** En Pronos, si el usuario olvida ejecutar manualmente el botón «Importar novedades desde programación» o el botón «Actualizar IBCs» antes de sacar la Planilla PILA, la liquidación sale errónea.
* **Dependencia excesiva de archivos `.CSV` y `.TXT` manuales:** Para contabilidad, bancos, descuentos de cooperativas y programación se obliga al usuario a armar archivos en Excel con columnas fijas como `FIN, FIN`.

---

## 2. Componentes y Submódulos a Desarrollar

Para cubrir todas las necesidades de la empresa de vigilancia sin clonar la rigidez de Pronos, el sistema debe estructurarse en **7 Submódulos Nucleares** (dejando por fuera el módulo de *Almacén/Kardex* de Pronos, que pertenece a logística/inventarios y solo debe conectarse con nómina cuando exista un descuento por pérdida o daño de dotación):

### Submódulo 1: Configuración Legal, Maestros y Motor de Conceptos
Es el cimiento paramétrico del sistema:
* **Parámetros Anuales de Ley:** Histórico de SMMLV, Auxilio de Transporte, topes de FSP (Fondo de Solidaridad Pensional), porcentajes de Salud/Pensión/ARL/Parafiscales y porcentajes legales de recargos (nocturno, dominical, festivo, extras diurnas/nocturnas).
* **Calendario de Días Festivos:** Tabla anual de festivos nacionales para cálculo automático de recargos y días hábiles de vacaciones.
* **Motor de Conceptos y «Agrupadores Base» (Tablas de Conceptos):** Creación de conceptos de Devengo (`1-99`), Licencias/Incapacidades (`100-110`), Deducciones (`500-599`) y Seguridad Social (`600+`), definiendo si son proporcionales a los días trabajados y si son constitutivos de salario. En lugar de las tablas manuales de Pronos (`LIQ`, `PRI`, `CES`, `VAC`, `IBC`, `IBC2`, `IBC3`), se usan *flags* booleanos o etiquetas de agrupación en cada concepto para saber qué base alimenta.
* **Catálogos Oficiales:** Bancos, Cargos, Ciudades DANE, Entidades de Seguridad Social (EPS, AFP, ARL, CCF con sus códigos oficiales PLU/PILA), Causales de Retiro y catálogo diagnóstico **CIE-10** para incapacidades.
* **Parametrización Contable por Concepto:** Asignación dual de cuenta contable PUC según si el empleado es **Administrativo (Cuenta 51...)** u **Operativo/Vigilancia (Cuenta 72...)**, más manejo de NIT de tercero afectado.

### Submódulo 2: Estructura de Costos Operativos y Modalidades de Vigilancia
Traduce los contratos de seguridad a reglas salariales:
* **Jerarquía Operativa:** `Sucursal` (Ciudad/Regional) $\rightarrow$ `Centro de Costo` (Cliente contratante) $\rightarrow$ `Dependencia` (Puesto de trabajo específico).
* **Ficha Financiera del Puesto (Dependencia):** Configuración del valor mensual pagado en ese puesto, monto prestacional, clase de riesgo ARL (ej. Riesgo IV o V para guardas), tipo de cotizante y modalidad de liquidación (Fijo, Variable, Por Promedio Garantizado o Por Programación).
* **Matriz de Modalidades de Turno:** Configuración de turnos ($12\text{h}$ diurno, $12\text{h}$ nocturno, $24\text{h}$ rotativo) y su distribución porcentual de conceptos suplementarios cuando se paga por tarifa promedio garantizada.

### Submódulo 3: Gestión de Personal, Expediente Digital y Cumplimiento SVSP (Cap/SOMA)
Unifica lo que en Pronos está partido entre *Hoja de Vida* y *Cap./SOMA*:
* **Hoja de Vida Unificada (Vista 360°):** Datos personales, ubicación DANE, libreta militar, grupo familiar (hijos para subsidios/bienestar), datos bancarios, afiliaciones a seguridad social (EPS, AFP, CCF, Cesantías), tipo de contrato, fecha de vencimiento (para alertas de preavisos) y estado (Activo / Retirado / Bloqueado).
* **Gestor Documental de Requisitos:** Lista de chequeo parametrizable (Cédula, Examen de ingreso, Psicofísico, Afiliaciones) con visor PDF integrado y estado de aptitud.
* **Control de Cursos de Vigilancia y Exportación RENOVA:** Registro de Academias de Seguridad autorizadas, Niveles de curso exigidos por la SuperVigilancia (`1101 Fundamentación`, `1201 Reentrenamiento`, especializaciones aeroportuaria, financiera, residencial, etc.), fecha de acreditación, código **NRO** y generación directa de la estructura Excel para cargue en la plataforma **RENOVA** de la SuperVigilancia, con alertas de cursos vencidos.
* **Capacitaciones Internas:** Registro de charlas/entrenamientos internos, instructor, intensidad horaria y calificación ($1$ a $5$).

### Submódulo 4: Programación de Turnos, Asistencia y Novedades de Tiempo
El puente entre el departamento de Operaciones y Nómina:
* **Historial y Asignación de Puestos:** Asignación individual o masiva de guardas a puestos con trazabilidad exacta de fechas de cambio (permitiendo saber en qué puestos estuvo un guarda o un «relevante/descansero» durante el mes).
* **Motor de Secuencias y Programación:** Generador automático de calendarios basado en secuencias (ej. `2X2X2` = `D-D-N-N-X-X`, `4X2`, `5X2`) o cargue masivo, más una grilla interactiva de **Control de Turnos** día a día para registrar apoyos o cambios de última hora sin dañar toda la programación del mes.
* **Control de Refuerzos Facturables:** Registro de guardas enviados como refuerzo adicional a clientes para alimentar tanto el pago del turno adicional como el cobro comercial al cliente.
* **Gestión de Ausentismos, Licencias e Incapacidades:** Registro directo (o sincronizado automáticamente desde la grilla de programación, donde se marcan códigos como `INC` Enfermedad General, `AT` Accidente de Trabajo, `LMA` Maternidad, `LNR` No Remunerada, `SAN` Sanción, `AUS` Ausencia, `110` Día de la Familia).
* **Módulo de Cartera y Recobro de Incapacidades (EPS/ARL):** Seguimiento financiero de incapacidades mayores a $2$ días (Fecha de cobro, Fecha de pago, Valor reconocido por la EPS/ARL, Estado y Observaciones).

### Submódulo 5: Novedades Financieras, Préstamos, Anticipos y Libranzas
* **Motor de Préstamos y Libranzas:** Creación de préstamos internos o con cooperativas/entidades (monto total, número de cuotas, cuota fija, control automático de cuotas pagadas, saldo pendiente y estado activo/inactivo).
* **Conceptos Fijos / Permanentes:** Asignación de devengos o deducciones recurrentes (ej. Auxilio de comunicación, Bono de puesto, Seguro fúnebre) configurables ya sea **por empleado** (en 1ra quincena, 2da quincena o mensual) o **por puesto/dependencia** (calculado por valor diario según días laborados en ese puesto).
* **Importador Masivo de Novedades Variables:** Cargue validado en lote para descuentos puntuales del mes (ej. cooperativas, fondo de empleados, casino) y cargue de horas extras manuales para personal administrativo.
* **Liquidación de Anticipos Quincenales:** Para empresas que liquidan nómina mensual pero pagan un anticipo fijo o porcentual el día $15$ (con opción de descontar o contemplar novedades de ausentismo ocurridas en la primera quincena).

### Submódulo 6: Motor Central de Liquidación (Nómina, Prestaciones y Definitivas)
El corazón matemático del módulo:
* **Pre-Nómina y Liquidación de Periodo:** Ejecución por lote (filtrable por sucursal, cliente/centro de costo, puesto o empleado), con pantalla de **Manejo/Edición Manual de Nómina** para ajustes puntuales y botón de recálculo inmediato de Seguridad Social. Incluye cierre y **Bloqueo por Fecha** para impedir que Operaciones altere turnos o novedades de periodos ya pagados.
* **Motor de Prestaciones Sociales (Con Proyección de Promedios):**
  * **Vacaciones:** Control de libro de vacaciones (días causados, tomados y pendientes), liquidación en tiempo o compensadas en dinero, parametrización de sábado como día hábil o inhábil, y cálculo sobre el salario promedio del último año.
  * **Cesantías e Intereses ($12\%$):** Liquidación anual con capacidad de **proyectar el promedio a 31 de diciembre** tomando el corte a 30 de noviembre (muy usado cuando se requiere consolidar antes de cerrar diciembre) y opción de enviar los intereses directamente como novedad pagable en la nómina.
  * **Prima de Servicios:** Liquidación semestral (junio y diciembre) con soporte de fecha de corte proyectada (ej. promediar a mayo y proyectar a junio) e inyección directa a novedades de pago.
* **Liquidación Definitiva de Contrato (Liquidación Total):** Flujo guiado que inactiva al trabajador, calcula tiempos netos descontando licencias no remuneradas/sanciones, integra el último periodo de salario (o lo separa si ya se pagó en nómina), promedia horas extras y recargos, liquida vacaciones/cesantías/intereses/prima proporcionales, cruza saldos de préstamos pendientes y genera el documento de paz y salvo legal.
* **Actualización Masiva de Salarios Básicos:** Herramienta de cambio de año fiscal para actualizar de un solo golpe a todos los trabajadores que ganan el SMMLV.

### Submódulo 7: Dispersiones, Cumplimiento Legal (PILA / DIAN) y Reportería
* **Liquidador de Seguridad Social y Planilla Única (PILA):** Cálculo automático de IBC (Salud/Pensión, ARL, Caja de Compensación), generación de novedades de doble línea (ingresos, retiros, incapacidades, licencias, vacaciones) y exportación del archivo plano `.TXT` bajo el estándar del operador de información junto con el resumen `.CSV` de auditoría.
* **Nómina Electrónica DIAN:** Mapeo de conceptos internos a los códigos oficiales **NIE** de la DIAN, generación de estructura XML/JSON, conexión con proveedor tecnológico/API DIAN, monitor de estados (**Enviados**, **Aprobados**, **Rechazos** con log de errores), almacenamiento de **CUNE** y generación del comprobante gráfico PDF con código QR.
* **Generador Multi-Banco (Archivos ACH):** Generación de archivos planos de dispersión bancaria según el formato de cada entidad (Bancolombia, Banco Caja Social, Davivienda, Bogotá, etc.) tanto para nómina como para anticipos y liquidaciones, alertando sobre empleados sin cuenta configurada.
* **Centro de Emisión Documental e Informes:**
  * Desprendibles de pago (con opción de ocultar conceptos específicos o agrupar horas extras) y envío masivo por correo electrónico con trazabilidad de entrega.
  * Constancias laborales parametrizables (con sueldo básico o promedio) para activos y retirados.
  * **Certificado de Ingresos y Retenciones (Formulario 220 DIAN)** anual.
  * Informes de Acumulados mensuales por concepto, Nómina por Dependencias/Clientes, Saldos de Préstamos y Bitácora de Auditoría de Usuarios (quién creó, modificó o eliminó qué registro y a qué hora).

---

## 3. Plan de Desarrollo General y Distribución de Esfuerzo

Desarrollar un sistema de nómina para vigilancia desde cero es un proyecto de **envergadura media-alta**, principalmente por la exactitud matemática y legal que exige (un peso mal calculado en un IBC o en una hora extra nocturna dominical multiplica errores en cientos de guardias).

Para abordar el desarrollo de forma ordenada, modular y sin bloqueos, lo ideal es dividirlo en **6 Fases Secuenciales**:

| Fase | Nombre del Hito | Alcance y Entregables Clave | Peso Estimado del Proyecto |
| :--- | :--- | :--- | :---: |
| **Fase 1** | **Cimientos, Maestros y Estructura Operativa** | • Modelos de datos base, parámetros de ley anuales (SMMLV, topes, porcentajes) y festivos.<br>• Catálogo de entidades (EPS, AFP, ARL, CCF, Bancos, CIE-10).<br>• Motor de Conceptos de Nómina, reglas de agrupación (IBC, Prestaciones) y parametrización de cuentas contables (Admin vs. Operativo).<br>• Estructura de `Sucursales` $\rightarrow$ `Centros de Costo (Clientes)` $\rightarrow$ `Dependencias (Puestos)` y `Modalidades de Turno`. | **$15\%$** |
| **Fase 2** | **Expediente de Personal (Hoja de Vida 360°) y Cumplimiento SVSP** | • Consola unificada del empleado (datos personales, contrato, seguridad social, banco, familia) que elimine la necesidad de abrir 3 ventanas a la vez.<br>• Gestor documental en PDF de requisitos de contratación.<br>• Submódulo de Academias, Niveles de Vigilancia, control de vencimiento de cursos y exportador para **RENOVA (SuperVigilancia)**. | **$15\%$** |
| **Fase 3** | **Programación, Turnos y Novedades (Tiempo y Dinero)** | • Historial de asignación y rotación de guardas por puestos con fechas de corte.<br>• Motor de secuencias (`2x2x2`, etc.), grilla de Control de Turnos diario y registro de Refuerzos.<br>• Liquidador de Licencias, Incapacidades (con CIE-10), Ausencias y Sanciones sincronizado con la programación.<br>• Módulo de Préstamos/Cuotas, Conceptos Permanentes (por empleado y por puesto), Anticipos de salario e Importador masivo `.CSV`/Excel. | **$20\%$** |
| **Fase 4** | **Motor de Liquidación de Nómina, Desprendibles y Bancos** | • Algoritmo central de liquidación por rangos (cruce de días en cada puesto + turnos + recargos + novedades + préstamos + retenciones + seguridad social).<br>• Consola de revisión/edición manual de pre-nómina y bloqueo de periodos cerrados.<br>• Generación de Desprendibles PDF (con despacho masivo por email) y generador de archivos planos de Bancos. | **$20\%$** |
| **Fase 5** | **Motor de Prestaciones Sociales y Liquidaciones Definitivas** | • Módulo de Vacaciones (control de saldos de días, disfrutadas vs. compensadas, cálculo de promedios anuales).<br>• Liquidador de Cesantías, Intereses a las Cesantías y Primas semestrales con motor de fecha promedio proyectada.<br>• Liquidador Total de Contrato (retiro, indemnizaciones, paz y salvo y cruce de cartera del empleado).<br>• Seguimiento de recobros de incapacidades ante EPS/ARL. | **$15\%$** |
| **Fase 6** | **Cumplimiento Normativo Externo (PILA, DIAN, Contabilidad) y BI** | • Liquidador de IBCs y generador de archivo plano **Planilla Única (PILA)** multi-línea.<br>• Integración de **Nómina Electrónica DIAN** (mapeo de códigos NIE, envío, control de CUNE y rechazos).<br>• Exportador de interfaz contable por terceros y centros de costo.<br>• Generador del Certificado de Ingresos y Retenciones (Formato 220), reportes de acumulados y auditoría de sistema. | **$15\%$** |

---

## 4. Recomendación Estratégica de Distribución del Trabajo

Si se aborda este desarrollo de forma progresiva, la clave para no abrumarse con la magnitud es separar la **complejidad de interfaz (CRUDs y vistas)** de la **complejidad algorítmica (motores de cálculo)**:

1. **Bloque A — Gestión y Operación Diaria (Fases 1, 2 y 3):** Es el bloque donde los usuarios pasan el $80\%$ del tiempo (creando hojas de vida, asignando puestos y registrando incapacidades o préstamos, tal como se observa en las capturas de pantalla). Si se construye una **Vista Unificada del Empleado** donde en una sola pantalla con pestañas limpias el analista vea *Datos Básicos + Puestos Asignados en el Mes + Novedades/Licencias + Préstamos*, se habrá mejorado drásticamente la experiencia frente a Pronos desde el primer día.
2. **Bloque B — El Motor Matemático (Fases 4 y 5):** Debe construirse como un servicio puro y aislado, respaldado por pruebas unitarias exhaustivas (comparando la liquidación de $10$ o $20$ guardias reales en Pronos contra el nuevo motor hasta que den exactamente los mismos pesos y centavos).
3. **Bloque C — Integraciones y Archivos Planos (Fase 6):** PILA, Bancos, Contabilidad y Nómina Electrónica son traductores de datos que toman la nómina ya liquidada en el Bloque B y la formatean según las estructuras exigidas por cada entidad externa.