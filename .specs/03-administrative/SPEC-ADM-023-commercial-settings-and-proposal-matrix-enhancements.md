# `SPEC-ADM-023`: Ecosistema Comercial - Paridad y Robustecimiento de Vigencias SVSP, Matriz Salarial y Cotizaciones

> **Estado**: `PROPUESTA TÉCNICA / LISTO PARA IMPLEMENTACIÓN`  
> **Módulos Backend**: `modules/commercial/settings`, `modules/commercial/proposals`  
> **Especificación Frontend**: [`SPEC-UI-005`](file:///d:/projects/security-crm-frontend/.specs/SPEC-UI-005-commercial-proposal-and-salary-matrix-enhancements.md)  
> **Código de Especificación**: `SPEC-ADM-023-commercial-settings-and-proposal-matrix-enhancements`  
> **Fecha**: 2026-10-25  

---

## 1. Alcance y Contexto Técnico

Esta especificación técnica respalda los 8 puntos acordados con la dirección para el módulo comercial:
1. Auto-completado de puestos desde `SecurityServiceCatalog`.
2. Auto-vinculación del costo laboral de `PositionSalaryMatrix` hacia las cotizaciones.
3. Soporte de firmantes ad-hoc en el payload y snapshot de propuestas comerciales (`draftSnapshotJson`).
4. Soporte masivo y dinámico para agregar cargos operativos arbitrarios en la matriz salarial.
5. Flexibilidad de esquemas de turnos (`SCHEDULE_2X2X2`, `SCHEDULE_3X3X2`, `SCHEDULE_4X4X2`, `SCHEDULE_5X1`, `SCHEDULE_5X2`) con factores de guardas por puesto calculados.
6. Cálculo algorítmico de horas extras y recargos con base en la jornada legal (Ley 2101 / 44h en 2026).
7. Vinculación estricta de la simulación salarial con la vigencia tarifaria activa y resolución del bug de casteo numérico en `CreateTariffPeriodDto` y `UpdateTariffPeriodDto`.
8. Eliminación física/lógica de registros individuales de `PositionSalaryMatrix` vía `DELETE /commercial/settings/salary-matrix/:id`.

---

## 2. Ajustes en DTOs y Validación

### Corrección en `CreateTariffPeriodDto` y `UpdateTariffPeriodDto`
* Se decoran todos los campos numéricos con `@Type(() => Number)` de `class-transformer`:
  ```ts
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  smmlv: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monthlyTransportAux: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  dailyTransportAux: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  baseHourlyRate?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  commercialMultiplier?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  strata46Multiplier?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  strata13Multiplier?: number;
  ```
Esto garantiza que los valores numéricos provenientes de formularios o de serializaciones Prisma `Decimal` sean convertidos a primitivas de punto flotante antes de que `class-validator` ejecute las aserciones `@IsNumber()`.

---

## 3. Matriz Salarial y Cálculo de Costo Real
* El motor `GuardSalaryCalculationEngine` provee las constantes de recargo por tipología:
  - Ord. Nocturna: $+35\%$
  - Extra Diurna: $+25\%$
  - Extra Nocturna: $+75\%$
  - Dominical Diurna: $+80\%$
  - Dominical Nocturna: $+115\%$
* El servicio `CommercialSettingsService.getSalaryMatrix` entrega los registros por tenant para sincronización directa con el simulador P&L en el frontend.

---

## 4. Requerimientos de Calidad y Cobertura
* Cobertura de pruebas unitarias $\ge 80\%$ en suites de `commercial/settings` y `commercial/proposals`.
* Cero conflictos de migración con Prisma (`npx prisma migrate dev` estricto en caso de nuevas entidades).
* Cero regresiones en los 46 casos de prueba vigentes del módulo comercial.
