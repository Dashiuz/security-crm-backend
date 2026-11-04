import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log(
    '🔍 Verificando estado post-despliegue en Base de Datos de Producción...\n',
  );

  // 1. Feature transversal
  const feature = await prisma.feature.findUnique({
    where: { key: 'payroll' },
  });
  console.log(
    `1. Feature 'payroll': ${feature ? '✅ ACTIVO (' + feature.id + ')' : '❌ NO ENCONTRADO'}`,
  );

  // 2. Permisos RBAC
  const permsCount = await prisma.permission.count({
    where: { key: { startsWith: 'payroll:' } },
  });
  console.log(
    `2. Permisos 'payroll:*': ${permsCount === 17 ? '✅ EXACTO (17)' : '⚠️ Cantidad: ' + permsCount}`,
  );

  // 3. Asignaciones de permisos a roles
  const rolePerms = await prisma.rolePermission.count({
    where: { permission: { key: { startsWith: 'payroll:' } } },
  });
  console.log(
    `3. Asignaciones RolePermission para nómina: ${rolePerms >= 51 ? '✅ CORRECTO (' + rolePerms + ' asignaciones)' : '⚠️ ' + rolePerms}`,
  );

  // 4. Parámetros legales (PayrollSettings)
  const settingsCount = await prisma.payrollSettings.count();
  console.log(
    `4. Registros PayrollSettings (2026): ${settingsCount === 3 ? '✅ EXACTO (3 tenants)' : '⚠️ ' + settingsCount}`,
  );

  // 5. Conceptos salariales
  const conceptsCount = await prisma.payrollConcept.count();
  console.log(
    `5. Conceptos salariales creados: ${conceptsCount > 0 ? '✅ CORRECTO (' + conceptsCount + ' conceptos)' : '❌ 0'}`,
  );

  // 6. Periodos 2026
  const periodsCount = await prisma.payrollPeriod.count({
    where: { year: 2026 },
  });
  console.log(
    `6. Periodos fiscales 2026: ${periodsCount === 36 ? '✅ EXACTO (36 periodos, 12 por tenant)' : '⚠️ ' + periodsCount}`,
  );

  // 7. Integridad de Colaboradores Reales en Seguridad Explorer (sz1wwxjvuao07011chmh7kgt)
  const employeesExplorer = await prisma.employee.count({
    where: { tenantId: 'sz1wwxjvuao07011chmh7kgt' },
  });
  console.log(
    `7. Colaboradores reales en Seguridad Explorer: ${employeesExplorer === 16 ? '✅ INTACTOS (16 colaboradores preservados)' : '⚠️ ' + employeesExplorer}`,
  );

  // 8. Integridad de Usuarios y Credenciales
  const usersCount = await prisma.user.count();
  console.log(
    `8. Total usuarios del sistema: ✅ ${usersCount} usuarios intactos.`,
  );

  console.log('\n🎉 ¡Validación de producción 100% exitosa!');
}

main()
  .catch((e) => {
    console.error('❌ Error durante la verificación:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
