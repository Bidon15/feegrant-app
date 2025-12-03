import { createTRPCRouter, publicProcedure, protectedProcedure } from "~/server/api/trpc";
import { COLLECTIONS, type User, type Address, type Namespace, type NamespaceRepo } from "~/server/db";
import { getCelestiaClient, getBackendAddress, getFeegrantAllowance } from "~/server/celestia/client";
import { formatTia, formatBytes } from "~/lib/formatting";
import { getNamespaceStats, getNamespaceBlobs } from "~/server/celenium/client";

export const statsRouter = createTRPCRouter({
  // Get network-wide statistics
  network: publicProcedure.query(async ({ ctx }) => {
    // Count total users
    const totalUsers = await ctx.db.countDocuments(COLLECTIONS.users, {});

    // Get all addresses and deduplicate by userId (one wallet per user)
    const allAddresses = await ctx.db.findMany<Address>(COLLECTIONS.addresses, {}, { limit: 1000 });
    const uniqueAddressesByUser = new Map<string, Address>();
    for (const addr of allAddresses) {
      // Keep the most recent address per user (last one wins since we iterate in order)
      uniqueAddressesByUser.set(addr.userId, addr);
    }
    const uniqueAddresses = Array.from(uniqueAddressesByUser.values());

    // Count unique addresses with feegrant (must have BOTH isDusted AND hasFeeGrant)
    const feegrantedCount = uniqueAddresses.filter(
      (addr) => addr.isDusted && addr.hasFeeGrant
    ).length;

    // Get all namespaces and deduplicate by namespaceId
    const allNamespaces = await ctx.db.findMany<Namespace>(COLLECTIONS.namespaces, {}, { limit: 1000 });
    const uniqueNamespacesByNsId = new Map<string, Namespace>();
    for (const ns of allNamespaces) {
      // Keep the first one per namespaceId
      if (!uniqueNamespacesByNsId.has(ns.namespaceId)) {
        uniqueNamespacesByNsId.set(ns.namespaceId, ns);
      }
    }
    const uniqueNamespacesCount = uniqueNamespacesByNsId.size;

    return {
      users: {
        total: totalUsers,
        withAddress: uniqueAddresses.length,
        feegranted: feegrantedCount,
      },
      namespaces: uniqueNamespacesCount,
    };
  }),

  // Get leaderboard by namespace activity (blobs submitted)
  leaderboard: publicProcedure.query(async ({ ctx }) => {
    // Get all namespaces
    const allNamespaces = await ctx.db.findMany<Namespace>(
      COLLECTIONS.namespaces,
      {},
      { limit: 100 }
    );

    // Deduplicate namespaces by namespaceId (keep first occurrence)
    const uniqueNamespacesByNsId = new Map<string, Namespace>();
    for (const ns of allNamespaces) {
      if (!uniqueNamespacesByNsId.has(ns.namespaceId)) {
        uniqueNamespacesByNsId.set(ns.namespaceId, ns);
      }
    }
    const namespaces = Array.from(uniqueNamespacesByNsId.values());

    // Get all namespace-repo links
    const allNamespaceRepos = await ctx.db.findMany<NamespaceRepo>(
      COLLECTIONS.namespaceRepos,
      {},
      { limit: 500 }
    );

    // Group repos by namespace ID (db record id, not Celestia namespaceId)
    const reposByNamespace = new Map<string, NamespaceRepo[]>();
    for (const repo of allNamespaceRepos) {
      const existing = reposByNamespace.get(repo.namespaceId) ?? [];
      existing.push(repo);
      reposByNamespace.set(repo.namespaceId, existing);
    }

    // Fetch stats for each unique namespace from Celenium and enrich with user data
    const entries = await Promise.all(
      namespaces.map(async (ns) => {
        const stats = await getNamespaceStats(ns.namespaceId);
        const user = await ctx.db.findUnique<User>(COLLECTIONS.users, {
          id: ns.userId,
        });
        const linkedRepos = reposByNamespace.get(ns.id) ?? [];

        return {
          id: ns.id,
          // User info
          userId: ns.userId,
          username: user?.githubLogin ?? user?.name ?? "anonymous",
          avatar: user?.image ?? `https://api.dicebear.com/7.x/identicon/svg?seed=${ns.userId}`,
          // Namespace info
          namespaceName: ns.name,
          namespaceId: ns.namespaceId,
          // Linked repos
          linkedRepos: linkedRepos.map((r) => ({
            fullName: r.fullName,
            htmlUrl: r.htmlUrl,
          })),
          // Activity stats from Celenium
          blobCount: stats?.blobs_count ?? 0,
          totalBytes: stats?.size ?? 0,
          totalBytesFormatted: formatBytes(stats?.size ?? 0),
          // Note: fee data not available from namespace endpoint
          hasOnChainActivity: (stats?.blobs_count ?? 0) > 0,
          createdAt: ns.createdAt,
        };
      })
    );

    // Sort by blob count (descending) - most active namespaces first
    entries.sort((a, b) => b.blobCount - a.blobCount);

    // Return top 50
    return entries.slice(0, 50);
  }),

  // Get current user's detailed stats
  myStats: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.findUnique<User>(COLLECTIONS.users, {
      id: ctx.session.user.id,
    });

    const address = await ctx.db.findUnique<Address>(COLLECTIONS.addresses, {
      userId: ctx.session.user.id,
    });

    if (!user) {
      return null;
    }

    // Get on-chain balance and feegrant data if address exists
    let balance = "0";
    let feeAllowanceRemaining = "0";
    let hasFeeGrant = address?.hasFeeGrant ?? false;

    if (address) {
      try {
        // Fetch balance and feegrant data in parallel
        const backendAddr = await getBackendAddress();
        const [balanceResult, feegrantResult] = await Promise.all([
          (async () => {
            const { client } = await getCelestiaClient();
            return client.getBalance(address.bech32, "utia");
          })(),
          getFeegrantAllowance(backendAddr, address.bech32),
        ]);

        balance = balanceResult.amount;

        // Use real on-chain feegrant data if available
        if (feegrantResult) {
          feeAllowanceRemaining = feegrantResult.remaining;
          hasFeeGrant = true;
        } else if (address.hasFeeGrant) {
          // Database says we have feegrant but chain says no - grant may have been revoked or exhausted
          feeAllowanceRemaining = "0";
          hasFeeGrant = false;
        }
      } catch (error) {
        console.error("[Stats] Error fetching wallet data:", error);
        // Fall back to database values on error
        feeAllowanceRemaining = address.feeAllowanceRemaining ?? "0";
      }
    }

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        githubId: user.githubId,
        githubLogin: user.githubLogin,
        joinedAt: user.createdAt,
      },
      wallet: address
        ? {
            address: address.bech32,
            isDusted: address.isDusted,
            hasFeeGrant,
            feeAllowanceRemaining,
            balance: formatTia(parseInt(balance)),
            balanceUtia: parseInt(balance),
          }
        : null,
    };
  }),

  // Get backend wallet info (for transparency)
  backendWallet: publicProcedure.query(async () => {
    try {
      const { client, address } = await getCelestiaClient();
      const balance = await client.getBalance(address, "utia");

      return {
        address,
        balance: formatTia(parseInt(balance.amount)),
        balanceUtia: parseInt(balance.amount),
      };
    } catch (error) {
      return {
        address: "unknown",
        balance: "0 TIA",
        balanceUtia: 0,
        error: error instanceof Error ? error.message : "Failed to fetch",
      };
    }
  }),

  // Get global blob stats across all namespaces (for htop)
  globalBlobStats: publicProcedure.query(async ({ ctx }) => {
    // Get all namespaces
    const allNamespaces = await ctx.db.findMany<Namespace>(
      COLLECTIONS.namespaces,
      {},
      { limit: 100 }
    );

    // Deduplicate namespaces by namespaceId (keep first occurrence)
    const uniqueNamespacesByNsId = new Map<string, Namespace>();
    for (const ns of allNamespaces) {
      if (!uniqueNamespacesByNsId.has(ns.namespaceId)) {
        uniqueNamespacesByNsId.set(ns.namespaceId, ns);
      }
    }
    const namespaces = Array.from(uniqueNamespacesByNsId.values());

    // Aggregate stats from Celenium
    let totalBlobs = 0;
    let totalBytes = 0;
    let totalFees = 0;

    const namespaceStats = await Promise.all(
      namespaces.map(async (ns) => {
        // Get namespace stats for blob count and size
        const stats = await getNamespaceStats(ns.namespaceId);

        // Get recent blobs to calculate fees (fee data is in blob transactions)
        // Fetch up to 100 blobs to estimate total fees
        const blobs = await getNamespaceBlobs(ns.namespaceId, { limit: 100 });
        const feeFromBlobs = blobs.reduce((sum, blob) => sum + parseInt(blob.tx.fee || "0"), 0);

        return {
          namespaceId: ns.namespaceId,
          name: ns.name,
          blobsCount: stats?.blobs_count ?? 0,
          size: stats?.size ?? 0,
          fee: feeFromBlobs,
        };
      })
    );

    // Sum up totals
    for (const stats of namespaceStats) {
      totalBlobs += stats.blobsCount;
      totalBytes += stats.size;
      totalFees += stats.fee;
    }

    // Get top namespaces by blob count
    const topNamespaces = namespaceStats
      .sort((a, b) => b.blobsCount - a.blobsCount)
      .slice(0, 10);

    return {
      totalNamespaces: namespaces.length,
      totalBlobs,
      totalBytes,
      totalBytesFormatted: formatBytes(totalBytes),
      totalFees,
      totalFeesFormatted: formatTia(totalFees),
      topNamespaces,
    };
  }),
});
