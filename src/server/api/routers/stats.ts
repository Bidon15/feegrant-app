import { createTRPCRouter, publicProcedure, protectedProcedure } from "~/server/api/trpc";
import { COLLECTIONS, type User, type Address, type JobLog } from "~/server/db";
import { getCelestiaClient } from "~/server/celestia/client";

// Format TIA amount from uTIA
function formatTia(utia: number): string {
  const tia = utia / 1000000;
  return `${tia.toFixed(2)} TIA`;
}

// Format bytes to human readable
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

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

    // Count jobs
    const totalJobs = await ctx.db.countDocuments(COLLECTIONS.jobLogs, {});
    const completedJobs = await ctx.db.countDocuments(COLLECTIONS.jobLogs, {
      status: "completed",
    });
    const failedJobs = await ctx.db.countDocuments(COLLECTIONS.jobLogs, {
      status: "failed",
    });

    return {
      users: {
        total: totalUsers,
        withAddress: totalAddresses,
        dusted: dustedAddresses,
        feegranted: feegrantedAddresses,
      },
      jobs: {
        total: totalJobs,
        completed: completedJobs,
        failed: failedJobs,
        successRate:
          totalJobs > 0
            ? Math.round((completedJobs / totalJobs) * 100)
            : 100,
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

    // Get user info for each address
    const leaderboardEntries = await Promise.all(
      addresses.map(async (address) => {
        const user = await ctx.db.findUnique<User>(COLLECTIONS.users, {
          id: address.userId,
        });

        // Try to get on-chain balance
        let balance = "0";
        try {
          const { client } = await getCelestiaClient();
          const balanceResult = await client.getBalance(address.bech32, "utia");
          balance = balanceResult.amount;
        } catch {
          // Ignore balance fetch errors
        }

        return {
          id: address.id,
          username: user?.name ?? user?.email?.split("@")[0] ?? "anonymous",
          avatar: user?.image ?? `https://api.dicebear.com/7.x/identicon/svg?seed=${address.userId}`,
          walletAddress: address.bech32,
          isDusted: address.isDusted,
          hasFeeGrant: address.hasFeeGrant,
          feeAllowanceRemaining: address.feeAllowanceRemaining,
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

  // Get recent activity (job logs)
  recentActivity: publicProcedure.query(async ({ ctx }) => {
    const jobs = await ctx.db.findMany<JobLog>(
      COLLECTIONS.jobLogs,
      {},
      { limit: 20, sort: { field: "createdAt", order: "desc" } }
    );

    return jobs.map((job) => ({
      id: job.id,
      type: job.jobName,
      status: job.status,
      txHash: job.txHash,
      error: job.error,
      timestamp: job.createdAt,
      payload: job.payload,
    }));
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

    // Get on-chain balance if address exists
    let balance = "0";
    if (address) {
      try {
        const { client } = await getCelestiaClient();
        const balanceResult = await client.getBalance(address.bech32, "utia");
        balance = balanceResult.amount;
      } catch {
        // Ignore balance fetch errors
      }
    }

    // Get user's job history
    const userJobs = await ctx.db.findMany<JobLog>(
      COLLECTIONS.jobLogs,
      {},
      { limit: 100, sort: { field: "createdAt", order: "desc" } }
    );

    // Filter jobs related to user's address
    const myJobs = address
      ? userJobs.filter(
          (job) =>
            job.payload &&
            typeof job.payload === "object" &&
            "address" in job.payload &&
            job.payload.address === address.bech32
        )
      : [];

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        githubId: user.githubId,
        joinedAt: user.createdAt,
      },
      wallet: address
        ? {
            address: address.bech32,
            isDusted: address.isDusted,
            hasFeeGrant: address.hasFeeGrant,
            feeAllowanceRemaining: address.feeAllowanceRemaining,
            balance: formatTia(parseInt(balance)),
            balanceUtia: parseInt(balance),
          }
        : null,
      activity: {
        totalJobs: myJobs.length,
        dustJobs: myJobs.filter((j) => j.jobName === "dust.send").length,
        feegrantJobs: myJobs.filter((j) => j.jobName === "feegrant.grant").length,
        recentJobs: myJobs.slice(0, 5),
      },
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
});
