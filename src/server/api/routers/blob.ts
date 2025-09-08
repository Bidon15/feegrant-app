import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { validateNamespace } from "~/server/celestia/namespace";
import { executeJob } from "~/server/jobs";

const MAX_BLOB_SIZE = 2 * 1024 * 1024; // 2MB

export const blobRouter = createTRPCRouter({
  submit: protectedProcedure
    .input(z.object({
      namespace: z.string(),
      blobBase64: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { namespace, blobBase64 } = input;
      
      // Validate namespace format
      if (!validateNamespace(namespace)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid namespace format. Must be 58 hex characters following ADR-015.",
        });
      }

      // Convert base64 to buffer and validate size
      let blob: Buffer;
      try {
        blob = Buffer.from(blobBase64, "base64");
      } catch {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid base64 blob data.",
        });
      }

      if (blob.length > MAX_BLOB_SIZE) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Blob size ${blob.length} exceeds maximum of ${MAX_BLOB_SIZE} bytes.`,
        });
      }

      // Check user has address and authz
      const address = await ctx.db.address.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!address) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "No address bound to user. Please bind an address first.",
        });
      }

      if (!address.hasAuthzGranted) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Authz not granted. Please grant authorization first.",
        });
      }

      if (address.revoked) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Address has been revoked.",
        });
      }

      // Check daily usage limit (optional, configurable)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const usage = await ctx.db.usageCounter.findUnique({
        where: {
          userId_date: {
            userId: ctx.session.user.id,
            date: today,
          },
        },
      });

      const dailyLimit = 3; // Make this configurable
      if (usage && usage.pfbCount >= dailyLimit) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `Daily limit of ${dailyLimit} blobs exceeded.`,
        });
      }

      // Store blob temporarily with TTL
      const expireAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      const blobPayload = await ctx.db.blobPayload.create({
        data: {
          userId: ctx.session.user.id,
          devAddr: address.bech32,
          namespace,
          blob,
          expireAt,
        },
      });

      // Execute blob job directly
      const result = await executeJob("pfb.exec", { blobId: blobPayload.id });

      // Update usage counter
      await ctx.db.usageCounter.upsert({
        where: {
          userId_date: {
            userId: ctx.session.user.id,
            date: today,
          },
        },
        update: {
          pfbCount: { increment: 1 },
        },
        create: {
          userId: ctx.session.user.id,
          date: today,
          pfbCount: 1,
        },
      });

      return {
        enqueued: true,
        txHash: (result as any).txHash,
        blobId: blobPayload.id,
      };
    }),

  txs: protectedProcedure
    .query(async ({ ctx }) => {
      const txs = await ctx.db.blobTx.findMany({
        where: { userId: ctx.session.user.id },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      return txs;
    }),
});
