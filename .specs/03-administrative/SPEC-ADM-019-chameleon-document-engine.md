# SPEC-ADM-019: Motor Transversal "Dossier Camaleón", Zero-Bloat Storage y Editor Asistido de Cláusulas

> **Estado**: `EN REVISIÓN / PROPUESTA TÉCNICA`  
> **Módulo Principal**: `commercial` (con extensión transversal a `human-resources`, `operations`, `quality-basc`)  
> **Ubicación Frontend**:
> - `src/app/(protected)/commercial/settings/components/tabs/DocumentSkinTab.tsx`
> - `src/app/(protected)/commercial/settings/components/tabs/SignersManagementTab.tsx`
> - `src/app/(protected)/commercial/settings/components/drawers/SnippetEditorDrawer.tsx` (Editor TipTap MIT)
> - `src/components/common/LivePdfPreview.tsx` (Visor agnóstico react-pdf en memoria)
> - `src/components/common/RichTextEditor.tsx` (Wrapper canónico MUI de TipTap)
>
> **Ubicación Backend**:
> - `src/modules/commercial/` (Reubicado como módulo troncal de 1er nivel)
> - `src/modules/commercial/repositories/commercial-settings.repository.ts` (Patrón Repositorio)
> - `src/modules/commercial/document-engine/` (Servicios de compilación e interpolación)
> - `src/modules/signatures/` (Integración con `SignatureRequest`, `SignatureGeneratorService` y `pdf-lib`)
> - `src/modules/storage/services/s3.service.ts` (Ampliación canónica de `generateS3Key`)
> - `prisma/schema/commercial_settings.prisma` (Evolución armónica del esquema existente)
> - `prisma/schema/document_engine.prisma` (Modelos de firmantes y trazabilidad)
>
> **Fecha de Creación**: 2026-10-22  
> **Autor**: Antigravity (Principal Software Architect & Lead Engineer)  
> **Dependencias Frontend Clave**: `@tiptap/react`, `@tiptap/starter-kit`, `@react-pdf/renderer`  
> **Dependencias Backend Clave**: `sharp`, `@types/sharp`, `pdf-lib` (ya instalada), `crypto`  

---

## 1. Contexto de Negocio y Filosofía Arquitectónica

### 1.1 Diagnóstico del Problema y Objetivos
En la operación de empresas de seguridad privada y vigilancia física en Colombia, la generación de documentos oficiales (propuestas económicas de licitación, cartas de presentación, órdenes de servicio, contratos laborales de guardas, actas de entrega de dotación y formatos de conocimiento de cliente BASC/ISO como `CM-F-001` y `CM-F-003`) sufre de dos problemas estructurales graves:

1. **Degradación de Marca y Dispersión de Plantillas**: Cada área (Comercial, Operaciones, RRHH, SIG) maneja formatos en Word desactualizados, con logotipos deformados, resoluciones de la SuperVigilancia desactualizadas y firmas pegadas como imágenes borrosas.
2. **Saturación y Sobrecosto en AWS S3 ("Bloat Storage")**: En sistemas convencionales, cada vez que un usuario ajusta un borrador o modifica una propuesta, se genera un archivo PDF y se sube a S3. Esto genera miles de archivos basura huérfanos que saturan el almacenamiento y multiplican los costos de infraestructura en la nube.

### 1.2 Filosofía "Zero-Bloat Storage" & Pantalla Dividida en Tiempo Real
El **Motor Dossier Camaleón** implementa una arquitectura de cero desperdicio:

