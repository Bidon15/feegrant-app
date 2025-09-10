import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { executeDustJob, executeFeegrantJob } from "~/server/jobs";

export const walletRouter = createTRPCRouter({
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

      if (userAddress.isDusted && userAddress.hasFeeGrant) {
        return { 
          success: true, 
          message: "already dusted and fee granted",
          txHash: "already-complete",
        };
      }

      // Execute dust job directly
      const dustResult = await executeDustJob(address);

      // Also grant fee allowance so user can pay for transactions
      const feeGrantResult = await executeFeegrantJob(address);

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
      console.log(`🔍 Validating address: "${address}" (length: ${address.length}, starts with celestia1: ${address.startsWith("celestia1")})`);
      
      if (!address.startsWith("celestia1") || address.length < 39 || address.length > 50) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Invalid Celestia address format. Address: "${address}" (length: ${address.length}, starts with celestia1: ${address.startsWith("celestia1")}). Address must start with 'celestia1' and be between 39-50 characters long.`,
        });
      }

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


  status: protectedProcedure
    .query(async ({ ctx }) => {
      const address = await ctx.db.address.findUnique({
        where: { userId: ctx.session.user.id },
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
