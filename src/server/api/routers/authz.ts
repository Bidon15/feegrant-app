import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { executeJob } from "~/server/jobs";

export const authzRouter = createTRPCRouter({
  dust: protectedProcedure
    .input(z.object({ address: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { address } = input;

      // Check if address belongs to user
      const userAddress = await ctx.db.address.findUnique({
        where: { 
          userId: ctx.session.user.id,
          bech32: address,
        },
      });

      if (!userAddress) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Address not found or not bound to user.",
        });
      }

      if (userAddress.isDusted) {
        return { 
          success: true, 
          message: "Address already dusted",
          txHash: "already-dusted",
        };
      }

      // Execute dust job directly
      const result = await executeJob("dust.send", { address });

      return {
        success: true,
        txHash: (result as any).txHash,
        message: "Dust job completed",
      };
    }),

  grantAuthz: protectedProcedure
    .input(z.object({
      address: z.string(),
      signedGrantTxBase64: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { address, signedGrantTxBase64 } = input;

      // Check if address belongs to user
      const userAddress = await ctx.db.address.findUnique({
        where: { 
          userId: ctx.session.user.id,
          bech32: address,
        },
      });

      if (!userAddress) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Address not found or not bound to user.",
        });
      }

      if (userAddress.hasAuthzGranted) {
        return { 
          success: true, 
          message: "Authz already granted",
          txHash: "already-granted",
        };
      }

      // Validate base64 format
      try {
        Buffer.from(signedGrantTxBase64, "base64");
      } catch {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid base64 transaction data.",
        });
      }

      // Execute authz broadcast job directly
      const result = await executeJob("authz.broadcast", { 
        signedTxBase64: signedGrantTxBase64,
        address,
      });

      return {
        success: true,
        txHash: (result as any).txHash,
        message: "Authz grant completed",
      };
    }),

  status: protectedProcedure
    .query(async ({ ctx }) => {
      const address = await ctx.db.address.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!address) {
        return {
          hasAddress: false,
          isDusted: false,
          hasAuthzGranted: false,
        };
      }

      return {
        hasAddress: true,
        address: address.bech32,
        isDusted: address.isDusted,
        hasAuthzGranted: address.hasAuthzGranted,
        revoked: address.revoked,
      };
    }),
});
