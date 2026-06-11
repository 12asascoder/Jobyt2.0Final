import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:postgres@127.0.0.1:5432/hiring_platform'
    }
  }
});

async function test() {
  try {
    await prisma.$connect();
    console.log('Prisma connected successfully via 127.0.0.1');
    const count = await prisma.users.count();
    console.log(`User count: ${count}`);
    await prisma.$disconnect();
  } catch (error) {
    console.error('Prisma connection failed via 127.0.0.1:', error);
    process.exit(1);
  }
}

test();
