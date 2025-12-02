import { createTRPCRouter, publicProcedure, protectedProcedure } from "~/server/api/trpc";
import { COLLECTIONS, type User, type Address, type Namespace } from "~/server/db";
import { getCelestiaClient, getBackendAddress, getFeegrantAllowance } from "~/server/celestia/client";
import { formatTia, formatBytes } from "~/lib/formatting";
import { getNamespaceStats } from "~/server/celenium/client";

export const statsRouter = createTRPCRouter({
  // Get network-wide statistics
  network: publicProcedure.query(async ({ ctx }) => {
    // Count total users
    const totalUsers = await ctx.db.countDocuments(COLLECTIONS.users, {});

    // Count addresses with various states
    const totalAddresses = await ctx.db.countDocuments(COLLECTIONS.addresses, {});
    const dustedAddresses = await ctx.db.countDocuments(COLLECTIONS.addresses, {
      isDusted: true,
    });
    const feegrantedAddresses = await ctx.db.countDocuments(
      COLLECTIONS.addresses,
      { hasFeeGrant: true }
    );

    return {
      users: {
        total: totalUsers,
        withAddress: totalAddresses,
        dusted: dustedAddresses,
        feegranted: feegrantedAddresses,
      },
    };
  }),

  // Get leaderboard of users with addresses
  leaderboard: publicProcedure.query(async ({ ctx }) => {
    // Get all addresses
    const addresses = await ctx.db.findMany<Address>(
      COLLECTIONS.addresses,
      {},
      { limit: 50, sort: { field: "createdAt", order: "desc" } }
    );

    // Get backend address for feegrant queries
    const backendAddr = await getBackendAddress();

    // Get user info for each address
    const leaderboardEntries = await Promise.all(
      addresses.map(async (address) => {
        const user = await ctx.db.findUnique<User>(COLLECTIONS.users, {
          id: address.userId,
        });

        // Try to get on-chain balance and feegrant data
        let balance = "0";
        let feeAllowanceRemaining = address.feeAllowanceRemaining ?? "0";
        let hasFeeGrant = address.hasFeeGrant;

        try {
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
            // Grant may have been exhausted or revoked
            feeAllowanceRemaining = "0";
            hasFeeGrant = false;
          }
        } catch {
          // Ignore fetch errors, use database values
        }

        return {
          id: address.id,
          username: user?.name ?? user?.email?.split("@")[0] ?? "anonymous",
          avatar: user?.image ?? `https://api.dicebear.com/7.x/identicon/svg?seed=${address.userId}`,
          walletAddress: address.bech32,
          isDusted: address.isDusted,
          hasFeeGrant,
          feeAllowanceRemaining,
          balance: formatTia(parseInt(balance)),
          balanceUtia: parseInt(balance),
          joinedAt: address.createdAt,
        };
      })
    );

    // Sort by balance (descending)
    leaderboardEntries.sort((a, b) => b.balanceUtia - a.balanceUtia);

    return leaderboardEntries;
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
    const namespaces = await ctx.db.findMany<Namespace>(
      COLLECTIONS.namespaces,
      {},
      { limit: 100 }
    );

    // Aggregate stats from Celenium
    let totalBlobs = 0;
    let totalBytes = 0;
    let totalFees = 0;

    const namespaceStats = await Promise.all(
      namespaces.map(async (ns) => {
        const stats = await getNamespaceStats(ns.namespaceId);
        return {
          namespaceId: ns.namespaceId,
          name: ns.name,
          blobsCount: stats?.blobs_count ?? 0,
          size: stats?.size ?? 0,
          fee: parseInt(stats?.fee ?? "0"),
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
