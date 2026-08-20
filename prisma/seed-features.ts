import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seed: Starting feature generation...');

  const featuresData = [
    { key: 'minuta', name: 'Minuta General', description: 'Registro de novedades generales' },
    { key: 'parking', name: 'Control de Parqueadero', description: 'Registro de vehículos y residentes' },
    { key: 'visitor', name: 'Control de Visitas', description: 'Registro de entrada y salida de visitantes' },
    { key: 'correspondence', name: 'Control de Correspondencia', description: 'Recepción y entrega de paquetes' },
    { key: 'client', name: 'Clientes', description: 'Gestión de cartera de clientes' },
    { key: 'employee', name: 'Empleados', description: 'Gestión de personal' },
    { key: 'user', name: 'Usuarios', description: 'Gestión de cuentas de acceso' },
    { key: 'department', name: 'Departamentos', description: 'Gestión de áreas de la empresa' },
    { key: 'position', name: 'Posiciones', description: 'Gestión de cargos' },
    { key: 'role', name: 'Roles', description: 'Gestión de permisos y accesos' },
    { key: 'resident', name: 'Residentes', description: 'Gestión de censo y residentes de inmuebles' },
  ];

  for (const f of featuresData) {
    await prisma.feature.upsert({
      where: { key: f.key },
      update: { name: f.name, description: f.description },
      create: f,
    });
  }

  // Sync features with active tenants
  const allFeatures = await prisma.feature.findMany();
  const tenants = await prisma.tenant.findMany({ where: { isActive: true } });

  for (const t of tenants) {
    await prisma.tenant.update({
      where: { id: t.id },
      data: {
        features: {
          connect: allFeatures.map((f) => ({ id: f.id })),
        },
      },
    });
  }

  console.log(
    `Seed: Successfully seeded ${featuresData.length} features and linked to ${tenants.length} active tenants.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
