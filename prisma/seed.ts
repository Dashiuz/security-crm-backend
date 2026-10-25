import {
  PrismaClient,
  PlanTier,
  SubscriptionStatus,
  PasswordPolicy,
} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seed: Starting database seeding...');

  // 1. Tenants
  const tenants = [
    {
      id: 'system',
      name: 'system',
      slug: 'system',
      isActive: true,
      createdAt: new Date('2026-03-25T04:58:18.997Z'),
      updatedAt: new Date('2026-03-25T00:00:00.000Z'),
      createdBy: 'system',
      updatedBy: 'system',
      logoUrl: '',
      primaryColor: '#7C3AED',
      secondaryColor: '#5B21B6',
      sidebarColor: '#1E1B4B',
    },
    {
      id: 'p1vk4imb6ugp1z0flglw86pk',
      name: 'Security Test',
      slug: 'sec-test',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: null,
      updatedBy: null,
      logoUrl: null,
      primaryColor: '#1976d2',
      secondaryColor: '#9c27b0',
      sidebarColor: null,
    },
  ];

  // 2. Roles
  const roles = [
    {
      id: 'b11j3fi8f29bix96dx8azfzo',
      tenantId: 'system',
      name: 'GODLIKE',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: null,
      updatedBy: null,
    },
    {
      id: 'xv1937hvbe2zhh7a0slp2ug0',
      tenantId: 'p1vk4imb6ugp1z0flglw86pk',
      name: 'ADMIN',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: null,
      updatedBy: null,
    },
    {
      id: 'u60ki0ch2irwmojhpr6mt69d',
      tenantId: 'p1vk4imb6ugp1z0flglw86pk',
      name: 'USER',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: null,
      updatedBy: null,
    },
  ];

  // 3. Permissions
  const permissions = [
    {
      id: 'godlike_manage_perm_id',
      key: 'godlike:manage',
      desc: 'Control total y suplantación multitenant (SuperAdmin)',
    },
    {
      id: 'cifrv3kl0q2125x7y0mt1jqh',
      key: 'employee:create',
      desc: 'Crear registros de empleados',
    },
    {
      id: 'dzx5svkbiyyz3h3g2wvgcpux',
      key: 'employee:update',
      desc: 'Actualizar información de empleados',
    },
    {
      id: 'a4x3gqh1u7838sr0i3ppawv6',
      key: 'employee:delete',
      desc: 'Inhabilitar registros de empleados',
    },
    {
      id: 'cr81uhcznb2jf4fz1rgefcqs',
      key: 'employee:read',
      desc: 'Consultar información de empleados',
    },
    {
      id: 'zeckhi5qmd3mfya194f9eild',
      key: 'employee:manage',
      desc: 'Control total de empleados',
    },
    {
      id: 'rr21avrkpz662c4nt46oim02',
      key: 'user:read',
      desc: 'Consultar usuarios del sistema',
    },
    {
      id: 'ppla80fnzn2mz6jwt2qhbg7g',
      key: 'user:create',
      desc: 'Crear cuentas de usuario',
    },
    {
      id: 'ypaapa6zuq096eywf2gaa7ji',
      key: 'user:update',
      desc: 'Actualizar cuentas de usuario',
    },
    {
      id: 'qxtcbt1tko5en558ij61u8h0',
      key: 'user:delete',
      desc: 'Inhabilitar cuentas de usuario',
    },
    {
      id: 'zbtgfyii4fc39a05e9r614r5',
      key: 'user:passwordchange',
      desc: 'Cambiar propia contraseña',
    },
    {
      id: 'n6gt8r3kef5tn8nzm2qagvcy',
      key: 'user:manage',
      desc: 'Control total de usuarios',
    },
    {
      id: 'b8j7ryjce6x87mgei5qhfqqq',
      key: 'position:manage',
      desc: 'Control total de cargos',
    },
    {
      id: 'lb57f0sarsbx9vjx0bv8i03n',
      key: 'position:read',
      desc: 'Consultar cargos',
    },
    {
      id: 'a1i52a32lmw1t4ky4yz5axbx',
      key: 'position:create',
      desc: 'Crear cargos',
    },
    {
      id: 'igqvzkysose1r6ng8iqynuiq',
      key: 'position:update',
      desc: 'Actualizar cargos',
    },
    {
      id: 's0nrwq0c1uog3qhsv5kkks7o',
      key: 'position:delete',
      desc: 'Inhabilitar cargos',
    },
    {
      id: 'e72v2ptgx88hnynsrkdtguo2',
      key: 'permission:manage',
      desc: 'Control total de permisos',
    },
    {
      id: 'vgrfx394jfbnu89sabio1ti4',
      key: 'permission:read',
      desc: 'Consultar catálogo de permisos',
    },
    {
      id: 't47g1rc0mh0c3185ejs0sy7o',
      key: 'permission:update',
      desc: 'Actualizar permisos',
    },
    {
      id: 'tc292zvxyx1e5ih7lz345xkm',
      key: 'permission:create',
      desc: 'Crear permisos',
    },
    {
      id: 'zxwlroxej5yvcjknt4e2r79v',
      key: 'permission:delete',
      desc: 'Eliminar permisos',
    },
    {
      id: 'l8v8c3qkks6poncrqezicsxr',
      key: 'role:manage',
      desc: 'Control total de roles',
    },
    {
      id: 'b436kaotypnixngh2rcplzob',
      key: 'role:create',
      desc: 'Crear roles de acceso',
    },
    {
      id: 'alubdlmgjbk7wmfd1qoo2a1e',
      key: 'role:read',
      desc: 'Consultar roles de acceso',
    },
    {
      id: 'oq3399gojxeoo5fgbca7o3dq',
      key: 'role:update',
      desc: 'Actualizar roles y permisos',
    },
    {
      id: 'pugwssoo7gr24esozhgqaiit',
      key: 'role:delete',
      desc: 'Eliminar roles de acceso',
    },
    {
      id: 'ds881ym4qgzdsry0eqlcbhkg',
      key: 'department:manage',
      desc: 'Control total de departamentos',
    },
    {
      id: 'kb2193t9gfvt96tyvmmp36s0',
      key: 'department:create',
      desc: 'Crear departamentos',
    },
    {
      id: 'c1oc1yymdy8ft4in2owymc17',
      key: 'department:read',
      desc: 'Consultar departamentos',
    },
    {
      id: 'mvn7ffhwxdxctlh16sqyu2ld',
      key: 'department:delete',
      desc: 'Eliminar departamentos',
    },
    {
      id: 'm063o8qcuovvb09xuvqemcqf',
      key: 'department:update',
      desc: 'Actualizar departamentos',
    },
    // Minuta permissions
    {
      id: 'minuta_read_perm_id',
      key: 'minuta:read',
      desc: 'Consultar registros de minutas y bitácoras',
    },
    {
      id: 'minuta_create_perm_id',
      key: 'minuta:create',
      desc: 'Crear registros en minutas operativas',
    },
    {
      id: 'minuta_update_perm_id',
      key: 'minuta:update',
      desc: 'Actualizar o anular registros de minuta',
    },
    {
      id: 'minuta_delete_perm_id',
      key: 'minuta:delete',
      desc: 'Eliminar registros de minuta',
    },
    {
      id: 'minuta_manage_perm_id',
      key: 'minuta:manage',
      desc: 'Control total de operaciones de minuta',
    },
    {
      id: 'minuta_export_perm_id',
      key: 'minuta:export',
      desc: 'Exportar reportes y fichas de minuta en formato PDF',
    },
    // Client permissions
    {
      id: 'client_read_all_perm_id',
      key: 'client:read_all',
      desc: 'Consultar todas las cuentas de clientes del tenant',
    },
    {
      id: 'client_read_assigned_perm_id',
      key: 'client:read_assigned',
      desc: 'Consultar únicamente clientes asignados al usuario',
    },
    {
      id: 'client_read_workplace_perm_id',
      key: 'client:read_workplace',
      desc: 'Consultar cliente asociado al puesto de trabajo',
    },
    {
      id: 'client_create_perm_id',
      key: 'client:create',
      desc: 'Crear cuentas y sedes de clientes',
    },
    {
      id: 'client_update_perm_id',
      key: 'client:update',
      desc: 'Actualizar cuentas y sedes de clientes',
    },
    {
      id: 'client_delete_perm_id',
      key: 'client:delete',
      desc: 'Inhabilitar cuentas y sedes de clientes',
    },
    {
      id: 'client_manage_perm_id',
      key: 'client:manage',
      desc: 'Control total de operaciones de clientes',
    },
    {
      id: 'client_read_general_perm_id',
      key: 'client:read_general',
      desc: 'Consultar información general del cliente',
    },
    {
      id: 'client_update_general_perm_id',
      key: 'client:update_general',
      desc: 'Actualizar información general del cliente',
    },
    {
      id: 'client_read_operations_perm_id',
      key: 'client:read_operations',
      desc: 'Consultar estructura física y operativa del cliente',
    },
    {
      id: 'client_update_operations_perm_id',
      key: 'client:update_operations',
      desc: 'Actualizar estructura física y operativa del cliente',
    },
    {
      id: 'client_read_legal_perm_id',
      key: 'client:read_legal',
      desc: 'Consultar información contractual, legal y consejo',
    },
    {
      id: 'client_update_legal_perm_id',
      key: 'client:update_legal',
      desc: 'Actualizar información contractual, legal y consejo',
    },
    {
      id: 'client_read_residents_perm_id',
      key: 'client:read_residents',
      desc: 'Consultar directorio de residentes del cliente',
    },
    // Resident permissions
    {
      id: 'resident_read_perm_id',
      key: 'resident:read',
      desc: 'Consultar residentes y asignación de unidades',
    },
    {
      id: 'resident_create_perm_id',
      key: 'resident:create',
      desc: 'Crear residentes y vincular a unidades',
    },
    {
      id: 'resident_update_perm_id',
      key: 'resident:update',
      desc: 'Actualizar datos de residentes',
    },
    {
      id: 'resident_delete_perm_id',
      key: 'resident:delete',
      desc: 'Inhabilitar o desvincular residentes',
    },
    {
      id: 'resident_manage_perm_id',
      key: 'resident:manage',
      desc: 'Control total de residentes',
    },
    // Tenant permissions
    {
      id: 'tenant_read_perm_id',
      key: 'tenant:read',
      desc: 'Consultar perfil, configuración y límites del tenant',
    },
    {
      id: 'tenant_manage_perm_id',
      key: 'tenant:manage',
      desc: 'Control total del perfil y configuración del tenant',
    },
    // Security Study permissions
    {
      id: 'sec_study_read_perm_id',
      key: 'sec_study:read',
      desc: 'Consultar estudios y documentos de seguridad',
    },
    {
      id: 'sec_study_create_perm_id',
      key: 'sec_study:create',
      desc: 'Crear estudios de seguridad y cargar documentos',
    },
    {
      id: 'sec_study_update_perm_id',
      key: 'sec_study:update',
      desc: 'Actualizar estudios de seguridad y documentos',
    },
    {
      id: 'sec_study_delete_perm_id',
      key: 'sec_study:delete',
      desc: 'Eliminar o anular estudios de seguridad',
    },
    {
      id: 'sec_study_manage_perm_id',
      key: 'sec_study:manage',
      desc: 'Control total de estudios de seguridad',
    },
    // Canva permissions
    {
      id: 'canva_read_perm_id',
      key: 'canva:read',
      desc: 'Consultar mapas y diseños vectoriales de canvas',
    },
    {
      id: 'canva_create_perm_id',
      key: 'canva:create',
      desc: 'Crear mapas base e inicializar editor canvas',
    },
    {
      id: 'canva_update_perm_id',
      key: 'canva:update',
      desc: 'Actualizar trazos y dispositivos en el canvas',
    },
    {
      id: 'canva_delete_perm_id',
      key: 'canva:delete',
      desc: 'Eliminar o descartar diseños de canvas',
    },
    {
      id: 'canva_manage_perm_id',
      key: 'canva:manage',
      desc: 'Control total de canvas y aprobación de geocercas',
    },
    // PQRS permissions
    {
      id: 'pqrs_read_perm_id',
      key: 'pqrs:read',
      desc: 'Consultar radicados y mensajes PQRS',
    },
    {
      id: 'pqrs_create_perm_id',
      key: 'pqrs:create',
      desc: 'Radicar solicitudes PQRS y respuestas',
    },
    {
      id: 'pqrs_update_perm_id',
      key: 'pqrs:update',
      desc: 'Actualizar estado de PQRS y agregar mensajes',
    },
    {
      id: 'pqrs_delete_perm_id',
      key: 'pqrs:delete',
      desc: 'Eliminar tickets y mensajes PQRS',
    },
    {
      id: 'pqrs_assign_perm_id',
      key: 'pqrs:assign',
      desc: 'Asignar tickets PQRS a operadores/responsables',
    },
    {
      id: 'pqrs_manage_perm_id',
      key: 'pqrs:manage',
      desc: 'Control total administrativo de tickets PQRS',
    },
    // Digital Signatures (Noxia Sign - SPEC-CORE-009)
    {
      id: 'signatures_profile_manage_perm_id',
      key: 'signatures:profile:manage',
      desc: 'Gestionar firma digital personal en perfil y configuraciones',
    },
    {
      id: 'signatures_request_create_perm_id',
      key: 'signatures:request:create',
      desc: 'Emitir solicitudes de firma externa y generar magic links',
    },
    {
      id: 'signatures_request_read_perm_id',
      key: 'signatures:request:read',
      desc: 'Consultar estado, aperturas y evidencias de solicitudes de firma',
    },
    {
      id: 'signatures_request_revoke_perm_id',
      key: 'signatures:request:revoke',
      desc: 'Revocar y forzar expiración de solicitudes de firma pendientes',
    },
    {
      id: 'signatures_verify_public_perm_id',
      key: 'signatures:verify:public',
      desc: 'Verificación pública de autenticidad e integridad de documentos por QR',
    },
    // Commercial Domain & SVSP Tariff (SPEC-ADM-018)
    {
      id: 'commercial_settings_read_perm_id',
      key: 'commercial:settings:read',
      desc: 'Consultar parámetros comerciales, tarifas SVSP y catálogo de servicios',
    },
    {
      id: 'commercial_settings_manage_perm_id',
      key: 'commercial:settings:manage',
      desc: 'Administrar vigencias tarifarias, salarios, valores agregados y skins',
    },
    // Commercial Proposals & P&L (SPEC-ADM-020)
    {
      id: 'commercial_proposals_read_perm_id',
      key: 'commercial:proposals:read',
      desc: 'Consultar propuestas comerciales y cotizaciones',
    },
    {
      id: 'commercial_proposals_create_perm_id',
      key: 'commercial:proposals:create',
      desc: 'Crear cotizaciones y ofertas comerciales',
    },
    {
      id: 'commercial_proposals_update_perm_id',
      key: 'commercial:proposals:update',
      desc: 'Modificar líneas y borradores de propuestas',
    },
    {
      id: 'commercial_proposals_issue_perm_id',
      key: 'commercial:proposals:issue',
      desc: 'Emitir oficialmente propuestas congelando PDF en S3',
    },
    {
      id: 'commercial_proposals_approve_pnl_perm_id',
      key: 'commercial:proposals:approve_pnl',
      desc: 'Aprobar propuestas con margen P&L en alerta ámbar',
    },
    // Commercial Service Orders (SPEC-ADM-021)
    {
      id: 'commercial_orders_read_perm_id',
      key: 'commercial:orders:read',
      desc: 'Consultar órdenes de servicio e histórico',
    },
    {
      id: 'commercial_orders_create_perm_id',
      key: 'commercial:orders:create',
      desc: 'Crear órdenes de servicio, asignar código OMEGA y disparar despacho',
    },
    {
      id: 'commercial_orders_manage_perm_id',
      key: 'commercial:orders:manage',
      desc: 'Control total y reintentos de despacho de órdenes de servicio',
    },
    // Commercial CRM & Legal (SPEC-ADM-022)
    {
      id: 'commercial_crm_read_perm_id',
      key: 'commercial:crm:read',
      desc: 'Consultar prospectos, pipeline y bitácora de seguimiento',
    },
    {
      id: 'commercial_crm_followup_perm_id',
      key: 'commercial:crm:followup',
      desc: 'Registrar gestiones de contacto y cierres por pérdida',
    },
    {
      id: 'commercial_legal_read_perm_id',
      key: 'commercial:legal:read',
      desc: 'Consultar cartera legal 360, pólizas, otrosíes y compromisos ANS',
    },
    {
      id: 'commercial_legal_manage_perm_id',
      key: 'commercial:legal:manage',
      desc: 'Gestionar pólizas, adiciones OSI y cumplimiento ANS',
    },
  ];

  // 5. Departments
  const departments = [
    {
      id: 'nxthvhdl3b2jfbvdr825mapd',
      tenantId: 'p1vk4imb6ugp1z0flglw86pk',
      name: 'OPERATIVO',
      isActive: true,
    },
    {
      id: 'a5dq2c4qf62t4ipf7851td2i',
      tenantId: 'p1vk4imb6ugp1z0flglw86pk',
      name: 'ADMINISTRATIVO',
      isActive: true,
    },
  ];

  // 6. Positions
  const positions = [
    {
      id: 't8ppqzgmrudcnk89xt7wxey6',
      tenantId: 'p1vk4imb6ugp1z0flglw86pk',
      name: 'ALMACENISTA',
      level: null,
      isActive: true,
    },
    {
      id: 'bxlh3ed5r9hhwh22forgjl9t',
      tenantId: 'p1vk4imb6ugp1z0flglw86pk',
      name: 'AUXILIAR DE ARCHIVO',
      level: null,
      isActive: true,
    },
    {
      id: 'h7ximdn4hcux860aa99kwk0j',
      tenantId: 'p1vk4imb6ugp1z0flglw86pk',
      name: 'SUPERVISOR DE PUESTO',
      level: null,
      isActive: true,
    },
    {
      id: 'jqpzs3rxecn3uc2lb9f4jrmi',
      tenantId: 'p1vk4imb6ugp1z0flglw86pk',
      name: 'TECNICO DE SEGURIDAD ELECTRONICA',
      level: null,
      isActive: true,
    },
    {
      id: 'dnxbiihgnsdfss9btas86392',
      tenantId: 'p1vk4imb6ugp1z0flglw86pk',
      name: 'GUARDA DE SEGURIDAD',
      level: null,
      isActive: true,
    },
    {
      id: 'kli6052hvujei7yu4cvwremm',
      tenantId: 'p1vk4imb6ugp1z0flglw86pk',
      name: 'GERENTE BOGOTA',
      level: null,
      isActive: true,
    },
    {
      id: 'ldm5si1a50syg8ky1kyeqtkg',
      tenantId: 'p1vk4imb6ugp1z0flglw86pk',
      name: 'DIRECTOR TECNOLOGIA',
      level: null,
      isActive: true,
    },
  ];

  // 7. Employees
  const employees = [
    {
      id: 'aioaybigrz5eswn62ttlsiab',
      tenantId: 'p1vk4imb6ugp1z0flglw86pk',
      firstName: 'Rosa',
      secondName: null,
      lastName: 'Coral',
      maternalSurname: null,
      fullName: 'Rosa Coral',
      documentType: 'CC',
      document: '99887766',
      birthdate: new Date('1992-03-10'),
      gender: 'F',
      address: 'Calle Principal 123',
      departmentId: 'a5dq2c4qf62t4ipf7851td2i',
      positionId: 'kli6052hvujei7yu4cvwremm',
      email: 'rosa.coral@example.com',
      phone: '555-9876',
      entryDate: new Date('2021-01-10'),
      isRetired: false,
      isActive: true,
      createdAt: new Date(),
      createdBy: 'seed_id_01',
      updatedAt: new Date(),
      updatedBy: null,
      retiredAt: null,
      deletedAt: null,
    },
    {
      id: 'aioaybigrz5eswn62ttlsibk',
      tenantId: 'system',
      firstName: 'Josua',
      secondName: 'Jacob',
      lastName: 'Guaramato',
      maternalSurname: null,
      fullName: 'Josua Jacob Guaramato',
      documentType: 'CC',
      document: '12345678',
      birthdate: new Date('1988-08-20'),
      gender: 'M',
      address: 'Sede Central System',
      departmentId: 'a5dq2c4qf62t4ipf7851td2i',
      positionId: 'kli6052hvujei7yu4cvwremm',
      email: 'josua.guaramato@example.com',
      phone: '555-4321',
      entryDate: new Date('2019-01-01'),
      isRetired: false,
      isActive: true,
      createdAt: new Date(),
      createdBy: 'system',
      updatedAt: new Date(),
      updatedBy: null,
      retiredAt: null,
      deletedAt: null,
    },
    {
      id: 'ly89lva0srljswu538x4hnao',
      tenantId: 'p1vk4imb6ugp1z0flglw86pk',
      firstName: 'Pepe',
      secondName: null,
      lastName: 'Test',
      maternalSurname: null,
      fullName: 'Pepe Test',
      documentType: 'CC',
      document: '11223344',
      birthdate: new Date('1990-01-01'),
      gender: 'M',
      address: 'al lado del vecino',
      departmentId: 'nxthvhdl3b2jfbvdr825mapd',
      positionId: 'ldm5si1a50syg8ky1kyeqtkg',
      email: 'pepe.test@example.com',
      phone: '555-1234',
      entryDate: new Date('2020-05-15'),
      isRetired: false,
      isActive: true,
      createdAt: new Date(),
      createdBy: 'seed_id_01',
      updatedAt: new Date(),
      updatedBy: 'seed_id_01',
      retiredAt: null,
      deletedAt: null,
    },
  ];

  // 8. Users
  const users = [
    // GODLIKE SuperAdmin User in tenant 'system'
    {
      id: 'seed_id_01',
      tenantId: 'system',
      document: '12345678',
      fullName: 'Josua Jacob Guaramato',
      department: 'Administrativo',
      position: 'Gerente Bogota',
      passwordHash:
        '$argon2id$v=19$m=19456,t=2,p=1$mSYpg8Y3p/mQrR5buqNWXQ$WWYaC7Q7+9VnPX9XRjp84iGZUTrV7YKjAGUc3rfI08w',
      isRetired: false,
      isActive: true,
      isFirstLogin: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system',
      updatedBy: 'seed_id_01',
      retiredAt: null,
      deletedAt: null,
    },
    // Commercial Admin User in tenant 'p1vk4imb6ugp1z0flglw86pk'
    {
      id: 'dk8j3u93xr56b1nf7m2qoqji',
      tenantId: 'p1vk4imb6ugp1z0flglw86pk',
      document: '11223344',
      fullName: 'Pepe Test',
      department: 'Operaciones',
      position: 'Director Tecnologia',
      passwordHash:
        '$argon2id$v=19$m=19456,t=2,p=1$gZbBmJZPstbJRcgpJTz5rw$EaSGnWoackAIvpoqJ1eu13WJbOvUPCGBILH9bv/2SSc',
      isRetired: false,
      isActive: true,
      isFirstLogin: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'seed_id_01',
      updatedBy: 'seed_id_01',
      retiredAt: null,
      deletedAt: null,
    },
  ];

  // Execute Seeding Sequence
  console.log('Seeding Tenants...');
  for (const item of tenants) {
    await prisma.tenant.upsert({
      where: { slug: item.slug },
      update: {
        name: item.name,
        isActive: item.isActive,
        logoUrl: item.logoUrl,
        primaryColor: item.primaryColor,
        secondaryColor: item.secondaryColor,
        sidebarColor: item.sidebarColor,
      },
      create: item,
    });
  }
  console.log('✅ Tenants seeded');

  console.log('Seeding Tenant Profiles, Subscriptions & Settings...');
  const tenantProfiles = [
    {
      tenantId: 'system',
      legalName: 'Noxia Global System Corp',
      taxId: '900000000-1',
      contactEmail: 'system@noxia.io',
      contactPhone: '+1 800 000 0000',
      address: 'Headquarters System',
      city: 'Bogota',
      country: 'Colombia',
      legalRepresentative: 'System Master',
    },
    {
      tenantId: 'p1vk4imb6ugp1z0flglw86pk',
      legalName: 'Seguridad Andina Ltda',
      taxId: '800123456-9',
      contactEmail: 'admin@seguridadandina.com',
      contactPhone: '+57 310 123 4567',
      address: 'Carrera 7 # 72-10 Oficina 301',
      city: 'Bogota',
      country: 'Colombia',
      legalRepresentative: 'Carlos Andres Rodriguez',
    },
  ];

  for (const prof of tenantProfiles) {
    await prisma.tenantProfile.upsert({
      where: { tenantId: prof.tenantId },
      update: prof,
      create: prof,
    });
  }

  const tenantSubscriptions = [
    {
      tenantId: 'system',
      planTier: PlanTier.ENTERPRISE,
      status: SubscriptionStatus.ACTIVE,
      maxClients: 999999,
      maxUsers: 999999,
      maxEmployees: 999999,
    },
    {
      tenantId: 'p1vk4imb6ugp1z0flglw86pk',
      planTier: PlanTier.PRO,
      status: SubscriptionStatus.ACTIVE,
      maxClients: 20,
      maxUsers: 100,
      maxEmployees: 200,
    },
  ];

  for (const sub of tenantSubscriptions) {
    await prisma.tenantSubscription.upsert({
      where: { tenantId: sub.tenantId },
      update: sub,
      create: sub,
    });
  }

  const tenantSettingsList = [
    {
      tenantId: 'system',
      timezone: 'America/Bogota',
      currency: 'COP',
      dateFormat: 'DD/MM/YYYY',
      mfaRequired: false,
      sessionTimeoutMinutes: 120,
      passwordPolicy: PasswordPolicy.STRICT,
      supportEmail: 'support@noxia.io',
    },
    {
      tenantId: 'p1vk4imb6ugp1z0flglw86pk',
      timezone: 'America/Bogota',
      currency: 'COP',
      dateFormat: 'DD/MM/YYYY',
      mfaRequired: false,
      sessionTimeoutMinutes: 60,
      passwordPolicy: PasswordPolicy.MEDIUM,
      supportEmail: 'soporte@seguridadandina.com',
      supportPhone: '+57 1 234 5678',
    },
  ];

  for (const set of tenantSettingsList) {
    await prisma.tenantSettings.upsert({
      where: { tenantId: set.tenantId },
      update: set,
      create: set,
    });
  }
  console.log('✅ Tenant profiles, subscriptions and settings seeded');

  console.log('Seeding Roles...');
  const seededRolesMap: Record<string, string> = {};
  for (const item of roles) {
    const r = await prisma.role.upsert({
      where: { tenantId_name: { tenantId: item.tenantId, name: item.name } },
      update: { name: item.name },
      create: item,
    });
    seededRolesMap[`${item.tenantId}:${item.name}`] = r.id;
  }
  console.log('✅ Roles seeded');

  console.log('Seeding Permissions...');
  const seededPermissionsMap: Record<string, string> = {};
  for (const item of permissions) {
    const p = await prisma.permission.upsert({
      where: { key: item.key },
      update: { desc: item.desc },
      create: item,
    });
    seededPermissionsMap[item.key] = p.id;
  }
  console.log('✅ Permissions seeded');

  const godlikeRoleId =
    seededRolesMap['system:GODLIKE'] || 'b11j3fi8f29bix96dx8azfzo';
  const adminRoleId =
    seededRolesMap['p1vk4imb6ugp1z0flglw86pk:ADMIN'] ||
    'xv1937hvbe2zhh7a0slp2ug0';

  const rolePermissions = [
    // GODLIKE gets all permissions including godlike:manage
    ...Object.values(seededPermissionsMap).map((permId) => ({
      roleId: godlikeRoleId,
      permissionId: permId,
      assignedAt: new Date(),
      assignedBy: 'system',
    })),
    // ADMIN gets manage & crud permissions
    ...Object.entries(seededPermissionsMap)
      .filter(([key]) => key !== 'godlike:manage')
      .map(([, permId]) => ({
        roleId: adminRoleId,
        permissionId: permId,
        assignedAt: new Date(),
        assignedBy: 'system',
      })),
  ];

  console.log('Seeding Role Permissions...');
  for (const item of rolePermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: item.roleId,
          permissionId: item.permissionId,
        },
      },
      update: { roleId: item.roleId, permissionId: item.permissionId },
      create: item,
    });
  }
  console.log('✅ Role permissions seeded');

  console.log('Seeding Departments...');
  for (const item of departments) {
    await prisma.department.upsert({
      where: { tenantId_name: { tenantId: item.tenantId, name: item.name } },
      update: { name: item.name },
      create: item,
    });
  }
  console.log('✅ Departments seeded');

  console.log('Seeding Positions...');
  for (const item of positions) {
    await prisma.position.upsert({
      where: { tenantId_name: { tenantId: item.tenantId, name: item.name } },
      update: { name: item.name },
      create: item,
    });
  }
  console.log('✅ Positions seeded');

  console.log('Seeding Employees...');
  for (const item of employees) {
    await prisma.employee.upsert({
      where: {
        tenantId_document: { tenantId: item.tenantId, document: item.document },
      },
      update: {
        firstName: item.firstName,
        secondName: item.secondName,
        lastName: item.lastName,
        maternalSurname: item.maternalSurname,
        fullName: item.fullName,
        documentType: item.documentType,
        document: item.document,
        birthdate: item.birthdate,
        gender: item.gender,
        address: item.address,
        departmentId: item.departmentId,
        positionId: item.positionId,
        email: item.email,
        phone: item.phone,
        entryDate: item.entryDate,
        isRetired: item.isRetired,
        isActive: item.isActive,
        createdAt: item.createdAt,
        createdBy: item.createdBy,
        updatedAt: item.updatedAt,
        retiredAt: item.retiredAt,
        deletedAt: item.deletedAt,
      },
      create: item,
    });
  }
  console.log('✅ Employees seeded');

  console.log('Seeding Users...');
  for (const item of users) {
    await prisma.user.upsert({
      where: { id: item.id },
      update: {
        tenantId: item.tenantId,
        passwordHash: item.passwordHash,
        fullName: item.fullName,
        document: item.document,
        department: item.department,
        position: item.position,
        isRetired: item.isRetired,
        isActive: item.isActive,
        isFirstLogin: item.isFirstLogin,
      },
      create: item,
    });
  }
  console.log('✅ Users seeded');

  console.log('Seeding User Roles...');
  const userRoles = [
    {
      userId: 'seed_id_01',
      roleId: godlikeRoleId,
      assignedAt: new Date(),
      assignedBy: 'system',
    },
    {
      userId: 'dk8j3u93xr56b1nf7m2qoqji',
      roleId: adminRoleId,
      assignedAt: new Date(),
      assignedBy: 'system',
    },
  ];

  for (const item of userRoles) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: item.userId,
          roleId: item.roleId,
        },
      },
      update: { userId: item.userId, roleId: item.roleId },
      create: item,
    });
  }
  console.log('✅ User roles seeded');

  // 12. Commercial Settings & SVSP 2026 Reference
  console.log('Seeding Commercial Settings for active tenants...');
  const testTenantId = 'p1vk4imb6ugp1z0flglw86pk';
  const commercialSetting = await prisma.commercialSettings.upsert({
    where: { tenantId: testTenantId },
    update: {},
    create: {
      tenantId: testTenantId,
      defaultAiuRate: 0.10,
      defaultIvaOnAiuRate: 0.19,
      defaultRetefuenteRate: 0.02,
      defaultReteIcaRate: 0.0138,
      maxReinvestmentPct1Yr: 0.80,
      maxReinvestmentPct2Yr: 1.60,
      defaultQuoteValidityDays: 15,
      enableGuardSalaryDisplay: true,
      qualityDocCode: 'CM-F-001',
      qualityDocVersion: 'V.4',
    },
  });

  // Default Tariff Period for 2026 (SVSP Official Reference)
  await prisma.tariffPeriodConfig.upsert({
    where: {
      tenantId_year_label: {
        tenantId: testTenantId,
        year: 2026,
        label: 'Tarifa Vigencia Oficial SVSP 2026 (44 Horas)',
      },
    },
    update: {
      smmlv: 1750905.00,
      monthlyTransportAux: 249095.00,
      dailyTransportAux: 8303.17,
      statutoryWeeklyHours: 44,
      baseHourlyRate: 7959.00,
    },
    create: {
      tenantId: testTenantId,
      commercialSettingsId: commercialSetting.id,
      year: 2026,
      label: 'Tarifa Vigencia Oficial SVSP 2026 (44 Horas)',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      isActive: true,
      smmlv: 1750905.00,
      monthlyTransportAux: 249095.00,
      dailyTransportAux: 8303.17,
      statutoryWeeklyHours: 44,
      baseHourlyRate: 7959.00,
      statutoryDayHours: 15,
      statutoryNightHours: 9,
      dayProportionFactor: 0.5597,
      nightProportionFactor: 0.4403,
      commercialMultiplier: 8.8,
      strata46Multiplier: 8.6,
      strata13Multiplier: 7.66376105,
    },
  });

  // Default Position Salary Matrix (Guarda Portero 2x2x2)
  await prisma.positionSalaryMatrix.upsert({
    where: {
      tenantId_positionTitle_scheduleType: {
        tenantId: testTenantId,
        positionTitle: 'Guarda Portero',
        scheduleType: 'SCHEDULE_2X2X2',
      },
    },
    update: {
      baseSalary: 1750905.00,
      transportAllowance: 249095.00,
      shiftOrdinaryHours: 8,
      shiftExtraHours: 4,
    },
    create: {
      tenantId: testTenantId,
      commercialSettingsId: commercialSetting.id,
      positionTitle: 'Guarda Portero',
      scheduleType: 'SCHEDULE_2X2X2',
      guardsRequiredPerPost: 3.0,
      baseSalary: 1750905.00,
      transportAllowance: 249095.00,
      shiftOrdinaryHours: 8,
      shiftExtraHours: 4,
      estimatedOvertimePay: 450000.00,
      grossSalary: 2449095.00,
      healthDeductionPct: 0.04,
      pensionDeductionPct: 0.04,
      healthDeduction: 88000.00,
      pensionDeduction: 88000.00,
      totalDeductions: 176000.00,
      fixedBonusNonSalary: 0,
      vehicleAllowance: 0,
      netTakeHomePay: 2273095.00,
      isActive: true,
    },
  });

  // Default Document Skin
  await prisma.tenantDocumentSkin.upsert({
    where: { tenantId: testTenantId },
    update: {},
    create: {
      tenantId: testTenantId,
      commercialSettingsId: commercialSetting.id,
      primaryBrandColorHex: '#1E1B4B',
      accentBrandColorHex: '#7C3AED',
      companyLegalName: 'Seguridad Test Ltda.',
      companyNit: '900.123.456-7',
      supervigilanciaLicense: 'Res. 20264100001234 de SuperVigilancia',
    },
  });

  console.log('✅ Commercial settings and SVSP 2026 reference seeded');

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
