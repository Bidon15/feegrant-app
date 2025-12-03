import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import {
  db,
  COLLECTIONS,
  generateId,
  nowISO,
  type Admin,
  type AdminFeegrant,
} from "~/server/db";
import { getBackendAddress } from "~/server/celestia/client";
import { executeAdminFeegrant, queryAuthzGrant } from "~/server/celestia/authz";
import { env } from "~/env";

// Default feegrant amount: 10 TIA = 10,000,000 utia
const DEFAULT_FEEGRANT_AMOUNT_UTIA = "10000000";
const DEFAULT_FEEGRANT_EXPIRATION_DAYS = 30;

export const adminRouter = createTRPCRouter({
  // Check if a Celestia address is registered as an admin
  verifyAdmin: publicProcedure
    .input(z.object({ celestiaAddress: z.string() }))
    .query(async ({ input }) => {
      const admin = await db.findUnique<Admin>(COLLECTIONS.admins, {
        celestiaAddress: input.celestiaAddress,
      });

      if (!admin?.isActive) {
        return { isAdmin: false, admin: null };
      }

      return {
        isAdmin: true,
        admin: {
          id: admin.id,
          name: admin.name,
          celestiaAddress: admin.celestiaAddress,
          hasAuthzGrant: admin.hasAuthzGrant,
          totalFeegrantsIssued: admin.totalFeegrantsIssued,
          totalUtiaGranted: admin.totalUtiaGranted,
          defaultAmountUtia: admin.defaultAmountUtia,
          defaultExpirationDays: admin.defaultExpirationDays,
        },
      };
    }),

  // Get backend wallet address and RPC endpoint (for authz grant setup)
  getBackendAddress: publicProcedure.query(async () => {
    const address = await getBackendAddress();
    return {
      backendAddress: address,
      rpcEndpoint: env.QUICKNODE_RPC,
    };
  }),

  // Register a new admin (self-registration with signature verification)
  // In production, this would require additional verification
  register: publicProcedure
    .input(
      z.object({
        celestiaAddress: z.string().startsWith("celestia1"),
        name: z.string().min(1).max(100),
        // In production, include signature verification
        signature: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Check if already registered
      const existing = await db.findUnique<Admin>(COLLECTIONS.admins, {
        celestiaAddress: input.celestiaAddress,
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Address already registered as admin",
        });
      }

      // Create new admin record
      const admin: Admin = {
        id: generateId(),
        celestiaAddress: input.celestiaAddress,
        userId: null,
        name: input.name,
        hasAuthzGrant: false,
        authzGrantTxHash: null,
        authzExpiresAt: null,
        defaultAmountUtia: DEFAULT_FEEGRANT_AMOUNT_UTIA,
        defaultExpirationDays: DEFAULT_FEEGRANT_EXPIRATION_DAYS,
        totalFeegrantsIssued: 0,
        totalUtiaGranted: "0",
        isActive: true,
        createdAt: nowISO(),
        updatedAt: nowISO(),
      };

      await db.createDocument(COLLECTIONS.admins, admin);

      return {
        success: true,
        admin: {
          id: admin.id,
          name: admin.name,
          celestiaAddress: admin.celestiaAddress,
        },
      };
    }),

  // Record that admin has granted authz to backend
  recordAuthzGrant: publicProcedure
    .input(
      z.object({
        celestiaAddress: z.string().startsWith("celestia1"),
        txHash: z.string(),
        expiresAt: z.string().nullable(), // ISO date or null for no expiration
      })
    )
    .mutation(async ({ input }) => {
      const admin = await db.findUnique<Admin>(COLLECTIONS.admins, {
        celestiaAddress: input.celestiaAddress,
      });

      if (!admin) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Admin not found",
        });
      }

      // Try to verify authz grant on-chain with retries (blockchain indexing can be slow)
      const backendAddress = await getBackendAddress();
      let authzGrant = null;

      for (let attempt = 0; attempt < 3; attempt++) {
        authzGrant = await queryAuthzGrant(input.celestiaAddress, backendAddress);
        if (authzGrant) break;
        // Wait 2 seconds before retry
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log(`[Authz] Retry ${attempt + 1}/3 - waiting for chain indexing...`);
      }

      // If we have a txHash, trust it even if on-chain query fails (indexing delay)
      if (!authzGrant && !input.txHash) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Authz grant not found on-chain. Please ensure the transaction was confirmed.",
        });
      }

      if (!authzGrant) {
        console.log(`[Authz] Grant not yet indexed, but txHash provided: ${input.txHash}`);
      }

      // Update admin record
      await db.updateDocument<Admin>(
        COLLECTIONS.admins,
        { id: admin.id },
        {
          hasAuthzGrant: true,
          authzGrantTxHash: input.txHash,
          authzExpiresAt: input.expiresAt,
          updatedAt: nowISO(),
        }
      );

      return { success: true };
    }),

  // Create a feegrant (admin initiates, backend executes via MsgExec)
  createFeegrant: publicProcedure
    .input(
      z.object({
        adminAddress: z.string().startsWith("celestia1"),
        recipientAddress: z.string().startsWith("celestia1"),
        amountUtia: z.string().optional(), // Defaults to admin's default
        expirationDays: z.number().optional(), // Defaults to admin's default
        note: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Verify admin exists and has authz
      const admin = await db.findUnique<Admin>(COLLECTIONS.admins, {
        celestiaAddress: input.adminAddress,
      });

      if (!admin) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Admin not found",
        });
      }

      if (!admin.isActive) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin account is deactivated",
        });
      }

      if (!admin.hasAuthzGrant) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Admin has not granted authz to backend. Please complete authz setup first.",
        });
      }

      // Use admin's defaults or provided values
      const amountUtia = input.amountUtia ?? admin.defaultAmountUtia;
      const expirationDays = input.expirationDays ?? admin.defaultExpirationDays;

      // Calculate expiration date
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expirationDays);

      // Create pending feegrant record
      const feegrant: AdminFeegrant = {
        id: generateId(),
        adminId: admin.id,
        adminAddress: admin.celestiaAddress,
        recipientAddress: input.recipientAddress,
        recipientUserId: null,
        recipientName: null,
        amountUtia,
        expiresAt: expiresAt.toISOString(),
        txHash: null,
        status: "pending",
        errorMessage: null,
        note: input.note ?? null,
        createdAt: nowISO(),
        updatedAt: nowISO(),
      };

      await db.createDocument(COLLECTIONS.adminFeegrants, feegrant);

      // Execute the feegrant via MsgExec
      try {
        await db.updateDocument<AdminFeegrant>(
          COLLECTIONS.adminFeegrants,
          { id: feegrant.id },
          { status: "executing", updatedAt: nowISO() }
        );

        const result = await executeAdminFeegrant({
          granter: admin.celestiaAddress,
          grantee: input.recipientAddress,
          amountUtia,
          expirationDate: expiresAt,
        });

        // Update feegrant record with success
        await db.updateDocument<AdminFeegrant>(
          COLLECTIONS.adminFeegrants,
          { id: feegrant.id },
          {
            status: "success",
            txHash: result.txHash,
            updatedAt: nowISO(),
          }
        );

        // Update admin stats
        const newTotal = BigInt(admin.totalUtiaGranted) + BigInt(amountUtia);
        await db.updateDocument<Admin>(
          COLLECTIONS.admins,
          { id: admin.id },
          {
            totalFeegrantsIssued: admin.totalFeegrantsIssued + 1,
            totalUtiaGranted: newTotal.toString(),
            updatedAt: nowISO(),
          }
        );

        return {
          success: true,
          feegrantId: feegrant.id,
          txHash: result.txHash,
        };
      } catch (error) {
        // Update feegrant record with failure
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        await db.updateDocument<AdminFeegrant>(
          COLLECTIONS.adminFeegrants,
          { id: feegrant.id },
          {
            status: "failed",
            errorMessage,
            updatedAt: nowISO(),
          }
        );

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to execute feegrant: ${errorMessage}`,
        });
      }
    }),

  // Get admin's feegrant history
  getFeegrantHistory: publicProcedure
    .input(
      z.object({
        adminAddress: z.string().startsWith("celestia1"),
        limit: z.number().min(1).max(100).optional().default(50),
      })
    )
    .query(async ({ input }) => {
      const feegrants = await db.findMany<AdminFeegrant>(
        COLLECTIONS.adminFeegrants,
        { adminAddress: input.adminAddress },
        { limit: input.limit, sort: { field: "createdAt", order: "desc" } }
      );

      return { feegrants };
    }),

  // Get admin stats
  getStats: publicProcedure
    .input(z.object({ adminAddress: z.string().startsWith("celestia1") }))
    .query(async ({ input }) => {
      const admin = await db.findUnique<Admin>(COLLECTIONS.admins, {
        celestiaAddress: input.adminAddress,
      });

      if (!admin) {
        return null;
      }

      // Count feegrants by status
      const allFeegrants = await db.findMany<AdminFeegrant>(
        COLLECTIONS.adminFeegrants,
        { adminAddress: input.adminAddress },
        { limit: 1000 }
      );

      const stats = {
        totalFeegrantsIssued: admin.totalFeegrantsIssued,
        totalUtiaGranted: admin.totalUtiaGranted,
        totalTiaGranted: (Number(admin.totalUtiaGranted) / 1_000_000).toFixed(2),
        successCount: allFeegrants.filter((f) => f.status === "success").length,
        pendingCount: allFeegrants.filter((f) => f.status === "pending" || f.status === "executing").length,
        failedCount: allFeegrants.filter((f) => f.status === "failed").length,
      };

      return stats;
    }),

  // Update admin defaults
  updateDefaults: publicProcedure
    .input(
      z.object({
        adminAddress: z.string().startsWith("celestia1"),
        defaultAmountUtia: z.string().optional(),
        defaultExpirationDays: z.number().min(1).max(365).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const admin = await db.findUnique<Admin>(COLLECTIONS.admins, {
        celestiaAddress: input.adminAddress,
      });

      if (!admin) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Admin not found",
        });
      }

      const updates: Partial<Admin> = { updatedAt: nowISO() };
      if (input.defaultAmountUtia) {
        updates.defaultAmountUtia = input.defaultAmountUtia;
      }
      if (input.defaultExpirationDays) {
        updates.defaultExpirationDays = input.defaultExpirationDays;
      }

      await db.updateDocument<Admin>(COLLECTIONS.admins, { id: admin.id }, updates);

      return { success: true };
    }),
});
