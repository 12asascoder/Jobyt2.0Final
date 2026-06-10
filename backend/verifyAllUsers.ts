import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const result = await prisma.users.updateMany({
      data: {
        email_verified: true
      }
    });
    console.log(`Successfully verified ${result.count} users!`);
  } catch (error) {
    console.error('Failed to verify users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