```
[ PANTALLA DIVIDIDA: FRONTEND ]
┌───────────────────────────────────────────────┬────────────────────────────────────────────────────────┐
│ PANEL IZQUIERDO: FORMULARIO REACTIVO          │ PANEL DERECHO: VISOR <LivePdfPreview />                │
│                                               │                                                        │
│ • Parámetros del Formulario (Turnos, A&S, VAG)│ • Renderizado vectorial en memoria (@react-pdf).       │
│ • Cláusulas editadas en TipTap WYSIWYG        │ • 0 llamadas al backend durante la edición.            │
│ • Inserción asistida de {{variables}}         │ • 0 bytes almacenados en AWS S3.                       │
│ • Selección de Firmantes Autorizados          │ • Zoom dinámico, paginación y previsualización viva.   │
└───────────────────────────────────────────────┴────────────────────────────────────────────────────────┘
                                      │
                                      ▼
                        [ ACCIÓN: "FINALIZAR Y EMITIR" ]
                                      │
                        Payload Snapshot JSON + Aprobación
                                      │
                                      ▼
[ BACKEND NESTJS: MOTOR DOCUMENTAL & FIRMAS ]
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 1. `sharp`: Procesa logos y firmas de firmantes (recorte alfa + compresión < 20 KB en S3).              │
│ 2. `pdf-lib`: Compila el PDF vectorial oficial inmutable con hoja de evidencias y QR.                   │
│ 3. `crypto`: Calcula el Hash SHA-256 inmutable de la Ley 527 de 1999 de Comercio Electrónico.           │
│ 4. `s3Service`: Sube el archivo definitivo a S3 (ÚNICA SUBIDA: ~45 KB promedio).                       │
│ 5. `SignatureRequest`: Registra el token criptográfico y estado PENDING para firma del cliente.        │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

* **Borradores (DRAFT)**: 0 bytes en AWS S3. Se almacenan como `draftSnapshot Json? @db.JsonB` en PostgreSQL.
* **Previsualización viva**: Ocurre en el navegador mediante `@react-pdf/renderer` en memoria, sin peticiones de red continuas.
* **Documento Oficial Emitido**: Solo se compila y sube a S3 en el instante de emisión final, registrando su firma y hash SHA-256 inmutable.

### 1.3 Historias de Usuario (User Stories)
* **US-DOC-01 (Identidad Camaleón Transversal)**: Como *Administrador del Tenant*, quiero configurar la paleta de colores corporativos, logotipos optimizados y resoluciones normativas oficiales para que cualquier documento emitido en Comercial, RRHH u Operaciones adopte automáticamente la identidad corporativa.
* **US-DOC-02 (Pipeline de Activos con `sharp`)**: Como *Sistema*, debo interceptar y optimizar logos y firmas antes de subirlos a S3, aplicando recorte de márgenes transparentes (`trim`), convirtiendo a WebP/PNG y garantizando un peso menor a 20 KB.
* **US-DOC-03 (Editor de Cláusulas con TipTap MIT)**: Como *Director Comercial / Abogado*, quiero redactar y editar cláusulas o textos legales con formato enriquecido (negrita, cursiva, viñetas, encabezados) e insertar tokens variables clicables (`{{nombre_cliente}}`, `{{nit}}`, `{{canon_mensual}}`) en la posición del cursor.
* **US-DOC-04 (Gestión de Firmantes con Roles y Firmas)**: Como *Representante Legal*, quiero registrar los funcionarios autorizados para firmar (Director Comercial, Representante Legal, Director de Operaciones, etc.), cargando su firma digitalizada transparente con asignación a plantillas.
* **US-DOC-05 (Sello Forense e Integridad Ley 527)**: Como *Oficial de Cumplimiento BASC/ISO*, quiero que cada PDF emitido se congele en S3 con su hash criptográfico SHA-256 registrado en auditoría, garantizando no repudio e inmutabilidad.
* **US-DOC-06 (Pantalla Dividida `<LivePdfPreview />`)**: Como *Asesor Comercial*, quiero ver en el panel derecho de la pantalla cómo va quedando el PDF de la propuesta en tiempo real mientras edito campos en el panel izquierdo.

---

## 2. Decisiones Arquitectónicas y Reorganización de Rutas

### 2.1 Reubicación a `src/modules/commercial` (Primer Nivel)
De acuerdo con los principios de Domain-Driven Design (DDD), el área comercial deja de ser un sub-directorio de `administrative` y se consolida como módulo troncal de primer nivel:

```text
src/modules/commercial/
├── commercial.module.ts              # Módulo principal exportable para app.module.ts
├── settings/                         # Fase 1: Tarifas SVSP, Matriz Salarial, Catálogos
│   ├── controllers/
│   │   └── commercial-settings.controller.ts
│   ├── services/
│   │   ├── commercial-settings.service.ts
│   │   ├── tariff-calculation.service.ts
│   │   └── guard-salary-calculation.service.ts
│   └── dtos/
├── document-engine/                  # Fase 2: Motor Camaleón, Firmantes, Snippets, Compilador
│   ├── controllers/
│   │   ├── document-engine.controller.ts
│   │   └── signers.controller.ts
│   ├── services/
│   │   ├── chameleon-document.service.ts
│   │   ├── asset-optimization.service.ts (sharp)
│   │   └── snippet-interpolation.service.ts
│   └── dtos/
└── repositories/                     # Capa de Acceso a Datos (Patrón Repositorio)
    ├── commercial-settings.repository.ts
    └── document-engine.repository.ts
