# Noxia API 🚀

Noxia es el potente motor de backend para el ecosistema de gestión de seguridad y CRM. Diseñado para ser escalable, seguro y altamente automatizado, Noxia centraliza la lógica empresarial de control de accesos, regulación administrativa y operaciones de seguridad en tiempo real.

## Objetivo

El objetivo principal de Noxia es proporcionar una infraestructura robusta y multitenant que permita a las empresas de seguridad gestionar múltiples sedes (tenants) con total aislamiento de datos, mientras automatiza tareas críticas como la auditoría de registros y el cumplimiento normativo.

## Características Clave

- **Aislamiento Multitenant**: Garantía de seguridad donde los datos de un cliente nunca son visibles para otro.
- **Auditoría Automatizada**: Cada cambio en el sistema es rastreado sin intervención manual del desarrollador.
- **Arquitectura Modular**: Facilita la expansión de funcionalidades en áreas como Regulación, Operación y Administración.
- **Cumplimiento Normativo**: Herramientas integradas para la gestión de empleados, dotaciones y bitácoras operativas.

## Guía de Inicio Rápido

### Requisitos Previos

- Node.js (v18+)
- PostgreSQL (v15+)
- npm / yarn

### Instalación

```bash
$ npm install
```

### Configuración

Crea un archivo `.env` en la raíz del proyecto basándote en `.env.example` y configura tus credenciales de base de datos y secretos JWT.

### Ejecución

```bash
# modo desarrollo
$ npm run start:dev

# modo producción
$ npm run start:prod
```

### Base de Datos (Prisma)

```bash
# Generar cliente
$ npx prisma generate

# Aplicar migraciones
$ npx prisma migrate dev
```

## Recursos

- [Arquitectura Detallada](ARCHITECTURE.md)
- [Documentación NestJS](https://docs.nestjs.com)

---

## Licencia

Noxia es [licencia privada](LICENSE). Prohibida su distribución no autorizada.
