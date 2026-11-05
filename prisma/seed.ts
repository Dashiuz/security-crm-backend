import { CANONICAL_PERMISSIONS } from './permissions-catalog';
import { seedPayroll } from './seed-payroll';
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
  const permissions = CANONICAL_PERMISSIONS;

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

  // Query all ADMIN roles across tenants to ensure they get new permissions
  const allAdminRoles = await prisma.role.findMany({
    where: { name: 'ADMIN' },
  });
  const adminRoleIds = Array.from(
    new Set([adminRoleId, ...allAdminRoles.map((r) => r.id)]),
  );

  const rolePermissions: Array<{
    roleId: string;
    permissionId: string;
    assignedAt: Date;
    assignedBy: string;
  }> = [
    // GODLIKE gets all permissions including godlike:manage
    ...Object.values(seededPermissionsMap).map((permId) => ({
      roleId: godlikeRoleId,
      permissionId: permId,
      assignedAt: new Date(),
      assignedBy: 'system',
    })),
  ];

  // All ADMIN roles get all non-godlike permissions
  for (const rid of adminRoleIds) {
    for (const [key, permId] of Object.entries(seededPermissionsMap)) {
      if (key !== 'godlike:manage') {
        rolePermissions.push({
          roleId: rid,
          permissionId: permId,
          assignedAt: new Date(),
          assignedBy: 'system',
        });
      }
    }
  }

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
  const activeTenants = await prisma.tenant.findMany({
    where: { isActive: true },
    select: { id: true },
  });
  const tenantsToSeed = Array.from(
    new Set(['p1vk4imb6ugp1z0flglw86pk', 'system', ...activeTenants.map((t) => t.id)]),
  );
  for (const tenantId of tenantsToSeed) {
    const commercialSetting = await prisma.commercialSettings.upsert({
      where: { tenantId },
      update: {},
      create: {
        tenantId,
        defaultAiuRate: 0.10,
        defaultIvaOnAiuRate: 0.19,
        defaultRetefuenteRate: 0.02,
        defaultReteIcaRate: 0.0138,
        maxReinvestmentPct1Yr: 0.80,
        maxReinvestmentPct2Yr: 1.60,
        defaultQuoteValidityDays: 15,
        enableGuardSalaryDisplay: true,
        defaultPromptPaymentDays: 10,
        defaultPromptPaymentDisc: 0.00,
        qualityDocCode: 'CM-F-001',
        qualityDocVersion: 'V.4',
      },
    });

    // Default Tariff Period for 2026 (SVSP Official Reference)
    await prisma.tariffPeriodConfig.upsert({
      where: {
        tenantId_year_label: {
          tenantId,
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
        statutoryDayHours: 13,
        statutoryNightHours: 11,
        dayProportionFactor: 0.4759,
        nightProportionFactor: 0.5241,
        commercialMultiplier: 8.8,
        strata46Multiplier: 9.77,
        strata13Multiplier: 7.66376105,
      },
      create: {
        tenantId,
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
        statutoryDayHours: 13,
        statutoryNightHours: 11,
        dayProportionFactor: 0.4759,
        nightProportionFactor: 0.5241,
        commercialMultiplier: 8.8,
        strata46Multiplier: 9.77,
        strata13Multiplier: 7.66376105,
      },
    });

    // Default Position Salary Matrix (Guarda Portero 2x2x2)
    await prisma.positionSalaryMatrix.upsert({
      where: {
        tenantId_positionTitle_scheduleType: {
          tenantId,
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
        tenantId,
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
      where: { tenantId },
      update: {},
      create: {
        tenantId,
        commercialSettingsId: commercialSetting.id,
        primaryBrandColorHex: '#1E1B4B',
        accentBrandColorHex: '#7C3AED',
        companyLegalName:
          tenantId === 'system' ? 'NOXIA Master System' : 'Seguridad Test Ltda.',
        companyNit: tenantId === 'system' ? '900.000.000-1' : '900.123.456-7',
        supervigilanciaLicense: 'Res. 20264100001234 de SuperVigilancia',
      },
    });
  }

  console.log('✅ Commercial settings and SVSP 2026 reference seeded');

  // 13. Payroll Foundations & Catalogs (SPEC-ADM-028)
  await seedPayroll(prisma, tenantsToSeed);

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
