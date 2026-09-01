import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function bootstrap() {
  console.log('--- Starting System Tenant Bootstrap ---');
  try {
    // 1. Ensure system tenant exists
    let systemTenant = await prisma.tenant.findUnique({ where: { id: 'system' } });
    if (!systemTenant) {
      console.log('Creating "system" tenant...');
      systemTenant = await prisma.tenant.create({
        data: {
          id: 'system',
          name: 'SYSTEM',
          slug: 'system',
          isActive: true,
          createdBy: 'system',
          updatedBy: 'system',
        }
      });
    }

    // 2. Ensure permission godlike:manage exists
    let perm = await prisma.permission.findUnique({ where: { key: 'godlike:manage' } });
    if (!perm) {
       console.log('Creating "godlike:manage" permission...');
       await prisma.permission.create({
         data: {
           id: 'seed_perm_godlike',
           key: 'godlike:manage',
           desc: 'Administración Global'
         }
       });
    }

    // 3. Ensure GODLIKE role exists
    let godlikeRole = await prisma.role.findFirst({
      where: { name: 'GODLIKE', tenantId: 'system' }
    });
    
    if (!godlikeRole) {
      console.log('Creating "GODLIKE" role in system tenant...');
      godlikeRole = await prisma.role.create({
        data: {
          name: 'GODLIKE',
          tenantId: 'system',
          createdBy: 'system',
          updatedBy: 'system',
        }
      });
    }

    // 4. Bind permission to role
    const rolePerm = await prisma.rolePermission.findFirst({
       where: { roleId: godlikeRole.id, permission: { key: 'godlike:manage' } }
    });
    if (!rolePerm) {
       console.log('Binding "godlike:manage" to "GODLIKE" role...');
       await prisma.rolePermission.create({
         data: { 
           role: { connect: { id: godlikeRole.id } },
           permission: { connect: { key: 'godlike:manage' } }
         }
       });
    }

    // 5. Assign to Josua (seed_id_01)
    const user = await prisma.user.findUnique({ where: { id: 'seed_id_01' } });
    if (user) {
      if (user.tenantId !== 'system') {
         console.log('Moving Josua to "system" tenant...');
         await prisma.user.update({
             where: { id: 'seed_id_01' },
             data: { tenantId: 'system' }
         });
      }

      const userRole = await prisma.userRole.findFirst({
         where: { userId: 'seed_id_01', roleId: godlikeRole.id }
      });
      if (!userRole) {
         console.log('Assigning GODLIKE role to Josua...');
         await prisma.userRole.create({
           data: { userId: 'seed_id_01', roleId: godlikeRole.id }
         });
      } else {
         console.log('Josua already possesses the GODLIKE role.');
      }
    } else {
      console.log('Warning: seed_id_01 user not found. Ensure User is seeded first.');
    }

    console.log('✅ Bootstrap completed successfully!');
  } catch (e) {
    console.error('❌ Bootstrap failed: ', e);
  } finally {
    await prisma.$disconnect();
  }
}

bootstrap();
