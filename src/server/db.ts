// OnChainDB client export (replaces Prisma)
// Uses the local SDK and provides Prisma-like API through our wrapper
import { db as onchainDb } from "~/lib/onchaindb";

// Export OnChainDB client as 'db' to minimize changes to existing code
// Note: OnChainDB methods differ from Prisma, routers will need refactoring
export const db = onchainDb;

// Legacy Prisma export (keep for gradual migration if needed)
// import { PrismaClient } from "@prisma/client";
// import { env } from "~/env";
//
// const createPrismaClient = () =>
//   new PrismaClient({
//     log:
//       env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
//   });
//
// const globalForPrisma = globalThis as unknown as {
//   prisma: ReturnType<typeof createPrismaClient> | undefined;
// };
//
// export const prismaDb = globalForPrisma.prisma ?? createPrismaClient();
//
// if (env.NODE_ENV !== "production") globalForPrisma.prisma = prismaDb;
