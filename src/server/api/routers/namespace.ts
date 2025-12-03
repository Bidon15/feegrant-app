import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import {
  COLLECTIONS,
  generateId,
  nowISO,
  type Namespace,
  type User,
  type NamespaceRepo,
} from "~/server/db";
import { createHash } from "crypto";
import {
  getNamespace as getCeleniumNamespace,
  getNamespaceBlobs,
  getNamespaceStats,
  formatBytes,
} from "~/server/celenium/client";

// Generate a deterministic Celestia namespace ID from a name (8 bytes, hex encoded)
// This ensures the same name always produces the same namespace ID
function generateNamespaceIdFromName(name: string): string {
  const hash = createHash("sha256").update(name).digest();
  // Take first 8 bytes of the hash for namespace ID
  return hash.subarray(0, 8).toString("hex");
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

  // Check namespace availability (for UI feedback)
  checkAvailability: protectedProcedure
    .input(z.object({ name: z.string() }))
    .query(async ({ ctx, input }) => {
      // Get user's github login for prefix
      const user = await ctx.db.findUnique<User>(COLLECTIONS.users, {
        id: ctx.session.user.id,
      });

      if (!user?.githubLogin) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User github login not found",
        });
      }

      // Build full namespace name with user prefix
      const fullName = `${user.githubLogin.toLowerCase()}/${input.name}`;

      // Check in our database first
      const existingInDb = await ctx.db.findMany<Namespace>(
        COLLECTIONS.namespaces,
        { name: fullName },
        { limit: 1 }
      );

      if (existingInDb.length > 0) {
        return {
          available: false,
          fullName,
          reason: "You already have a namespace with this name",
        };
      }

      // Check on Celenium if namespace ID is already used on chain
      // Note: We generate a deterministic namespace ID from the name
      const potentialNamespaceId = generateNamespaceIdFromName(fullName);
      const celeniumNs = await getCeleniumNamespace(potentialNamespaceId);

      if (celeniumNs && celeniumNs.pfb_count > 0) {
        return {
          available: false,
          fullName,
          reason: "This namespace already has blobs on Celestia",
        };
      }

      return {
        available: true,
        fullName,
        reason: null,
      };
    }),

  // Create a new namespace
  create: protectedProcedure
    .input(
      z.object({
        name: z
          .string()
          .min(1, "Name must be at least 1 character")
          .max(50, "Name must be at most 50 characters")
          .regex(
            /^[a-z0-9]+(?:\/[a-z0-9-]+)*$/,
            "Name must be lowercase letters, numbers, and slashes (e.g., myapp/production)"
          ),
        description: z.string().max(200).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get user's github login for prefix
      const user = await ctx.db.findUnique<User>(COLLECTIONS.users, {
        id: ctx.session.user.id,
      });

      if (!user?.githubLogin) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User github login not found",
        });
      }

      // Build full namespace name with user prefix
      const fullName = `${user.githubLogin.toLowerCase()}/${input.name}`;

      // Check if namespace name already exists for this user
      const existing = await ctx.db.findMany<Namespace>(
        COLLECTIONS.namespaces,
        { name: fullName },
        { limit: 1 }
      );

      if (existing.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You already have a namespace with this name",
        });
      }

      // Generate deterministic namespace ID from the full name
      const namespaceId = generateNamespaceIdFromName(fullName);

      // Create the namespace
      const now = nowISO();
      const namespace: Namespace = {
        id: generateId(),
        userId: ctx.session.user.id,
        name: fullName,
        namespaceId,
        description: input.description ?? null,
        blobCount: 0,
        totalBytes: 0,
        lastActivityAt: null,
        isActive: true,
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

  // Add a repo to a namespace (many-to-many via namespace_repos)
  addRepo: protectedProcedure
    .input(
      z.object({
        namespaceId: z.string(),
        // GitHub repo info
        repoId: z.number(),
        fullName: z.string(),
        name: z.string(),
        owner: z.string(),
        description: z.string().nullable(),
        isPrivate: z.boolean(),
        htmlUrl: z.string(),
        language: z.string().nullable(),
        stargazersCount: z.number(),
        forksCount: z.number(),
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
          message: "You don't have permission to modify this namespace",
        });
      }

      // Check if this repo is already linked to this namespace
      const existing = await ctx.db.findMany<NamespaceRepo>(
        COLLECTIONS.namespaceRepos,
        { namespaceId: input.namespaceId, repoId: input.repoId },
        { limit: 1 }
      );

      if (existing.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This repo is already linked to this namespace",
        });
      }

      // Create the namespace-repo link
      const namespaceRepo: NamespaceRepo = {
        id: generateId(),
        namespaceId: input.namespaceId,
        userId: ctx.session.user.id,
        repoId: input.repoId,
        fullName: input.fullName,
        name: input.name,
        owner: input.owner,
        description: input.description,
        isPrivate: input.isPrivate,
        htmlUrl: input.htmlUrl,
        language: input.language,
        stargazersCount: input.stargazersCount,
        forksCount: input.forksCount,
        createdAt: nowISO(),
      };

      await ctx.db.createDocument(COLLECTIONS.namespaceRepos, namespaceRepo);

      return namespaceRepo;
    }),

  // Remove a repo from a namespace
  removeRepo: protectedProcedure
    .input(
      z.object({
        namespaceId: z.string(),
        repoId: z.number(),
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
          message: "You don't have permission to modify this namespace",
        });
      }

      // Find the link to delete
      const links = await ctx.db.findMany<NamespaceRepo>(
        COLLECTIONS.namespaceRepos,
        { namespaceId: input.namespaceId, repoId: input.repoId },
        { limit: 1 }
      );

      if (links.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Repo link not found",
        });
      }

      await ctx.db.deleteDocument(COLLECTIONS.namespaceRepos, { id: links[0]!.id });

      return { success: true };
    }),

  // Get repos linked to a namespace
  getRepos: protectedProcedure
    .input(z.object({ namespaceId: z.string() }))
    .query(async ({ ctx, input }) => {
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
          message: "You don't have access to this namespace",
        });
      }

      const repos = await ctx.db.findMany<NamespaceRepo>(
        COLLECTIONS.namespaceRepos,
        { namespaceId: input.namespaceId }
      );

      return repos;
    }),

  // Get detailed activity for a namespace (blobs + linked repos)
  getActivity: protectedProcedure
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

      if (namespace.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this namespace",
        });
      }

      // Get linked repos from junction table
      const linkedRepos = await ctx.db.findMany<NamespaceRepo>(
        COLLECTIONS.namespaceRepos,
        { namespaceId: namespace.id }
      );

      // Get blob activity from Celenium
      const [celeniumNs, stats, recentBlobs] = await Promise.all([
        getCeleniumNamespace(namespace.namespaceId),
        getNamespaceStats(namespace.namespaceId),
        getNamespaceBlobs(namespace.namespaceId, { limit: 5 }),
      ]);

      return {
        namespace: {
          ...namespace,
          // Update with latest from Celenium
          blobCount: celeniumNs?.pfb_count ?? stats?.blobs_count ?? namespace.blobCount,
          totalBytes: celeniumNs?.size ?? stats?.size ?? namespace.totalBytes,
          lastActivityAt: celeniumNs?.last_message_time ?? namespace.lastActivityAt,
        },
        linkedRepos: linkedRepos.map((repo) => ({
          repoId: repo.repoId,
          fullName: repo.fullName,
          htmlUrl: repo.htmlUrl,
          language: repo.language,
          isPrivate: repo.isPrivate,
        })),
        stats: stats ? {
          size: stats.size,
          blobsCount: stats.blobs_count,
          fee: stats.fee,
          commitsCount: stats.commits_count,
          sizeFormatted: formatBytes(stats.size),
        } : null,
        recentBlobs: recentBlobs.map((blob) => ({
          height: blob.height,
          time: blob.time,
          size: blob.size,
          sizeFormatted: formatBytes(blob.size),
          commitment: blob.commitment,
          txHash: blob.tx.hash,
          status: blob.tx.status,
        })),
      };
    }),

  // Get activity summary for all user namespaces (for profile dashboard)
  listWithActivity: protectedProcedure.query(async ({ ctx }) => {
    const namespaces = await ctx.db.findMany<Namespace>(
      COLLECTIONS.namespaces,
      { userId: ctx.session.user.id },
      { sort: { field: "createdAt", order: "desc" } }
    );

    // Get all namespace-repo links for this user
    const allNamespaceRepos = await ctx.db.findMany<NamespaceRepo>(
      COLLECTIONS.namespaceRepos,
      { userId: ctx.session.user.id }
    );

    // Group repos by namespace ID
    const reposByNamespace = new Map<string, NamespaceRepo[]>();
    for (const repo of allNamespaceRepos) {
      const existing = reposByNamespace.get(repo.namespaceId) ?? [];
      existing.push(repo);
      reposByNamespace.set(repo.namespaceId, existing);
    }

    // Enrich namespaces with activity data from Celenium
    const enriched = await Promise.all(
      namespaces.map(async (ns) => {
        // Get stats from Celenium - this is the source of truth for on-chain activity
        const stats = await getNamespaceStats(ns.namespaceId);
        const linkedRepos = reposByNamespace.get(ns.id) ?? [];

        // hasOnChainActivity = true if Celenium has data for this namespace
        // (meaning at least one blob has been submitted)
        const hasOnChainActivity = stats !== null && stats.blobs_count > 0;

        return {
          ...ns,
          // Use Celenium data if available, otherwise show 0 (not local DB values)
          blobCount: stats?.blobs_count ?? 0,
          totalBytes: stats?.size ?? 0,
          totalBytesFormatted: formatBytes(stats?.size ?? 0),
          totalFees: stats?.fee ?? "0",
          // Flag to indicate if namespace has real on-chain activity
          hasOnChainActivity,
          // Array of linked repos (many-to-many)
          linkedRepos: linkedRepos.map((repo) => ({
            repoId: repo.repoId,
            fullName: repo.fullName,
            htmlUrl: repo.htmlUrl,
            language: repo.language,
            isPrivate: repo.isPrivate,
          })),
        };
      })
    );

    return enriched;
  }),
});
