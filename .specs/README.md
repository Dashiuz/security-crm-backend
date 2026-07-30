# Noxia Spec-Kit (Spec Driven Development) 🚀

Este directorio `.specs/` contiene el conjunto de herramientas y especificaciones que rigen el desarrollo guiado por especificaciones (**Spec Driven Development - SDD**) para el sistema **Noxia (Security CRM)**.

## 📌 Guía de Uso del Spec-Kit

Cualquier nueva funcionalidad, módulo o refactorización importante **DEBE** comenzar especificándose mediante una plantilla de este directorio antes de redactar código de producción.

### Estructura de Directorios

```text
.specs/
├── README.md                          # Este archivo
├── templates/                         # Plantillas oficiales (prefijo template.*)
│   ├── template.feature-spec.md       # Plantilla principal de especificación completa
│   ├── template.api-contract.md       # Plantilla detallada de contrato API REST
│   └── template.ui-spec.md            # Plantilla detallada de UI/UX para Next.js
├── 01-regulation/                     # Especificaciones de Identidad, Auth, Tenants y RBAC
├── 02-operation/                      # Especificaciones de Minuta Virtual, Visitantes, Correspondencia, etc.
└── 03-administrative/                 # Especificaciones de Gestión Comercial y Financiera
```

---

## 📋 Proceso SDD Paso a Paso

1. **Copiar una Plantilla**:
   Copia `templates/template.feature-spec.md` al módulo correspondiente (ej: `02-operation/SPEC-OPE-001-minuta-general.md`).

2. **Diligenciar la Especificación**:
   Define con precisión:
   - Permisos RBAC requeridos (`modulo:accion`).
   - Reglas de Aislamiento Multi-Tenant (interceptor Prisma y `RequestContextService`).
   - Modelo de datos Prisma (`prisma/schema/*.prisma`).
   - Contratos API REST (NestJS DTOs, endpoints, Swagger).
   - Componentes Frontend (Next.js App Router, formulación UI/UX Pro Max).
   - Criterios de Aceptación y Pruebas Unitarias/E2E.

3. **Revisión y Aprobación**:
   La especificación debe ser revisada contra el documento de arquitectura para garantizar que respeta las leyes del Sandbox de Impersonación y Aislamiento Multi-Tenant.

4. **Implementación y Verificación**:
   Desarrollar Backend -> Frontend -> Pruebas -> Actualización de Swagger.
