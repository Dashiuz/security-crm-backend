# ESPECIFICACIÓN UI/UX FRONTEND: [Nombre de la Vista / Módulo]

> **Especificación asociada**: `[SPEC-OPE-XXX / SPEC-REG-XXX / SPEC-ADM-XXX]`  
> **Ruta App Router**: `src/app/(protected)/[modulo]/[recurso]/page.tsx`  
> **Skill de Diseño**: `ui-ux-pro-max`, `vercel-react-best-practices`  

---

## 1. Arquitectura de la Vista Frontend

### 1.1 Estructura de Carpetas y Componentes
```text
src/app/(protected)/[modulo]/[recurso]/
├── page.tsx                           # Punto de entrada de la página (Server/Client boundary)
├── _components/                       # Componentes exclusivos de la vista
│   ├── [recurso]-table.tsx            # Tabla paginada de registros
│   ├── [recurso]-form-modal.tsx       # Modal/Formulario de creación o edición
│   ├── [recurso]-filters.tsx          # Bar de filtros (búsqueda, rango de fechas, estado)
│   └── [recurso]-void-modal.tsx       # Modal de confirmación de anulación
└── _hooks/                            # Custom hooks para mutación y fetch de datos
    └── use-[recurso].ts
```

---

## 2. Guías de Diseño UI/UX (Estándar Noxia UI)

### 2.1 Paleta de Colores y Tokens
- **Fondo**: Neutral Dark `#0F172A` (Slate-900) con superficies Glassmorphic `#1E293B/80` (Slate-800 con backdrop-blur).
- **Acento Primario**: Indigo / Cyber Blue `#6366F1` para acciones principales (Crear, Guardar).
- **Badges de Estado**:
  - `ACTIVE`: Verde Esmeralda `#10B981` (Emerald-500)
  - `VOIDED` / `CANCELLED`: Rojo Rosa `#F43F5E` (Rose-500)
  - `PENDING`: Ámbar `#F59E0B` (Amber-500)

### 2.2 Componentes de la Interfaz

#### A. Encabezado de Página (Header Section)
- Título principal (`h1`) con la tipografía oficial.
- Muestra el contexto del tenant activo y breadcrumbs de navegación.
- Botón de acción principal `[ + Crear Nuevo Registro ]` con estilo destacado.

#### B. Barra de Filtros (Filter Bar)
- Input de búsqueda en tiempo real (debounce 300ms).
- Selector de rango de fechas (Date Range Picker).
- Selector de estado (`Todos`, `Activos`, `Anulados`).

#### C. Tabla Principal de Datos
- Columnas: `Fecha/Hora`, `Anotación / Título`, `Categoría`, `Registrado Por`, `Estado`, `Acciones`.
- Paginador integrado en el pie de tabla (`Página X de Y`, controles `Anterior` y `Siguiente`).
- Micro-animaciones en hover sobre las filas de la tabla.

#### D. Formulario Reactivo (Modal)
- Formulario modal con validación previa al envío (`react-hook-form` + `zod` o `yup`).
- Indicadores visuales de carga (spinner / disabled state) mientras la petición POST/PATCH está en curso.
- Feedback de éxito mediante Toast notification.

---

## 3. Manejo de Estados y Errores

### 3.1 Estados de Interfaz (UI States)
1. **Loading State**: Esqueletos (Skeletons) animados en la tabla mientras se cargan los datos.
2. **Empty State**: Ilustración/mensaje amigable cuando no existen registros para el filtro seleccionado.
3. **Error State**: Banner explicativo en caso de falla de red o error de servidor (`500`).
4. **Forbidden State (403)**: Mensaje de permiso insuficiente si el rol del usuario no cuenta con `[modulo]:read`.

---

## 4. Checklist de Cumplimiento UI/UX

- [ ] La vista es 100% responsiva (Mobile, Tablet, Desktop).
- [ ] No existen colores genéricos sin estilo (se usan tokens de Tailwind/Vanilla CSS del sistema).
- [ ] Los botones e inputs cuentan con estados `:hover`, `:focus-visible` y `:disabled` claramente diferenciados.
- [ ] Todas las llamadas a la API gestionan tokens de autenticación JWT y manejan errores `401` redirigiendo al login.
