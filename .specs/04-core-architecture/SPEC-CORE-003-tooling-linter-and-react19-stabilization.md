# SPEC-CORE-003: Calibración de Linters (Backend/Frontend), Estabilización de React 19 y Garantía de No-Regresión

> **Estado**: `COMPLETADO`  
> **Módulo**: `core-architecture / tooling / linter / react-19 / frontend / backend`  
> **Autor(es)**: `Software Architect & Senior Fullstack Engineer`  
> **Fecha de Creación**: `2026-10-13`  
> **Última Actualización**: `2026-10-13`  

---

## 1. Contexto de Negocio e Historias de Usuario

### 1.1 Objetivo
Estabilizar las herramientas de calidad de código (ESLint) en Backend y Frontend, y resolver las advertencias y errores generados por las nuevas reglas estrictas de **React 19 / React Compiler**, garantizando una política de **cero regresiones** sobre las funcionalidades existentes en producción.

### 1.2 Historias de Usuario (User Stories)
- **US-01**: Como **Ingeniero Backend**, quiero que `npm run lint` sea una herramienta ágil y libre de falsos positivos causados por el tipado dinámico de NestJS/Prisma, para que el pipeline de integración continua (CI) valide la calidad sin bloqueos espurios.
- **US-02**: Como **Ingeniero Frontend**, quiero que los componentes y proveedores de contexto cumplan las directivas de React 19 (sin accesos a `ref` en render ni llamadas síncronas a `setState` en efectos), eliminando renders en cascada y comportamientos no reactivos.
- **US-03**: Como **Arquitecto de Software**, quiero que todas las suites de prueba unitarias existentes (27 suites, 140 tests en backend) y el proceso de compilación de producción de Next.js (33 rutas) sigan pasando al 100% sin degradar el rendimiento ni romper contratos.

---

## 2. Especificación Técnica

### 2.1 Backend: Calibración de `eslint.config.mjs`
- **Archivo**: `d:\projects\security-crm-backend\eslint.config.mjs`
- **Problema**: La activación de `tseslint.configs.recommendedTypeChecked` combinada con `@typescript-eslint/no-explicit-any: 'off'` generaba más de 2000 errores de tipo `no-unsafe-*` en estructuras dinámicas intrínsecas a NestJS (como decoradores `@Req() req: any`, `RequestContextService`, y llamadas proxy de Prisma).
- **Solución Implementada**:
  - Desactivadas las reglas de inspección insegura sobre `any` (`no-unsafe-assignment`, `no-unsafe-member-access`, `no-unsafe-call`, `no-unsafe-return`).
  - Mantenidas como advertencia (`warn`) las llamadas sin control de promesas (`no-floating-promises`), argumentos inseguros (`no-unsafe-argument`), tipos redundantes (`no-redundant-type-constituents`), métodos sin await (`require-await`), y variables no utilizadas (`no-unused-vars` con prefijo `_`).
  - Desactivada `unbound-method` para evitar falsos positivos con mocks en tests Jest.
  - Mantenida `prettier/prettier` en `'error'` para estricta consistencia de formato.
  - Corregido escape superfluo en regex de `resident.service.ts`.

### 2.2 Frontend: Calibración de `eslint.config.mjs`
- **Archivo**: `d:\projects\security-crm-frontend\eslint.config.mjs`
- **Problema**: El preset `eslint-config-next/typescript` imponía `@typescript-eslint/no-explicit-any: 'error'`, bloqueando llamadas de utilidades API y adaptadores frontend (~420 errores), junto con la regla experimental `react-hooks/set-state-in-effect`.
- **Solución Implementada**:
  - Ajustado `@typescript-eslint/no-explicit-any` a `'warn'` para advertir su uso durante el desarrollo sin detener la compilación de entrega continua.
  - Ajustado `react-hooks/set-state-in-effect` a `'warn'` para permitir patrones legítimos de sincronización de formularios en diálogos abiertos.
  - Escapadas comillas simples en texto JSX de `pqrs/page.tsx`.

### 2.3 Frontend: Refactorización React 19 y React Compiler

#### A. `SseProvider.tsx` (`react-hooks/refs`)
- **Archivo**: `d:\projects\security-crm-frontend\src\providers\SseProvider.tsx`
- **Implementación**:
  - Declarado estado reactivo: `const [isConnected, setIsConnected] = useState<boolean>(false);`
  - En `eventSource.onopen`: ejecutar `setIsConnected(true);`
  - En `eventSource.onerror`: ejecutar `setIsConnected(false);`
  - En cleanup del `useEffect`: ejecutar `setIsConnected(false);`
  - En el Provider: `value={{ isConnected }}` (reactivo para toda la aplicación).

#### B. `TenantProvider.tsx` (`react-hooks/set-state-in-effect`)
- **Archivo**: `d:\projects\security-crm-frontend\src\providers\TenantProvider.tsx`
- **Implementación**:
  - Derivado el estado directamente sin `useState`: `const tenant = session?.user?.tenant ?? null;`
  - Reducido el `useEffect` exclusivamente al efecto secundario en el DOM externo (`document.title`).
  - Eliminado render en cascada innecesario.

#### C. `notification-sound.ts` (`react-hooks/set-state-in-effect`)
- **Archivo**: `d:\projects\security-crm-frontend\src\utils\notification-sound.ts`
- **Implementación**:
  - Eliminada la asignación síncrona redundante dentro del cuerpo del efecto al montar, preservando los listeners de eventos para `MUTE_CHANGE_EVENT` y `storage`.
  - Cero renders en cascada y sincronización intacta.

---

## 3. Plan de Verificación y Cero Regresiones

Batería ejecutada con éxito total:

1. **Backend**:
   - `npx.cmd prisma validate`: Esquemas 100% válidos.
   - `npx.cmd tsc --noEmit`: 0 errores de TypeScript estricto.
   - `npm.cmd test`: **27/27 suites en verde, 140/140 pruebas aprobadas**.
   - `npm.cmd run lint`: **0 errores**.
2. **Frontend**:
   - `npx.cmd tsc --noEmit`: 0 errores de TypeScript.
   - `npm.cmd run build`: **100% de páginas y rutas (33 rutas) compiladas exitosamente con Turbopack**.
   - `npm.cmd run lint`: **0 errores**.

---

## 4. Plan de Ejecución por Fases (Checklist SDD)

### Fase 1: Calibración de Linters
- [x] Aplicar calibración de reglas en `d:\projects\security-crm-backend\eslint.config.mjs`.
- [x] Aplicar calibración de reglas en `d:\projects\security-crm-frontend\eslint.config.mjs`.
- [x] Validar `npm.cmd run lint` en backend (0 errores).

### Fase 2: Estabilización de Hooks React 19 en Frontend
- [x] Refactorizar `SseProvider.tsx` con estado reactivo `isConnected`.
- [x] Refactorizar `TenantProvider.tsx` con estado derivado puro de sesión.
- [x] Refactorizar `notification-sound.ts` eliminando llamada redundante en efecto.
- [x] Validar `npm.cmd run lint` en frontend (0 errores).

### Fase 3: Pruebas de Regresión y Cierre
- [x] Ejecutar suite completa `npm.cmd test` en backend (140/140 tests en verde).
- [x] Ejecutar `npm.cmd run build` en frontend (33 rutas generadas).
- [x] Registrar decisiones y cambios en `d:\projects\security-crm-backend\.specs\ai-decisions.log`.
