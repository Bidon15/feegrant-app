import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import {
  initializeSchema,
  getSchemaStatus,
  verifyIndexes,
} from "~/server/onchaindb/schema";

export const adminRouter = createTRPCRouter({
  // Initialize database schema (collections and indexes)
  // This should be called once during initial setup
  initSchema: publicProcedure.mutation(async () => {
    console.log("[Admin] Initializing database schema...");
    const result = await initializeSchema();
    return result;
  }),

  // Get current schema status
  schemaStatus: publicProcedure.query(async () => {
    return getSchemaStatus();
  }),

  // Verify all required indexes exist
  verifyIndexes: publicProcedure.query(async () => {
    return verifyIndexes();
  }),
});
