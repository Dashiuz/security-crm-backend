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
    { tenantId: 'test_01', name: 'GODLIKE' },
    { tenantId: 'test_01', name: 'ADMIN' },
    { tenantId: 'test_01', name: 'USER' },
  ];

  const departments = [
    { tenantId: 'test_01', name: 'ADMINISTRATIVO', isActive: true },
    { tenantId: 'test_01', name: 'OPERATIVO', isActive: true },
  ];

  const positions = [
    { tenantId: 'test_01', name: 'ALMACENISTA' },
    { tenantId: 'test_01', name: 'ANALISTA DE SELECCION' },
    { tenantId: 'test_01', name: 'ANALISTA DE TECNOLOGIA' },
    { tenantId: 'test_01', name: 'ANALISTA JURIDICO' },
    { tenantId: 'test_01', name: 'APRENDIZ SENA' },
    { tenantId: 'test_01', name: 'ASISTENTE ADMINISTRATIVO' },
    { tenantId: 'test_01', name: 'ASISTENTE COMERCIAL' },
    { tenantId: 'test_01', name: 'ASISTENTE DE TECNOLOGIA' },
    { tenantId: 'test_01', name: 'ASISTENTE MEDIOS TECNOLOGICOS' },
    { tenantId: 'test_01', name: 'ASISTENTE OPERACIONES' },
    { tenantId: 'test_01', name: 'ASISTENTE RECURSOS HUMANOS' },
    { tenantId: 'test_01', name: 'ASISTENTE TECNICO' },
    { tenantId: 'test_01', name: 'AUXILIAR CONTABLE' },
    { tenantId: 'test_01', name: 'AUXILIAR DE ARCHIVO' },
    { tenantId: 'test_01', name: 'AUXILIAR DE NOMINA' },
    { tenantId: 'test_01', name: 'AUXILIAR DE PROGRAMACION' },
    { tenantId: 'test_01', name: 'AUXILIAR DE TECNOLOGIA' },
    { tenantId: 'test_01', name: 'COORDINADOR DE CALIDAD' },
    { tenantId: 'test_01', name: 'COORDINADOR DE OPERACIONES' },
    { tenantId: 'test_01', name: 'COORDINADORA DE SERVICIO' },
    { tenantId: 'test_01', name: 'DIRECTOR AGENCIA TUNJA' },
    { tenantId: 'test_01', name: 'DIRECTOR COMERCIAL' },
    { tenantId: 'test_01', name: 'DIRECTOR DE MEDIOS TECNOLOGICOS' },
    { tenantId: 'test_01', name: 'DIRECTOR DE RIESGOS E INVESTIGACION' },
    { tenantId: 'test_01', name: 'DIRECTOR INNOVACION Y TECNOLOGIA' },
    { tenantId: 'test_01', name: 'DIRECTOR SEGURIDAD ELECTRONICA' },
    { tenantId: 'test_01', name: 'DIRECTORA COMERCIAL' },
    { tenantId: 'test_01', name: 'DIRECTORA DE CONTABILIDAD' },
    { tenantId: 'test_01', name: 'DIRECTORA DE NOMINA' },
    { tenantId: 'test_01', name: 'DIRECTORA RECURSOS HUMANOS' },
    { tenantId: 'test_01', name: 'DIRECTORA SISTEMAS DE CALIDAD' },
    { tenantId: 'test_01', name: 'DISEÑADORA DE CONTENIDO DIGITAL' },
    { tenantId: 'test_01', name: 'EJECUTIVA COMERCIAL' },
    { tenantId: 'test_01', name: 'GERENTE' },
    { tenantId: 'test_01', name: 'GERENTE BOGOTA' },
    { tenantId: 'test_01', name: 'GERENTE DE OPERACIONES' },
    { tenantId: 'test_01', name: 'GUARDA DE SEGURIDAD' },
    { tenantId: 'test_01', name: 'GUARDA LIDER' },
    { tenantId: 'test_01', name: 'INGENIERO ELECTRONICO DE PROYECTO' },
    { tenantId: 'test_01', name: 'OPERADOR MEDIOS TECNOLOGICOS' },
    { tenantId: 'test_01', name: 'PROGRAMADORA' },
    { tenantId: 'test_01', name: 'SECRETARIA GENERAL' },
    { tenantId: 'test_01', name: 'SERVICIOS GNALES' },
    { tenantId: 'test_01', name: 'SUB GERENTE' },
    { tenantId: 'test_01', name: 'SUPERVISOR' },
    { tenantId: 'test_01', name: 'SUPERVISOR DE PROYECTOS' },
    { tenantId: 'test_01', name: 'SUPERVISOR DE PUESTO' },
    { tenantId: 'test_01', name: 'SUPERVISOR MOTORIZADO' },
    { tenantId: 'test_01', name: 'TECNICO DE SEGURIDAD ELECTRONICA' },
    { tenantId: 'test_01', name: 'TECNICO EN INSTALACION' },
    { tenantId: 'test_01', name: 'TECNICO EN INSTALACIONES' },
    { tenantId: 'test_01', name: 'TECNICO EN MANTENIMIENTO' },
  ];

  const employees = [
    {
      tenantId: 'test_01',
      firstName: 'Rosa',
      secondName: null,
      lastName: 'Coral',
      maternalSurname: 'Castañeda',
      fullName: 'Rosa Coral Castañeda',
      documentType: 'CC',
      document: '12345678',
      birthdate: new Date('1980-01-01'),
      gender: 'Femenino',
      address: '123 Main St',
      departmentId: null,
      positionId: null,
      email: 'rosa.coral.castaneda@example.com',
      phone: '12345678',
      entryDate: new Date('2020-01-01'),
      isRetired: false,
      isActive: true,
      createdAt: new Date(),
      createdBy: 'mock_user',
      updatedAt: new Date(),
      retiredAt: null,
      deletedAt: null,
    },
    {
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
      departmentId: null,
      positionId: null,
      email: 'carlos.perez.gomez@example.com',
      phone: '23456789',
      entryDate: new Date('2021-03-15'),
      isRetired: false,
      isActive: true,
      createdAt: new Date(),
      createdBy: 'mock_user',
      updatedAt: new Date(),
      retiredAt: null,
      deletedAt: null,
    },
  ];

  const permissions = [
    { key: 'employee:create', desc: 'Create employees' },
    { key: 'employee:read', desc: 'Read employees' },
    { key: 'employee:update', desc: 'Update employees' },
    { key: 'employee:delete', desc: 'Delete employees' },

    { key: 'role:manage', desc: 'Manage roles' },
    { key: 'user:manage', desc: 'Manage users' },
    { key: 'permission:read', desc: 'Read permission catalog' },

    { key: 'department:manage', desc: 'Manage departments' },
    { key: 'position:manage', desc: 'Manage positions' },
  ];

  const tablesData = [
    { tableName: 'tenant', data: tenants },
    { tableName: 'role', data: roles },
    { tableName: 'permission', data: permissions },
    { tableName: 'department', data: departments },
    { tableName: 'position', data: positions },
    { tableName: 'employee', data: employees },
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
          data.firstName == 'Rosa' ? 'ADMINISTRATIVO' : 'OPERACIONES',
        positionId:
          data.firstName == 'Rosa' ? 'GERENTE BOGOTA' : 'GUARDA DE SEGURIDAD',
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
  } else if (tableName == 'permission') {
    await prisma.permission.upsert({
      where: { key: data.key },
      update: { desc: data.desc },
      create: data,
    });

    console.log('✅ Permissions seeded');
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
