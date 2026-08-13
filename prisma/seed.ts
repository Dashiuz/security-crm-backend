import { PrismaClient } from '@prisma/client';

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
      primaryColor: '#224229',
      secondaryColor: '#24b343',
      sidebarColor: '#252b27',
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
      desc: 'SuperAdmin permission to manage and impersonate tenants',
    },
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
      id: 'cr81uhcznb2jf4fz1rgefcqs',
      key: 'employee:read',
      desc: 'Can read employee data',
    },
    {
      id: 'zeckhi5qmd3mfya194f9eild',
      key: 'employee:manage',
      desc: 'All crud permissions for employees',
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
      id: 'n6gt8r3kef5tn8nzm2qagvcy',
      key: 'user:manage',
      desc: 'All crud permissions for users',
    },
    {
      id: 'b8j7ryjce6x87mgei5qhfqqq',
      key: 'position:manage',
      desc: 'Manage positions',
    },
    {
      id: 'lb57f0sarsbx9vjx0bv8i03n',
      key: 'position:read',
      desc: 'Read positions',
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
      id: 'l8v8c3qkks6poncrqezicsxr',
      key: 'role:manage',
      desc: 'All crud permissinos for roles',
    },
    {
      id: 'b436kaotypnixngh2rcplzob',
      key: 'role:create',
      desc: 'Create roles',
    },
    {
      id: 'alubdlmgjbk7wmfd1qoo2a1e',
      key: 'role:read',
      desc: 'Read roles',
    },
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
    // Minuta permissions
    {
      id: 'minuta_read_perm_id',
      key: 'minuta:read',
      desc: 'Read logbook entries',
    },
    {
      id: 'minuta_create_perm_id',
      key: 'minuta:create',
      desc: 'Create logbook entries',
    },
    {
      id: 'minuta_update_perm_id',
      key: 'minuta:update',
      desc: 'Update or void logbook entries',
    },
    {
      id: 'minuta_delete_perm_id',
      key: 'minuta:delete',
      desc: 'Delete logbook entries',
    },
    {
      id: 'minuta_manage_perm_id',
      key: 'minuta:manage',
      desc: 'Manage all logbook operations',
    },
    // Client permissions
    {
      id: 'client_read_perm_id',
      key: 'client:read',
      desc: 'Read client accounts and sites',
    },
    {
      id: 'client_create_perm_id',
      key: 'client:create',
      desc: 'Create client accounts and sites',
    },
    {
      id: 'client_update_perm_id',
      key: 'client:update',
      desc: 'Update client accounts and sites',
    },
    {
      id: 'client_delete_perm_id',
      key: 'client:delete',
      desc: 'Delete client accounts and sites',
    },
    {
      id: 'client_manage_perm_id',
      key: 'client:manage',
      desc: 'Manage all client operations',
    },
  ];

  // 4. Role Permissions
  const rolePermissions = [
    // GODLIKE gets all permissions including godlike:manage
    ...permissions.map((p) => ({
      roleId: 'b11j3fi8f29bix96dx8azfzo', // GODLIKE role
      permissionId: p.id,
      assignedAt: new Date(),
      assignedBy: 'system',
    })),
    // ADMIN gets manage & crud permissions
    ...permissions
      .filter((p) => p.key !== 'godlike:manage')
      .map((p) => ({
        roleId: 'xv1937hvbe2zhh7a0slp2ug0', // ADMIN role
        permissionId: p.id,
        assignedAt: new Date(),
        assignedBy: 'system',
      })),
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

  // 9. User Roles
  const userRoles = [
    {
      userId: 'seed_id_01',
      roleId: 'b11j3fi8f29bix96dx8azfzo', // GODLIKE role in system tenant
      assignedAt: new Date(),
      assignedBy: 'system',
    },
    {
      userId: 'dk8j3u93xr56b1nf7m2qoqji',
      roleId: 'xv1937hvbe2zhh7a0slp2ug0', // ADMIN role in p1vk4imb6ugp1z0flglw86pk tenant
      assignedAt: new Date(),
      assignedBy: 'system',
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

  console.log('Seeding Roles...');
  for (const item of roles) {
    await prisma.role.upsert({
      where: { tenantId_name: { tenantId: item.tenantId, name: item.name } },
      update: { name: item.name },
      create: item,
    });
  }
  console.log('✅ Roles seeded');

  console.log('Seeding Permissions...');
  for (const item of permissions) {
    await prisma.permission.upsert({
      where: { key: item.key },
      update: { desc: item.desc },
      create: item,
    });
  }
  console.log('✅ Permissions seeded');

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
