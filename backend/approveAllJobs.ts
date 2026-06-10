import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const result = await prisma.$executeRawUnsafe(`UPDATE jobs SET status = 'active', job_approval_status = 'approved'`);
    console.log(`Successfully approved all jobs!`);
  } catch (error) {
    console.error('Failed to approve jobs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
