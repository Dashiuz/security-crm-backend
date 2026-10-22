# Esquema de Datos Consolidado (Prisma ORM) - Noxia Security ERP & CRM

> **Archivo**: `csv_templates/schemas.md`  
> **Fuente**: `prisma/schema/*.prisma` (31 archivos modulares bajo `prismaSchemaFolder`)  
> **Motor**: PostgreSQL 16+  
> **Total Modelos**: 32 modelos relacionales  
> **Total Enums**: 24 enumeraciones tipadas  

---

## 1. Guía Rápida de Mapeo para Plantillas CSV (`csv_templates/`)

Este documento consolida todos los esquemas de la base de datos para facilitar la consulta y validación de columnas al crear o modificar plantillas de importación masiva en formato CSV.

| Plantilla CSV | Modelos Prisma Relacionados | Columnas / Campos Principales | Notas de Validación |
| :--- | :--- | :--- | :--- |
| `clientes_plantilla.csv`<br>`clientes_otro_tenant.csv`<br>`clientes_tercer_tenant.csv` | `Client`<br>`ClientProperties` | `name`, `documentType`, `documentNumber`, `sector`, `category`, `address`, `phone`, `email` | `sector` debe ser uno de `ClientSector` (RESIDENTIAL, COMMERCIAL, etc.). `documentType` usa `IdType`. |
| `empleados.csv` | `Employee`<br>`Department`<br>`Position` | `firstName`, `lastName`, `documentType`, `document`, `birthdate`, `gender`, `address`, `entryDate`, `departmentId`, `positionId` | Validación de cédula única por tenant. Fechas en formato ISO `YYYY-MM-DD`. |
| `residentes_plantilla.csv`<br>`residentes_plantilla_144.csv`<br>`residentes_plantilla_200.csv` | `Resident`<br>`Unit`<br>`Tower`<br>`Floor` | `name`, `document`, `phone`, `email`, `tower`, `unit`, `residentType` | `residentType` debe ser `OWNER` o `TENANT`. Se asocia automáticamente a la unidad y torre correspondiente. |
| `cargos.csv`<br>`mas_cargos.csv` | `Position`<br>`Department` | `name`, `description`, `departmentId` | `departmentId` debe existir previamente en el tenant. |
| `departamentos.csv` | `Department` | `name`, `code` | `code` es opcional o único por departamento en el tenant. |

---

## 2. Índice General de Archivos y Modelos

### 1. Configuración de Base de Datos y Generadores
Definición del cliente de Prisma, extensiones y conexión a PostgreSQL.

