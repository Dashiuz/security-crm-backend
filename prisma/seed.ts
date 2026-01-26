import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const permissions = [
    { key: 'employee:create', desc: 'Create employees' },
    { key: 'employee:read', desc: 'Read employees' },
    { key: 'employee:update', desc: 'Update employees' },
    { key: 'employee:delete', desc: 'Delete employees' },

    { key: 'role:manage', desc: 'Manage roles' },
    { key: 'user:manage', desc: 'Manage users' },
    { key: 'permission:read', desc: 'Read permission catalog' },
  ];

  for (const p of permissions) {
    await prisma.permission.upsert({
      where: { key: p.key },
      update: { desc: p.desc },
      create: p,
    });
  }

  console.log('✅ Permissions seeded');
}

main()
  .catch((e) => {
    console.error('❌ Seed error', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
