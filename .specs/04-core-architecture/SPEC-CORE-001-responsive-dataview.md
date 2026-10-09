# SPEC-CORE-001: Responsive Data View & Cursor Pagination 📱🚀

## 1. Contexto y Objetivos
Se requiere modernizar la interfaz de usuario para dispositivos móviles mediante la implementación de un componente universal virtualizado (`<ResponsiveDataView />`). Para lograr una experiencia fluida sin cargar excesivamente la memoria del dispositivo, se implementará paginación basada en cursores (Cursor-Based Pagination) en el backend, garantizando retrocompatibilidad absoluta con el comportamiento actual de los `DataTable` de escritorio.

---

## 2. Puntos de Implementación en Frontend (`security-crm-frontend`)

### 2.1. Instalación de Dependencia
- Instalar la librería de virtualización: `npm install react-virtuoso`.

### 2.2. Modernización de `DataTable.tsx` (Columna de Acciones)
- Modificar el objeto `actionsColumn`.
- Cambiar `showInMenu={false}` a `showInMenu={true}` para los botones por defecto (Ver Detalle, Editar, Eliminar).
- Utilizar `React.cloneElement` para interceptar dinámicamente cualquier array generado por la función `customActions(row)` y forzar `showInMenu: true` y una propiedad `key` válida.
- Reducir el `width` por defecto de la columna a `80px` (o `100px` si hay customActions).

### 2.3. Creación del componente maestro `<ResponsiveDataView />`
- **Ruta**: `src/components/common/ResponsiveDataView.tsx`
- **Props**: Extenderá de `DataTableProps` (Omitiendo `endpoint` y `rows`) para mantener compatibilidad con la creación de botones, filtros de estado, etc. Se añadirán props específicas:
  - `renderMobileCard: (item: any) => React.ReactNode`
  - `fetchFn: (cursor?: string) => Promise<{ data: any[], nextCursor: string | null }>`
- **Comportamiento Desktop (`md+`)**: Renderiza el `<DataTable>` pasándole todos los props rest (`...rest`) y los datos acumulados a través de `rows`. Oculta los controles de carga virtual.
- **Comportamiento Mobile (`xs, sm`)**:
  - Oculta el `<DataTable>`.
  - Renderiza un `<Virtuoso />` utilizando `useWindowScroll` para scroll nativo.
  - Al detectar `endReached`, invoca silenciosamente `fetchFn` pasando el `nextCursor`.
  - Muestra un `<CircularProgress>` en el pie de la lista virtual durante la carga de nuevas páginas.

---

## 3. Modificaciones en el Backend (`security-crm-backend`) (Cursor-Based Pagination)

Para soportar el *Infinite Scrolling* nativo de la App sin romper la funcionalidad actual de los listados, se implementará una adaptación retrocompatible:

### 3.1. DTO de Paginación Universal
Crear un DTO común en `src/common/dto/cursor-pagination.dto.ts`:
```typescript
import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CursorPaginationDto {
  @ApiPropertyOptional({ description: 'ID del último elemento cargado para paginación' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ description: 'Cantidad máxima de elementos a retornar', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  take?: number = 20;
}
```

### 3.2. Adaptación en Capa de Servicios y Repositorios
Los métodos `findAll` (y equivalentes) recibirán opcionalmente este objeto de paginación.
La inyección en Prisma será segura y retrocompatible:
```typescript
const args: any = {
  where: { /* filtros actuales */ },
  orderBy: { createdAt: 'desc' } // Obligatorio para paginación por cursor determinista
};

if (pagination?.cursor) {
  args.cursor = { id: pagination.cursor };
  args.skip = 1; // Para no repetir el elemento del cursor
}

if (pagination?.take) {
  args.take = pagination.take;
}

const data = await this.prisma.model.findMany(args);
```

### 3.3. Estructura de Respuesta en Controladores (Retrocompatibilidad Asegurada)
El controlador interceptará la respuesta plana actual y retornará un formato de envoltorio (Envelope Pattern):

```typescript
// Lógica para determinar el nextCursor
const nextCursor = data.length === take ? data[data.length - 1].id : null;

return {
  data: data,
  meta: {
    nextCursor
  }
};
```
> **NOTA DE SEGURIDAD**: La implementación actual del componente `<DataTable>` en el frontend extrae la información utilizando la instrucción: `Array.isArray(data) ? data : data?.data || []`. Esto significa que al migrar el backend de un Array plano `[...]` al objeto `{ data: [...], meta: {...} }`, **absolutamente ningún DataTable actual en el frontend se romperá**, logrando un cambio transparente de arquitectura.

---

## 4. Criterios de Aceptación y Pruebas
1. Los DataTables existentes en Desktop mostrarán sus acciones en un menú kebab de 3 puntos en vez de botones horizontales.
2. La vista móvil de la lista que adopte `ResponsiveDataView` (ej. Clientes, Usuarios, etc.) renderizará tarjetas en vez de tablas horizontales aplastadas.
3. El scroll en móvil cargará automáticamente nuevas páginas (infinite scroll) disparando la función al final del componente.
4. El backend responderá correctamente tanto sin cursor (estado inicial) como con cursor, respetando el tamaño máximo (`take`).
