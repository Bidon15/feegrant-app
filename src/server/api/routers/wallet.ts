import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { executeDustJob, executeFeegrantJob } from "~/server/jobs";
import { COLLECTIONS, type Address } from "~/server/db";

export const walletRouter = createTRPCRouter({
  dust: protectedProcedure
    .input(z.object({ address: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { address } = input;

      // Check if address belongs to user - find by bech32 and verify userId
      const addressResults = await ctx.db.findMany<Address>(
        COLLECTIONS.addresses,
        { bech32: address },
        { limit: 1 }
      );
      const userAddress =
        addressResults.length > 0 &&
        addressResults[0]?.userId === ctx.session.user.id
          ? addressResults[0]
          : null;

      if (!userAddress) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Address not found or not bound to user.",
        });
      }

      if (userAddress.isDusted && userAddress.hasFeeGrant) {
        return {
          success: true,
          message: "already dusted and fee granted",
          txHash: "already-complete",
        };
      }

      // Execute dust job if not already dusted
      let dustResult = { txHash: "already-dusted" };
      if (!userAddress.isDusted) {
        try {
          dustResult = await executeDustJob(address);
        } catch (dustError) {
          console.error(`[Wallet] Dust failed for ${address}:`, dustError);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Dust transaction failed: ${dustError instanceof Error ? dustError.message : "Unknown error"}`,
          });
        }
      }

      // Only proceed with feegrant if dust was successful
      let feeGrantResult = { txHash: "already-granted" };
      if (!userAddress.hasFeeGrant) {
        try {
          feeGrantResult = await executeFeegrantJob(address);
        } catch (feeGrantError) {
          console.error(`[Wallet] Feegrant failed for ${address}:`, feeGrantError);
          // Dust succeeded but feegrant failed - return partial success
          // The user can retry feegrant later
          return {
            success: false,
            txHash: dustResult.txHash,
            feeGrantTxHash: null,
            message: `Dust succeeded but feegrant failed: ${feeGrantError instanceof Error ? feeGrantError.message : "Unknown error"}`,
            error: "FEEGRANT_FAILED",
          };
        }
      }

      return {
        success: true,
        txHash: dustResult.txHash,
        feeGrantTxHash: feeGrantResult.txHash,
        message: "Dust and fee grant completed",
      };
    }),

  grantFeeAllowance: protectedProcedure
    .input(z.object({ address: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { address } = input;

      // Validate that the address is a valid Celestia address
      if (
        !address.startsWith("celestia1") ||
        address.length < 39 ||
        address.length > 50
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Invalid Celestia address format. Address: "${address}" (length: ${address.length}, starts with celestia1: ${address.startsWith("celestia1")}). Address must start with 'celestia1' and be between 39-50 characters long.`,
        });
      }

      // Check if address belongs to user
      const addressResults = await ctx.db.findMany<Address>(
        COLLECTIONS.addresses,
        { bech32: address },
        { limit: 1 }
      );
      const userAddress =
        addressResults.length > 0 &&
        addressResults[0]?.userId === ctx.session.user.id
          ? addressResults[0]
          : null;

      if (!userAddress) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Address not found or not bound to user.",
        });
      }

      if (userAddress.hasFeeGrant) {
        return {
          success: true,
          message: "Fee allowance already granted",
          txHash: "already-granted",
        };
      }

      // Execute feegrant job directly
      const result = await executeFeegrantJob(address);

      return {
        success: true,
        txHash: result.txHash,
        message: "Fee allowance granted successfully",
      };
    }),

  status: protectedProcedure.query(async ({ ctx }) => {
    const address = await ctx.db.findUnique<Address>(COLLECTIONS.addresses, {
      userId: ctx.session.user.id,
    });

    if (!address) {
      return {
        hasAddress: false,
        isDusted: false,
      };
    }

    return {
      hasAddress: true,
      address: address.bech32,
      isDusted: address.isDusted,
    };
  }),
});
