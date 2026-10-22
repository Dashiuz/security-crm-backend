const fs = require('fs');
const path = require('path');

const schemaDir = path.resolve(__dirname, '../prisma/schema');
const targetFile = path.resolve(__dirname, '../csv_templates/schemas.md');

const groups = [
  {
    title: '1. Configuración de Base de Datos y Generadores',
    description: 'Definición del cliente de Prisma, extensiones y conexión a PostgreSQL.',
    files: ['generator.prisma', 'datasource.prisma']
  },
  {
    title: '2. Enumeraciones Globales del Sistema (Enums)',
    description: 'Catálogo de valores permitidos para estados, clasificaciones, tipos de documento y políticas.',
    files: ['enums.prisma']
  },
  {
    title: '3. Gobierno, Multitenancy y Seguridad (Core SaaS & RBAC)',
    description: 'Arquitectura multi-inquilino (Tenants), control de acceso basado en roles (RBAC), sesiones y auditoría.',
    files: [
      'tenant.prisma',
      'user.prisma',
      'role.prisma',
      'permission.prisma',
      'rolePermission.prisma',
      'userRole.prisma',
      'userSession.prisma',
      'user_client_access.prisma',
      'feature.prisma',
      'audit.prisma',
      'department.prisma',
      'position.prisma',
      'file_import_log.prisma'
    ]
  },
  {
    title: '4. Módulo Administrativo, Clientes e Inmuebles',
    description: 'Directorio de clientes, copropiedades, jerarquía física (Torre, Piso, Unidad), residentes, empleados y PQRS.',
    files: [
      'clients.prisma',
      'client_properties.prisma',
      'tower.prisma',
      'floor.prisma',
      'unit.prisma',
      'resident.prisma',
      'employee.prisma',
      'security_studies.prisma',
      'pqrs.prisma'
    ]
  },
  {
    title: '5. Módulo Operativo y Control de Acceso (Minutas y Campo)',
    description: 'Control de portería, visitantes, correspondencia, parqueaderos, minutas de puesto y archivos adjuntos.',
    files: [
      'minuta.prisma',
      'visitor_entry_control.prisma',
      'correspondence_received_control.prisma',
      'parking_resident_vehicle_control.prisma',
      'media_attachment.prisma',
      'notification.prisma'
    ]
  }
];

let md = '';

md += '# Esquema de Datos Consolidado (Prisma ORM) - Noxia Security ERP & CRM\n\n';
md += '> **Archivo**: `csv_templates/schemas.md`  \n';
md += '> **Fuente**: `prisma/schema/*.prisma` (31 archivos modulares bajo `prismaSchemaFolder`)  \n';
md += '> **Motor**: PostgreSQL 16+  \n';
md += '> **Total Modelos**: 32 modelos relacionales  \n';
md += '> **Total Enums**: 24 enumeraciones tipadas  \n\n';
md += '---\n\n';

md += '## 1. Guía Rápida de Mapeo para Plantillas CSV (`csv_templates/`)\n\n';
md += 'Este documento consolida todos los esquemas de la base de datos para facilitar la consulta y validación de columnas al crear o modificar plantillas de importación masiva en formato CSV.\n\n';

md += '| Plantilla CSV | Modelos Prisma Relacionados | Columnas / Campos Principales | Notas de Validación |\n';
md += '| :--- | :--- | :--- | :--- |\n';
md += '| `clientes_plantilla.csv`<br>`clientes_otro_tenant.csv`<br>`clientes_tercer_tenant.csv` | `Client`<br>`ClientProperties` | `name`, `documentType`, `documentNumber`, `sector`, `category`, `address`, `phone`, `email` | `sector` debe ser uno de `ClientSector` (RESIDENTIAL, COMMERCIAL, etc.). `documentType` usa `IdType`. |\n';
md += '| `empleados.csv` | `Employee`<br>`Department`<br>`Position` | `firstName`, `lastName`, `documentType`, `document`, `birthdate`, `gender`, `address`, `entryDate`, `departmentId`, `positionId` | Validación de cédula única por tenant. Fechas en formato ISO `YYYY-MM-DD`. |\n';
md += '| `residentes_plantilla.csv`<br>`residentes_plantilla_144.csv`<br>`residentes_plantilla_200.csv` | `Resident`<br>`Unit`<br>`Tower`<br>`Floor` | `name`, `document`, `phone`, `email`, `tower`, `unit`, `residentType` | `residentType` debe ser `OWNER` o `TENANT`. Se asocia automáticamente a la unidad y torre correspondiente. |\n';
md += '| `cargos.csv`<br>`mas_cargos.csv` | `Position`<br>`Department` | `name`, `description`, `departmentId` | `departmentId` debe existir previamente en el tenant. |\n';
md += '| `departamentos.csv` | `Department` | `name`, `code` | `code` es opcional o único por departamento en el tenant. |\n\n';

md += '---\n\n';

md += '## 2. Índice General de Archivos y Modelos\n\n';

groups.forEach(g => {
  md += `### ${g.title}\n`;
  md += `${g.description}\n\n`;
  g.files.forEach(f => {
    const filePath = path.join(schemaDir, f);
    const content = fs.readFileSync(filePath, 'utf8');
    const models = (content.match(/model\s+(\w+)/g) || []).map(m => m.split(/\s+/)[1]);
    const enums = (content.match(/enum\s+(\w+)/g) || []).map(e => e.split(/\s+/)[1]).filter(e => e !== 'luego');
    const items = [...models.map(m => `\`model ${m}\``), ...enums.map(e => `\`enum ${e}\``)];
    const anchor = f.replace(/[^a-zA-Z0-9_-]/g, '');
    md += `- [${f}](#${anchor}): ${items.join(', ') || 'Configuración'}\n`;
  });
  md += '\n';
});

md += '---\n\n';
md += '## 3. Esquemas Prisma Modulares Detallados\n\n';

groups.forEach(g => {
  md += `### ${g.title}\n\n`;
  md += `${g.description}\n\n`;

  g.files.forEach(f => {
    const filePath = path.join(schemaDir, f);
    const content = fs.readFileSync(filePath, 'utf8').trim();
    const anchor = f.replace(/[^a-zA-Z0-9_-]/g, '');

    md += `<a id="${anchor}"></a>\n`;
    md += `#### Archivo: \`prisma/schema/${f}\`\n\n`;
    md += '```prisma\n';
    md += content + '\n';
    md += '```\n\n';
  });
});

md += '---\n\n';
md += '## 4. Esquema Completo Consolidado (Single-File Schema)\n\n';
md += 'A continuación se presenta la consolidación íntegra de todos los modelos y enumeraciones en un único bloque continuo para referencia directa en herramientas como Prisma Studio, DBML o diagramadores ER:\n\n';

md += '```prisma\n';
groups.forEach(g => {
  md += `// ============================================================================\n`;
  md += `// ${g.title}\n`;
  md += `// ============================================================================\n\n`;

  g.files.forEach(f => {
    const filePath = path.join(schemaDir, f);
    const content = fs.readFileSync(filePath, 'utf8').trim();
    md += `// --- Inicio: prisma/schema/${f} ---\n`;
    md += content + '\n';
    md += `// --- Fin: prisma/schema/${f} ---\n\n`;
  });
});
md += '```\n';

fs.writeFileSync(targetFile, md, 'utf8');
console.log('Successfully written:', targetFile);
console.log('File size (bytes):', fs.statSync(targetFile).size);