```

### 2.2 Patrón Repositorio (`CommercialSettingsRepository`)
Se elimina el acoplamiento directo de consultas Prisma en `CommercialSettingsService`. Las transacciones, consultas complejas con `include`, ordenamientos y soft-deletes se encapsulan en:

```typescript
// src/modules/commercial/repositories/commercial-settings.repository.ts
@Injectable()
export class CommercialSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByTenantId(tenantId: string) { ... }
  async createInitialSettings(data: Prisma.CommercialSettingsCreateInput) { ... }
  async updateSettings(id: string, data: Prisma.CommercialSettingsUpdateInput) { ... }
  async findTariffPeriods(tenantId: string) { ... }
  async findServiceCatalog(tenantId: string) { ... }
  // ... métodos de persistencia desacoplados
}
```

---

## 3. Modelo de Datos Prisma Armonizado

Para evitar migraciones destructivas (`DROP COLUMN`) sobre la base de datos de producción ya migrada en Fase 1, **evolucionamos armónicamente** los esquemas existentes:

### 3.1 Enums (`prisma/schema/enums.prisma`)
Se agregan los enums para encabezados y firmantes sin tocar los existentes:

```prisma
enum DocumentHeaderLayout {
  CLASSIC_MEMBRETE       // Logo izquierda, datos normativos derecha
  BANNER_CINTILLO        // Barra superior sólida en color primario
  MINIMALIST_TECH        // Tipografía compacta y logo reducido
  MODERN_SPLIT           // Doble columna asimétrica ejecutiva
}

enum SignerRoleScope {
  COMMERCIAL_DIRECTOR    // Firma director comercial
  LEGAL_REPRESENTATIVE   // Firma representante legal / gerencia general
  OPERATIONS_DIRECTOR    // Firma director de operaciones
  HUMAN_RESOURCES_HEAD   // Firma director de talento humano
  QUALITY_OFFICER        // Firma oficial de cumplimiento / SIG
  CUSTOM                 // Rol configurado a medida
}

