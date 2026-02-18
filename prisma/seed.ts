import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenants = [
    {
      id: 'test_01',
      name: 'Security Test',
      slug: 'sec-test',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const roles = [
    {
      id: 'xv1937hvbe2zhh7a0slp2ug0',
      name: 'test_01',
      slug: 'ADMIN',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: null,
      updatedBy: null,
    },
    {
      id: 'u60ki0ch2irwmojhpr6mt69d',
      name: 'test_01',
      slug: 'USER',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: null,
      updatedBy: null,
    },
    {
      id: 'b11j3fi8f29bix96dx8azfzo',
      name: 'test_01',
      slug: 'GODLIKE',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: null,
      updatedBy: null,
    },
  ];

  const permissions = [
    {
      id: 'cifrv3kl0q2125x7y0mt1jqh',
      key: 'employee:create',
      desc: 'Create employees',
    },
    {
      id: 'dzx5svkbiyyz3h3g2wvgcpux',
      key: 'employee:update',
      desc: 'Update employees',
    },
    {
      id: 'a4x3gqh1u7838sr0i3ppawv6',
      key: 'employee:delete',
      desc: 'Delete employees',
    },
    {
      id: 'b8j7ryjce6x87mgei5qhfqqq',
      key: 'position:manage',
      desc: 'Manage positions',
    },
    {
      id: 'rr21avrkpz662c4nt46oim02',
      key: 'user:read',
      desc: 'Read users information data',
    },
    {
      id: 'ppla80fnzn2mz6jwt2qhbg7g',
      key: 'user:create',
      desc: 'Create users to interact with the platform',
    },
    {
      id: 'ypaapa6zuq096eywf2gaa7ji',
      key: 'user:update',
      desc: 'Update users information',
    },
    {
      id: 'qxtcbt1tko5en558ij61u8h0',
      key: 'user:delete',
      desc: 'Deletes a user, softly',
    },
    {
      id: 'zbtgfyii4fc39a05e9r614r5',
      key: 'user:passwordchange',
      desc: 'User can change its own password',
    },
    {
      id: 'zeckhi5qmd3mfya194f9eild',
      key: 'employee:manage',
      desc: 'All crud permissions for employees',
    },
    {
      id: 'n6gt8r3kef5tn8nzm2qagvcy',
      key: 'user:manage',
      desc: 'All crud permissions for users',
    },
    {
      id: 'lb57f0sarsbx9vjx0bv8i03n',
      key: 'position:read',
      desc: 'Read positions',
    },
    {
      id: 'e72v2ptgx88hnynsrkdtguo2',
      key: 'permission:manage',
      desc: 'All crud permissions for permissions',
    },
    {
      id: 'vgrfx394jfbnu89sabio1ti4',
      key: 'permission:read',
      desc: 'Read permissions',
    },
    {
      id: 't47g1rc0mh0c3185ejs0sy7o',
      key: 'permission:update',
      desc: 'Update permissions',
    },
    {
      id: 'a1i52a32lmw1t4ky4yz5axbx',
      key: 'position:create',
      desc: 'Create positions',
    },
    {
      id: 'igqvzkysose1r6ng8iqynuiq',
      key: 'position:update',
      desc: 'Update positions',
    },
    {
      id: 's0nrwq0c1uog3qhsv5kkks7o',
      key: 'position:delete',
      desc: 'Delete positions',
    },
    {
      id: 'l8v8c3qkks6poncrqezicsxr',
      key: 'role:manage',
      desc: 'All crud permissinos for roles',
    },
    {
      id: 'b436kaotypnixngh2rcplzob',
      key: 'role:create',
      desc: 'Create roles',
    },
    { id: 'alubdlmgjbk7wmfd1qoo2a1e', key: 'role:read', desc: 'Read roles' },
    {
      id: 'oq3399gojxeoo5fgbca7o3dq',
      key: 'role:update',
      desc: 'Update roles',
    },
    {
      id: 'pugwssoo7gr24esozhgqaiit',
      key: 'role:delete',
      desc: 'Delete roles',
    },
    {
      id: 'ds881ym4qgzdsry0eqlcbhkg',
      key: 'department:manage',
      desc: 'All permissions for departments',
    },
    {
      id: 'kb2193t9gfvt96tyvmmp36s0',
      key: 'department:create',
      desc: 'Create departments',
    },
    {
      id: 'c1oc1yymdy8ft4in2owymc17',
      key: 'department:read',
      desc: 'Read departments',
    },
    {
      id: 'mvn7ffhwxdxctlh16sqyu2ld',
      key: 'department:delete',
      desc: 'Delete departments',
    },
    {
      id: 'm063o8qcuovvb09xuvqemcqf',
      key: 'department:update',
      desc: 'Update departments',
    },
    {
      id: 'tc292zvxyx1e5ih7lz345xkm',
      key: 'permission:create',
      desc: 'Create permissions',
    },
    {
      id: 'zxwlroxej5yvcjknt4e2r79v',
      key: 'permission:delete',
      desc: 'Delete permissions',
    },
    {
      id: 'cr81uhcznb2jf4fz1rgefcqs',
      key: 'employee:read',
      desc: 'Can read employee data',
    },
  ];

  const rolePermissions = [
    {
      roleId: 'b11j3fi8f29bix96dx8azfzo',
      permissionId: 'b8j7ryjce6x87mgei5qhfqqq',
      assignedAt: new Date(),
      assignedBy: null,
    },
    {
      roleId: 'b11j3fi8f29bix96dx8azfzo',
      permissionId: 'ds881ym4qgzdsry0eqlcbhkg',
      assignedAt: new Date(),
      assignedBy: null,
    },
    {
      roleId: 'b11j3fi8f29bix96dx8azfzo',
      permissionId: 'e72v2ptgx88hnynsrkdtguo2',
      assignedAt: new Date(),
      assignedBy: null,
    },
    {
      roleId: 'b11j3fi8f29bix96dx8azfzo',
      permissionId: 'l8v8c3qkks6poncrqezicsxr',
      assignedAt: new Date(),
      assignedBy: null,
    },
    {
      roleId: 'b11j3fi8f29bix96dx8azfzo',
      permissionId: 'n6gt8r3kef5tn8nzm2qagvcy',
      assignedAt: new Date(),
      assignedBy: null,
    },
    {
      roleId: 'b11j3fi8f29bix96dx8azfzo',
      permissionId: 'zeckhi5qmd3mfya194f9eild',
      assignedAt: new Date(),
      assignedBy: null,
    },
  ];

  const departments = [
    {
      id: 'nxthvhdl3b2jfbvdr825mapd',
      tenantId: 'test_01',
      name: 'OPERATIVO',
      isActive: true,
    },
    {
      id: 'a5dq2c4qf62t4ipf7851td2i',
      tenantId: 'test_01',
      name: 'ADMINISTRATIVO',
      isActive: true,
    },
  ];

  const positions = [
    {
      id: 't8ppqzgmrudcnk89xt7wxey6',
      tenantId: 'test_01',
      name: 'ALMACENISTA',
      level: null,
      isActive: true,
    },
    {
      id: 'bxlh3ed5r9hhwh22forgjl9t',
      tenantId: 'test_01',
      name: 'AUXILIAR DE ARCHIVO',
      level: null,
      isActive: true,
    },
    {
      id: 'h7ximdn4hcux860aa99kwk0j',
      tenantId: 'test_01',
      name: 'SUPERVISOR DE PUESTO',
      level: null,
      isActive: true,
    },
    {
      id: 'jqpzs3rxecn3uc2lb9f4jrmi',
      tenantId: 'test_01',
      name: 'TECNICO DE SEGURIDAD ELECTRONICA',
      level: null,
      isActive: true,
    },
    {
      id: 'atu37uexb3qdu8e227tcvim2',
      tenantId: 'test_01',
      name: 'ANALISTA DE TECNOLOGIA',
      level: null,
      isActive: true,
    },
    {
      id: 'aurxqgklt866gzqc2wlqr0mj',
      tenantId: 'test_01',
      name: 'AUXILIAR DE PROGRAMACION',
      level: null,
      isActive: true,
    },
    {
      id: 'xlqjpjpuiee81zxm4n0ccrie',
      tenantId: 'test_01',
      name: 'SERVICIOS GNALES',
      level: null,
      isActive: true,
    },
    {
      id: 'b3rehmw0wa6f0i1b8ortaa63',
      tenantId: 'test_01',
      name: 'TECNICO EN INSTALACION',
      level: null,
      isActive: true,
    },
    {
      id: 'gyd1cqcnpd01roz7as6dkqfk',
      tenantId: 'test_01',
      name: 'ANALISTA JURIDICO',
      level: null,
      isActive: true,
    },
    {
      id: 'q145qggfiw5pmls6qzfk1zlw',
      tenantId: 'test_01',
      name: 'ASISTENTE ADMINISTRATIVO',
      level: null,
      isActive: true,
    },
    {
      id: 'ui1iujdwgq0xp2o93rqbi436',
      tenantId: 'test_01',
      name: 'ANALISTA DE SELECCION',
      level: null,
      isActive: true,
    },
    {
      id: 'g12wy357n3eb3rzav9mhh5ur',
      tenantId: 'test_01',
      name: 'ASISTENTE DE TECNOLOGIA',
      level: null,
      isActive: true,
    },
    {
      id: 'smlest91q9xlvd37s5s9wens',
      tenantId: 'test_01',
      name: 'APRENDIZ SENA',
      level: null,
      isActive: true,
    },
    {
      id: 'g11sekccg3kpc256tqugvpm9',
      tenantId: 'test_01',
      name: 'ASISTENTE MEDIOS TECNOLOGICOS',
      level: null,
      isActive: true,
    },
    {
      id: 'qxvocog7h0tkap5jccg1vng0',
      tenantId: 'test_01',
      name: 'ASISTENTE COMERCIAL',
      level: null,
      isActive: true,
    },
    {
      id: 'ojd7wnf0jo0f6vummhfcdzap',
      tenantId: 'test_01',
      name: 'DIRECTOR COMERCIAL',
      level: null,
      isActive: true,
    },
    {
      id: 'c3ptkj3a0d9zx8rgoqo6yjgp',
      tenantId: 'test_01',
      name: 'DIRECTORA RECURSOS HUMANOS',
      level: null,
      isActive: true,
    },
    {
      id: 'w7ufcpoq1z3syz2rqhicsbj2',
      tenantId: 'test_01',
      name: 'DIRECTORA SISTEMAS DE CALIDAD',
      level: null,
      isActive: true,
    },
    {
      id: 'u6n5rbtq04i1otyrvsa0mkxx',
      tenantId: 'test_01',
      name: 'GERENTE DE OPERACIONES',
      level: null,
      isActive: true,
    },
    {
      id: 'j10cmogcmksz68142yl5e5ps',
      tenantId: 'test_01',
      name: 'DIRECTOR INNOVACION Y TECNOLOGIA',
      level: null,
      isActive: true,
    },
    {
      id: 'kli6052hvujei7yu4cvwremm',
      tenantId: 'test_01',
      name: 'GERENTE BOGOTA',
      level: null,
      isActive: true,
    },
    {
      id: 'be0h742a9gp2utcpp6i8vuhi',
      tenantId: 'test_01',
      name: 'OPERADOR MEDIOS TECNOLOGICOS',
      level: null,
      isActive: true,
    },
    {
      id: 'c1ymqyu8og72gi7s4g3vd52a',
      tenantId: 'test_01',
      name: 'EJECUTIVA COMERCIAL',
      level: null,
      isActive: true,
    },
    {
      id: 'ji55j4h3079mjtdnyfxp3sid',
      tenantId: 'test_01',
      name: 'SUB GERENTE',
      level: null,
      isActive: true,
    },
    {
      id: 'p6ackplvcfxkswgijfqraodd',
      tenantId: 'test_01',
      name: 'SECRETARIA GENERAL',
      level: null,
      isActive: true,
    },
    {
      id: 'dnxbiihgnsdfss9btas86392',
      tenantId: 'test_01',
      name: 'GUARDA DE SEGURIDAD',
      level: null,
      isActive: true,
    },
    {
      id: 'vdrlopctyufcm1wpwzkvhyp7',
      tenantId: 'test_01',
      name: 'PROGRAMADORA',
      level: null,
      isActive: true,
    },
    {
      id: 'bp10vupohso6hr739gjucp52',
      tenantId: 'test_01',
      name: 'GUARDA LIDER',
      level: null,
      isActive: true,
    },
    {
      id: 'zmz2m2ddrgpc9jrt74oxg3bn',
      tenantId: 'test_01',
      name: 'GERENTE',
      level: null,
      isActive: true,
    },
    {
      id: 'hmm4572sc4p61i3371lqls54',
      tenantId: 'test_01',
      name: 'SUPERVISOR MOTORIZADO',
      level: null,
      isActive: true,
    },
    {
      id: 'fvgblibjbo9n1luz26eyr5fb',
      tenantId: 'test_01',
      name: 'TECNICO EN INSTALACIONES',
      level: null,
      isActive: true,
    },
    {
      id: 'nkxeitfm4510alwsxy6wqjfq',
      tenantId: 'test_01',
      name: 'DISEÑADORA DE CONTENIDO DIGITAL',
      level: null,
      isActive: true,
    },
    {
      id: 'a84mwjvdgvh6ei4ljc0119ix',
      tenantId: 'test_01',
      name: 'SUPERVISOR',
      level: null,
      isActive: true,
    },
    {
      id: 'wystxgri0im8p758094sknzu',
      tenantId: 'test_01',
      name: 'INGENIERO ELECTRONICO DE PROYECTO',
      level: null,
      isActive: true,
    },
    {
      id: 'q13wdtw2tbnm7aueazeyooo9',
      tenantId: 'test_01',
      name: 'TECNICO EN MANTENIMIENTO',
      level: null,
      isActive: true,
    },
    {
      id: 'idli1b07xh639a4zjlx4aq1p',
      tenantId: 'test_01',
      name: 'SUPERVISOR DE PROYECTOS',
      level: null,
      isActive: true,
    },
    {
      id: 'n142nlncy9uzer4v42jxtvt0',
      tenantId: 'test_01',
      name: 'DIRECTORA COMERCIAL',
      level: null,
      isActive: true,
    },
    {
      id: 'y122vyqtmcsvt6nqk3ebwb83',
      tenantId: 'test_01',
      name: 'AUXILIAR DE TECNOLOGIA',
      level: null,
      isActive: true,
    },
    {
      id: 'ioy205odrbsrphk5tlhatcwi',
      tenantId: 'test_01',
      name: 'DIRECTORA DE CONTABILIDAD',
      level: null,
      isActive: true,
    },
    {
      id: 'fb9w6rojhzhmgp7aw3ruvx7q',
      tenantId: 'test_01',
      name: 'DIRECTOR DE MEDIOS TECNOLOGICOS',
      level: null,
      isActive: true,
    },
    {
      id: 'mkizefd31iwunajhhzhlwcqe',
      tenantId: 'test_01',
      name: 'COORDINADOR DE CALIDAD',
      level: null,
      isActive: true,
    },
    {
      id: 'ty7ap7r5grme9fe3qs0rgk9v',
      tenantId: 'test_01',
      name: 'ASISTENTE TECNICO',
      level: null,
      isActive: true,
    },
    {
      id: 'ekals725smjs8uippjecuve6',
      tenantId: 'test_01',
      name: 'ASISTENTE OPERACIONES',
      level: null,
      isActive: true,
    },
    {
      id: 'dgeeb56ooip54svk69n7y6v3',
      tenantId: 'test_01',
      name: 'DIRECTOR AGENCIA TUNJA',
      level: null,
      isActive: true,
    },
    {
      id: 'tzzershsxuoyfjmozqnasy3d',
      tenantId: 'test_01',
      name: 'AUXILIAR DE NOMINA',
      level: null,
      isActive: true,
    },
    {
      id: 'c8ejy16mao09ebw02uq3bh5g',
      tenantId: 'test_01',
      name: 'DIRECTOR DE RIESGOS E INVESTIGACION',
      level: null,
      isActive: true,
    },
    {
      id: 'skzwo3wp5wvc8q4g1af5de5u',
      tenantId: 'test_01',
      name: 'ASISTENTE RECURSOS HUMANOS',
      level: null,
      isActive: true,
    },
    {
      id: 'dryv2kc5sqxyjjkv005ydyw3',
      tenantId: 'test_01',
      name: 'DIRECTORA DE NOMINA',
      level: null,
      isActive: true,
    },
    {
      id: 'v60brxj1azqlritdoiu95c2m',
      tenantId: 'test_01',
      name: 'DIRECTOR SEGURIDAD ELECTRONICA',
      level: null,
      isActive: true,
    },
    {
      id: 'h10zcao9tbpjf7joc2sti8cw',
      tenantId: 'test_01',
      name: 'COORDINADOR DE OPERACIONES',
      level: null,
      isActive: true,
    },
    {
      id: 'xcxwevcpxesuqsrw9pwjwpqp',
      tenantId: 'test_01',
      name: 'COORDINADORA DE SERVICIO',
      level: null,
      isActive: true,
    },
    {
      id: 'wagz8ebpph6oxc976yo355bq',
      tenantId: 'test_01',
      name: 'AUXILIAR CONTABLE',
      level: null,
      isActive: true,
    },
  ];

  const employees = [
    {
      id: 'ujh9epbmm9tu4lihmroug07y',
      tenantId: 'test_01',
      firstName: 'Carlos',
      secondName: 'Andrés',
      lastName: 'Pérez',
      maternalSurname: 'Gómez',
      fullName: 'Carlos Andrés Pérez Gómez',
      documentType: 'CC',
      document: '23456789',
      birthdate: new Date('1990-05-12'),
      gender: 'Masculino',
      address: '456 Oak Ave',
      departmentId: 'nxthvhdl3b2jfbvdr825mapd',
      positionId: 'dnxbiihgnsdfss9btas86392',
      email: 'carlos.perez.gomez@example.com',
      phone: '23456789',
      entryDate: new Date('2021-03-15'),
      isRetired: false,
      isActive: true,
      createdAt: new Date(),
      createdBy: 'mock_user',
      updatedAt: new Date(),
      updatedBy: null,
      retiredAt: null,
      deletedAt: null,
    },
    {
      id: 'aioaybigrz5eswn62ttlsiab',
      tenantId: 'test_01',
      firstName: 'Rosa',
      secondName: null,
      lastName: 'Coral',
      maternalSurname: 'Castañeda',
      fullName: 'Rosa Coral Castañeda',
      documentType: 'CC',
      document: '987654',
      birthdate: new Date('1990-01-01'),
      gender: 'Femenino',
      address: '456 Oak Ave',
      departmentId: 'a5dq2c4qf62t4ipf7851td2i',
      positionId: 'kli6052hvujei7yu4cvwremm',
      email: 'rosa.coral@example.com',
      phone: '987654',
      entryDate: new Date('2021-03-15'),
      isRetired: false,
      isActive: true,
      createdAt: new Date(),
      createdBy: 'mock_user',
      updatedAt: new Date(),
      updatedBy: null,
      retiredAt: null,
      deletedAt: null,
    },
    {
      id: 'aioaybigrz5eswn62ttlsibk',
      tenantId: 'test_01',
      firstName: 'Josua',
      secondName: 'Jacob',
      lastName: 'Guaramato',
      maternalSurname: null,
      fullName: 'Josua Jacob Guaramato',
      documentType: 'CC',
      document: '12345678',
      birthdate: new Date('1990-08-02'),
      gender: 'Masculino',
      address: '456 Oak Ave',
      departmentId: 'a5dq2c4qf62t4ipf7851td2i',
      positionId: 'kli6052hvujei7yu4cvwremm',
      email: 'josua.guaramato@example.com',
      phone: '3102101010',
      entryDate: new Date('2021-03-15'),
      isRetired: false,
      isActive: true,
      createdAt: new Date(),
      createdBy: 'mock_user',
      updatedAt: new Date(),
      updatedBy: null,
      retiredAt: null,
      deletedAt: null,
    },
    {
      id: 'ly89lva0srljswu538x4hnao',
      tenantId: 'test_01',
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
      positionId: 'dnxbiihgnsdfss9btas86392',
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

  const users = [
    {
      id: 'dk8j3u93xr56b1nf7m2qoqji',
      tenantId: 'test_01',
      document: '11223344',
      fullName: 'Pepe Test',
      department: 'Operaciones',
      position: 'Guarda de Seguridad',
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
    {
      id: 'seed_id_01',
      tenantId: 'test_01',
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
      createdBy: null,
      updatedBy: 'seed_id_01',
      retiredAt: null,
      deletedAt: null,
    },
  ];

  const userRoles = [
    {
      id: 'seed_id_01',
      roleId: 'b11j3fi8f29bix96dx8azfzo',
      asignedAt: new Date(),
    },
  ];

  const tablesData = [
    { tableName: 'tenant', data: tenants },
    { tableName: 'role', data: roles },
    { tableName: 'permission', data: permissions },
    { tableName: 'rolePermissions', data: rolePermissions },
    { tableName: 'department', data: departments },
    { tableName: 'position', data: positions },
    { tableName: 'employee', data: employees },
    { tableName: 'users', data: users },
    { tableName: 'userRoles', data: userRoles },
  ];

  for (const table of tablesData) {
    const promises = table.data.map((item: any) =>
      seedThatTableUp(table.tableName, item),
    );
    await Promise.all(promises);
  }
}

async function seedThatTableUp(tableName: string, data: any) {
  if (tableName == 'tenant') {
    await prisma.tenant.upsert({
      where: { slug: data.slug },
      update: { name: data.name },
      create: data,
    });

    console.log('✅ Tenants seeded');
  } else if (tableName == 'role') {
    await prisma.role.upsert({
      where: { tenantId_name: { tenantId: data.tenantId, name: data.name } },
      update: { name: data.name },
      create: data,
    });

    console.log('✅ Roles seeded');
  } else if (tableName == 'department') {
    await prisma.department.upsert({
      where: { tenantId_name: { tenantId: data.tenantId, name: data.name } },
      update: { name: data.name },
      create: data,
    });

    console.log('✅ Departments seeded');
  } else if (tableName == 'position') {
    await prisma.position.upsert({
      where: { tenantId_name: { tenantId: data.tenantId, name: data.name } },
      update: { name: data.name },
      create: data,
    });

    console.log('✅ Positions seeded');
  } else if (tableName == 'employee') {
    await prisma.employee.upsert({
      where: {
        tenantId_document: { tenantId: data.tenantId, document: data.document },
      },
      update: {
        firstName: data.firstName,
        secondName: data.secondName,
        lastName: data.lastName,
        maternalSurname: data.maternalSurname,
        fullName: data.fullName,
        documentType: data.documentType,
        document: data.document,
        birthdate: data.birthdate,
        gender: data.gender,
        address: data.address,
        departmentId:
          data.firstName == 'Rosa' || 'Josua'
            ? 'a5dq2c4qf62t4ipf7851td2i'
            : 'nxthvhdl3b2jfbvdr825mapd',
        positionId:
          data.firstName == 'Rosa' || 'Josua'
            ? 'kli6052hvujei7yu4cvwremm'
            : 'dnxbiihgnsdfss9btas86392',
        email: data.email,
        phone: data.phone,
        entryDate: data.entryDate,
        isRetired: data.isRetired,
        isActive: data.isActive,
        createdAt: data.createdAt,
        createdBy: data.createdBy,
        updatedAt: data.updatedAt,
        retiredAt: data.retiredAt,
        deletedAt: data.deletedAt,
      },
      create: data,
    });

    console.log('✅ Employees seeded');
  } else if (tableName == 'users') {
    await prisma.user.upsert({
      where: { id: data.id },
      update: {
        tenantId: data.tenantId,
        passwordHash: data.passwordHash,
        fullName: data.fullName,
        document: data.document,
        department: data.department,
        position: data.position,
        isRetired: data.isRetired,
        isActive: data.isActive,
        isFirstLogin: data.isFirstLogin,
      },
      create: data,
    });

    console.log('✅ Users seeded');
  } else if (tableName == 'permission') {
    await prisma.permission.upsert({
      where: { key: data.key },
      update: { desc: data.desc },
      create: data,
    });

    console.log('✅ Permissions seeded');
  } else if (tableName == 'rolePermissions') {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: data.roleId,
          permissionId: data.permissionId,
        },
      },
      update: { roleId: data.roleId, permissionId: data.permissionId },
      create: data,
    });

    console.log('✅ Role permissions seeded');
  } else if (tableName == 'userRoles') {
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: data.userId,
          roleId: data.roleId,
        },
      },
      update: { userId: data.userId, roleId: data.roleId },
      create: data,
    });

    console.log('✅ User roles seeded');
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed error', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
