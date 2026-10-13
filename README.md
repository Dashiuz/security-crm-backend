# Noxia API 🚀

Noxia es el potente motor de backend para el ecosistema de gestión de seguridad, CRM y bitácoras operativas virtuales. Diseñado para ser escalable, seguro y altamente automatizado, Noxia centraliza la lógica empresarial de control de accesos, regulación administrativa, operaciones de seguridad en tiempo real, estudios de seguridad geoespaciales con CAD vectorial y gestión de solicitudes PQRS.

## Objetivo

El objetivo principal de Noxia es proporcionar una infraestructura robusta y multitenant que permita a las empresas de seguridad gestionar múltiples sedes (tenants) y carteras de clientes (conjuntos residenciales, empresas) con total aislamiento de datos, mientras automatiza tareas críticas como la auditoría de registros, el cumplimiento normativo y la comunicación en tiempo real.

## Características Clave

- **Aislamiento Multitenant e Impersonation Sandbox**: Garantía de seguridad donde los datos de un tenant nunca se mezclan con otro, con soporte para supervisión SuperAdmin (`GODLIKE`).
- **Seguridad a Nivel de Datos (Multi-Client Scoping)**: Row-Level Security a nivel de aplicación (`allowedClientIds`) que restringe a coordinadores y comerciales exclusivamente a sus clientes asignados.
- **Auditoría Invisible Automatizada**: Cada inserción, actualización y anulación es registrada automáticamente vía extensión de Prisma con el UUID de auditoría del usuario en sesión (ALS).
- **Monolito Modular con Bounded Contexts**: Dominios independientes para Regulación, Operaciones (4 minutas de portería) y Gestión Administrativa (Estructuras físicas, Clientes, Residentes, PQRS, Estudios de Seguridad).
- **Estudios de Seguridad & Canvas CAD**: Integración matemática con Mapbox (proyecciones Mercator) y Konva.js para trazado de geocercas perimetrales e inventario vectorial de dispositivos físicos.
- **Módulo PQRS con Event-Driven SSE**: Flujo secuencial de estados para tickets, chat con evidencia adjunta, notificaciones Server-Sent Events en tiempo real y gobernanza de prioridades.
- **Almacenamiento Seguro S3**: Gestión de archivos multimedia privados mediante URLs prefirmadas de 15 minutos en Amazon Web Services.

## Guía de Inicio Rápido

### Requisitos Previos

- Node.js (v20+)
- PostgreSQL (v15+)
- npm / yarn

### Instalación

```bash
$ npm install
```

### Configuración

Crea un archivo `.env` en la raíz del proyecto basándote en `.env.example` y configura tus credenciales de base de datos (`DATABASE_URL`), secretos JWT y credenciales AWS S3.

### Ejecución

```bash
# modo desarrollo
$ npm run start:dev

# modo producción
$ npm run start:prod
```

### Base de Datos (Prisma)

> **Nota para Windows (PowerShell):** Utilizar `npx.cmd` en lugar de `npx` para evitar restricciones de ejecución de scripts.

```bash
# Generar cliente Prisma
$ npx.cmd prisma generate

# Aplicar migraciones en desarrollo
$ npx.cmd prisma migrate dev

# Aplicar migraciones en producción / CI
$ npx.cmd prisma migrate deploy
```

### Pruebas Automatizadas

```bash
# Ejecutar suite de pruebas unitarias (Jest)
$ npm test

# Verificación de compilación TypeScript estricta
$ npx.cmd tsc --noEmit
```

## Recursos

- [Arquitectura Detallada](ARCHITECTURE.md)
- [Especificaciones SDD (.specs)](.specs/README.md)
- [Reglas Generales de Backend (.specs/00-general-rules)](.specs/00-general-rules/backend-rules.md)
- [Documentación NestJS](https://docs.nestjs.com)

---

## Licencia

Noxia es [licencia privada](LICENSE). Prohibida su distribución no autorizada.
