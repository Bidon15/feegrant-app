"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { api } from "~/trpc/react";
import {
  Activity,
  Users,
  Clock,
  Wallet,
  Loader2,
  RefreshCw,
  Coins,
  TrendingUp,
  Box,
  Database,
  Github,
  ExternalLink,
  FolderGit2,
} from "lucide-react";
import { truncateAddress } from "~/lib/formatting";

export default function HtopPage() {
  const [sessionTime, setSessionTime] = useState(0);

  // Fetch real data from tRPC
  const {
    data: leaderboard,
    isLoading: leaderboardLoading,
    refetch: refetchLeaderboard,
  } = api.stats.leaderboard.useQuery(undefined, {
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: networkStats, refetch: refetchStats } = api.stats.network.useQuery(undefined, {
    refetchInterval: 30000,
  });

  const { data: backendWallet } = api.stats.backendWallet.useQuery();

  const { data: blobStats, refetch: refetchBlobStats } = api.stats.globalBlobStats.useQuery(undefined, {
    refetchInterval: 30000,
  });

  // Session time counter
  useEffect(() => {
    const interval = setInterval(() => {
      setSessionTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleRefresh = () => {
    void refetchLeaderboard();
    void refetchStats();
    void refetchBlobStats();
  };

  return (
    <div className="min-h-screen pt-16">
      {/* Terminal Header */}
      <div className="border-b border-border bg-void/80 backdrop-blur-sm sticky top-16 z-40">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="font-mono text-lg">
                <span className="text-primary">htop</span>
                <span className="text-muted-foreground"> - blobcell network monitor</span>
              </h1>
              <Badge variant="outline" className="font-mono text-xs">
                mocha-4
              </Badge>
            </div>

            <div className="flex items-center gap-6 font-mono text-xs">
              <div className="flex items-center gap-2">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span className="text-accent">{formatTime(sessionTime)}</span>
              </div>
              {networkStats && (
                <>
                  <div className="flex items-center gap-2">
                    <Users className="w-3 h-3 text-primary" />
                    <span className="text-foreground">{networkStats.users.total} users</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Activity className="w-3 h-3 text-accent" />
                    <span className="text-foreground">
                      {networkStats.users.feegranted} fee granted
                    </span>
                  </div>
                </>
              )}
              <button
                onClick={handleRefresh}
                className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Network Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="glass border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-mono">
                    {networkStats?.users.total ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Users</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-accent/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <Wallet className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-mono">
                    {networkStats?.users.withAddress ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Bound Wallets</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-[hsl(15_85%_55%)]/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[hsl(15_85%_55%)]/10">
                  <Box className="w-5 h-5 text-[hsl(15_85%_55%)]" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-mono">
                    {networkStats?.namespaces ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Namespaces</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-[hsl(35_90%_55%)]/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[hsl(35_90%_55%)]/10">
                  <TrendingUp className="w-5 h-5 text-[hsl(35_90%_55%)]" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-mono">
                    {networkStats?.users.feegranted ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Fee Granted</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Blob Stats */}
        {blobStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="glass border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Box className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-mono">
                      {blobStats.totalBlobs}
                    </p>
                    <p className="text-xs text-muted-foreground">Total Blobs</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass border-accent/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-accent/10">
                    <Database className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-mono">
                      {blobStats.totalBytesFormatted}
                    </p>
                    <p className="text-xs text-muted-foreground">Data Stored</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass border-[hsl(15_85%_55%)]/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[hsl(15_85%_55%)]/10">
                    <Activity className="w-5 h-5 text-[hsl(15_85%_55%)]" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-mono">
                      {blobStats.totalNamespaces}
                    </p>
                    <p className="text-xs text-muted-foreground">Namespaces</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass border-[hsl(35_90%_55%)]/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[hsl(35_90%_55%)]/10">
                    <Coins className="w-5 h-5 text-[hsl(35_90%_55%)]" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-mono">
                      {blobStats.totalFeesFormatted}
                    </p>
                    <p className="text-xs text-muted-foreground">Fees Spent</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Backend Wallet Status */}
        {backendWallet && (
          <Card className="glass border-primary/20 mb-8">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Wallet className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-mono">Backend Wallet</p>
                    <p className="text-sm font-mono">{truncateAddress(backendWallet.address)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Available Balance</p>
                  <p className="text-xl font-bold font-mono text-primary">{backendWallet.balance}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Namespace Activity Leaderboard */}
        <Card className="glass-strong mb-8">
          <CardHeader className="pb-2">
            <CardTitle className="font-mono text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-accent" />
              <span className="text-accent">LEADERBOARD</span>
              <span className="text-muted-foreground"> - namespace activity</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {leaderboardLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : leaderboard && leaderboard.length > 0 ? (
              <>
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 py-2 border-b border-border font-mono text-xs text-muted-foreground uppercase">
                  <div>Rank</div>
                  <div className="col-span-2">User</div>
                  <div className="col-span-3">Namespace</div>
                  <div className="col-span-3">Linked Repos</div>
                  <div className="text-center">Blobs</div>
                  <div className="text-right col-span-2">Data</div>
                </div>

                {/* Table Rows */}
                <div className="divide-y divide-border/50">
                  {leaderboard.map((entry, index) => (
                    <div
                      key={entry.id}
                      className="grid grid-cols-12 gap-4 py-3 items-center hover:bg-muted/20 transition-colors"
                    >
                      {/* Rank */}
                      <div className="font-mono text-lg font-bold">
                        <span
                          className={
                            index === 0
                              ? "text-[hsl(35_90%_55%)]"
                              : index === 1
                                ? "text-muted-foreground"
                                : index === 2
                                  ? "text-[hsl(15_85%_55%)]"
                                  : "text-muted-foreground/50"
                          }
                        >
                          #{index + 1}
                        </span>
                      </div>

                      {/* User */}
                      <div className="col-span-2 flex items-center gap-2">
                        <Image
                          src={entry.avatar}
                          alt={entry.username}
                          width={24}
                          height={24}
                          className="w-6 h-6 rounded-full"
                          unoptimized
                        />
                        <span className="font-mono text-sm truncate">@{entry.username}</span>
                      </div>

                      {/* Namespace */}
                      <div className="col-span-3">
                        <a
                          href={`https://mocha.celenium.io/namespace/${entry.namespaceId.padStart(56, "0")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          {entry.namespaceName}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>

                      {/* Linked Repos */}
                      <div className="col-span-3">
                        {entry.linkedRepos.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {entry.linkedRepos.slice(0, 2).map((repo) => (
                              <a
                                key={repo.fullName}
                                href={repo.htmlUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs bg-muted/30 px-2 py-0.5 rounded hover:bg-muted/50 transition-colors"
                                title={repo.fullName}
                              >
                                <Github className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate max-w-[120px]">
                                  {repo.fullName.length > 20
                                    ? `${repo.fullName.slice(0, 18)}...`
                                    : repo.fullName}
                                </span>
                              </a>
                            ))}
                            {entry.linkedRepos.length > 2 && (
                              <span className="text-xs text-muted-foreground">
                                +{entry.linkedRepos.length - 2}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>

                      {/* Blob Count */}
                      <div className="text-center">
                        <Badge
                          variant={entry.blobCount > 0 ? "default" : "secondary"}
                          className="font-mono"
                        >
                          {entry.blobCount}
                        </Badge>
                      </div>

                      {/* Data Size */}
                      <div className="text-right col-span-2 font-mono text-sm text-muted-foreground">
                        {entry.totalBytesFormatted}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Box className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No namespaces yet</p>
                <p className="text-xs mt-1">Create one to start submitting blobs!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer Help */}
        <div className="mt-6 text-center font-mono text-xs text-muted-foreground">
          <span className="text-primary">F1</span> Help{" "}
          <span className="text-primary">F2</span> Setup{" "}
          <span className="text-primary">F10</span> Quit{" "}
          <span className="text-muted-foreground/50">
            | Data refreshes every 30s | Connect your wallet to join
          </span>
        </div>
      </div>
    </div>
  );
}
