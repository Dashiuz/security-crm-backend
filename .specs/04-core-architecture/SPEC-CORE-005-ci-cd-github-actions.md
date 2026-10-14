# SPEC-CORE-005: Pipelines de CI/CD con GitHub Actions, Integridad de Base de Datos y Puertas de Calidad

> **Estado**: `COMPLETADO`  
> **Módulo**: `core-architecture / devops / ci-cd / database / quality-gate`  
> **Autor(es)**: `Software Architect & Senior DevOps Engineer`  
> **Fecha de Creación**: `2026-10-14`  
> **Última Actualización**: `2026-10-14`  

---

## 1. Contexto de Negocio e Historias de Usuario

### 1.1 Objetivo
Establecer un ecosistema de Integración y Despliegue Continuo (**CI/CD**) automatizado, resiliente y de alto estándar mediante **GitHub Actions** para los repositorios de **Backend** (`security-crm-backend`) y **Frontend** (`security-crm-frontend`).

El sistema garantiza:
1. **Verificación Estricta de Calidad y Tipado**: Ningún código con errores de TypeScript (`tsc --noEmit`), advertencias críticas de linter o fallos en pruebas unitarias podrá integrarse a la rama `main`.
2. **Generación Determinista de Prisma**: Ejecución obligatoria de `npx prisma generate` previo a cualquier análisis o ejecución de pruebas para asegurar la existencia de tipos ORM en el runner efímero de CI.
3. **Auditoría e Integridad de Base de Datos**: Validación de desfase (*drift detection*) entre el historial de migraciones de Prisma y la base de datos de producción en Supabase (`npx prisma migrate status`).
4. **Despliegue Secuencial Seguro en Backend**: En ramas principales (`main`), aplicar automáticamente migraciones pendientes en Supabase (`npx prisma migrate deploy`) antes de disparar el webhook de despliegue en Render (`RENDER_DEPLOY_HOOK_URL`), previniendo caídas por inconsistencia de esquemas.
5. **Quality Gate de Frontend**: Verificación exhaustiva de compilación de producción en Next.js con Turbopack y React Compiler sin exposición de secretos ni credenciales públicas quemadas en el código.

### 1.2 Historias de Usuario (User Stories)
- **US-01 (Backend Quality Gate)**: Como **Arquitecto de Software**, quiero que cada Pull Request y push a `main` valide tipos, linting y el 100% de las pruebas unitarias con servicios externos mockeados (S3, Resend, Supabase), para que las ramas protegidas permanezcan siempre estables.
- **US-02 (Database Drift Protection)**: Como **DBA / DevOps**, quiero que el pipeline verifique la coherencia del esquema con Supabase en el puerto 5432, para detectar migraciones faltantes o alteraciones no autorizadas antes de autorizar un despliegue.
- **US-03 (Zero-Downtime Backend CD)**: Como **Ingeniero de Operaciones**, quiero que las migraciones se apliquen en Supabase de forma atómica antes de que Render inicie la actualización de la API, para evitar errores de modelo en tiempo de ejecución.
- **US-04 (Frontend Quality Assurance)**: Como **Frontend Lead**, quiero que cada cambio verifique que `next build` compile limpiamente con Turbopack, garantizando que el despliegue automático nativo de Vercel nunca reciba código roto.

---

## 2. Especificación Técnica de los Flujos

### 2.1 Backend CI/CD Pipeline (`backend-ci.yml`)

#### Disparadores (`on`):
- `push` a ramas `[main, staging, develop]`.
- `pull_request` contra ramas `[main, staging, develop]`.

#### Jobs y Secuencia:
1. **`code-quality-and-tests`**:
   - `actions/checkout@v4`
   - `actions/setup-node@v4` con Node.js 20 y caché de `npm`.
   - `npm ci`
   - **`npx prisma generate`**: Mandatorio antes de tipado y tests.
   - `npx prisma validate`
   - `npx tsc --noEmit` (0 errores permitidos).
   - `npm run lint`
   - `npm test` (Jest en ambiente `NODE_ENV=test` con variables dummy seguras para evitar llamadas de red a AWS S3 o Resend).