- [generator.prisma](#generatorprisma): Configuración
- [datasource.prisma](#datasourceprisma): Configuración

### 2. Enumeraciones Globales del Sistema (Enums)
Catálogo de valores permitidos para estados, clasificaciones, tipos de documento y políticas.

- [enums.prisma](#enumsprisma): `enum RecordStatus`, `enum RecordSource`, `enum VehicleCondition`, `enum VisitorMode`, `enum CorrespondenceType`, `enum CorrespondenceStatus`, `enum ClientStatus`, `enum AdministrationType`, `enum ContractStatus`, `enum ClientSector`, `enum ResidentialComplexType`, `enum ResidentType`, `enum IdType`, `enum ResidencePlaceholder`, `enum UnitType`, `enum UserType`, `enum PlanTier`, `enum SubscriptionStatus`, `enum PasswordPolicy`, `enum SecurityStudyStatus`, `enum OperationalCategory`

### 3. Gobierno, Multitenancy y Seguridad (Core SaaS & RBAC)
Arquitectura multi-inquilino (Tenants), control de acceso basado en roles (RBAC), sesiones y auditoría.

- [tenant.prisma](#tenantprisma): `model Tenant`, `model TenantProfile`, `model TenantSubscription`, `model TenantSettings`
- [user.prisma](#userprisma): `model User`
- [role.prisma](#roleprisma): `model Role`
- [permission.prisma](#permissionprisma): `model Permission`
- [rolePermission.prisma](#rolePermissionprisma): `model RolePermission`
- [userRole.prisma](#userRoleprisma): `model UserRole`
- [userSession.prisma](#userSessionprisma): `model UserSession`
- [user_client_access.prisma](#user_client_accessprisma): `model UserClientAccess`
- [feature.prisma](#featureprisma): `model Feature`
- [audit.prisma](#auditprisma): `model AuditLog`
- [department.prisma](#departmentprisma): `model Department`
- [position.prisma](#positionprisma): `model Position`
- [file_import_log.prisma](#file_import_logprisma): `model FileImportLog`

### 4. Módulo Administrativo, Clientes e Inmuebles
Directorio de clientes, copropiedades, jerarquía física (Torre, Piso, Unidad), residentes, empleados y PQRS.

- [clients.prisma](#clientsprisma): `model Client`
- [client_properties.prisma](#client_propertiesprisma): `model ClientProperties`
- [tower.prisma](#towerprisma): `model Tower`
- [floor.prisma](#floorprisma): `model Floor`
- [unit.prisma](#unitprisma): `model Unit`
- [resident.prisma](#residentprisma): `model Resident`
- [employee.prisma](#employeeprisma): `model Employee`
- [security_studies.prisma](#security_studiesprisma): `model SecurityStudy`
- [pqrs.prisma](#pqrsprisma): `model PqrsTicket`, `model PqrsMessage`, `enum PqrsType`, `enum PqrsStatus`, `enum PqrsPriority`

### 5. Módulo Operativo y Control de Acceso (Minutas y Campo)
Control de portería, visitantes, correspondencia, parqueaderos, minutas de puesto y archivos adjuntos.

- [minuta.prisma](#minutaprisma): `model Minuta`
- [visitor_entry_control.prisma](#visitor_entry_controlprisma): `model VisitorEntryControl`
- [correspondence_received_control.prisma](#correspondence_received_controlprisma): `model CorrespondenceReceivedControl`
- [parking_resident_vehicle_control.prisma](#parking_resident_vehicle_controlprisma): `model ParkingResidentVehicleControl`
- [media_attachment.prisma](#media_attachmentprisma): `model MediaAttachment`
- [notification.prisma](#notificationprisma): `model Notification`

---

## 3. Esquemas Prisma Modulares Detallados

### 1. Configuración de Base de Datos y Generadores

Definición del cliente de Prisma, extensiones y conexión a PostgreSQL.

<a id="generatorprisma"></a>
#### Archivo: `prisma/schema/generator.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}
```

<a id="datasourceprisma"></a>
#### Archivo: `prisma/schema/datasource.prisma`

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### 2. Enumeraciones Globales del Sistema (Enums)

Catálogo de valores permitidos para estados, clasificaciones, tipos de documento y políticas.

<a id="enumsprisma"></a>
#### Archivo: `prisma/schema/enums.prisma`

```prisma
enum RecordStatus {
  ACTIVE
  CORRECTED
  VOIDED
}

enum RecordSource {
  WEB
  MOBILE
  IMPORT
  API
}

enum VehicleCondition {
  GOOD
  BAD
}

enum VisitorMode {
  PEDESTRIAN
  VEHICLE
}

enum CorrespondenceType {
  BOX
  ENVELOPE
  DOCUMENT
  LETTER
  PACKAGE
  FOOD_DELIVERY
  OTHER
}

enum CorrespondenceStatus {
  RECEIVED
  DELIVERED
  RETURNED
  VOIDED
}

enum ClientStatus {
  PROSPECT
  ACTIVE
  INACTIVE
}

enum AdministrationType {
  ENTERPRISE
  INDIVIDUAL
}

enum ContractStatus {
  ACTIVE
  INACTIVE
  PENDING
  EXPIRED
  CANCELLED
  SUSPENDED
  RENEWED
  TERMINATED
}

enum ClientSector {
  RESIDENTIAL
  COMMERCIAL
  INDUSTRIAL
  GOVERNMENT
  OTHER
}

enum ResidentialComplexType {
  SINGLE_BUILDING
  BUILDING_CLUSTER
  HOUSE_CLUSTER
  MIXED
  COMMERCIAL
  OTHER
}

enum ResidentType {
  OWNER
  TENANT
  FAMILY_MEMBER
  OTHER
}

enum IdType {
  CI
  CE
  PASSPORT
  NIT
  OTHER
}

enum ResidencePlaceholder {
  LETTER
  NUMBER
  ALPHANUMERIC
}

enum UnitType {
  APARTMENT
  HOUSE
  OFFICE
  WAREHOUSE
  OTHER
  TOWNHOUSE
  BODEGA
}

enum UserType {
  EMPLOYEE
  RESIDENCE_MANAGER
}

enum PlanTier {
  BASIC
  PRO
  ENTERPRISE
}

enum SubscriptionStatus {
  TRIAL
  ACTIVE
  PAST_DUE
  CANCELED
}

enum PasswordPolicy {
  LOW
  MEDIUM
  STRICT
}

enum SecurityStudyStatus {
  CURRENT
  DISCONTINUED
}

enum OperationalCategory {
  DIRECTOR
  COORDINATOR
  SUPERVISOR
  GUARD
  OPERATOR
  ADMINISTRATIVE
  OTHER
}
```

### 3. Gobierno, Multitenancy y Seguridad (Core SaaS & RBAC)

Arquitectura multi-inquilino (Tenants), control de acceso basado en roles (RBAC), sesiones y auditoría.

<a id="tenantprisma"></a>
#### Archivo: `prisma/schema/tenant.prisma`

```prisma
model Tenant {
  id             String   @id @default(cuid(2))
  name           String
  slug           String   @unique
  isActive       Boolean  @default(true)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  createdBy      String?
  updatedBy      String?
  logoUrl        String?
  primaryColor   String?  @default("#7C3AED")
  secondaryColor String?  @default("#5B21B6")
  sidebarColor   String?  @default("#1E1B4B")

  profile                        TenantProfile?
  subscription                   TenantSubscription?
  settings                       TenantSettings?

  employees   Employee[]
  users       User[]
  roles       Role[]
  departments Department[]
  positions   Position[]
  features    Feature[]

  minutas                        Minuta[]
  parkingResidentVehicleControls ParkingResidentVehicleControl[]
  visitorEntryControls           VisitorEntryControl[]
  correspondenceReceivedControls CorrespondenceReceivedControl[]
  clients                        Client[]
  residents                      Resident[]
  clientProperties               ClientProperties[]
  towers                         Tower[]
  floors                         Floor[]
  units                          Unit[]
  mediaAttachments               MediaAttachment[]
  fileImportLogs                 FileImportLog[]
  securityStudies                SecurityStudy[]
  pqrsTickets                    PqrsTicket[]
  pqrsMessages                   PqrsMessage[]
  notifications                  Notification[]
  userClientAccesses             UserClientAccess[]

  @@map("tenant")
}

model TenantProfile {
  id                  String   @id @default(cuid(2))
  tenantId            String   @unique
  tenant              Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  legalName           String   @db.VarChar(150)
  taxId               String   @db.VarChar(50) // NIT/RUT
  contactEmail        String   @db.VarChar(100)
  contactPhone        String?  @db.VarChar(50)
  address             String?  @db.VarChar(200)
  city                String?  @db.VarChar(100)
  country             String?  @db.VarChar(100)
  legalRepresentative String?  @db.VarChar(150)

  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@map("tenant_profiles")
}

model TenantSubscription {
  id                 String             @id @default(cuid(2))
  tenantId           String             @unique
  tenant             Tenant             @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  planTier           PlanTier           @default(BASIC)
  status             SubscriptionStatus @default(TRIAL)

  maxClients         Int                @default(5)
  maxUsers           Int                @default(50)
  maxEmployees       Int                @default(50)

  subscriptionEndsAt DateTime?
  paymentGatewayId   String?            @db.VarChar(100)

  createdAt          DateTime           @default(now())
  updatedAt          DateTime           @updatedAt

  @@map("tenant_subscriptions")
}

model TenantSettings {
  id                    String         @id @default(cuid(2))
  tenantId              String         @unique
  tenant                Tenant         @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  // Operativa
  timezone              String         @default("America/Bogota") @db.VarChar(50)
  currency              String         @default("COP") @db.VarChar(10)
  dateFormat            String         @default("DD/MM/YYYY") @db.VarChar(20)

  // Seguridad
  mfaRequired           Boolean        @default(false)
  sessionTimeoutMinutes Int            @default(60)
  passwordPolicy        PasswordPolicy @default(MEDIUM)

  // White-labeling avanzado
  faviconUrl            String?        @db.VarChar(255)
  loginBackgroundUrl    String?        @db.VarChar(255)
  supportEmail          String?        @db.VarChar(100)
  supportPhone          String?        @db.VarChar(50)

  createdAt             DateTime       @default(now())
  updatedAt             DateTime       @updatedAt

  @@map("tenant_settings")
}
```

<a id="userprisma"></a>
#### Archivo: `prisma/schema/user.prisma`

```prisma
model User {
  id       String @id @default(cuid(2))
  tenantId String
  tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  clientId String?
  client   Client? @relation(fields: [clientId], references: [id], onDelete: SetNull)

  userType UserType @default(EMPLOYEE)

  document     String @unique
  fullName     String
  department   String
  position     String
  passwordHash String

  isRetired    Boolean @default(false)
  isActive     Boolean @default(true)
  isFirstLogin Boolean @default(true)

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  createdBy String?
  updatedBy String?
  retiredAt DateTime? @db.Date
  deletedAt DateTime?

  roles          UserRole[]
  sessions       UserSession[]
  clientAccesses UserClientAccess[]


  // Minuta audit fields
  minutasCreated Minuta[] @relation("MinutaCreatedBy")
  minutasUpdated Minuta[] @relation("MinutaUpdatedBy")
  minutasDeleted Minuta[] @relation("MinutaDeletedBy")
  minutasVoided  Minuta[] @relation("MinutaVoidedBy")

  // Parking vehicle control
  parkingVehicleCreated ParkingResidentVehicleControl[] @relation("ParkingVehicleCreatedBy")
  parkingVehicleUpdated ParkingResidentVehicleControl[] @relation("ParkingVehicleUpdatedBy")
  parkingVehicleDeleted ParkingResidentVehicleControl[] @relation("ParkingVehicleDeletedBy")
  parkingVehicleVoided  ParkingResidentVehicleControl[] @relation("ParkingVehicleVoidedBy")
  parkingVehicleGuard   ParkingResidentVehicleControl[] @relation("ParkingVehicleGuard")

  // Visitor entry control
  visitorEntryCreated VisitorEntryControl[] @relation("VisitorEntryCreatedBy")
  visitorEntryUpdated VisitorEntryControl[] @relation("VisitorEntryUpdatedBy")
  visitorEntryDeleted VisitorEntryControl[] @relation("VisitorEntryDeletedBy")
  visitorEntryVoided  VisitorEntryControl[] @relation("VisitorEntryVoidedBy")
  visitorEntryGuard   VisitorEntryControl[] @relation("VisitorEntryGuard")

  // Correspondence
  correspondenceCreated     CorrespondenceReceivedControl[] @relation("CorrespondenceCreatedBy")
  correspondenceUpdated     CorrespondenceReceivedControl[] @relation("CorrespondenceUpdatedBy")
  correspondenceDeleted     CorrespondenceReceivedControl[] @relation("CorrespondenceDeletedBy")
  correspondenceVoided      CorrespondenceReceivedControl[] @relation("CorrespondenceVoidedBy")
  correspondenceGuardOnDuty CorrespondenceReceivedControl[] @relation("CorrespondenceGuardOnDuty")

  // Client audit fields
  clientsCreated Client[] @relation("ClientCreatedBy")
  clientsUpdated Client[] @relation("ClientUpdatedBy")
  clientsDeleted Client[] @relation("ClientDeletedBy")

  // Resident audit fields
  residentsCreated Resident[] @relation("ResidentCreatedBy")
  residentsUpdated Resident[] @relation("ResidentUpdatedBy")
  residentsDeleted Resident[] @relation("ResidentDeletedBy")

  // Security studies audit fields
  securityStudiesCreated SecurityStudy[] @relation("StudyCreatedBy")
  securityStudiesUpdated SecurityStudy[] @relation("StudyUpdatedBy")
  securityStudiesDeleted SecurityStudy[] @relation("StudyDeletedBy")

  // PQRS relations
  ticketsAssigned     PqrsTicket[]  @relation("TicketAssignedTo")
  ticketsCreated      PqrsTicket[]  @relation("TicketCreatedBy")
  ticketsUpdated      PqrsTicket[]  @relation("TicketUpdatedBy")
  ticketsVoided       PqrsTicket[]  @relation("TicketVoidedBy")
  pqrsMessagesCreated PqrsMessage[] @relation("MessageCreatedBy")
  pqrsMessagesUpdated PqrsMessage[] @relation("MessageUpdatedBy")

  // Notifications
  notifications       Notification[]

  @@index([tenantId])
  @@index([clientId])
  @@index([document])
  @@map("users")
}
```

<a id="roleprisma"></a>
#### Archivo: `prisma/schema/role.prisma`

```prisma
model Role {
  id       String @id @default(cuid(2))
  tenantId String
  tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  name     String
  isActive Boolean @default(true)
  users UserRole[]
  perms RolePermission[]

  createdAt DateTime @default(now())
  updatedAt DateTime @default(now())
  createdBy String?
  updatedBy String?

  @@unique([tenantId, name])
  @@index([tenantId])
  @@map("role")
}
```

<a id="permissionprisma"></a>
#### Archivo: `prisma/schema/permission.prisma`

```prisma
model Permission {
  id   String  @id @default(cuid(2))
  key  String  @unique
  desc String?

  roles RolePermission[]

  @@map("permission")
}
```

<a id="rolePermissionprisma"></a>
#### Archivo: `prisma/schema/rolePermission.prisma`

```prisma
model RolePermission {
  roleId       String
  permissionId String
  assignedAt   DateTime @default(now())
  assignedBy   String?

  role       Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@id([roleId, permissionId])
  @@map("role_permission")
}
```

<a id="userRoleprisma"></a>
#### Archivo: `prisma/schema/userRole.prisma`

```prisma
model UserRole {
  userId     String
  roleId     String
  assignedAt DateTime @default(now())
  assignedBy String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  role Role @relation(fields: [roleId], references: [id], onDelete: Cascade)

  @@id([userId, roleId])
  @@map("user_role")
}
```

<a id="userSessionprisma"></a>
#### Archivo: `prisma/schema/userSession.prisma`

```prisma
model UserSession {
  id     String @id @default(cuid(2))
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  refreshTokenHash     String
  userAgent            String?
  ip                   String?
  impersonatedTenantId String?
  createdAt            DateTime      @default(now())
  expiresAt            DateTime
  revokedAt            DateTime?
  replacedById         String?
  replacedBy           UserSession?  @relation("SessionRotation", fields: [replacedById], references: [id])
  replaces             UserSession[] @relation("SessionRotation")

  @@index([userId])
  @@index([expiresAt])
  @@map("user_session")
}
```

<a id="user_client_accessprisma"></a>
#### Archivo: `prisma/schema/user_client_access.prisma`

```prisma
model UserClientAccess {
  id         String    @id @default(cuid(2))
  tenantId   String
  tenant     Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  // Acceso de Usuario Digital (opcional si es personal sin cuenta digital)
  userId     String?
  user       User?     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Expediente Laboral de Empleado (opcional si es usuario sin nómina, ej: Residence Manager)
  employeeId String?
  employee   Employee? @relation(fields: [employeeId], references: [id], onDelete: Cascade)

  clientId   String
  client     Client    @relation(fields: [clientId], references: [id], onDelete: Cascade)

  roleName   String?
  isActive   Boolean   @default(true)

  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  @@unique([userId, clientId])
  @@unique([employeeId, clientId])
  @@index([tenantId])
  @@index([userId])
  @@index([employeeId])
  @@index([clientId])
  @@map("user_client_access")
}
```

<a id="featureprisma"></a>
#### Archivo: `prisma/schema/feature.prisma`

```prisma
model Feature {
  id          String   @id @default(cuid(2))
  key         String   @unique
  name        String
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  tenants Tenant[]

  @@map("feature")
}
```

<a id="auditprisma"></a>
#### Archivo: `prisma/schema/audit.prisma`

```prisma
model AuditLog {
  id        String   @id @default(cuid(2))
  tenantId  String?
  entity    String
  entityId  String
  action    String
  oldValue  Json?
  newValue  Json?
  userId    String?
  createdAt DateTime @default(now())

  @@index([tenantId])
  @@index([entity, entityId])
  @@index([userId])
  @@map("audit_log")
}
```

<a id="departmentprisma"></a>
#### Archivo: `prisma/schema/department.prisma`

```prisma
model Department {
  id       String  @id @default(cuid(2))
  tenantId String
  name     String
  isActive Boolean @default(true)

  tenant    Tenant     @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  employees Employee[] @relation("EmployeeDepartment")

  createdAt DateTime @default(now())
  updatedAt DateTime @default(now())
  createdBy String?
  updatedBy String?

  @@unique([tenantId, name])
  @@index([tenantId])
  @@map("department")
}
```

<a id="positionprisma"></a>
#### Archivo: `prisma/schema/position.prisma`

```prisma
model Position {
  id                  String              @id @default(cuid(2))
  tenantId            String
  name                String
  level               Int?
  operationalCategory OperationalCategory @default(GUARD)
  isActive            Boolean             @default(true)

  tenant    Tenant     @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  employees Employee[] @relation("EmployeePosition")

  createdAt DateTime @default(now())
  updatedAt DateTime @default(now())
  createdBy String?
  updatedBy String?

  @@unique([tenantId, name])
  @@index([tenantId])
  @@index([operationalCategory])
  @@map("position")
}
```

<a id="file_import_logprisma"></a>
#### Archivo: `prisma/schema/file_import_log.prisma`

```prisma
model FileImportLog {
  id       String @id @default(cuid(2))
  tenantId String
  tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  entityType   String // "CLIENT", "RESIDENT"
  fileName     String
  status       String // "SUCCESS", "PARTIAL", "FAILED"
  totalRows    Int
  successRows  Int
  errorRows    Int
  errorDetails Json?  @db.JsonB

  uploadedBy String // userId
  createdAt  DateTime @default(now())

  @@index([tenantId])
  @@map("file_import_logs")
}
```

### 4. Módulo Administrativo, Clientes e Inmuebles

Directorio de clientes, copropiedades, jerarquía física (Torre, Piso, Unidad), residentes, empleados y PQRS.

<a id="clientsprisma"></a>
#### Archivo: `prisma/schema/clients.prisma`

```prisma
model Client {
  id             String         @id @default(cuid(2))
  tenantId       String
  tenant         Tenant         @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  internalCode   String         @unique
  clientStatus   ClientStatus   @default(ACTIVE)
  contractStatus ContractStatus @default(ACTIVE)

  contractNumber String? @unique
  nit            String  @unique
  name           String
  email          String?
  phone          String?
  receptionPhone String?
  zipCode        String?
  address        String?
  country        String?
  city           String?
  state          String?
  commune        String?
  neighborhood   String?
  quadrant       String?
  quadrantPhone  String?
  cai            String?
  observations   String?

  sector ClientSector @default(RESIDENTIAL)


  installedTech      Boolean @default(false)
  securityStudy      String?
  weaponsAmount      Int     @default(0)
  administrator      String?
  administratorPhone String?
  administratorEmail String?

  contractDate     DateTime? @db.Date
  lastContractDate DateTime? @db.Date

  // Extended Contract Information
  renewedContract    Boolean?  @default(false)
  contractEndDate    DateTime?
  contractMediaFiles Json?     @db.JsonB

  // Extended Administrative & Contact Information
  administrationType        AdministrationType?
  administrationCompanyData Json?               @db.JsonB
  councilData               Json?               @db.JsonB

  createdAt   DateTime @default(now())
  createdById String?
  createdBy   User?    @relation("ClientCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)

  updatedAt   DateTime @updatedAt
  updatedById String?
  updatedBy   User?    @relation("ClientUpdatedBy", fields: [updatedById], references: [id], onDelete: SetNull)

  deletedAt   DateTime?
  deletedById String?
  deletedBy   User?     @relation("ClientDeletedBy", fields: [deletedById], references: [id], onDelete: SetNull)

  isActive Boolean @default(true)

  users            User[]
  clientAccesses   UserClientAccess[]
  employees        Employee[]
  minutas          Minuta[]
  visitorEntries   VisitorEntryControl[]
  correspondences  CorrespondenceReceivedControl[]
  parkingVehicles  ParkingResidentVehicleControl[]
  mediaAttachments MediaAttachment[]

  clientProperties ClientProperties?
  residents        Resident[]
  towers           Tower[]
  floors           Floor[]
  units            Unit[]
  securityStudies  SecurityStudy[]
  pqrsTickets      PqrsTicket[]
  pqrsMessages     PqrsMessage[]

  mapboxBaseImageS3Key String?
  geofence             Json?   @db.JsonB
  mapboxCenterLat      Float?
  mapboxCenterLng      Float?
  mapboxZoom           Float?
  mapboxBboxMinLat     Float?
  mapboxBboxMinLng     Float?
  mapboxBboxMaxLat     Float?
  mapboxBboxMaxLng     Float?


  @@unique([tenantId, nit])
  @@unique([tenantId, internalCode])
  @@unique([tenantId, contractNumber])
  @@index([tenantId])
  @@index([createdById])
  @@map("client")
}
```

<a id="client_propertiesprisma"></a>
#### Archivo: `prisma/schema/client_properties.prisma`

```prisma
model ClientProperties {
  id       String @id @default(cuid(2))
  tenantId String
  tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  clientId String @unique
  client   Client @relation(fields: [clientId], references: [id], onDelete: Cascade)

  structureType          ResidentialComplexType @default(BUILDING_CLUSTER)
  towersAmount           Int?                   @default(0)
  unitsAmount            Int?                   @default(0)
  hasSocialRoom          Boolean?               @default(false)
  socialRoomAmount       Int?                   @default(0)
  hasGym                 Boolean?               @default(false)
  gymAmount              Int?                   @default(0)
  hasPool                Boolean?               @default(false)
  poolAmount             Int?                   @default(0)
  hasTennisCourt         Boolean?               @default(false)
  tennisCourtAmount      Int?                   @default(0)
  hasBasketballCourt     Boolean?               @default(false)
  basketballCourtAmount  Int?                   @default(0)
  hasFootballCourt       Boolean?               @default(false)
  footballCourtAmount    Int?                   @default(0)
  hasVolleyballCourt     Boolean?               @default(false)
  volleyballCourtAmount  Int?                   @default(0)
  hasSquashCourt         Boolean?               @default(false)
  squashCourtAmount      Int?                   @default(0)
  hasPlayground          Boolean?               @default(false)
  playgroundAmount       Int?                   @default(0)
  hasParking             Boolean?               @default(false)
  parkingAmount          Int?                   @default(0)
  hasGuestParking        Boolean?               @default(false)
  guestParkingAmount     Int?                   @default(0)
  hasMotorcycleParking   Boolean?               @default(false)
  motorcycleParkingAmount Int?                  @default(0)
  hasBicycleRack         Boolean?               @default(false)
  bicycleRackAmount      Int?                   @default(0)
  bicycleCapacityPerRack Int?                   @default(0)
  hasCommercialStores    Boolean?               @default(false)
  commercialStoresAmount Int?                   @default(0)
  hasStorageRoom         Boolean?               @default(false)
  storageRoomAmount      Int?                   @default(0)

  entriesDescription Json? @db.JsonB
  entriesMediaFiles  Json? @db.JsonB
  structureConfig    Json? @db.JsonB

  mediaAttachments MediaAttachment[]

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?
  createdBy String?
  updatedBy String?
  deletedBy String?

  @@index([tenantId])
  @@index([clientId])
  @@map("client_properties")
}
```

<a id="towerprisma"></a>
#### Archivo: `prisma/schema/tower.prisma`

```prisma
model Tower {
  id       String @id @default(cuid(2))
  tenantId String
  tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  clientId String
  client   Client @relation(fields: [clientId], references: [id], onDelete: Cascade)

  towerName    String @db.VarChar(50)
  floorsAmount Int    @default(0)
  elevators    Int    @default(0)

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?
  createdBy String?
  updatedBy String?
  deletedBy String?

  units  Unit[]
  floors Floor[]

  @@index([tenantId])
  @@index([clientId])
  @@map("towers")
}
```

<a id="floorprisma"></a>
#### Archivo: `prisma/schema/floor.prisma`

```prisma
model Floor {
  id       String  @id @default(cuid(2))
  tenantId String
  tenant   Tenant  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  clientId String
  client   Client  @relation(fields: [clientId], references: [id], onDelete: Cascade)
  towerId  String?
  tower    Tower?  @relation(fields: [towerId], references: [id], onDelete: Cascade)

  floorNumber Int @default(0)

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?
  createdBy String?
  updatedBy String?
  deletedBy String?

  units Unit[]

  @@index([tenantId])
  @@index([clientId])
  @@index([towerId])
  @@map("floors")
}
```

<a id="unitprisma"></a>
#### Archivo: `prisma/schema/unit.prisma`

```prisma
model Unit {
  id       String  @id @default(cuid(2))
  tenantId String
  tenant   Tenant  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  clientId String
  client   Client  @relation(fields: [clientId], references: [id], onDelete: Cascade)
  towerId  String?
  tower    Tower?  @relation(fields: [towerId], references: [id], onDelete: Cascade)
  floorId  String?
  floor    Floor?  @relation(fields: [floorId], references: [id], onDelete: Cascade)

  unitName String   @db.VarChar(50)
  unitType UnitType @default(APARTMENT)

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?
  createdBy String?
  updatedBy String?
  deletedBy String?

  residents       Resident[]
  visitorEntries  VisitorEntryControl[]
  correspondences CorrespondenceReceivedControl[]
  minutas         Minuta[]
  parkingControls ParkingResidentVehicleControl[]

  @@index([tenantId])
  @@index([clientId])
  @@index([towerId])
  @@index([floorId])
  @@map("units")
}
```

<a id="residentprisma"></a>
#### Archivo: `prisma/schema/resident.prisma`

```prisma
model Resident {
  id              String       @id @default(cuid(2))
  tenantId        String
  tenant          Tenant       @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  clientId        String
  client          Client       @relation(fields: [clientId], references: [id], onDelete: Cascade)
  unitId          String
  unit            Unit         @relation(fields: [unitId], references: [id], onDelete: Cascade)
  residentType    ResidentType
  idType          IdType?
  firstName       String
  lastName        String
  document        String
  phoneNumber     String
  email           String?
  gender          String?      @db.VarChar(1)
  birthdate       DateTime?
  residentSince   DateTime     @default(now())
  accessStartDate DateTime?
  accessEndDate   DateTime?

  createdAt   DateTime @default(now())
  createdById String?
  createdBy   User?    @relation("ResidentCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)

  updatedAt   DateTime @updatedAt
  updatedById String?
  updatedBy   User?    @relation("ResidentUpdatedBy", fields: [updatedById], references: [id], onDelete: SetNull)

  deletedAt   DateTime?
  deletedById String?
  deletedBy   User?     @relation("ResidentDeletedBy", fields: [deletedById], references: [id], onDelete: SetNull)

  mediaAttachments MediaAttachment[]
  visitorEntries   VisitorEntryControl[]
  correspondences  CorrespondenceReceivedControl[]
  minutas          Minuta[]
  parkingControls  ParkingResidentVehicleControl[]

  @@unique([tenantId, clientId, document])
  @@index([tenantId])
  @@index([clientId])
  @@index([unitId])
  @@map("resident")
}
```

<a id="employeeprisma"></a>
#### Archivo: `prisma/schema/employee.prisma`

```prisma
model Employee {
  id       String @id @default(cuid(2))
  tenantId String
  tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  clientId String?
  client   Client? @relation(fields: [clientId], references: [id], onDelete: SetNull)

  clientHistory Json? @default("[]") @db.JsonB

  firstName       String
  secondName      String?
  lastName        String
  maternalSurname String?
  fullName        String
  documentType    String
  document        String
  birthdate       DateTime  @db.Date
  gender          String
  address         String    @default("")
  departmentId    String?
  positionId      String?
  email           String?
  phone           String?
  entryDate       DateTime  @db.Date
  isRetired       Boolean   @default(false)
  isActive        Boolean   @default(true)
  createdAt       DateTime  @default(now())
  createdBy       String?   @default("")
  updatedAt       DateTime  @updatedAt
  updatedBy       String?   @default("")
  retiredAt       DateTime? @db.Date
  deletedAt       DateTime?

  departmentRef Department? @relation("EmployeeDepartment", fields: [departmentId], references: [id], onDelete: SetNull)
  positionRef   Position?   @relation("EmployeePosition", fields: [positionId], references: [id], onDelete: SetNull)

  mediaAttachments   MediaAttachment[]
  clientAccesses     UserClientAccess[]

  parkingControls        ParkingResidentVehicleControl[]
  visitorControls        VisitorEntryControl[]
  correspondenceControls CorrespondenceReceivedControl[]

  @@unique([tenantId, document])
  @@unique([tenantId, email])
  @@index([tenantId])
  @@index([clientId])
  @@index([document])
  @@index([departmentId])
  @@index([positionId])
  @@map("employee")
}
```

<a id="security_studiesprisma"></a>
#### Archivo: `prisma/schema/security_studies.prisma`

```prisma
model SecurityStudy {
  id              String   @id @default(cuid(2))
  tenantId        String   
  tenant          Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  clientId        String
  client          Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)

  name            String?
  description     String?

  // Referencias a la Imagen Base (Generada por Mapbox API)
  baseImageS3Key   String?   
  mapboxCenterLat  Float?
  mapboxCenterLng  Float?
  mapboxZoom       Float?
  
  // Bounding Box para los cálculos Matemáticos del Canva (Vital)
  mapboxBboxMinLat Float?
  mapboxBboxMinLng Float?
  mapboxBboxMaxLat Float?
  mapboxBboxMaxLng Float?

  // El motor vectorial Konva.js
  canvasState      Json?     @db.JsonB 

  
  status          SecurityStudyStatus @default(CURRENT)
  version         Int                 @default(1)

  // Documentos adjuntos (estudio de seguridad sin canva)
  files           Json?    @db.JsonB

  // Trazabilidad Estándar
  createdAt       DateTime @default(now())
  createdById     String?
  createdBy       User?    @relation("StudyCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)

  updatedAt       DateTime @updatedAt
  updatedById     String?
  updatedBy       User?    @relation("StudyUpdatedBy", fields: [updatedById], references: [id], onDelete: SetNull)

  deletedAt       DateTime?
  deletedById     String?
  deletedBy       User?    @relation("StudyDeletedBy", fields: [deletedById], references: [id], onDelete: SetNull)

  @@index([tenantId])
  @@index([clientId])
  @@map("security_studies")
}
```

<a id="pqrsprisma"></a>
#### Archivo: `prisma/schema/pqrs.prisma`

```prisma
enum PqrsType {
  PETICION
  QUEJA
  RECLAMO
  SUGERENCIA
  FELICITACION
}

enum PqrsStatus {
  OPEN
  ASSIGNED
  IN_PROGRESS
  RESOLVED
  CLOSED
  REJECTED
  VOIDED
}

enum PqrsPriority {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

model PqrsTicket {
  id          String       @id @default(cuid(2))
  tenantId    String
  tenant      Tenant       @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  clientId    String
  client      Client       @relation(fields: [clientId], references: [id], onDelete: Cascade)

  code        String
  subject     String
  description String       @db.Text
  status      PqrsStatus   @default(OPEN)
  priority    PqrsPriority @default(MEDIUM)
  type        PqrsType

  assignedToId String?
  assignedTo   User?       @relation("TicketAssignedTo", fields: [assignedToId], references: [id], onDelete: SetNull)

  // Metadatos de Anulación Formal (Auditoría)
  voidReason  String?      @db.Text
  voidedAt    DateTime?
  voidedById  String?
  voidedBy    User?        @relation("TicketVoidedBy", fields: [voidedById], references: [id], onDelete: SetNull)

  messages    PqrsMessage[]
  attachments MediaAttachment[]

  createdById String?
  createdBy   User?       @relation("TicketCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)
  updatedById String?
  updatedBy   User?       @relation("TicketUpdatedBy", fields: [updatedById], references: [id], onDelete: SetNull)

  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  @@unique([tenantId, code])
  @@index([tenantId])
  @@index([clientId])
  @@index([assignedToId])
  @@index([status])
  @@map("pqrs_tickets")
}

model PqrsMessage {
  id           String          @id @default(cuid(2))
  tenantId     String
  tenant       Tenant          @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  clientId     String
  client       Client          @relation(fields: [clientId], references: [id], onDelete: Cascade)

  ticketId     String
  ticket       PqrsTicket      @relation(fields: [ticketId], references: [id], onDelete: Cascade)

  content      String          @db.Text
  isFromClient Boolean         @default(false)

  attachments  MediaAttachment[]

  createdById  String?
  createdBy    User?           @relation("MessageCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)
  updatedById  String?
  updatedBy    User?           @relation("MessageUpdatedBy", fields: [updatedById], references: [id], onDelete: SetNull)

  createdAt    DateTime        @default(now())
  updatedAt    DateTime        @updatedAt

  @@index([tenantId])
  @@index([clientId])
  @@index([ticketId])
  @@map("pqrs_messages")
}
```

### 5. Módulo Operativo y Control de Acceso (Minutas y Campo)

Control de portería, visitantes, correspondencia, parqueaderos, minutas de puesto y archivos adjuntos.

<a id="minutaprisma"></a>
#### Archivo: `prisma/schema/minuta.prisma`

```prisma
model Minuta {
  id       String @id @default(cuid(2))
  tenantId String
  tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  clientId String?
  client   Client? @relation(fields: [clientId], references: [id], onDelete: SetNull)

  // Core
  date       DateTime @db.Date
  time       DateTime @db.Time
  occurredAt DateTime
  annotation String

  // Opcionales útiles
  category       String?
  priority       Int? // 1..5 si quieres; o cámbialo a enum luego
  tags           String[] @default([])
  isConfidential Boolean  @default(false)

  isInternal Boolean @default(false)

  // Ubicación y Origen de Novedad
  guardPost        String?
  isResidentLinked Boolean   @default(false)
  noveltySource    String?
  unitId           String?
  unit             Unit?     @relation(fields: [unitId], references: [id], onDelete: SetNull)
  residentId       String?
  resident         Resident? @relation(fields: [residentId], references: [id], onDelete: SetNull)

  // Estado / anulación
  status     RecordStatus @default(ACTIVE)
  voidReason String?
  voidedAt   DateTime?
  voidedById String?
  voidedBy   User?        @relation("MinutaVoidedBy", fields: [voidedById], references: [id], onDelete: SetNull)

  // Auditoría transversal
  source      RecordSource @default(WEB)
  externalRef String?

  createdAt   DateTime @default(now())
  createdById String?
  createdBy   User?    @relation("MinutaCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)

  updatedAt   DateTime @updatedAt
  updatedById String?
  updatedBy   User?    @relation("MinutaUpdatedBy", fields: [updatedById], references: [id], onDelete: SetNull)

  deletedAt   DateTime?
  deletedById String?
  deletedBy   User?     @relation("MinutaDeletedBy", fields: [deletedById], references: [id], onDelete: SetNull)

  mediaAttachments MediaAttachment[]

  @@index([tenantId])
  @@index([clientId])
  @@index([unitId])
  @@index([residentId])
  @@index([tenantId, clientId])
  @@index([tenantId, isInternal])
  @@index([tenantId, date])
  @@index([tenantId, occurredAt])
  @@index([createdById])
  @@map("minuta")
}
```

<a id="visitor_entry_controlprisma"></a>
#### Archivo: `prisma/schema/visitor_entry_control.prisma`

```prisma
model VisitorEntryControl {
  id       String @id @default(cuid(2))
  tenantId String
  tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  clientId String?
  client   Client? @relation(fields: [clientId], references: [id], onDelete: SetNull)

  isInternal Boolean @default(false)

  employeeId String?
  employee   Employee? @relation(fields: [employeeId], references: [id], onDelete: SetNull)

  unitId String?
  unit   Unit?   @relation(fields: [unitId], references: [id], onDelete: SetNull)

  residentId String?
  resident   Resident? @relation(fields: [residentId], references: [id], onDelete: SetNull)

  // Base
  date       DateTime @db.Date
  time       DateTime @db.Time
  occurredAt DateTime // recomendado: datetime de entrada

  visitorFullName String
  visitorIdNumber String
  visitorIdType   String? // opcional (CC/CE/PASSPORT)

  entryTime DateTime  @db.Time
  exitTime  DateTime? @db.Time
  exitAt    DateTime? // útil para rangos

  authorizedByFullName String?
  peopleCount          Int     @default(1)

  mode VisitorMode

  // Destino (puedes mantener string + estructura)
  destination String? // "casa-bloque-apartamento" legacy-friendly
  block       String?
  apartment   String?

  ticketNumber String? // número de ficha

  // Campos vehiculares (si mode=VEHICLE)
  brand        String?
  plate        String?
  observations String?

  // Guarda de turno (quien ejecuta el control)
  guardId           String?
  guard             User?   @relation("VisitorEntryGuard", fields: [guardId], references: [id], onDelete: SetNull)
  guardNameSnapshot String?

  // Estado / anulación
  status     RecordStatus @default(ACTIVE)
  voidReason String?
  voidedAt   DateTime?
  voidedById String?
  voidedBy   User?        @relation("VisitorEntryVoidedBy", fields: [voidedById], references: [id], onDelete: SetNull)

  // Auditoría transversal
  source      RecordSource @default(WEB)
  externalRef String?

  createdAt   DateTime @default(now())
  createdById String?
  createdBy   User?    @relation("VisitorEntryCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)

  updatedAt   DateTime @updatedAt
  updatedById String?
  updatedBy   User?    @relation("VisitorEntryUpdatedBy", fields: [updatedById], references: [id], onDelete: SetNull)

  deletedAt   DateTime?
  deletedById String?
  deletedBy   User?     @relation("VisitorEntryDeletedBy", fields: [deletedById], references: [id], onDelete: SetNull)

  mediaAttachments MediaAttachment[]

  @@index([tenantId])
  @@index([clientId])
  @@index([unitId])
  @@index([residentId])
  @@index([employeeId])
  @@index([tenantId, clientId])
  @@index([tenantId, isInternal])
  @@index([tenantId, date])
  @@index([tenantId, occurredAt])
  @@index([tenantId, visitorIdNumber])
  @@index([tenantId, plate])
  @@index([guardId])
  @@map("visitor_entry_control")
}
```

<a id="correspondence_received_controlprisma"></a>
#### Archivo: `prisma/schema/correspondence_received_control.prisma`

```prisma
model CorrespondenceReceivedControl {
  id       String @id @default(cuid(2))
  tenantId String
  tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  clientId String?
  client   Client? @relation(fields: [clientId], references: [id], onDelete: SetNull)

  isInternal Boolean @default(false)

  recipientEmployeeId String?
  recipientEmployee   Employee? @relation(fields: [recipientEmployeeId], references: [id], onDelete: SetNull)

  unitId String?
  unit   Unit?   @relation(fields: [unitId], references: [id], onDelete: SetNull)

  recipientResidentId String?
  recipientResident   Resident? @relation(fields: [recipientResidentId], references: [id], onDelete: SetNull)

  // Base
  date       DateTime @db.Date
  time       DateTime @db.Time
  occurredAt DateTime // recomendado: datetime de recibido

  receivedTime DateTime @db.Time // si quieres mantener “hora de recibido” explícita

  destination    String
  sender         String? // remite
  courierCompany String?
  trackingNumber String?

  guardOnDutyId     String?
  guardOnDuty       User?   @relation("CorrespondenceGuardOnDuty", fields: [guardOnDutyId], references: [id], onDelete: SetNull)
  guardNameSnapshot String?

  receivedByName String? // “persona que recibe” (puede no ser user del sistema)

  correspondenceType CorrespondenceType
  status             CorrespondenceStatus @default(RECEIVED)

  // Entrega y Evidencia
  deliveredAt         DateTime?
  deliveredToName     String?
  deliveryEvidenceUrl String?
  deliveryNotes       String?

  observations String?

  // Anulación (alineado con los otros)
  voidReason String?
  voidedAt   DateTime?
  voidedById String?
  voidedBy   User?     @relation("CorrespondenceVoidedBy", fields: [voidedById], references: [id], onDelete: SetNull)

  // Auditoría transversal
  source      RecordSource @default(WEB)
  externalRef String?

  createdAt   DateTime @default(now())
  createdById String?
  createdBy   User?    @relation("CorrespondenceCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)

  updatedAt   DateTime @updatedAt
  updatedById String?
  updatedBy   User?    @relation("CorrespondenceUpdatedBy", fields: [updatedById], references: [id], onDelete: SetNull)

  deletedAt   DateTime?
  deletedById String?
  deletedBy   User?     @relation("CorrespondenceDeletedBy", fields: [deletedById], references: [id], onDelete: SetNull)

  mediaAttachments MediaAttachment[]

  @@index([tenantId])
  @@index([clientId])
  @@index([unitId])
  @@index([recipientResidentId])
  @@index([recipientEmployeeId])
  @@index([tenantId, clientId])
  @@index([tenantId, isInternal])
  @@index([tenantId, date])
  @@index([tenantId, occurredAt])
  @@index([tenantId, status])
  @@index([trackingNumber])
  @@index([guardOnDutyId])
  @@map("correspondence_received_control")
}
```

<a id="parking_resident_vehicle_controlprisma"></a>
#### Archivo: `prisma/schema/parking_resident_vehicle_control.prisma`

```prisma
model ParkingResidentVehicleControl {
  id       String @id @default(cuid(2))
  tenantId String
  tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  clientId String?
  client   Client? @relation(fields: [clientId], references: [id], onDelete: SetNull)

  // Base
  date       DateTime @db.Date
  time       DateTime @db.Time
  occurredAt DateTime // recomendado: datetime de ingreso (entry)

  // Horas específicas del flujo
  entryTime DateTime  @db.Time
  exitTime  DateTime? @db.Time
  exitAt    DateTime? // útil para reportes por rango de salida

  parkingNumber String
  ticketNumber  String? // número de ficha

  isInternal Boolean @default(false)

  employeeId String?
  employee   Employee? @relation(fields: [employeeId], references: [id], onDelete: SetNull)

  unitId String?
  unit   Unit?   @relation(fields: [unitId], references: [id], onDelete: SetNull)

  residentId String?
  resident   Resident? @relation(fields: [residentId], references: [id], onDelete: SetNull)

  interior  String?
  apartment String?

  plate String
  brand String?
  color String?

  // Check de elementos (puedes mantener columnas + JSON)
  mirrors          Boolean?
  antenna          Boolean?
  radio            Boolean?
  spareTire        Boolean? // repuesto
  hubcaps          Boolean? // copas
  vehicleChecklist Json?

  condition VehicleCondition @default(GOOD)

  // Guarda (operador) del registro
  guardId           String?
  guard             User?   @relation("ParkingVehicleGuard", fields: [guardId], references: [id], onDelete: SetNull)
  guardNameSnapshot String?

  observations String?

  // Estado / anulación
  status     RecordStatus @default(ACTIVE)
  voidReason String?
  voidedAt   DateTime?
  voidedById String?
  voidedBy   User?        @relation("ParkingVehicleVoidedBy", fields: [voidedById], references: [id], onDelete: SetNull)

  // Auditoría transversal
  source      RecordSource @default(WEB)
  externalRef String?

  createdAt   DateTime @default(now())
  createdById String?
  createdBy   User?    @relation("ParkingVehicleCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)

  updatedAt   DateTime @updatedAt
  updatedById String?
  updatedBy   User?    @relation("ParkingVehicleUpdatedBy", fields: [updatedById], references: [id], onDelete: SetNull)

  deletedAt   DateTime?
  deletedById String?
  deletedBy   User?     @relation("ParkingVehicleDeletedBy", fields: [deletedById], references: [id], onDelete: SetNull)

  mediaAttachments MediaAttachment[]

  @@index([tenantId])
  @@index([clientId])
  @@index([unitId])
  @@index([residentId])
  @@index([employeeId])
  @@index([tenantId, clientId])
  @@index([tenantId, isInternal])
  @@index([tenantId, date])
  @@index([tenantId, occurredAt])
  @@index([tenantId, plate])
  @@index([guardId])
  @@map("parking_resident_vehicle_control")
}
```

<a id="media_attachmentprisma"></a>
#### Archivo: `prisma/schema/media_attachment.prisma`

```prisma
model MediaAttachment {
  id       String @id @default(cuid(2))
  tenantId String
  tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  url       String @db.Text
  s3Key     String @unique
  fileName  String
  mimeType  String
  sizeBytes Int

  // Foreign Key Relations
  clientId           String?
  client             Client?                        @relation(fields: [clientId], references: [id], onDelete: Cascade)
  clientPropertiesId String?
  clientProperties   ClientProperties?              @relation(fields: [clientPropertiesId], references: [id], onDelete: Cascade)
  residentId         String?
  resident           Resident?                      @relation(fields: [residentId], references: [id], onDelete: Cascade)
  minutaId           String?
  minuta             Minuta?                        @relation(fields: [minutaId], references: [id], onDelete: Cascade)
  correspondenceId   String?
  correspondence     CorrespondenceReceivedControl? @relation(fields: [correspondenceId], references: [id], onDelete: Cascade)
  parkingVehicleId   String?
  parkingVehicle     ParkingResidentVehicleControl? @relation(fields: [parkingVehicleId], references: [id], onDelete: Cascade)
  visitorEntryId     String?
  visitorEntry       VisitorEntryControl?           @relation(fields: [visitorEntryId], references: [id], onDelete: Cascade)
  employeeId         String?
  employee           Employee?                      @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  pqrsTicketId       String?
  pqrsTicket         PqrsTicket?                    @relation(fields: [pqrsTicketId], references: [id], onDelete: Cascade)
  pqrsMessageId      String?
  pqrsMessage        PqrsMessage?                   @relation(fields: [pqrsMessageId], references: [id], onDelete: Cascade)

  uploadedById String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([tenantId])
  @@index([clientId])
  @@index([residentId])
  @@index([minutaId])
  @@index([employeeId])
  @@index([pqrsTicketId])
  @@index([pqrsMessageId])
  @@index([s3Key])
  @@map("media_attachments")
}
```

<a id="notificationprisma"></a>
#### Archivo: `prisma/schema/notification.prisma`

```prisma
model Notification {
  id        String   @id @default(cuid(2))
  tenantId  String
  tenant    Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  title     String
  message   String
  type      String   // 'PQRS_ASSIGNED', 'PQRS_UPDATED', etc.
  link      String?  // Ej: /administrative/pqrs/{id}
  
  isRead    Boolean  @default(false)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([tenantId])
  @@index([userId, isRead])
  @@map("notifications")
}
```

---

## 4. Esquema Completo Consolidado (Single-File Schema)

A continuación se presenta la consolidación íntegra de todos los modelos y enumeraciones en un único bloque continuo para referencia directa en herramientas como Prisma Studio, DBML o diagramadores ER:

```prisma
// ============================================================================
// 1. Configuración de Base de Datos y Generadores
// ============================================================================

// --- Inicio: prisma/schema/generator.prisma ---
generator client {
  provider = "prisma-client-js"
}
// --- Fin: prisma/schema/generator.prisma ---

// --- Inicio: prisma/schema/datasource.prisma ---
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
// --- Fin: prisma/schema/datasource.prisma ---

// ============================================================================
// 2. Enumeraciones Globales del Sistema (Enums)
// ============================================================================

// --- Inicio: prisma/schema/enums.prisma ---
enum RecordStatus {
  ACTIVE
  CORRECTED
  VOIDED
}

enum RecordSource {
  WEB
  MOBILE
  IMPORT
  API
}

enum VehicleCondition {
  GOOD
  BAD
}

enum VisitorMode {
  PEDESTRIAN
  VEHICLE
}

enum CorrespondenceType {
  BOX
  ENVELOPE
  DOCUMENT
  LETTER
  PACKAGE
  FOOD_DELIVERY
  OTHER
}

enum CorrespondenceStatus {
  RECEIVED
  DELIVERED
  RETURNED
  VOIDED
}

enum ClientStatus {
  PROSPECT
  ACTIVE
  INACTIVE
}

enum AdministrationType {
  ENTERPRISE
  INDIVIDUAL
}

enum ContractStatus {
  ACTIVE
  INACTIVE
  PENDING
  EXPIRED
  CANCELLED
  SUSPENDED
  RENEWED
  TERMINATED
}

enum ClientSector {
  RESIDENTIAL
  COMMERCIAL
  INDUSTRIAL
  GOVERNMENT
  OTHER
}

enum ResidentialComplexType {
  SINGLE_BUILDING
  BUILDING_CLUSTER
  HOUSE_CLUSTER
  MIXED
  COMMERCIAL
  OTHER
}

enum ResidentType {
  OWNER
  TENANT
  FAMILY_MEMBER
  OTHER
}

enum IdType {
  CI
  CE
  PASSPORT
  NIT
  OTHER
}

enum ResidencePlaceholder {
  LETTER
  NUMBER
  ALPHANUMERIC
}

enum UnitType {
  APARTMENT
  HOUSE
  OFFICE
  WAREHOUSE
  OTHER
  TOWNHOUSE
  BODEGA
}

enum UserType {
  EMPLOYEE
  RESIDENCE_MANAGER
}

enum PlanTier {
  BASIC
  PRO
  ENTERPRISE
}

enum SubscriptionStatus {
  TRIAL
  ACTIVE
  PAST_DUE
  CANCELED
}

enum PasswordPolicy {
  LOW
  MEDIUM
  STRICT
}

enum SecurityStudyStatus {
  CURRENT
  DISCONTINUED
}

enum OperationalCategory {
  DIRECTOR
  COORDINATOR
  SUPERVISOR
  GUARD
  OPERATOR
  ADMINISTRATIVE
  OTHER
}
// --- Fin: prisma/schema/enums.prisma ---

// ============================================================================
// 3. Gobierno, Multitenancy y Seguridad (Core SaaS & RBAC)
// ============================================================================

// --- Inicio: prisma/schema/tenant.prisma ---
model Tenant {
  id             String   @id @default(cuid(2))
  name           String
  slug           String   @unique
  isActive       Boolean  @default(true)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  createdBy      String?
  updatedBy      String?
  logoUrl        String?
  primaryColor   String?  @default("#7C3AED")
  secondaryColor String?  @default("#5B21B6")
  sidebarColor   String?  @default("#1E1B4B")

  profile                        TenantProfile?
  subscription                   TenantSubscription?
  settings                       TenantSettings?

  employees   Employee[]
  users       User[]
  roles       Role[]
  departments Department[]
  positions   Position[]
  features    Feature[]

  minutas                        Minuta[]
  parkingResidentVehicleControls ParkingResidentVehicleControl[]
  visitorEntryControls           VisitorEntryControl[]
  correspondenceReceivedControls CorrespondenceReceivedControl[]
  clients                        Client[]
  residents                      Resident[]
  clientProperties               ClientProperties[]
  towers                         Tower[]
  floors                         Floor[]
  units                          Unit[]
  mediaAttachments               MediaAttachment[]
  fileImportLogs                 FileImportLog[]
  securityStudies                SecurityStudy[]
  pqrsTickets                    PqrsTicket[]
  pqrsMessages                   PqrsMessage[]
  notifications                  Notification[]
  userClientAccesses             UserClientAccess[]

  @@map("tenant")
}

model TenantProfile {
  id                  String   @id @default(cuid(2))
  tenantId            String   @unique
  tenant              Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  legalName           String   @db.VarChar(150)
  taxId               String   @db.VarChar(50) // NIT/RUT
  contactEmail        String   @db.VarChar(100)
  contactPhone        String?  @db.VarChar(50)
  address             String?  @db.VarChar(200)
  city                String?  @db.VarChar(100)
  country             String?  @db.VarChar(100)
  legalRepresentative String?  @db.VarChar(150)

  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@map("tenant_profiles")
}

model TenantSubscription {
  id                 String             @id @default(cuid(2))
  tenantId           String             @unique
  tenant             Tenant             @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  planTier           PlanTier           @default(BASIC)
  status             SubscriptionStatus @default(TRIAL)

  maxClients         Int                @default(5)
  maxUsers           Int                @default(50)
  maxEmployees       Int                @default(50)

  subscriptionEndsAt DateTime?
  paymentGatewayId   String?            @db.VarChar(100)

  createdAt          DateTime           @default(now())
  updatedAt          DateTime           @updatedAt

  @@map("tenant_subscriptions")
}

model TenantSettings {
  id                    String         @id @default(cuid(2))
  tenantId              String         @unique
  tenant                Tenant         @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  // Operativa
  timezone              String         @default("America/Bogota") @db.VarChar(50)
  currency              String         @default("COP") @db.VarChar(10)
  dateFormat            String         @default("DD/MM/YYYY") @db.VarChar(20)

  // Seguridad
  mfaRequired           Boolean        @default(false)
  sessionTimeoutMinutes Int            @default(60)
  passwordPolicy        PasswordPolicy @default(MEDIUM)

  // White-labeling avanzado
  faviconUrl            String?        @db.VarChar(255)
  loginBackgroundUrl    String?        @db.VarChar(255)
  supportEmail          String?        @db.VarChar(100)
  supportPhone          String?        @db.VarChar(50)

  createdAt             DateTime       @default(now())
  updatedAt             DateTime       @updatedAt

  @@map("tenant_settings")
}
// --- Fin: prisma/schema/tenant.prisma ---

// --- Inicio: prisma/schema/user.prisma ---
model User {
  id       String @id @default(cuid(2))
  tenantId String
  tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  clientId String?
  client   Client? @relation(fields: [clientId], references: [id], onDelete: SetNull)

  userType UserType @default(EMPLOYEE)

  document     String @unique
  fullName     String
  department   String
  position     String
  passwordHash String

  isRetired    Boolean @default(false)
  isActive     Boolean @default(true)
  isFirstLogin Boolean @default(true)

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  createdBy String?
  updatedBy String?
  retiredAt DateTime? @db.Date
  deletedAt DateTime?

  roles          UserRole[]
  sessions       UserSession[]
  clientAccesses UserClientAccess[]


  // Minuta audit fields
  minutasCreated Minuta[] @relation("MinutaCreatedBy")
  minutasUpdated Minuta[] @relation("MinutaUpdatedBy")
  minutasDeleted Minuta[] @relation("MinutaDeletedBy")
  minutasVoided  Minuta[] @relation("MinutaVoidedBy")

  // Parking vehicle control
  parkingVehicleCreated ParkingResidentVehicleControl[] @relation("ParkingVehicleCreatedBy")
  parkingVehicleUpdated ParkingResidentVehicleControl[] @relation("ParkingVehicleUpdatedBy")
  parkingVehicleDeleted ParkingResidentVehicleControl[] @relation("ParkingVehicleDeletedBy")
  parkingVehicleVoided  ParkingResidentVehicleControl[] @relation("ParkingVehicleVoidedBy")
  parkingVehicleGuard   ParkingResidentVehicleControl[] @relation("ParkingVehicleGuard")

  // Visitor entry control
  visitorEntryCreated VisitorEntryControl[] @relation("VisitorEntryCreatedBy")
  visitorEntryUpdated VisitorEntryControl[] @relation("VisitorEntryUpdatedBy")
  visitorEntryDeleted VisitorEntryControl[] @relation("VisitorEntryDeletedBy")
  visitorEntryVoided  VisitorEntryControl[] @relation("VisitorEntryVoidedBy")
  visitorEntryGuard   VisitorEntryControl[] @relation("VisitorEntryGuard")

  // Correspondence
  correspondenceCreated     CorrespondenceReceivedControl[] @relation("CorrespondenceCreatedBy")
  correspondenceUpdated     CorrespondenceReceivedControl[] @relation("CorrespondenceUpdatedBy")
  correspondenceDeleted     CorrespondenceReceivedControl[] @relation("CorrespondenceDeletedBy")
  correspondenceVoided      CorrespondenceReceivedControl[] @relation("CorrespondenceVoidedBy")
  correspondenceGuardOnDuty CorrespondenceReceivedControl[] @relation("CorrespondenceGuardOnDuty")

  // Client audit fields
  clientsCreated Client[] @relation("ClientCreatedBy")
  clientsUpdated Client[] @relation("ClientUpdatedBy")
  clientsDeleted Client[] @relation("ClientDeletedBy")

  // Resident audit fields
  residentsCreated Resident[] @relation("ResidentCreatedBy")
  residentsUpdated Resident[] @relation("ResidentUpdatedBy")
  residentsDeleted Resident[] @relation("ResidentDeletedBy")

  // Security studies audit fields
  securityStudiesCreated SecurityStudy[] @relation("StudyCreatedBy")
  securityStudiesUpdated SecurityStudy[] @relation("StudyUpdatedBy")
  securityStudiesDeleted SecurityStudy[] @relation("StudyDeletedBy")

  // PQRS relations
  ticketsAssigned     PqrsTicket[]  @relation("TicketAssignedTo")
  ticketsCreated      PqrsTicket[]  @relation("TicketCreatedBy")
  ticketsUpdated      PqrsTicket[]  @relation("TicketUpdatedBy")
  ticketsVoided       PqrsTicket[]  @relation("TicketVoidedBy")
  pqrsMessagesCreated PqrsMessage[] @relation("MessageCreatedBy")
  pqrsMessagesUpdated PqrsMessage[] @relation("MessageUpdatedBy")

  // Notifications
  notifications       Notification[]

  @@index([tenantId])
  @@index([clientId])
  @@index([document])
  @@map("users")
}
// --- Fin: prisma/schema/user.prisma ---

// --- Inicio: prisma/schema/role.prisma ---
model Role {
  id       String @id @default(cuid(2))
  tenantId String
  tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  name     String
  isActive Boolean @default(true)
  users UserRole[]
  perms RolePermission[]

  createdAt DateTime @default(now())
  updatedAt DateTime @default(now())
  createdBy String?
  updatedBy String?

  @@unique([tenantId, name])
  @@index([tenantId])
  @@map("role")
}
// --- Fin: prisma/schema/role.prisma ---

// --- Inicio: prisma/schema/permission.prisma ---
model Permission {
  id   String  @id @default(cuid(2))
  key  String  @unique
  desc String?

  roles RolePermission[]

  @@map("permission")
}
// --- Fin: prisma/schema/permission.prisma ---

// --- Inicio: prisma/schema/rolePermission.prisma ---
model RolePermission {
  roleId       String
  permissionId String
  assignedAt   DateTime @default(now())
  assignedBy   String?

  role       Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@id([roleId, permissionId])
  @@map("role_permission")
}
// --- Fin: prisma/schema/rolePermission.prisma ---

// --- Inicio: prisma/schema/userRole.prisma ---
model UserRole {
  userId     String
  roleId     String
  assignedAt DateTime @default(now())
  assignedBy String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  role Role @relation(fields: [roleId], references: [id], onDelete: Cascade)

  @@id([userId, roleId])
  @@map("user_role")
}
// --- Fin: prisma/schema/userRole.prisma ---

// --- Inicio: prisma/schema/userSession.prisma ---
model UserSession {
  id     String @id @default(cuid(2))
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  refreshTokenHash     String
  userAgent            String?
  ip                   String?
  impersonatedTenantId String?
  createdAt            DateTime      @default(now())
  expiresAt            DateTime
  revokedAt            DateTime?
  replacedById         String?
  replacedBy           UserSession?  @relation("SessionRotation", fields: [replacedById], references: [id])
  replaces             UserSession[] @relation("SessionRotation")

  @@index([userId])
  @@index([expiresAt])
  @@map("user_session")
}
// --- Fin: prisma/schema/userSession.prisma ---

// --- Inicio: prisma/schema/user_client_access.prisma ---
model UserClientAccess {
  id         String    @id @default(cuid(2))
  tenantId   String
  tenant     Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  // Acceso de Usuario Digital (opcional si es personal sin cuenta digital)
  userId     String?
  user       User?     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Expediente Laboral de Empleado (opcional si es usuario sin nómina, ej: Residence Manager)
  employeeId String?
  employee   Employee? @relation(fields: [employeeId], references: [id], onDelete: Cascade)

  clientId   String
  client     Client    @relation(fields: [clientId], references: [id], onDelete: Cascade)

  roleName   String?
  isActive   Boolean   @default(true)

  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  @@unique([userId, clientId])
  @@unique([employeeId, clientId])
  @@index([tenantId])
  @@index([userId])
  @@index([employeeId])
  @@index([clientId])
  @@map("user_client_access")
}
// --- Fin: prisma/schema/user_client_access.prisma ---

// --- Inicio: prisma/schema/feature.prisma ---
model Feature {
  id          String   @id @default(cuid(2))
  key         String   @unique
  name        String
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  tenants Tenant[]

  @@map("feature")
}
// --- Fin: prisma/schema/feature.prisma ---

// --- Inicio: prisma/schema/audit.prisma ---
model AuditLog {
  id        String   @id @default(cuid(2))
  tenantId  String?
  entity    String
  entityId  String
  action    String
  oldValue  Json?
  newValue  Json?
  userId    String?
  createdAt DateTime @default(now())

  @@index([tenantId])
  @@index([entity, entityId])
  @@index([userId])
  @@map("audit_log")
}
// --- Fin: prisma/schema/audit.prisma ---

// --- Inicio: prisma/schema/department.prisma ---
model Department {
  id       String  @id @default(cuid(2))
  tenantId String
  name     String
  isActive Boolean @default(true)

  tenant    Tenant     @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  employees Employee[] @relation("EmployeeDepartment")

  createdAt DateTime @default(now())
  updatedAt DateTime @default(now())
  createdBy String?
  updatedBy String?

  @@unique([tenantId, name])
  @@index([tenantId])
  @@map("department")
}
// --- Fin: prisma/schema/department.prisma ---

// --- Inicio: prisma/schema/position.prisma ---
model Position {
  id                  String              @id @default(cuid(2))
  tenantId            String
  name                String
  level               Int?
  operationalCategory OperationalCategory @default(GUARD)
  isActive            Boolean             @default(true)

  tenant    Tenant     @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  employees Employee[] @relation("EmployeePosition")

  createdAt DateTime @default(now())
  updatedAt DateTime @default(now())
  createdBy String?
  updatedBy String?

  @@unique([tenantId, name])
  @@index([tenantId])
  @@index([operationalCategory])
  @@map("position")
}
// --- Fin: prisma/schema/position.prisma ---

// --- Inicio: prisma/schema/file_import_log.prisma ---
model FileImportLog {
  id       String @id @default(cuid(2))
  tenantId String
  tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  entityType   String // "CLIENT", "RESIDENT"
  fileName     String
  status       String // "SUCCESS", "PARTIAL", "FAILED"
  totalRows    Int
  successRows  Int
  errorRows    Int
  errorDetails Json?  @db.JsonB

  uploadedBy String // userId
  createdAt  DateTime @default(now())

  @@index([tenantId])
  @@map("file_import_logs")
}
// --- Fin: prisma/schema/file_import_log.prisma ---

// ============================================================================
// 4. Módulo Administrativo, Clientes e Inmuebles
// ============================================================================

// --- Inicio: prisma/schema/clients.prisma ---
model Client {
  id             String         @id @default(cuid(2))
  tenantId       String
  tenant         Tenant         @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  internalCode   String         @unique
  clientStatus   ClientStatus   @default(ACTIVE)
  contractStatus ContractStatus @default(ACTIVE)

  contractNumber String? @unique
  nit            String  @unique
  name           String
  email          String?
  phone          String?
  receptionPhone String?
  zipCode        String?
  address        String?
  country        String?
  city           String?
  state          String?
  commune        String?
  neighborhood   String?
  quadrant       String?
  quadrantPhone  String?
  cai            String?
  observations   String?

  sector ClientSector @default(RESIDENTIAL)


  installedTech      Boolean @default(false)
  securityStudy      String?
  weaponsAmount      Int     @default(0)
  administrator      String?
  administratorPhone String?
  administratorEmail String?

  contractDate     DateTime? @db.Date
  lastContractDate DateTime? @db.Date

  // Extended Contract Information
  renewedContract    Boolean?  @default(false)
  contractEndDate    DateTime?
  contractMediaFiles Json?     @db.JsonB

  // Extended Administrative & Contact Information
  administrationType        AdministrationType?
  administrationCompanyData Json?               @db.JsonB
  councilData               Json?               @db.JsonB

  createdAt   DateTime @default(now())
  createdById String?
  createdBy   User?    @relation("ClientCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)

  updatedAt   DateTime @updatedAt
  updatedById String?
  updatedBy   User?    @relation("ClientUpdatedBy", fields: [updatedById], references: [id], onDelete: SetNull)

  deletedAt   DateTime?
  deletedById String?
  deletedBy   User?     @relation("ClientDeletedBy", fields: [deletedById], references: [id], onDelete: SetNull)

  isActive Boolean @default(true)

  users            User[]
  clientAccesses   UserClientAccess[]
  employees        Employee[]
  minutas          Minuta[]
  visitorEntries   VisitorEntryControl[]
  correspondences  CorrespondenceReceivedControl[]
  parkingVehicles  ParkingResidentVehicleControl[]
  mediaAttachments MediaAttachment[]

  clientProperties ClientProperties?
  residents        Resident[]
  towers           Tower[]
  floors           Floor[]
  units            Unit[]
  securityStudies  SecurityStudy[]
  pqrsTickets      PqrsTicket[]
  pqrsMessages     PqrsMessage[]

  mapboxBaseImageS3Key String?
  geofence             Json?   @db.JsonB
  mapboxCenterLat      Float?
  mapboxCenterLng      Float?
  mapboxZoom           Float?
  mapboxBboxMinLat     Float?
  mapboxBboxMinLng     Float?
  mapboxBboxMaxLat     Float?
  mapboxBboxMaxLng     Float?


  @@unique([tenantId, nit])
  @@unique([tenantId, internalCode])
  @@unique([tenantId, contractNumber])
  @@index([tenantId])
  @@index([createdById])
  @@map("client")
}
// --- Fin: prisma/schema/clients.prisma ---

// --- Inicio: prisma/schema/client_properties.prisma ---
model ClientProperties {
  id       String @id @default(cuid(2))
  tenantId String
  tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  clientId String @unique
  client   Client @relation(fields: [clientId], references: [id], onDelete: Cascade)

  structureType          ResidentialComplexType @default(BUILDING_CLUSTER)
  towersAmount           Int?                   @default(0)
  unitsAmount            Int?                   @default(0)
  hasSocialRoom          Boolean?               @default(false)
  socialRoomAmount       Int?                   @default(0)
  hasGym                 Boolean?               @default(false)
  gymAmount              Int?                   @default(0)
  hasPool                Boolean?               @default(false)
  poolAmount             Int?                   @default(0)
  hasTennisCourt         Boolean?               @default(false)
  tennisCourtAmount      Int?                   @default(0)
  hasBasketballCourt     Boolean?               @default(false)
  basketballCourtAmount  Int?                   @default(0)
  hasFootballCourt       Boolean?               @default(false)
  footballCourtAmount    Int?                   @default(0)
  hasVolleyballCourt     Boolean?               @default(false)
  volleyballCourtAmount  Int?                   @default(0)
  hasSquashCourt         Boolean?               @default(false)
  squashCourtAmount      Int?                   @default(0)
  hasPlayground          Boolean?               @default(false)
  playgroundAmount       Int?                   @default(0)
  hasParking             Boolean?               @default(false)
  parkingAmount          Int?                   @default(0)
  hasGuestParking        Boolean?               @default(false)
  guestParkingAmount     Int?                   @default(0)
  hasMotorcycleParking   Boolean?               @default(false)
  motorcycleParkingAmount Int?                  @default(0)
  hasBicycleRack         Boolean?               @default(false)
  bicycleRackAmount      Int?                   @default(0)
  bicycleCapacityPerRack Int?                   @default(0)
  hasCommercialStores    Boolean?               @default(false)
  commercialStoresAmount Int?                   @default(0)
  hasStorageRoom         Boolean?               @default(false)
  storageRoomAmount      Int?                   @default(0)

  entriesDescription Json? @db.JsonB
  entriesMediaFiles  Json? @db.JsonB
  structureConfig    Json? @db.JsonB

  mediaAttachments MediaAttachment[]

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?
  createdBy String?
  updatedBy String?
  deletedBy String?

  @@index([tenantId])
  @@index([clientId])
  @@map("client_properties")
}
// --- Fin: prisma/schema/client_properties.prisma ---

// --- Inicio: prisma/schema/tower.prisma ---
model Tower {
  id       String @id @default(cuid(2))
  tenantId String
  tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  clientId String
  client   Client @relation(fields: [clientId], references: [id], onDelete: Cascade)

  towerName    String @db.VarChar(50)
  floorsAmount Int    @default(0)
  elevators    Int    @default(0)

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?
  createdBy String?
  updatedBy String?
  deletedBy String?

  units  Unit[]
  floors Floor[]

  @@index([tenantId])
  @@index([clientId])
  @@map("towers")
}
// --- Fin: prisma/schema/tower.prisma ---

// --- Inicio: prisma/schema/floor.prisma ---
model Floor {
  id       String  @id @default(cuid(2))
  tenantId String
  tenant   Tenant  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  clientId String
  client   Client  @relation(fields: [clientId], references: [id], onDelete: Cascade)
  towerId  String?
  tower    Tower?  @relation(fields: [towerId], references: [id], onDelete: Cascade)

  floorNumber Int @default(0)

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?
  createdBy String?
  updatedBy String?
  deletedBy String?

  units Unit[]

  @@index([tenantId])
  @@index([clientId])
  @@index([towerId])
  @@map("floors")
}
// --- Fin: prisma/schema/floor.prisma ---

// --- Inicio: prisma/schema/unit.prisma ---
model Unit {
  id       String  @id @default(cuid(2))
  tenantId String
  tenant   Tenant  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  clientId String
  client   Client  @relation(fields: [clientId], references: [id], onDelete: Cascade)
  towerId  String?
  tower    Tower?  @relation(fields: [towerId], references: [id], onDelete: Cascade)
  floorId  String?
  floor    Floor?  @relation(fields: [floorId], references: [id], onDelete: Cascade)

  unitName String   @db.VarChar(50)
  unitType UnitType @default(APARTMENT)

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?
  createdBy String?
  updatedBy String?
  deletedBy String?

  residents       Resident[]
  visitorEntries  VisitorEntryControl[]
  correspondences CorrespondenceReceivedControl[]
  minutas         Minuta[]
  parkingControls ParkingResidentVehicleControl[]

  @@index([tenantId])
  @@index([clientId])
  @@index([towerId])
  @@index([floorId])
  @@map("units")
}
// --- Fin: prisma/schema/unit.prisma ---

// --- Inicio: prisma/schema/resident.prisma ---
model Resident {
  id              String       @id @default(cuid(2))
  tenantId        String
  tenant          Tenant       @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  clientId        String
  client          Client       @relation(fields: [clientId], references: [id], onDelete: Cascade)
  unitId          String
  unit            Unit         @relation(fields: [unitId], references: [id], onDelete: Cascade)
  residentType    ResidentType
  idType          IdType?
  firstName       String
  lastName        String
  document        String
  phoneNumber     String
  email           String?
  gender          String?      @db.VarChar(1)
  birthdate       DateTime?
  residentSince   DateTime     @default(now())
  accessStartDate DateTime?
  accessEndDate   DateTime?

  createdAt   DateTime @default(now())
  createdById String?
  createdBy   User?    @relation("ResidentCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)

  updatedAt   DateTime @updatedAt
  updatedById String?
  updatedBy   User?    @relation("ResidentUpdatedBy", fields: [updatedById], references: [id], onDelete: SetNull)

  deletedAt   DateTime?
  deletedById String?
  deletedBy   User?     @relation("ResidentDeletedBy", fields: [deletedById], references: [id], onDelete: SetNull)

  mediaAttachments MediaAttachment[]
  visitorEntries   VisitorEntryControl[]
  correspondences  CorrespondenceReceivedControl[]
  minutas          Minuta[]
  parkingControls  ParkingResidentVehicleControl[]

  @@unique([tenantId, clientId, document])
  @@index([tenantId])
  @@index([clientId])
  @@index([unitId])
  @@map("resident")
}
// --- Fin: prisma/schema/resident.prisma ---

// --- Inicio: prisma/schema/employee.prisma ---
model Employee {
  id       String @id @default(cuid(2))
  tenantId String
  tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  clientId String?
  client   Client? @relation(fields: [clientId], references: [id], onDelete: SetNull)

  clientHistory Json? @default("[]") @db.JsonB

  firstName       String
  secondName      String?
  lastName        String
  maternalSurname String?
  fullName        String
  documentType    String
  document        String
  birthdate       DateTime  @db.Date
  gender          String
  address         String    @default("")
  departmentId    String?
  positionId      String?
  email           String?
  phone           String?
  entryDate       DateTime  @db.Date
  isRetired       Boolean   @default(false)
  isActive        Boolean   @default(true)
  createdAt       DateTime  @default(now())
  createdBy       String?   @default("")
  updatedAt       DateTime  @updatedAt
  updatedBy       String?   @default("")
  retiredAt       DateTime? @db.Date
  deletedAt       DateTime?

  departmentRef Department? @relation("EmployeeDepartment", fields: [departmentId], references: [id], onDelete: SetNull)
  positionRef   Position?   @relation("EmployeePosition", fields: [positionId], references: [id], onDelete: SetNull)

  mediaAttachments   MediaAttachment[]
  clientAccesses     UserClientAccess[]

  parkingControls        ParkingResidentVehicleControl[]
  visitorControls        VisitorEntryControl[]
  correspondenceControls CorrespondenceReceivedControl[]

  @@unique([tenantId, document])
  @@unique([tenantId, email])
  @@index([tenantId])
  @@index([clientId])
  @@index([document])
  @@index([departmentId])
  @@index([positionId])
  @@map("employee")
}
// --- Fin: prisma/schema/employee.prisma ---

// --- Inicio: prisma/schema/security_studies.prisma ---
model SecurityStudy {
  id              String   @id @default(cuid(2))
  tenantId        String   
  tenant          Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  clientId        String
  client          Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)

  name            String?
  description     String?

  // Referencias a la Imagen Base (Generada por Mapbox API)
  baseImageS3Key   String?   
  mapboxCenterLat  Float?
  mapboxCenterLng  Float?
  mapboxZoom       Float?
  
  // Bounding Box para los cálculos Matemáticos del Canva (Vital)
  mapboxBboxMinLat Float?
  mapboxBboxMinLng Float?
  mapboxBboxMaxLat Float?
  mapboxBboxMaxLng Float?

  // El motor vectorial Konva.js
  canvasState      Json?     @db.JsonB 

  
  status          SecurityStudyStatus @default(CURRENT)
  version         Int                 @default(1)

  // Documentos adjuntos (estudio de seguridad sin canva)
  files           Json?    @db.JsonB

  // Trazabilidad Estándar
  createdAt       DateTime @default(now())
  createdById     String?
  createdBy       User?    @relation("StudyCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)

  updatedAt       DateTime @updatedAt
  updatedById     String?
  updatedBy       User?    @relation("StudyUpdatedBy", fields: [updatedById], references: [id], onDelete: SetNull)

  deletedAt       DateTime?
  deletedById     String?
  deletedBy       User?    @relation("StudyDeletedBy", fields: [deletedById], references: [id], onDelete: SetNull)

  @@index([tenantId])
  @@index([clientId])
  @@map("security_studies")
}
// --- Fin: prisma/schema/security_studies.prisma ---

// --- Inicio: prisma/schema/pqrs.prisma ---
enum PqrsType {
  PETICION
  QUEJA
  RECLAMO
  SUGERENCIA
  FELICITACION
}

enum PqrsStatus {
  OPEN
  ASSIGNED
  IN_PROGRESS
  RESOLVED
  CLOSED
  REJECTED
  VOIDED
}

enum PqrsPriority {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

model PqrsTicket {
  id          String       @id @default(cuid(2))
  tenantId    String
  tenant      Tenant       @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  clientId    String
  client      Client       @relation(fields: [clientId], references: [id], onDelete: Cascade)

  code        String
  subject     String
  description String       @db.Text
  status      PqrsStatus   @default(OPEN)
  priority    PqrsPriority @default(MEDIUM)
  type        PqrsType

  assignedToId String?
  assignedTo   User?       @relation("TicketAssignedTo", fields: [assignedToId], references: [id], onDelete: SetNull)

  // Metadatos de Anulación Formal (Auditoría)
  voidReason  String?      @db.Text
  voidedAt    DateTime?
  voidedById  String?
  voidedBy    User?        @relation("TicketVoidedBy", fields: [voidedById], references: [id], onDelete: SetNull)

  messages    PqrsMessage[]
  attachments MediaAttachment[]

  createdById String?
  createdBy   User?       @relation("TicketCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)
  updatedById String?
  updatedBy   User?       @relation("TicketUpdatedBy", fields: [updatedById], references: [id], onDelete: SetNull)

  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  @@unique([tenantId, code])
  @@index([tenantId])
  @@index([clientId])
  @@index([assignedToId])
  @@index([status])
  @@map("pqrs_tickets")
}

model PqrsMessage {
  id           String          @id @default(cuid(2))
  tenantId     String
  tenant       Tenant          @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  clientId     String
  client       Client          @relation(fields: [clientId], references: [id], onDelete: Cascade)

  ticketId     String
  ticket       PqrsTicket      @relation(fields: [ticketId], references: [id], onDelete: Cascade)

  content      String          @db.Text
  isFromClient Boolean         @default(false)

  attachments  MediaAttachment[]

  createdById  String?
  createdBy    User?           @relation("MessageCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)
  updatedById  String?
  updatedBy    User?           @relation("MessageUpdatedBy", fields: [updatedById], references: [id], onDelete: SetNull)

  createdAt    DateTime        @default(now())
  updatedAt    DateTime        @updatedAt

  @@index([tenantId])
  @@index([clientId])
  @@index([ticketId])
  @@map("pqrs_messages")
}
// --- Fin: prisma/schema/pqrs.prisma ---

// ============================================================================
// 5. Módulo Operativo y Control de Acceso (Minutas y Campo)
// ============================================================================

// --- Inicio: prisma/schema/minuta.prisma ---
model Minuta {
  id       String @id @default(cuid(2))
  tenantId String
  tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  clientId String?
  client   Client? @relation(fields: [clientId], references: [id], onDelete: SetNull)

  // Core
  date       DateTime @db.Date
  time       DateTime @db.Time
  occurredAt DateTime
  annotation String

  // Opcionales útiles
  category       String?
  priority       Int? // 1..5 si quieres; o cámbialo a enum luego
  tags           String[] @default([])
  isConfidential Boolean  @default(false)

  isInternal Boolean @default(false)

  // Ubicación y Origen de Novedad
  guardPost        String?
  isResidentLinked Boolean   @default(false)
  noveltySource    String?
  unitId           String?
  unit             Unit?     @relation(fields: [unitId], references: [id], onDelete: SetNull)
  residentId       String?
  resident         Resident? @relation(fields: [residentId], references: [id], onDelete: SetNull)

  // Estado / anulación
  status     RecordStatus @default(ACTIVE)
  voidReason String?
  voidedAt   DateTime?
  voidedById String?
  voidedBy   User?        @relation("MinutaVoidedBy", fields: [voidedById], references: [id], onDelete: SetNull)

  // Auditoría transversal
  source      RecordSource @default(WEB)
  externalRef String?

  createdAt   DateTime @default(now())
  createdById String?
  createdBy   User?    @relation("MinutaCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)

  updatedAt   DateTime @updatedAt
  updatedById String?
  updatedBy   User?    @relation("MinutaUpdatedBy", fields: [updatedById], references: [id], onDelete: SetNull)

  deletedAt   DateTime?
  deletedById String?
  deletedBy   User?     @relation("MinutaDeletedBy", fields: [deletedById], references: [id], onDelete: SetNull)

  mediaAttachments MediaAttachment[]

  @@index([tenantId])
  @@index([clientId])
  @@index([unitId])
  @@index([residentId])
  @@index([tenantId, clientId])
  @@index([tenantId, isInternal])
  @@index([tenantId, date])
  @@index([tenantId, occurredAt])
  @@index([createdById])
  @@map("minuta")
}
// --- Fin: prisma/schema/minuta.prisma ---

// --- Inicio: prisma/schema/visitor_entry_control.prisma ---
model VisitorEntryControl {
  id       String @id @default(cuid(2))
  tenantId String
  tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  clientId String?
  client   Client? @relation(fields: [clientId], references: [id], onDelete: SetNull)

  isInternal Boolean @default(false)

  employeeId String?
  employee   Employee? @relation(fields: [employeeId], references: [id], onDelete: SetNull)

  unitId String?
  unit   Unit?   @relation(fields: [unitId], references: [id], onDelete: SetNull)

  residentId String?
  resident   Resident? @relation(fields: [residentId], references: [id], onDelete: SetNull)

  // Base
  date       DateTime @db.Date
  time       DateTime @db.Time
  occurredAt DateTime // recomendado: datetime de entrada

  visitorFullName String
  visitorIdNumber String
  visitorIdType   String? // opcional (CC/CE/PASSPORT)

  entryTime DateTime  @db.Time
  exitTime  DateTime? @db.Time
  exitAt    DateTime? // útil para rangos

  authorizedByFullName String?
  peopleCount          Int     @default(1)

  mode VisitorMode

  // Destino (puedes mantener string + estructura)
  destination String? // "casa-bloque-apartamento" legacy-friendly
  block       String?
  apartment   String?

  ticketNumber String? // número de ficha

  // Campos vehiculares (si mode=VEHICLE)
  brand        String?
  plate        String?
  observations String?

  // Guarda de turno (quien ejecuta el control)
  guardId           String?
  guard             User?   @relation("VisitorEntryGuard", fields: [guardId], references: [id], onDelete: SetNull)
  guardNameSnapshot String?

  // Estado / anulación
  status     RecordStatus @default(ACTIVE)
  voidReason String?
  voidedAt   DateTime?
  voidedById String?
  voidedBy   User?        @relation("VisitorEntryVoidedBy", fields: [voidedById], references: [id], onDelete: SetNull)

  // Auditoría transversal
  source      RecordSource @default(WEB)
  externalRef String?

  createdAt   DateTime @default(now())
  createdById String?
  createdBy   User?    @relation("VisitorEntryCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)

  updatedAt   DateTime @updatedAt
  updatedById String?
  updatedBy   User?    @relation("VisitorEntryUpdatedBy", fields: [updatedById], references: [id], onDelete: SetNull)

  deletedAt   DateTime?
  deletedById String?
  deletedBy   User?     @relation("VisitorEntryDeletedBy", fields: [deletedById], references: [id], onDelete: SetNull)

  mediaAttachments MediaAttachment[]

  @@index([tenantId])
  @@index([clientId])
  @@index([unitId])
  @@index([residentId])
  @@index([employeeId])
  @@index([tenantId, clientId])
  @@index([tenantId, isInternal])
  @@index([tenantId, date])
  @@index([tenantId, occurredAt])
  @@index([tenantId, visitorIdNumber])
  @@index([tenantId, plate])
  @@index([guardId])
  @@map("visitor_entry_control")
}
// --- Fin: prisma/schema/visitor_entry_control.prisma ---

// --- Inicio: prisma/schema/correspondence_received_control.prisma ---
model CorrespondenceReceivedControl {
  id       String @id @default(cuid(2))
  tenantId String
  tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  clientId String?
  client   Client? @relation(fields: [clientId], references: [id], onDelete: SetNull)

  isInternal Boolean @default(false)

  recipientEmployeeId String?
  recipientEmployee   Employee? @relation(fields: [recipientEmployeeId], references: [id], onDelete: SetNull)

  unitId String?
  unit   Unit?   @relation(fields: [unitId], references: [id], onDelete: SetNull)

  recipientResidentId String?
  recipientResident   Resident? @relation(fields: [recipientResidentId], references: [id], onDelete: SetNull)

  // Base
  date       DateTime @db.Date
  time       DateTime @db.Time
  occurredAt DateTime // recomendado: datetime de recibido

  receivedTime DateTime @db.Time // si quieres mantener “hora de recibido” explícita

  destination    String
  sender         String? // remite
  courierCompany String?
  trackingNumber String?

  guardOnDutyId     String?
  guardOnDuty       User?   @relation("CorrespondenceGuardOnDuty", fields: [guardOnDutyId], references: [id], onDelete: SetNull)
  guardNameSnapshot String?

  receivedByName String? // “persona que recibe” (puede no ser user del sistema)

  correspondenceType CorrespondenceType
  status             CorrespondenceStatus @default(RECEIVED)

  // Entrega y Evidencia
  deliveredAt         DateTime?
  deliveredToName     String?
  deliveryEvidenceUrl String?
  deliveryNotes       String?

  observations String?

  // Anulación (alineado con los otros)
  voidReason String?
  voidedAt   DateTime?
  voidedById String?
  voidedBy   User?     @relation("CorrespondenceVoidedBy", fields: [voidedById], references: [id], onDelete: SetNull)

  // Auditoría transversal
  source      RecordSource @default(WEB)
  externalRef String?

  createdAt   DateTime @default(now())
  createdById String?
  createdBy   User?    @relation("CorrespondenceCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)

  updatedAt   DateTime @updatedAt
  updatedById String?
  updatedBy   User?    @relation("CorrespondenceUpdatedBy", fields: [updatedById], references: [id], onDelete: SetNull)

  deletedAt   DateTime?
  deletedById String?
  deletedBy   User?     @relation("CorrespondenceDeletedBy", fields: [deletedById], references: [id], onDelete: SetNull)

  mediaAttachments MediaAttachment[]

  @@index([tenantId])
  @@index([clientId])
  @@index([unitId])
  @@index([recipientResidentId])
  @@index([recipientEmployeeId])
  @@index([tenantId, clientId])
  @@index([tenantId, isInternal])
  @@index([tenantId, date])
  @@index([tenantId, occurredAt])
  @@index([tenantId, status])
  @@index([trackingNumber])
  @@index([guardOnDutyId])
  @@map("correspondence_received_control")
}
// --- Fin: prisma/schema/correspondence_received_control.prisma ---

// --- Inicio: prisma/schema/parking_resident_vehicle_control.prisma ---
model ParkingResidentVehicleControl {
  id       String @id @default(cuid(2))
  tenantId String
  tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  clientId String?
  client   Client? @relation(fields: [clientId], references: [id], onDelete: SetNull)

  // Base
  date       DateTime @db.Date
  time       DateTime @db.Time
  occurredAt DateTime // recomendado: datetime de ingreso (entry)

  // Horas específicas del flujo
  entryTime DateTime  @db.Time
  exitTime  DateTime? @db.Time
  exitAt    DateTime? // útil para reportes por rango de salida

  parkingNumber String
  ticketNumber  String? // número de ficha

  isInternal Boolean @default(false)

  employeeId String?
  employee   Employee? @relation(fields: [employeeId], references: [id], onDelete: SetNull)

  unitId String?
  unit   Unit?   @relation(fields: [unitId], references: [id], onDelete: SetNull)

  residentId String?
  resident   Resident? @relation(fields: [residentId], references: [id], onDelete: SetNull)

  interior  String?
  apartment String?

  plate String
  brand String?
  color String?

  // Check de elementos (puedes mantener columnas + JSON)
  mirrors          Boolean?
  antenna          Boolean?
  radio            Boolean?
  spareTire        Boolean? // repuesto
  hubcaps          Boolean? // copas
  vehicleChecklist Json?

  condition VehicleCondition @default(GOOD)

  // Guarda (operador) del registro
  guardId           String?
  guard             User?   @relation("ParkingVehicleGuard", fields: [guardId], references: [id], onDelete: SetNull)
  guardNameSnapshot String?

  observations String?

  // Estado / anulación
  status     RecordStatus @default(ACTIVE)
  voidReason String?
  voidedAt   DateTime?
  voidedById String?
  voidedBy   User?        @relation("ParkingVehicleVoidedBy", fields: [voidedById], references: [id], onDelete: SetNull)

  // Auditoría transversal
  source      RecordSource @default(WEB)
  externalRef String?

  createdAt   DateTime @default(now())
  createdById String?
  createdBy   User?    @relation("ParkingVehicleCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)

  updatedAt   DateTime @updatedAt
  updatedById String?
  updatedBy   User?    @relation("ParkingVehicleUpdatedBy", fields: [updatedById], references: [id], onDelete: SetNull)

  deletedAt   DateTime?
  deletedById String?
  deletedBy   User?     @relation("ParkingVehicleDeletedBy", fields: [deletedById], references: [id], onDelete: SetNull)

  mediaAttachments MediaAttachment[]

  @@index([tenantId])
  @@index([clientId])
  @@index([unitId])
  @@index([residentId])
  @@index([employeeId])
  @@index([tenantId, clientId])
  @@index([tenantId, isInternal])
  @@index([tenantId, date])
  @@index([tenantId, occurredAt])
  @@index([tenantId, plate])
  @@index([guardId])
  @@map("parking_resident_vehicle_control")
}
// --- Fin: prisma/schema/parking_resident_vehicle_control.prisma ---

// --- Inicio: prisma/schema/media_attachment.prisma ---
model MediaAttachment {
  id       String @id @default(cuid(2))
  tenantId String
  tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  url       String @db.Text
  s3Key     String @unique
  fileName  String
  mimeType  String
  sizeBytes Int

  // Foreign Key Relations
  clientId           String?
  client             Client?                        @relation(fields: [clientId], references: [id], onDelete: Cascade)
  clientPropertiesId String?
  clientProperties   ClientProperties?              @relation(fields: [clientPropertiesId], references: [id], onDelete: Cascade)
  residentId         String?
  resident           Resident?                      @relation(fields: [residentId], references: [id], onDelete: Cascade)
  minutaId           String?
  minuta             Minuta?                        @relation(fields: [minutaId], references: [id], onDelete: Cascade)
  correspondenceId   String?
  correspondence     CorrespondenceReceivedControl? @relation(fields: [correspondenceId], references: [id], onDelete: Cascade)
  parkingVehicleId   String?
  parkingVehicle     ParkingResidentVehicleControl? @relation(fields: [parkingVehicleId], references: [id], onDelete: Cascade)
  visitorEntryId     String?
  visitorEntry       VisitorEntryControl?           @relation(fields: [visitorEntryId], references: [id], onDelete: Cascade)
  employeeId         String?
  employee           Employee?                      @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  pqrsTicketId       String?
  pqrsTicket         PqrsTicket?                    @relation(fields: [pqrsTicketId], references: [id], onDelete: Cascade)
  pqrsMessageId      String?
  pqrsMessage        PqrsMessage?                   @relation(fields: [pqrsMessageId], references: [id], onDelete: Cascade)

  uploadedById String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([tenantId])
  @@index([clientId])
  @@index([residentId])
  @@index([minutaId])
  @@index([employeeId])
  @@index([pqrsTicketId])
  @@index([pqrsMessageId])
  @@index([s3Key])
  @@map("media_attachments")
}
// --- Fin: prisma/schema/media_attachment.prisma ---

// --- Inicio: prisma/schema/notification.prisma ---
model Notification {
  id        String   @id @default(cuid(2))
  tenantId  String
  tenant    Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  title     String
  message   String
  type      String   // 'PQRS_ASSIGNED', 'PQRS_UPDATED', etc.
  link      String?  // Ej: /administrative/pqrs/{id}
  
  isRead    Boolean  @default(false)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([tenantId])
  @@index([userId, isRead])
  @@map("notifications")
}
// --- Fin: prisma/schema/notification.prisma ---

```

<a id="signatureprisma"></a>
#### Archivo: `prisma/schema/signature.prisma`

```prisma
// ============================================================================
// SPEC-CORE-009: Motor de Firmas Digitales y Ciclo de Vida de Documentos
// ============================================================================

enum SignatureStatus {
  DRAFT
  PENDING
  VIEWED
  SIGNED
  REJECTED
  EXPIRED
  REVOKED
}

enum SignatureDocumentType {
  QUOTATION
  PURCHASE_ORDER
  SERVICE_ORDER
  EMPLOYMENT_CONTRACT
  EQUIPMENT_DELIVERY
  OPERATIONAL_MINUTE
  GENERAL_FORMAT
}

enum SignatureCreationMode {
  DRAW
  TYPE
  UPLOAD
}

model SignatureRequest {
  id              String                @id @default(cuid(2))
  tenantId        String
  tenant          Tenant                @relation(fields: [tenantId], references: [id], onDelete: Restrict)

  // Documento asociado
  documentType    SignatureDocumentType
  documentId      String                // ID del registro comercial/operativo
  documentTitle   String                // Ej: "Orden de Servicio OS-2026-0042"
  documentVersion Int                   @default(1)

  // Datos estructurados en borrador (0 bytes en S3)
  draftSnapshot   Json?                 @db.JsonB // Snapshot estructurado JSONB del documento

  // Token Criptográfico de Acceso Público
  token           String                @unique // Token aleatorio de 64 caracteres hex
  expiresAt       DateTime

  // Información del Firmante
  signerName      String
  signerEmail     String
  signerDocument  String?               // Cédula de ciudadanía o NIT
  signerPhone     String?
  signerRole      String?               // Ej: "Representante Legal / Gerente"

  // Estado del Flujo
  status          SignatureStatus       @default(DRAFT)
  rejectionReason String?

  // Pista de Auditoría e Inmutabilidad (Ley 527 de 1999)
  originalDocHash String?               // Hash SHA-256 del PDF base
  signedDocHash   String?               // Hash SHA-256 del PDF final firmado
  signatureMethod SignatureCreationMode?
  signatureIp     String?
  signatureUa     String?               // User-Agent del navegador
  signatureImage  String?               @db.Text // DataURL o path del PNG de firma

  // Timestamps de Ciclo de Vida
  sentAt          DateTime?
  viewedAt        DateTime?
  signedAt        DateTime?
  revokedAt       DateTime?

  // OTP Opcional (Doble Factor)
  otpCodeHash     String?
  otpExpiresAt    DateTime?

  // Relación con el Archivo Oficial Congelado en S3
  mediaAttachmentId String?
  mediaAttachment   MediaAttachment?    @relation(fields: [mediaAttachmentId], references: [id], onDelete: SetNull)

  // Metadatos de Auditoría Interna
  createdById     String?
  createdBy       User?                 @relation("SignatureRequestsCreated", fields: [createdById], references: [id], onDelete: SetNull)
  createdAt       DateTime              @default(now())
  updatedAt       DateTime              @updatedAt

  @@index([tenantId])
  @@index([tenantId, status])
  @@index([token])
  @@index([documentType, documentId])
  @@map("signature_requests")
}
// --- Fin: prisma/schema/signature.prisma ---
```
