import { PrismaClient } from '@prisma/client';

// Singleton pattern — reuse one connection across the process
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'warn', 'error']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Re-export all Prisma types so services don't need to import @prisma/client directly
export * from '@prisma/client';