enum SnippetCategory {
  COMMERCIAL_PROPOSAL    // Cartas de presentación, notas de vigencia
  LEGAL_CLAUSES          // Cláusulas de exoneración, confidencialidad, SARLAFT
  OPERATIONAL_ORDERS     // Consignas de puesto, protocolos
  HUMAN_RESOURCES        // Términos de contratación, acuerdos de confidencialidad
  QUALITY_BASC           // Acuerdos de seguridad BASC, políticas de SG-SST
}
```

### 3.2 Evolución de `TenantDocumentSkin` (`prisma/schema/commercial_settings.prisma`)
Se preservan los campos existentes (`primaryBrandColorHex`, `accentBrandColorHex`, etc.) y se extienden con las nuevas propiedades de layout y marca de agua:

```prisma
model TenantDocumentSkin {
  id                   String             @id @default(cuid(2))
  tenantId             String             @unique
  tenant               Tenant             @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  commercialSettingsId String?            @unique
  commercialSettings   CommercialSettings? @relation(fields: [commercialSettingsId], references: [id], onDelete: Cascade)

  // 1. Identidad Visual de Marca (Compatibilidad + Nuevos Acentos)
  primaryBrandColorHex String               @default("#1E1B4B")
  accentBrandColorHex  String               @default("#7C3AED")
  secondaryColorHex    String?              @default("#F59E0B") // Alertas y badges
  neutralDarkHex       String?              @default("#0F172A") // Textos principales
  neutralLightHex      String?              @default("#F8FAFC") // Fondos de tablas
  headerLayout         DocumentHeaderLayout @default(CLASSIC_MEMBRETE)
  watermarkEnabled     Boolean              @default(false)
  watermarkOpacity     Decimal              @default(0.06) @db.Decimal(3, 2)
  watermarkS3Key       String?

  // 2. Claves de Archivos en AWS S3
  logoS3Key            String?              // Logo principal a color (WebP < 25KB)
  secondaryLogoS3Key   String?              // Logo alternativo para fondos oscuros

  // 3. Credenciales Legales y Resoluciones SVSP
  companyLegalName         String
  companyNit               String
  commercialRegisterNum    String?
  supervigilanciaLicense   String?
  supervigilanciaLicDate   DateTime? @db.Date
  supervigilanciaLicExpiry DateTime? @db.Date
  minTicLicenseNum         String?
  uniformsResolutionNum    String?
  overtimeResolutionNum    String?
  sstImplementationPct     Decimal?  @default(99.5) @db.Decimal(5, 2)

  // 4. Sellos y Certificaciones
  hasIso9001Certified     Boolean @default(true)
  hasBascCertified        Boolean @default(true)
  hasPoliceSupportNetwork Boolean @default(true)
  hasDijinEnterpriseFront Boolean @default(true)

  // 5. Configuración de Calidad ISO / BASC
  isoDocumentCodePrefix   String? @default("CM-F")
  defaultFooterDisclaimer String? @db.Text

  // 6. Relaciones con Firmantes y Snippets
  signers                 AuthorizedSigner[]
  textSnippets            DocumentTextSnippet[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  createdById String?
  updatedById String?

  @@index([tenantId])
  @@map("tenant_document_skins")
}
```

### 3.3 Modelo de Firmantes Autorizados (`AuthorizedSigner`)
Extrae los firmantes de columnas planas a una entidad relacional dinámica:

```prisma
model AuthorizedSigner {
  id                  String             @id @default(cuid(2))
  tenantId            String
  documentSkinId      String
  documentSkin        TenantDocumentSkin @relation(fields: [documentSkinId], references: [id], onDelete: Cascade)

  fullName            String             @db.VarChar(150)
  idNumber            String             @db.VarChar(50)  // Cédula o identificación
  corporateTitle      String             @db.VarChar(120) // Ej: "Director Comercial"
  email               String             @db.VarChar(150)
  phone               String?            @db.VarChar(50)
  roleScope           SignerRoleScope    @default(CUSTOM)

  // Archivo de Firma Digitalizada Optimizado con sharp (< 18KB)
  signatureImageS3Key String
  isDefaultCommercial Boolean            @default(false)
  isDefaultLegal      Boolean            @default(false)
  isActive            Boolean            @default(true)

  createdAt           DateTime           @default(now())
  updatedAt           DateTime           @updatedAt
  createdById         String?
  updatedById         String?

  @@unique([tenantId, email])
  @@index([tenantId, isActive])
  @@map("authorized_signers")
}
```

### 3.4 Enriquecimiento de `DocumentTextSnippet`
Mantiene los campos de Fase 1 e incorpora el arreglo de variables dinámicas:

```prisma
model DocumentTextSnippet {
  id                   String              @id @default(cuid(2))
  tenantId             String
  tenant               Tenant              @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  commercialSettingsId String?
  commercialSettings   CommercialSettings? @relation(fields: [commercialSettingsId], references: [id], onDelete: Cascade)
  documentSkinId       String?
  documentSkin         TenantDocumentSkin? @relation(fields: [documentSkinId], references: [id], onDelete: Cascade)

  key                String              // "COVER_LETTER_RESIDENTIAL", "LEGAL_NOTE_SARLAFT"
  title              String              // "Carta de Presentación - Sector Residencial"
  bodyTemplate       String              @db.Text // Soporta HTML / TipTap y {{variables}}
  category           String              @default("COMMERCIAL_PROPOSAL") // Compatible con enum
  availableVariables Json                @default("[]") @db.JsonB // Lista de chips sugeridos
  isDefault          Boolean             @default(false)
  isActive           Boolean             @default(true)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  createdById String?
  updatedById String?

  @@unique([tenantId, key])
  @@index([tenantId, category])
  @@map("document_text_snippets")
}
```

---

## 4. Pipeline de Optimización de Activos con `sharp`

Para asegurar que logos de 5 MB o escaneos de firmas pesadas no degraden el tamaño de los PDFs ni saturen el almacenamiento, `AssetOptimizationService` procesa los buffers en memoria antes de invocar a `S3Service`:

```typescript
// src/modules/commercial/document-engine/services/asset-optimization.service.ts
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import sharp from 'sharp';

export interface ProcessedAsset {
  buffer: Buffer;
  mimeType: string;
  extension: string;
  width: number;
  height: number;
  sizeBytes: number;
}

@Injectable()
export class AssetOptimizationService {
  private readonly logger = new Logger(AssetOptimizationService.name);

  /**
   * Optimiza el logotipo del tenant:
   * - Redimensiona a máximo 600px de ancho preservando aspecto.
   * - Remueve metadatos EXIF.
   * - Convierte a WebP (calidad 88, peso típico 15KB - 25KB).
   */
  async processLogo(rawBuffer: Buffer): Promise<ProcessedAsset> {
    try {
      const pipeline = sharp(rawBuffer)
        .rotate()
        .resize({ width: 600, withoutEnlargement: true })
        .webp({ quality: 88, effort: 5 });

      const buffer = await pipeline.toBuffer();
      const metadata = await sharp(buffer).metadata();

      return {
        buffer,
        mimeType: 'image/webp',
        extension: 'webp',
        width: metadata.width ?? 600,
        height: metadata.height ?? 200,
        sizeBytes: buffer.length,
      };
    } catch (error) {
      this.logger.error('Error optimizando logotipo corporativo', error);
      throw new BadRequestException('El archivo de imagen del logotipo es inválido o está corrupto.');
    }
  }

  /**
   * Optimiza firmas digitalizadas para su estampación en PDFs:
   * - Recorta bordes transparentes o blancos sobrantes (.trim()).
   * - Limpia canal alfa (transparencia limpia sin recuadros grises).
   * - Escala a máximo 320px de ancho.
   * - Convierte a PNG optimizado (compresión nivel 9, peso típico 8KB - 16KB).
   */
  async processSignature(rawBuffer: Buffer): Promise<ProcessedAsset> {
    try {
      const pipeline = sharp(rawBuffer)
        .rotate()
        .trim()
        .resize({ width: 320, withoutEnlargement: true })
        .png({ compressionLevel: 9, adaptiveFiltering: true });

      const buffer = await pipeline.toBuffer();
      const metadata = await sharp(buffer).metadata();

      return {
        buffer,
        mimeType: 'image/png',
        extension: 'png',
        width: metadata.width ?? 320,
        height: metadata.height ?? 120,
        sizeBytes: buffer.length,
      };
    } catch (error) {
      this.logger.error('Error optimizando firma digitalizada', error);
      throw new BadRequestException('El archivo de firma debe ser una imagen válida con fondo transparente o neutro.');
    }
  }
}
```

### 4.1 Integración Canónica con `S3Service`
Se amplía el enum `MediaTypeCategory` en `src/modules/storage/dtos/upload-media.dto.ts` respetando el método canónico `generateS3Key(...)`:
* `MediaTypeCategory.BRAND_LOGO` $\rightarrow$ `tenants/${tenantId}/brand/${skinId}/logo-${uniqueFile}`
* `MediaTypeCategory.SIGNER_SIGNATURE` $\rightarrow$ `tenants/${tenantId}/signers/${signerId}/sig-${uniqueFile}`
* `MediaTypeCategory.COMPILED_DOCUMENT` $\rightarrow$ `tenants/${tenantId}/documents/${documentType}/${sourceId}/v${version}-${uniqueFile}`

---

## 5. Editor de Cláusulas Asistido (TipTap Core MIT)

### 5.1 Arquitectura del Componente `RichTextEditor.tsx`
Se construye un componente reutilizable en `src/components/common/RichTextEditor.tsx` basado en las librerías gratuitas y de código abierto `@tiptap/react` y `@tiptap/starter-kit`:

```
┌────────────────────────────────────────────────────────────────────────┐
│ BARRA DE HERRAMIENTAS CANÓNICA MUI (Botonera Superior)                │
├────────────────────────────────────────────────────────────────────────┤
│ [B]  [I]  [U]  [S]  |  [H1]  [H2]  [P]  |  [• Viñetas]  [1. Número]   │
├────────────────────────────────────────────────────────────────────────┤
│ BOTONERA DE VARIABLES ASISTIDA (Chips Dinámicos Clicables):            │
│ [ + Nombre Cliente ]  [ + NIT ]  [ + Ciudad ]  [ + Canon Mensual ]     │
├────────────────────────────────────────────────────────────────────────┤
│ ÁREA DE EDICIÓN WYSIWYG:                                              │
│                                                                        │
│ Respetados miembros del Consejo de Administración de {{nombre_cliente}},│
│ nos dirigimos a ustedes con el fin de presentar nuestra propuesta...  │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Lógica de Inserción Reactiva de Chips de Variables
Al pulsar cualquiera de los chips de variables (`{{nombre_cliente}}`), el editor inserta de forma instantánea el token en la posición actual del cursor sin perder el foco ni alterar el formato circundante:

```typescript
const handleInsertVariable = (variableKey: string) => {
  if (!editor) return;
  const token = `{{${variableKey}}}`;
  editor.chain().focus().insertContent(token).run();
};
```

---

## 6. Previsualización Viva (`<LivePdfPreview />`) y Emisión Inmutable

### 6.1 Visor de Pantalla Dividida en Tiempo Real
En el frontend, el componente `LivePdfPreview.tsx` utiliza `@react-pdf/renderer` en el cliente. Recibe el objeto reactivo de la propuesta (servicios, tarifas, textos de TipTap y datos de la empresa) y compila el PDF en memoria mediante `usePDF` o `BlobProvider`.

* **Ventaja clave**: El usuario ve exactamente el documento final con su paginación real, saltos de hoja, colores y membrete, con **0 bytes subidos a S3** y sin recargar la página.

### 6.2 Ciclo de Emisión Criptográfica (Sinergia con `SignatureRequest`)
Cuando el usuario pulsa **"Aprobar y Emitir Propuesta"**:
1. El backend recibe la instrucción formal de emisión.
2. Recupera la identidad del tenant (`TenantDocumentSkin`) y los firmantes autorizados (`AuthorizedSigner`).
3. Compila el PDF vectorial final.
4. Calcula el hash **SHA-256** del buffer emitido (`originalDocHash`).
5. Sube el PDF a S3 mediante `S3Service` (~45 KB promedio).
6. Crea el registro en `SignatureRequest` con estado `PENDING`, asociando el token criptográfico único.
7. Dispara la notificación por correo al cliente para que acceda al portal `/sign/[token]`.

---

## 7. Catálogo de Endpoints REST (Contratos de API)

### 7.1 Permisos RBAC
* `document:skin:read`: Consultar configuración de marca, colores y membretes.
* `document:skin:manage`: Actualizar colores, cargar logos y resoluciones normativas.
* `document:signers:manage`: Crear, actualizar y cargar firmas de firmantes autorizados.
* `document:snippets:manage`: Administrar plantillas de texto y cláusulas.

### 7.2 Endpoints de Configuración de Motor Documental
| Método | Endpoint | Descripción | Roles Autorizados |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/commercial/settings/skin` | Consulta la piel de marca del tenant | `ADMIN`, `COMMERCIAL_MANAGER`, `COMMERCIAL_AGENT` |
| `PATCH` | `/api/v1/commercial/settings/skin` | Actualiza colores y resoluciones | `ADMIN`, `COMMERCIAL_MANAGER` |
| `POST` | `/api/v1/commercial/settings/skin/logo` | Sube y optimiza con sharp el logo principal | `ADMIN`, `COMMERCIAL_MANAGER` |
| `GET` | `/api/v1/commercial/settings/signers` | Lista firmantes autorizados del tenant | `ADMIN`, `COMMERCIAL_MANAGER` |
| `POST` | `/api/v1/commercial/settings/signers` | Registra firmante y rol corporativo | `ADMIN`, `COMMERCIAL_MANAGER` |
| `PATCH` | `/api/v1/commercial/settings/signers/:id` | Edita datos de un firmante | `ADMIN`, `COMMERCIAL_MANAGER` |
| `POST` | `/api/v1/commercial/settings/signers/:id/signature` | Sube y optimiza firma (PNG transparente < 18KB) | `ADMIN`, `COMMERCIAL_MANAGER` |
| `DELETE` | `/api/v1/commercial/settings/signers/:id` | Inhabilita firmante (soft-delete) | `ADMIN`, `COMMERCIAL_MANAGER` |
| `GET` | `/api/v1/commercial/settings/snippets` | Lista cláusulas y fragmentos | `ADMIN`, `COMMERCIAL_MANAGER`, `COMMERCIAL_AGENT` |
| `POST` | `/api/v1/commercial/settings/snippets` | Crea nueva plantilla con variables TipTap | `ADMIN`, `COMMERCIAL_MANAGER` |
| `PATCH` | `/api/v1/commercial/settings/snippets/:id` | Actualiza plantilla de texto y variables | `ADMIN`, `COMMERCIAL_MANAGER` |
| `DELETE` | `/api/v1/commercial/settings/snippets/:id` | Elimina plantilla no predeterminada | `ADMIN`, `COMMERCIAL_MANAGER` |

### 7.3 Sinergia y Reutilización de Endpoints Existentes (`src/modules/signatures`)
Para evitar duplicidad funcional, reescritura de código y sobrecostos arquitectónicos, el motor documental se acopla directamente a los endpoints existentes ya implementados en el módulo de firmas:

1. **Gestión de Firma de Usuario Interno (`User Signatures`)**:
   * `GET /api/users/me/signature`: Recupera la firma digital configurada del funcionario autenticado (ej: Director Comercial, Gerente General).
   * `POST /api/users/me/signature`: Permite al funcionario registrar o dibujar su firma desde su propio perfil de usuario sin depender del módulo administrativo.
   * `DELETE /api/users/me/signature`: Remueve la firma del usuario.
   * *Articulación*: Los firmantes autorizados (`AuthorizedSigner`) que coincidan con usuarios del sistema pueden enlazar directamente su firma almacenada en `User.signatureUrl`, eliminando la necesidad de cargarla múltiples veces.

2. **Emisión, Congelamiento y Trazabilidad (`Signature Requests - Noxia Sign`)**:
   * `POST /api/signatures/requests`: Emite formalmente la solicitud de firma externa con Magic Link. Admite el payload estructurado `draftSnapshot: any` (JSONB), implementando la filosofía *Zero-Bloat Storage*.
   * `GET /api/signatures/requests/:id`: Consulta en tiempo real el estado (`PENDING`, `VIEWED`, `SIGNED`, `REVOKED`) y trazabilidad forense.
   * `POST /api/signatures/requests/:id/revoke`: Revoca el enlace activo cuando se genera una nueva versión de la propuesta comercial.

3. **Portal Público de Firma y Verificación QR (`Public Signature Portal`)**:
   * `GET /api/public/signatures/:token`: Permite al cliente externo visualizar la propuesta comercial desde el portal público `/sign/[token]`.
   * `POST /api/public/signatures/:token/sign`: Sella la firma electrónica del cliente, compila el PDF vectorial oficial con `pdf-lib`, genera la Hoja de Evidencias con hash SHA-256 inmutable y marca el trámite como `SIGNED`.
   * `GET /api/public/signatures/verify/:id`: Permite a terceros y autoridades verificar la autenticidad e integridad del documento escaneando el código QR impreso (Ley 527 de 1999).

---

## 8. Criterios de Aceptación Forense y Quality Gate

1. **Aislamiento Multi-Tenant Estricto**:
   * Ningún tenant puede consultar ni estampar firmantes o configuraciones de otro tenant. Las claves S3 respetan el prefijo estricto `tenants/${tenantId}/`.
2. **Eficiencia de Activos con `sharp`**:
   * Ningún logotipo procesado debe superar los 30 KB ni los 600px de ancho en WebP.
   * Ninguna firma digitalizada debe superar los 18 KB ni contener fondos blancos o bordes sucios; el canal alfa debe ser nítido (`trim`).
3. **Métrica Zero-Bloat en Borradores**:
   * Las propuestas en borrador ocupan **0 bytes en AWS S3** (persistencia única en `draftSnapshot JsonB`).
4. **Integridad Criptográfica Forense (Ley 527 de 1999)**:
   * Cada PDF emitido genera un hash SHA-256 idéntico al resultado de calcular `sha256(pdfBuffer)`. Cualquier alteración externa del archivo en S3 invalidará la verificación en el portal `/verify/[id]`.
5. **Estabilidad Frontend**:
   * El editor TipTap debe renderizarse con tema nativo Noxia sin advertencias en consola de React 19.
   * El visor reactivo `<LivePdfPreview />` debe actualizarse en memoria a 60 FPS sin congelar la pestaña del navegador.
6. **Cobertura de Pruebas Unitarias ($\ge 80\%$)**:
   * Todos los controladores, servicios, repositorios y utilitarios creados o modificados en el backend (`AssetOptimizationService`, `ChameleonDocumentService`, `CommercialSettingsRepository`, `SignersController`, `DocumentEngineController`, etc.) deben contar con suites de pruebas unitarias Jest (`*.spec.ts`) que garanticen una cobertura mínima del **80%** en sentencias (*statements*), ramas (*branches*), funciones (*functions*) y líneas (*lines*).
7. **Migración Formal de Base de Datos y Sincronización Local**:
   * Se debe generar el archivo de migración canónico de Prisma mediante `npx prisma migrate dev --name <nombre_migracion>` asegurando que no exista *schema drift*.
   * La base de datos PostgreSQL local debe quedar 100% migrada y actualizada sin errores, preservando intactos los registros preexistentes de Fase 1 (`CommercialSettings`, catálogos de servicios y tarifas).
