import { PrismaClient } from '@prisma/client';
import { CANONICAL_PERMISSIONS } from './permissions-catalog';

export async function syncPermissionsAndRoles(targetPrisma?: PrismaClient) {
  const prisma = targetPrisma || new PrismaClient();
  const shouldDisconnect = !targetPrisma;

  try {
    console.log('🔄 Sincronizando catálogo canónico de permisos (129)...');

    // 1. Upsert all 129 permissions
    let permCreated = 0;
    let permUpdated = 0;
    const seededPermissionsMap: Record<string, string> = {};

    for (const item of CANONICAL_PERMISSIONS) {
      const existing = await prisma.permission.findUnique({
        where: { key: item.key },
      });

      const p = await prisma.permission.upsert({
        where: { key: item.key },
        update: { desc: item.desc },
        create: item,
      });

      if (!existing) {
        permCreated++;
      } else {
        permUpdated++;
      }
      seededPermissionsMap[item.key] = p.id;
    }
    console.log(
      `✅ Permisos procesados: ${CANONICAL_PERMISSIONS.length} (${permCreated} creados, ${permUpdated} actualizados)`,
    );

    // 2. Sync Platform Features
    console.log('🔄 Sincronizando características de plataforma (features)...');
    const featuresData = [
      {
        key: 'minuta',
        name: 'Minuta General',
        description: 'Registro de novedades generales',
      },
      {
        key: 'parking',
        name: 'Control de Parqueadero',
        description: 'Registro de vehículos y residentes',
      },
      {
        key: 'visitor',
        name: 'Control de Visitas',
        description: 'Registro de entrada y salida de visitantes',
      },
      {
        key: 'correspondence',
        name: 'Control de Correspondencia',
        description: 'Recepción y entrega de paquetes',
      },
      {
        key: 'client',
        name: 'Clientes',
        description: 'Gestión de cartera de clientes',
      },
      {
        key: 'prospect',
        name: 'Prospectos',
        description: 'Gestión de prospectos de clientes',
      },
      {
        key: 'employee',
        name: 'Empleados',
        description: 'Gestión de personal',
      },
      {
        key: 'user',
        name: 'Usuarios',
        description: 'Gestión de cuentas de acceso',
      },
      {
        key: 'department',
        name: 'Departamentos',
        description: 'Gestión de áreas de la empresa',
      },
      {
        key: 'position',
        name: 'Posiciones',
        description: 'Gestión de cargos',
      },
      {
        key: 'role',
        name: 'Roles',
        description: 'Gestión de permisos y accesos',
      },
      {
        key: 'resident',
        name: 'Residentes',
        description: 'Gestión de censo y residentes de inmuebles',
      },
      {
        key: 'sec_study',
        name: 'Estudios de Seguridad',
        description: 'Gestión documental de estudios de seguridad',
      },
      {
        key: 'canva',
        name: 'Canva de Seguridad',
        description: 'Diseño interactivo y geofencing en canva',
      },
      {
        key: 'pqrs',
        name: 'Módulo PQRS',
        description:
          'Gestión B2B de Peticiones, Quejas, Reclamos, Sugerencias y Felicitaciones',
      },
      {
        key: 'signature',
        name: 'Motor de Firmas Digitales (Loro Sign)',
        description:
          'Gestión y emisión de documentos con firmas electrónicas y validez jurídica',
      },
      {
        key: 'commercial',
        name: 'Gestión Comercial',
        description:
          'Motor tarifario SVSP, cotizaciones, propuestas y órdenes de servicio',
      },
      {
        key: 'payroll',
        name: 'Nómina y Liquidación Laboral',
        description:
          'Motor de nómina para vigilancia privada, dependencias operativas, turnos, PILA y Nómina Electrónica DIAN',
      },
      {
        key: 'tools_codes',
        name: 'Herramientas: Códigos QR y de Barras',
        description:
          'Generación, registro y trazabilidad de códigos de marcación y activos',
      },
      {
        key: 'dashboard',
        name: 'Dashboard Ejecutivo',
        description:
          'Consola central de métricas KPI, cumplimiento ANS y recordatorios',
      },
    ];

    for (const f of featuresData) {
      await prisma.feature.upsert({
        where: { key: f.key },
        update: { name: f.name, description: f.description },
        create: f,
      });
    }

    const allFeatures = await prisma.feature.findMany();
    const activeTenants = await prisma.tenant.findMany({
      where: { isActive: true },
    });
    for (const t of activeTenants) {
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
      `✅ ${featuresData.length} Features sincronizados para ${activeTenants.length} tenants activos.`,
    );

    // 3. Assign 128 permissions to all ADMIN roles across all tenants
    console.log(
      '🔄 Sincronizando asignaciones a roles ADMIN y GODLIKE...',
    );
    const adminRoles = await prisma.role.findMany({
      where: { name: 'ADMIN' },
      include: { tenant: { select: { slug: true, name: true } } },
    });

    const nonGodlikePermEntries = Object.entries(seededPermissionsMap).filter(
      ([key]) => key !== 'godlike:manage',
    );

    for (const role of adminRoles) {
      console.log(
        `  -> Actualizando rol ADMIN para tenant [${role.tenant?.slug || role.tenantId}] (${role.tenant?.name || 'N/A'})...`,
      );
      for (const [, permId] of nonGodlikePermEntries) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId: permId,
            },
          },
          update: { roleId: role.id, permissionId: permId },
          create: {
            roleId: role.id,
            permissionId: permId,
            assignedAt: new Date(),
            assignedBy: 'system',
          },
        });
      }
    }

    // 4. Assign 129 permissions to all GODLIKE roles
    const godlikeRoles = await prisma.role.findMany({
      where: { name: 'GODLIKE' },
    });
    for (const role of godlikeRoles) {
      console.log(`  -> Actualizando rol GODLIKE (${role.id})...`);
      for (const permId of Object.values(seededPermissionsMap)) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId: permId,
            },
          },
          update: { roleId: role.id, permissionId: permId },
          create: {
            roleId: role.id,
            permissionId: permId,
            assignedAt: new Date(),
            assignedBy: 'system',
          },
        });
      }
    }

    console.log(
      `✅ Roles sincronizados: ${adminRoles.length} roles ADMIN (128 permisos c/u), ${godlikeRoles.length} roles GODLIKE (129 permisos c/u).`,
    );
    console.log('🎉 Sincronización de permisos y roles completada exitosamente.');
  } finally {
    if (shouldDisconnect) {
      await prisma.$disconnect();
    }
  }
}

if (require.main === module) {
  syncPermissionsAndRoles().catch((err) => {
    console.error('❌ Error en sincronización de permisos:', err);
    process.exit(1);
  });
}
