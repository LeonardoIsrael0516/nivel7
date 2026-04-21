import argon2 from 'argon2';
import { prisma } from '../src/lib/prisma.js';
import { env } from '../src/env.js';
async function main() {
    await prisma.plan.upsert({
        where: { code: 'basico' },
        update: {},
        create: { code: 'basico', name: 'Nivel de Aparencia', priceCents: 2990 }
    });
    await prisma.plan.upsert({
        where: { code: 'completo' },
        update: {},
        create: { code: 'completo', name: 'Poder de Atracao', priceCents: 5990 }
    });
    const passwordHash = await argon2.hash(env.ADMIN_PASSWORD);
    await prisma.adminUser.upsert({
        where: { email: env.ADMIN_EMAIL },
        update: { passwordHash },
        create: {
            email: env.ADMIN_EMAIL,
            passwordHash
        }
    });
}
main()
    .catch(async (e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
