import { PrismaClient } from "@prisma/client";

// dev 핫리로드 시 PrismaClient 인스턴스가 누적되는 것을 막기 위한 싱글톤.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
