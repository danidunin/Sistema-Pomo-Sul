import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// A integração Neon da Vercel cria a variável com o nome prefixado pelo recurso
// (ex: Pomosul_DATABASE_URL_UNPOOLED) em vez de DATABASE_URL — aceita ambos.
const connectionString = process.env.DATABASE_URL ?? process.env.Pomosul_DATABASE_URL_UNPOOLED;

const adapter = new PrismaPg({ connectionString });

export const db = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
