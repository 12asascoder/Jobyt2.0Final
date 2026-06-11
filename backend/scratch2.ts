import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
  try {
    await prisma.$connect();
    console.log('Prisma connected successfully');
    
    // Test a basic query
    const count = await prisma.users.count();
    console.log(`User count: ${count}`);
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Prisma connection failed:', error);
    process.exit(1);
  }
}

test();
