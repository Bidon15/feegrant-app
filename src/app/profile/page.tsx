"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
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
  Github,
  Box,
  Copy,
  Check,
  Trash2,
  X,
  FolderGit2,
} from "lucide-react";
import { formatTia } from "~/lib/formatting";

export default function ProfilePage() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [newNamespaceName, setNewNamespaceName] = useState("");
  const [isCreatingNamespace, setIsCreatingNamespace] = useState(false);
  const [namespaceError, setNamespaceError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  // Track which namespace is showing the repo selector
  const [addingRepoToNamespace, setAddingRepoToNamespace] = useState<string | null>(null);
  // Track which specific repo is being added (namespaceId:repoId)
  const [pendingRepoAdd, setPendingRepoAdd] = useState<string | null>(null);
  // Track which specific repo is being removed (namespaceId:repoId)
  const [pendingRepoRemove, setPendingRepoRemove] = useState<string | null>(null);
  // Track which namespace is being deleted
  const [pendingNamespaceDelete, setPendingNamespaceDelete] = useState<string | null>(null);

  // Fetch real user data from tRPC
  const { data: myStats, isLoading, refetch } = api.stats.myStats.useQuery();
  const { data: namespaces, refetch: refetchNamespaces } = api.namespace.listWithActivity.useQuery();

  // Check namespace availability as user types
  const { data: availability, isLoading: checkingAvailability } = api.namespace.checkAvailability.useQuery(
    { name: newNamespaceName },
    { enabled: newNamespaceName.length >= 1 }
  );

  // Fetch GitHub repos when adding to a namespace
  const { data: availableRepos, isLoading: isLoadingRepos } = api.github.listRepos.useQuery(
    { perPage: 50 },
    { enabled: addingRepoToNamespace !== null }
  );

  const createNamespace = api.namespace.create.useMutation({
    onSuccess: () => {
      setNewNamespaceName("");
      setIsCreatingNamespace(false);
      setNamespaceError(null);
      void refetchNamespaces();
    },
    onError: (error) => {
      setNamespaceError(error.message);
    },
  });

  const utils = api.useUtils();
  const deleteNamespace = api.namespace.delete.useMutation({
    onMutate: async ({ id }) => {
      setPendingNamespaceDelete(id);
      await utils.namespace.listWithActivity.cancel();
      const previousNamespaces = utils.namespace.listWithActivity.getData();
      utils.namespace.listWithActivity.setData(undefined, (old) =>
        old?.filter((ns) => ns.id !== id)
      );
      return { previousNamespaces };
    },
    onError: (error, _variables, context) => {
      console.error("[Profile] Failed to delete namespace:", error);
      if (context?.previousNamespaces) {
        utils.namespace.listWithActivity.setData(undefined, context.previousNamespaces);
      }
    },
    onSettled: () => {
      setPendingNamespaceDelete(null);
      void utils.namespace.listWithActivity.invalidate();
    },
  });

  // Add repo to namespace
  const addRepoToNamespace = api.namespace.addRepo.useMutation({
    onMutate: ({ namespaceId, repoId }) => {
      setPendingRepoAdd(`${namespaceId}:${repoId}`);
    },
    onSuccess: () => {
      setAddingRepoToNamespace(null);
      void refetchNamespaces();
    },
    onSettled: () => {
      setPendingRepoAdd(null);
    },
  });

  // Remove repo from namespace
  const removeRepoFromNamespace = api.namespace.removeRepo.useMutation({
    onMutate: ({ namespaceId, repoId }) => {
      setPendingRepoRemove(`${namespaceId}:${repoId}`);
    },
    onSuccess: () => {
      void refetchNamespaces();
    },
    onSettled: () => {
      setPendingRepoRemove(null);
    },
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetch(), refetchNamespaces()]);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleCreateNamespace = () => {
    if (!newNamespaceName.trim()) return;
    setNamespaceError(null);
    createNamespace.mutate({ name: newNamespaceName.toLowerCase().trim() });
  };

  const copyToClipboard = (id: string, text: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
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
                  {user.githubLogin && (
                    <a
                      href={`https://github.com/${user.githubLogin}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-primary transition-colors"
                    >
                      <Github className="w-4 h-4" />
                      {user.githubLogin}
                    </a>
                  )}
                  <span>Joined {new Date(user.joinedAt).toLocaleDateString()}</span>
                </div>
                {hasWallet && (
                  <div className="flex items-center gap-2 mt-2">
                    <Wallet className="w-4 h-4 text-muted-foreground" />
                    <code className="font-mono text-xs bg-muted/50 px-2 py-1 rounded text-primary">
                      {wallet.address}
                    </code>
                    <button
                      onClick={() => copyToClipboard("wallet-address", wallet.address)}
                      className="p-1 hover:bg-muted/50 rounded transition-colors"
                      title="Copy address"
                    >
                      {copiedId === "wallet-address" ? (
                        <Check className="w-4 h-4 text-primary" />
                      ) : (
                        <Copy className="w-4 h-4 text-muted-foreground hover:text-primary" />
                      )}
                    </button>
                  </div>
                )}
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

        {/* User Blob Stats - Only shows on-chain activity from Celenium */}
        {namespaces && namespaces.length > 0 && (() => {
          // Deduplicate namespaces by namespaceId for accurate stats
          const uniqueNamespaces = Array.from(
            new Map(namespaces.map(ns => [ns.namespaceId, ns])).values()
          );
          // Only count namespaces with actual on-chain activity (blobs submitted to Celestia)
          const activeNamespaces = uniqueNamespaces.filter(ns => ns.hasOnChainActivity);
          const totalBlobs = activeNamespaces.reduce((acc, ns) => acc + ns.blobCount, 0);
          const totalBytes = activeNamespaces.reduce((acc, ns) => acc + (ns.totalBytes || 0), 0);
          // Count total linked repos across all namespaces
          const linkedReposCount = uniqueNamespaces.reduce((acc, ns) => acc + (ns.linkedRepos?.length ?? 0), 0);

          return (
            <Card className="glass-strong mb-8">
              <CardHeader>
                <CardTitle className="font-mono text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  <span className="text-primary">YOUR BLOB ACTIVITY</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 rounded-lg bg-muted/20">
                    <div className="text-2xl font-bold font-mono text-primary">
                      {totalBlobs}
                    </div>
                    <div className="text-xs text-muted-foreground">Total Blobs</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/20">
                    <div className="text-2xl font-bold font-mono text-accent">
                      {activeNamespaces.length}
                    </div>
                    <div className="text-xs text-muted-foreground">Active Namespaces</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/20">
                    <div className="text-2xl font-bold font-mono text-[hsl(15_85%_55%)]">
                      {totalBytes > 1024 * 1024
                        ? `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`
                        : `${(totalBytes / 1024).toFixed(1)} KB`}
                    </div>
                    <div className="text-xs text-muted-foreground">Total Data</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/20">
                    <div className="text-2xl font-bold font-mono">
                      {linkedReposCount}
                    </div>
                    <div className="text-xs text-muted-foreground">Linked Repos</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* Namespaces Section */}
        <Card className="glass mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-mono text-sm flex items-center gap-2">
                  <Box className="w-4 h-4 text-primary" />
                  <span className="text-primary">MY NAMESPACES</span>
                </CardTitle>
                <CardDescription className="mt-1">
                  Create namespaces to organize your blob submissions
                </CardDescription>
              </div>
              {!isCreatingNamespace && (
                <Button
                  size="sm"
                  onClick={() => setIsCreatingNamespace(true)}
                  className="font-mono"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {/* Create namespace form */}
            {isCreatingNamespace && (
              <div className="mb-4 p-4 rounded-lg bg-muted/20 border border-border">
                <div className="flex gap-2 items-center">
                  <span className="font-mono text-sm text-muted-foreground whitespace-nowrap">
                    {myStats?.user?.githubLogin?.toLowerCase() ?? "user"}/
                  </span>
                  <Input
                    placeholder="myapp/production"
                    value={newNamespaceName}
                    onChange={(e) => setNewNamespaceName(e.target.value.toLowerCase())}
                    className="font-mono"
                    onKeyDown={(e) => e.key === "Enter" && handleCreateNamespace()}
                  />
                  <Button
                    onClick={handleCreateNamespace}
                    disabled={createNamespace.isPending || !newNamespaceName.trim() || (availability && !availability.available)}
                    className="font-mono"
                  >
                    {createNamespace.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Create"
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setIsCreatingNamespace(false);
                      setNewNamespaceName("");
                      setNamespaceError(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>

                {/* Availability feedback */}
                {newNamespaceName.length >= 1 && (
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    {checkingAvailability ? (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Checking availability...
                      </span>
                    ) : availability?.available ? (
                      <span className="flex items-center gap-1 text-primary">
                        <CheckCircle2 className="w-3 h-3" />
                        <code className="font-mono text-xs">{availability.fullName}</code> is available
                      </span>
                    ) : availability ? (
                      <span className="flex items-center gap-1 text-destructive">
                        <XCircle className="w-3 h-3" />
                        {availability.reason}
                      </span>
                    ) : null}
                  </div>
                )}

                {namespaceError && (
                  <p className="text-sm text-destructive mt-2">{namespaceError}</p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Namespace will be prefixed with your GitHub username for uniqueness
                </p>
              </div>
            )}

            {/* Namespace list */}
            {namespaces && namespaces.length > 0 ? (() => {
              // Deduplicate namespaces by namespaceId (keep the first/latest one)
              const uniqueNamespaces = Array.from(
                new Map(namespaces.map(ns => [ns.namespaceId, ns])).values()
              );
              return (
              <div className="space-y-3">
                {uniqueNamespaces.map((ns) => {
                  const linkedReposList = ns.linkedRepos ?? [];
                  const isAddingRepo = addingRepoToNamespace === ns.id;
                  // Filter out repos already linked to this namespace
                  const alreadyLinkedRepoIds = new Set(linkedReposList.map(r => r.repoId));
                  const reposToShow = availableRepos?.filter(r => !alreadyLinkedRepoIds.has(r.id)) ?? [];

                  return (
                    <div
                      key={ns.id}
                      className="p-4 rounded-lg bg-muted/20 border border-border/50 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium">{ns.name}</span>
                          <Badge variant={ns.isActive ? "default" : "secondary"} className="text-xs">
                            {ns.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(ns.id, ns.namespaceId)}
                            title="Copy namespace ID"
                            className="h-8 px-2"
                          >
                            {copiedId === ns.id ? (
                              <Check className="w-4 h-4 text-primary" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteNamespace.mutate({ id: ns.id })}
                            disabled={pendingNamespaceDelete === ns.id || deleteNamespace.isPending}
                            className="text-destructive hover:text-destructive h-8 px-2"
                            title="Delete namespace"
                          >
                            {pendingNamespaceDelete === ns.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Blob Stats Row */}
                      <div className="flex items-center gap-4 mb-2 text-xs">
                        <span className="flex items-center gap-1 text-primary">
                          <Box className="w-3 h-3" />
                          {ns.blobCount} blobs
                        </span>
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Activity className="w-3 h-3" />
                          {ns.totalBytesFormatted}
                        </span>
                        {ns.totalFees !== "0" && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Coins className="w-3 h-3" />
                            {ns.totalFees} utia fees
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">Namespace ID:</span>
                        <code className="font-mono bg-muted/50 px-2 py-1 rounded text-primary break-all">
                          {ns.namespaceId}
                        </code>
                        {copiedId === ns.id && (
                          <span className="text-primary text-xs">Copied!</span>
                        )}
                      </div>
                      {ns.description && (
                        <p className="text-xs text-muted-foreground mt-2">{ns.description}</p>
                      )}

                      {/* Linked repos section - supports multiple repos */}
                      <div className="mt-3 pt-3 border-t border-border/30">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <FolderGit2 className="w-3.5 h-3.5" />
                            <span>Linked Repos ({linkedReposList.length})</span>
                          </div>
                          {!isAddingRepo && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setAddingRepoToNamespace(ns.id)}
                              className="h-6 px-2 text-xs"
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Add
                            </Button>
                          )}
                        </div>

                        {/* List of linked repos */}
                        {linkedReposList.length > 0 && (
                          <div className="space-y-1 mb-2">
                            {linkedReposList.map((repo) => {
                              const isRemoving = pendingRepoRemove === `${ns.id}:${repo.repoId}`;
                              return (
                                <div
                                  key={repo.repoId}
                                  className={`flex items-center justify-between py-1 px-2 rounded bg-background/50 ${isRemoving ? "opacity-50" : ""}`}
                                >
                                  <a
                                    href={repo.htmlUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-mono text-xs text-primary hover:underline flex items-center gap-1"
                                  >
                                    {repo.fullName}
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                  <div className="flex items-center gap-2">
                                    {repo.language && (
                                      <Badge variant="outline" className="text-xs h-5">
                                        {repo.language}
                                      </Badge>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeRepoFromNamespace.mutate({
                                        namespaceId: ns.id,
                                        repoId: repo.repoId,
                                      })}
                                      disabled={isRemoving || removeRepoFromNamespace.isPending}
                                      className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                                      title="Remove repo"
                                    >
                                      {isRemoving ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <X className="w-3 h-3" />
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Add repo selector */}
                        {isAddingRepo && (
                          <div className="p-2 rounded bg-background/50 border border-border/50">
                            {isLoadingRepos ? (
                              <div className="flex items-center justify-center py-2">
                                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                              </div>
                            ) : reposToShow.length > 0 ? (
                              <div className="space-y-1 max-h-32 overflow-y-auto">
                                {reposToShow.slice(0, 10).map((repo) => {
                                  const isAdding = pendingRepoAdd === `${ns.id}:${repo.id}`;
                                  return (
                                    <button
                                      key={repo.id}
                                      onClick={() => {
                                        addRepoToNamespace.mutate({
                                          namespaceId: ns.id,
                                          repoId: repo.id,
                                          fullName: repo.fullName,
                                          name: repo.name,
                                          owner: repo.owner,
                                          description: repo.description,
                                          isPrivate: repo.isPrivate,
                                          htmlUrl: repo.htmlUrl,
                                          language: repo.language,
                                          stargazersCount: repo.stargazersCount,
                                          forksCount: repo.forksCount,
                                        });
                                      }}
                                      disabled={isAdding || addRepoToNamespace.isPending}
                                      className={`w-full text-left px-2 py-1.5 rounded text-xs font-mono hover:bg-muted/50 transition-colors flex items-center justify-between ${isAdding ? "bg-muted/30" : ""}`}
                                    >
                                      <span className="truncate">{repo.fullName}</span>
                                      <span className="flex items-center gap-2">
                                        {repo.language && (
                                          <span className="text-muted-foreground">{repo.language}</span>
                                        )}
                                        {isAdding && (
                                          <Loader2 className="w-3 h-3 animate-spin text-primary" />
                                        )}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground text-center py-2">
                                No more repos to add
                              </p>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setAddingRepoToNamespace(null)}
                              disabled={addRepoToNamespace.isPending}
                              className="w-full mt-2 h-7 text-xs"
                            >
                              Cancel
                            </Button>
                          </div>
                        )}

                        {/* Empty state */}
                        {linkedReposList.length === 0 && !isAddingRepo && (
                          <p className="text-xs text-muted-foreground">
                            No repos linked yet. Click &quot;Add&quot; to link GitHub repositories.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              );
            })() : (
              <div className="text-center py-8 text-muted-foreground">
                <Box className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No namespaces yet</p>
                <p className="text-xs mt-1">Create one to start organizing your blobs</p>
              </div>
            )}
          </CardContent>
        </Card>

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
          <Button asChild variant="outline" className="font-mono">
            <a
              href="https://github.com/Bidon15/feegrant-app"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github className="w-4 h-4 mr-2" />
              BlobCell Repo
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