2. **`db-integrity-and-drift`** (`needs: [code-quality-and-tests]`):
   - Conexión al Session Pooler de Supabase en IPv4 utilizando `${{ secrets.DATABASE_URL }}` (`aws-0-us-west-2.pooler.supabase.com:5432`).
   - `npx prisma migrate status` con análisis contextual inteligente:
     - Si el esquema está al día (código 0): Aprobado.
     - Si se detecta *drift* estructural o error de conexión: Falla inmediata del pipeline.
     - Si se detectan migraciones pendientes locales: En eventos `pull_request` o pushes a ramas no-producción (`staging`, `develop`) se aprueba informando que se desplegarán al mezclar a `main`, evitando falsos negativos en revisión de código. En eventos `push` a `main`, da paso ordenado al job de despliegue.

3. **`deploy-to-render`** (`needs: [db-integrity-and-drift]`, condicional: `github.ref == 'refs/heads/main' && github.event_name == 'push'`):
   - `npx prisma migrate deploy`: Aplica atómicamente todas las migraciones pendientes en Supabase.
   - `npx prisma migrate status`: Post-verificación obligatoria garantizando que la base de datos de producción quedó 100% al día.
   - Disparo seguro de `RENDER_DEPLOY_HOOK_URL` mediante cURL con validación de código HTTP 200/201.

### 2.2 Frontend CI Quality Gate (`frontend-ci.yml`)

#### Disparadores (`on`):
- `push` a ramas `[main, staging, develop]`.
- `pull_request` contra ramas `[main, staging, develop]`.

#### Jobs y Secuencia:
1. **`quality-gate`**:
   - `actions/checkout@v4`
   - `actions/setup-node@v4` con Node.js 20 y caché de `npm`.
   - `npm ci`
   - `npx tsc --noEmit` (0 errores de TypeScript estricto).
   - `npm run lint`
   - `npm run build` (Next.js Turbopack) inyectando:
     - `NEXT_PUBLIC_API_BASE_URL: ${{ secrets.NEXT_PUBLIC_API_BASE_URL }}`
     - `NEXT_PUBLIC_MAPBOX_TOKEN: ${{ secrets.NEXT_PUBLIC_MAPBOX_TOKEN }}`
   - **Cero secretos hardcodeados**: Eliminación de cualquier valor de respaldo sensible en el archivo YAML.

---

## 3. Matriz de Variables de Entorno y Secretos

| Repositorio | Secreto / Variable | Propósito | Entorno |
| :--- | :--- | :--- | :--- |
| `security-crm-backend` | `DATABASE_URL` | Cadena directa Supabase (puerto 5432 con SSL) | CI/CD |
| `security-crm-backend` | `RENDER_DEPLOY_HOOK_URL` | Webhook de despliegue en Render | CD (`main`) |
| `security-crm-frontend` | `NEXT_PUBLIC_API_BASE_URL` | URL base de la API backend en Render | CI (`next build`) |
| `security-crm-frontend` | `NEXT_PUBLIC_MAPBOX_TOKEN` | Token de acceso público a Mapbox | CI (`next build`) |

---

## 4. Plan de Ejecución

- [x] Diseñar arquitectura y validar discrepancias de infraestructura (Supabase 6543 vs 5432, Render hook, Vercel).
- [x] Crear especificación técnica `SPEC-CORE-005-ci-cd-github-actions.md`.
- [x] Generar archivo `security-crm-backend/.github/workflows/backend-ci.yml`.
- [x] Generar archivo `security-crm-frontend/.github/workflows/frontend-ci.yml`.
- [x] Actualizar bitácora `.specs/ai-decisions.log`.
- [x] Validar sintaxis y coherencia estructural de los archivos generados.
