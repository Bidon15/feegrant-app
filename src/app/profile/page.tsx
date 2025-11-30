"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";
import {
  Wallet,
  ExternalLink,
  Plus,
  Coins,
  TrendingUp,
  Terminal,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Activity,
  BookOpen,
  Code,
} from "lucide-react";
import { formatTia, truncateAddress } from "~/lib/formatting";

export default function ProfilePage() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch real user data from tRPC
  const { data: myStats, isLoading, refetch } = api.stats.myStats.useQuery();
  const { data: networkStats } = api.stats.network.useQuery();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="font-mono text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!myStats) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-8 h-8 text-destructive mx-auto mb-4" />
          <p className="font-mono text-muted-foreground">Failed to load profile</p>
          <Button onClick={() => refetch()} className="mt-4 font-mono">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const { user, wallet } = myStats;
  const hasWallet = !!wallet;
  const feeAllowanceRemaining = wallet?.feeAllowanceRemaining
    ? parseInt(wallet.feeAllowanceRemaining)
    : 0;
  const feeAllowanceTotal = 1000000; // 1 TIA default grant
  const remainingPercentage =
    feeAllowanceTotal > 0 ? (feeAllowanceRemaining / feeAllowanceTotal) * 100 : 0;

  return (
    <div className="min-h-screen pt-16">
      {/* Header */}
      <div className="border-b border-border bg-void/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Image
                src={user.image ?? `https://api.dicebear.com/7.x/identicon/svg?seed=${user.id}`}
                alt={user.name ?? "User"}
                width={64}
                height={64}
                className="w-16 h-16 rounded-full border-2 border-primary"
                unoptimized
              />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold font-mono">
                    {user.name ?? user.email?.split("@")[0] ?? "Anonymous"}
                  </h1>
                  <Badge variant="default" className="font-mono">
                    {hasWallet && wallet.isDusted && wallet.hasFeeGrant
                      ? "Active"
                      : hasWallet
                        ? "Setup Pending"
                        : "No Wallet"}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                  {hasWallet && (
                    <span className="flex items-center gap-1">
                      <Wallet className="w-4 h-4" />
                      {truncateAddress(wallet.address)}
                    </span>
                  )}
                  <span>Joined {new Date(user.joinedAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="font-mono"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Wallet Setup CTA if no wallet */}
        {!hasWallet && (
          <Card className="glass border-primary/30 mb-8">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
                  <Wallet className="w-7 h-7 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-mono font-semibold mb-1">Connect Your Wallet</h3>
                  <p className="text-sm text-muted-foreground">
                    Link your Keplr wallet to get started with BlobCell
                  </p>
                </div>
                <Button asChild className="font-mono glow-green">
                  <Link href="/">
                    <Plus className="w-4 h-4 mr-2" />
                    Setup Wallet
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Wallet Balance Card */}
          <Card className="glass border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-primary" />
                  <span className="font-mono text-sm text-muted-foreground">
                    Wallet Balance
                  </span>
                </div>
                <TrendingUp className="w-4 h-4 text-accent" />
              </div>
              <div className="space-y-3">
                <div className="text-3xl font-bold font-mono text-primary">
                  {hasWallet ? wallet.balance : "0.00 TIA"}
                </div>
                {hasWallet && (
                  <div className="flex items-center gap-2 text-xs">
                    {wallet.isDusted ? (
                      <span className="flex items-center gap-1 text-primary">
                        <CheckCircle2 className="w-3 h-3" />
                        Dusted
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <XCircle className="w-3 h-3" />
                        Not dusted
                      </span>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Fee Grant Card */}
          <Card className="glass border-accent/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-accent" />
                <span className="font-mono text-sm text-muted-foreground">
                  Fee Grant Status
                </span>
              </div>
              {hasWallet && wallet.hasFeeGrant ? (
                <div className="space-y-3">
                  <div className="text-3xl font-bold font-mono">
                    {formatTia(feeAllowanceRemaining)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground font-mono">
                      <span>Remaining</span>
                      <span>of {formatTia(feeAllowanceTotal)}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-accent transition-all"
                        style={{ width: `${remainingPercentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-2">
                  <XCircle className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No fee grant</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Wallet Status Card */}
          <Card className="glass border-coral/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Terminal className="w-5 h-5 text-[hsl(15_85%_55%)]" />
                <span className="font-mono text-sm text-muted-foreground">
                  Wallet Status
                </span>
              </div>
              {hasWallet ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {wallet.isDusted ? (
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                    ) : (
                      <XCircle className="w-5 h-5 text-muted-foreground" />
                    )}
                    <span className={wallet.isDusted ? "text-primary" : "text-muted-foreground"}>
                      {wallet.isDusted ? "Dusted" : "Not dusted"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {wallet.hasFeeGrant ? (
                      <CheckCircle2 className="w-5 h-5 text-accent" />
                    ) : (
                      <XCircle className="w-5 h-5 text-muted-foreground" />
                    )}
                    <span className={wallet.hasFeeGrant ? "text-accent" : "text-muted-foreground"}>
                      {wallet.hasFeeGrant ? "Fee grant active" : "No fee grant"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-2">
                  <XCircle className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No wallet connected</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Network Stats */}
        {networkStats && (
          <Card className="glass-strong mb-8">
            <CardHeader>
              <CardTitle className="font-mono text-sm flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                <span className="text-primary">NETWORK STATS</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 rounded-lg bg-muted/20">
                  <div className="text-2xl font-bold font-mono text-primary">
                    {networkStats.users.total}
                  </div>
                  <div className="text-xs text-muted-foreground">Total Users</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/20">
                  <div className="text-2xl font-bold font-mono text-accent">
                    {networkStats.users.withAddress}
                  </div>
                  <div className="text-xs text-muted-foreground">Connected Wallets</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/20">
                  <div className="text-2xl font-bold font-mono text-[hsl(15_85%_55%)]">
                    {networkStats.users.dusted}
                  </div>
                  <div className="text-xs text-muted-foreground">Dusted Wallets</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/20">
                  <div className="text-2xl font-bold font-mono">
                    {networkStats.users.feegranted}
                  </div>
                  <div className="text-xs text-muted-foreground">Fee Granted</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Start Building CTA - Show when wallet is active */}
        {hasWallet && wallet.isDusted && wallet.hasFeeGrant && (
          <Card className="glass border-primary/30 mb-8">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
                  <Code className="w-7 h-7 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-mono font-semibold mb-1">Ready to Submit Blobs</h3>
                  <p className="text-sm text-muted-foreground">
                    Your feegrant is active. Start building with Go or Rust.
                  </p>
                </div>
                <Button asChild className="font-mono glow-green">
                  <Link href="/get-started">
                    <BookOpen className="w-4 h-4 mr-2" />
                    View Docs
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="mt-8 flex flex-wrap gap-4 justify-center">
          {hasWallet && wallet.isDusted && wallet.hasFeeGrant && (
            <Button asChild className="font-mono glow-green">
              <Link href="/get-started">
                <Code className="w-4 h-4 mr-2" />
                Start Building
              </Link>
            </Button>
          )}
          <Button asChild variant="outline" className="font-mono">
            <Link href="/htop">
              <Terminal className="w-4 h-4 mr-2" />
              View Network Activity
            </Link>
          </Button>
          {hasWallet && (
            <Button asChild variant="outline" className="font-mono">
              <a
                href={`https://mocha.celenium.io/address/${wallet.address}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View on Explorer
              </a>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
