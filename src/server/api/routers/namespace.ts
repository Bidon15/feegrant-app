import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import {
  COLLECTIONS,
  generateId,
  nowISO,
  type Namespace,
  type User,
  type LinkedRepo,
} from "~/server/db";
import { randomBytes } from "crypto";
import {
  getNamespace as getCeleniumNamespace,
  getNamespaceBlobs,
  getNamespaceStats,
  formatBytes,
} from "~/server/celenium/client";

// Generate a Celestia namespace ID (8 bytes, hex encoded)
function generateNamespaceId(): string {
  return randomBytes(8).toString("hex");
}

export const namespaceRouter = createTRPCRouter({
  // Get all namespaces for the current user
  list: protectedProcedure.query(async ({ ctx }) => {
    const namespaces = await ctx.db.findMany<Namespace>(
      COLLECTIONS.namespaces,
      { userId: ctx.session.user.id },
      { sort: { field: "createdAt", order: "desc" } }
    );

    return namespaces;
  }),

  // Get a single namespace by ID
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const namespace = await ctx.db.findUnique<Namespace>(
        COLLECTIONS.namespaces,
        { id: input.id }
      );

      if (!namespace) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Namespace not found",
        });
      }

      // Check ownership
      if (namespace.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this namespace",
        });
      }

      return namespace;
    }),

  // Get namespace by name (for linking)
  getByName: protectedProcedure
    .input(z.object({ name: z.string() }))
    .query(async ({ ctx, input }) => {
      const namespaces = await ctx.db.findMany<Namespace>(
        COLLECTIONS.namespaces,
        { name: input.name },
        { limit: 1 }
      );

      if (namespaces.length === 0) {
        return null;
      }

      const namespace = namespaces[0]!;

      // Only return if owned by user
      if (namespace.userId !== ctx.session.user.id) {
        return null;
      }

      return namespace;
    }),

  // Create a new namespace
  create: protectedProcedure
    .input(
      z.object({
        name: z
          .string()
          .min(3, "Name must be at least 3 characters")
          .max(50, "Name must be at most 50 characters")
          .regex(
            /^[a-z0-9]+(?:\/[a-z0-9-]+)*$/,
            "Name must be lowercase, can contain slashes for hierarchy (e.g., myapp/production)"
          ),
        description: z.string().max(200).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if namespace name already exists
      const existing = await ctx.db.findMany<Namespace>(
        COLLECTIONS.namespaces,
        { name: input.name },
        { limit: 1 }
      );

      if (existing.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A namespace with this name already exists",
        });
      }

      // Create the namespace
      const now = nowISO();
      const namespace: Namespace = {
        id: generateId(),
        userId: ctx.session.user.id,
        name: input.name,
        namespaceId: generateNamespaceId(),
        description: input.description ?? null,
        blobCount: 0,
        totalBytes: 0,
        lastActivityAt: null,
        isActive: true,
        linkedRepoId: null,
        createdAt: now,
        updatedAt: now,
      };

      await ctx.db.createDocument(COLLECTIONS.namespaces, namespace);

      return namespace;
    }),

  // Update a namespace
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        description: z.string().max(200).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const namespace = await ctx.db.findUnique<Namespace>(
        COLLECTIONS.namespaces,
        { id: input.id }
      );

      if (!namespace) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Namespace not found",
        });
      }

      if (namespace.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to update this namespace",
        });
      }

      const updates: Partial<Namespace> = {};
      if (input.description !== undefined) updates.description = input.description;
      if (input.isActive !== undefined) updates.isActive = input.isActive;

      const updated = await ctx.db.updateDocument<Namespace>(
        COLLECTIONS.namespaces,
        { id: input.id },
        updates
      );

      return updated;
    }),

  // Delete a namespace
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const namespace = await ctx.db.findUnique<Namespace>(
        COLLECTIONS.namespaces,
        { id: input.id }
      );

      if (!namespace) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Namespace not found",
        });
      }

      if (namespace.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to delete this namespace",
        });
      }

      await ctx.db.deleteDocument(COLLECTIONS.namespaces, { id: input.id });

      return { success: true };
    }),

  // Get all namespaces (public, for leaderboard/htop)
  all: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        activeOnly: z.boolean().default(false),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const query: Record<string, unknown> = {};
      if (input?.activeOnly) {
        query.isActive = true;
      }

      const namespaces = await ctx.db.findMany<Namespace>(
        COLLECTIONS.namespaces,
        query,
        {
          limit: input?.limit ?? 50,
          sort: { field: "blobCount", order: "desc" },
        }
      );

      // Enrich with owner info
      const enriched = await Promise.all(
        namespaces.map(async (ns) => {
          const user = await ctx.db.findUnique<User>(COLLECTIONS.users, {
            id: ns.userId,
          });

          return {
            ...ns,
            ownerName: user?.name ?? user?.email?.split("@")[0] ?? "anonymous",
            ownerAvatar:
              user?.image ??
              `https://api.dicebear.com/7.x/identicon/svg?seed=${ns.userId}`,
          };
        })
      );

      return enriched;
    }),

  // Get namespace stats (aggregate from OnChainDB)
  stats: publicProcedure.query(async ({ ctx }) => {
    const total = await ctx.db.countDocuments(COLLECTIONS.namespaces, {});
    const active = await ctx.db.countDocuments(COLLECTIONS.namespaces, {
      isActive: true,
    });

    // Get total blobs and bytes from our stored namespace data
    // (these are synced from Celenium periodically)
    const namespaces = await ctx.db.findMany<Namespace>(
      COLLECTIONS.namespaces,
      {},
      { limit: 1000 }
    );

    const totalBlobs = namespaces.reduce((sum, ns) => sum + ns.blobCount, 0);
    const totalBytes = namespaces.reduce((sum, ns) => sum + ns.totalBytes, 0);

    return {
      total,
      active,
      totalBlobs,
      totalBytes,
      totalBytesFormatted: formatBytes(totalBytes),
    };
  }),

  // Get blobs for a namespace from Celenium API
  blobs: protectedProcedure
    .input(
      z.object({
        namespaceId: z.string(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      // Verify user owns this namespace
      const namespace = await ctx.db.findUnique<Namespace>(
        COLLECTIONS.namespaces,
        { namespaceId: input.namespaceId }
      );

      if (!namespace) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Namespace not found",
        });
      }

      if (namespace.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this namespace",
        });
      }

      // Fetch blobs from Celenium
      const blobs = await getNamespaceBlobs(input.namespaceId, {
        limit: input.limit,
        offset: input.offset,
      });

      return {
        namespaceId: input.namespaceId,
        namespaceName: namespace.name,
        blobs: blobs.map((blob) => ({
          height: blob.height,
          time: blob.time,
          size: blob.size,
          sizeFormatted: formatBytes(blob.size),
          commitment: blob.commitment,
          contentType: blob.content_type,
          txHash: blob.tx.hash,
          fee: blob.tx.fee,
          status: blob.tx.status,
        })),
      };
    }),

  // Sync namespace stats from Celenium (call periodically or on-demand)
  syncStats: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const namespace = await ctx.db.findUnique<Namespace>(
        COLLECTIONS.namespaces,
        { id: input.id }
      );

      if (!namespace) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Namespace not found",
        });
      }

      if (namespace.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to sync this namespace",
        });
      }

      // Fetch stats from Celenium
      const celeniumNs = await getCeleniumNamespace(namespace.namespaceId);
      const stats = await getNamespaceStats(namespace.namespaceId);

      if (!celeniumNs && !stats) {
        // Namespace hasn't been used on-chain yet
        return namespace;
      }

      // Update our stored stats
      const updates: Partial<Namespace> = {
        blobCount: celeniumNs?.pfb_count ?? stats?.blobs_count ?? namespace.blobCount,
        totalBytes: celeniumNs?.size ?? stats?.size ?? namespace.totalBytes,
        lastActivityAt: celeniumNs?.last_message_time ?? namespace.lastActivityAt,
      };

      const updated = await ctx.db.updateDocument<Namespace>(
        COLLECTIONS.namespaces,
        { id: input.id },
        updates
      );

      return updated;
    }),

  // Link a namespace to a GitHub repo
  linkToRepo: protectedProcedure
    .input(
      z.object({
        namespaceId: z.string(),
        linkedRepoId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify namespace exists and user owns it
      const namespace = await ctx.db.findUnique<Namespace>(
        COLLECTIONS.namespaces,
        { id: input.namespaceId }
      );

      if (!namespace) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Namespace not found",
        });
      }

      if (namespace.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to link this namespace",
        });
      }

      // Verify the linked repo exists and user owns it
      const repo = await ctx.db.findUnique<LinkedRepo>(
        COLLECTIONS.linkedRepos,
        { id: input.linkedRepoId }
      );

      if (!repo) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Linked repository not found",
        });
      }

      if (repo.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to use this repository",
        });
      }

      // Update the namespace with the linked repo
      const updated = await ctx.db.updateDocument<Namespace>(
        COLLECTIONS.namespaces,
        { id: input.namespaceId },
        { linkedRepoId: input.linkedRepoId }
      );

      return updated;
    }),

  // Unlink a namespace from its repo
  unlinkFromRepo: protectedProcedure
    .input(z.object({ namespaceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const namespace = await ctx.db.findUnique<Namespace>(
        COLLECTIONS.namespaces,
        { id: input.namespaceId }
      );

      if (!namespace) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Namespace not found",
        });
      }

      if (namespace.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to unlink this namespace",
        });
      }

      const updated = await ctx.db.updateDocument<Namespace>(
        COLLECTIONS.namespaces,
        { id: input.namespaceId },
        { linkedRepoId: null }
      );

      return updated;
    }),
});
