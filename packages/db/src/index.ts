import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function poolerConnectionString(): string {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL is not set");
  const url = new URL(raw);
  url.searchParams.delete("pgbouncer");
  url.searchParams.delete("connection_limit");
  return url.toString();
}

function createClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: poolerConnectionString() });
  return new PrismaClient({ adapter });
}

function getClient(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;
  const client = createClient();
  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = client;
  return client;
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return Reflect.get(getClient(), prop);
  },
});

export type { Prisma } from "../generated/prisma/client";
export * from "../generated/prisma/client";
