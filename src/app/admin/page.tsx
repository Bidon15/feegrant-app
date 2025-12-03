"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { api } from "~/trpc/react";
import {
  Shield,
  Wallet,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Send,
  History,
  Settings,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  Coins,
  TrendingUp,
} from "lucide-react";

const CELESTIA_MOCHA_CHAIN_ID = "mocha-4";

export default function AdminPage() {
  // Keplr connection state
  const [keplrAddress, setKeplrAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Admin registration state
  const [adminName, setAdminName] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  // Feegrant form state
  const [recipientAddress, setRecipientAddress] = useState("");
  const [feegrantAmount, setFeegrantAmount] = useState("10");
  const [feegrantNote, setFeegrantNote] = useState("");
  const [isGranting, setIsGranting] = useState(false);

  // Authz state
  const [isGrantingAuthz, setIsGrantingAuthz] = useState(false);

  // UI state
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"grant" | "history" | "settings">("grant");

  // Check if current address is an admin
  const { data: adminStatus, refetch: refetchAdminStatus, isLoading: isCheckingAdmin } =
    api.admin.verifyAdmin.useQuery(
      { celestiaAddress: keplrAddress ?? "" },
      { enabled: !!keplrAddress }
    );

  // Get backend address for authz
  const { data: backendData } = api.admin.getBackendAddress.useQuery();

  // Get admin stats
  const { data: adminStats, refetch: refetchStats } = api.admin.getStats.useQuery(
    { adminAddress: keplrAddress ?? "" },
    { enabled: !!keplrAddress && !!adminStatus?.isAdmin }
  );

  // Get feegrant history
  const { data: historyData, refetch: refetchHistory } = api.admin.getFeegrantHistory.useQuery(
    { adminAddress: keplrAddress ?? "", limit: 20 },
    { enabled: !!keplrAddress && !!adminStatus?.isAdmin }
  );

  // Mutations
  const registerMutation = api.admin.register.useMutation({
    onSuccess: () => {
      void refetchAdminStatus();
      setAdminName("");
    },
  });

  const recordAuthzMutation = api.admin.recordAuthzGrant.useMutation({
    onSuccess: () => {
      void refetchAdminStatus();
    },
  });

  const createFeegrantMutation = api.admin.createFeegrant.useMutation({
    onSuccess: () => {
      void refetchHistory();
      void refetchStats();
      setRecipientAddress("");
      setFeegrantNote("");
    },
  });

  // Connect Keplr
  const connectKeplr = async () => {
    setIsConnecting(true);
    setConnectionError(null);

    try {
      if (!window.keplr) {
        throw new Error("Keplr wallet not found. Please install Keplr extension.");
      }

      // Enable the chain (Keplr already has mocha-4 built-in)
      await window.keplr.enable(CELESTIA_MOCHA_CHAIN_ID);
      const key = await window.keplr.getKey(CELESTIA_MOCHA_CHAIN_ID);
      setKeplrAddress(key.bech32Address);
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : "Failed to connect");
    } finally {
      setIsConnecting(false);
    }
  };

  // Listen for Keplr account changes
  useEffect(() => {
    const handleKeyStoreChange = async () => {
      if (window.keplr) {
        try {
          const key = await window.keplr.getKey(CELESTIA_MOCHA_CHAIN_ID);
          setKeplrAddress(key.bech32Address);
        } catch {
          setKeplrAddress(null);
        }
      }
    };

    window.addEventListener("keplr_keystorechange", () => void handleKeyStoreChange());
    return () => {
      window.removeEventListener("keplr_keystorechange", () => void handleKeyStoreChange());
    };
  }, []);

  // Handle admin registration
  const handleRegister = async () => {
    if (!keplrAddress || !adminName.trim()) return;
    setIsRegistering(true);
    try {
      await registerMutation.mutateAsync({
        celestiaAddress: keplrAddress,
        name: adminName.trim(),
      });
    } finally {
      setIsRegistering(false);
    }
  };

  // Handle authz grant
  const handleGrantAuthz = async () => {
    if (!keplrAddress || !window.keplr || !backendData?.backendAddress) {
      console.error("[Authz] Missing required data:", { keplrAddress, hasKeplr: !!window.keplr, backendAddress: backendData?.backendAddress });
      return;
    }
    setIsGrantingAuthz(true);
    setConnectionError(null);

    try {
      console.log("[Authz] Starting authz grant flow...");

      // Enable the chain (Keplr already has mocha-4 built-in)
      await window.keplr.enable(CELESTIA_MOCHA_CHAIN_ID);
      console.log("[Authz] Chain enabled");

      // Get offline signer
      const offlineSigner = await window.keplr.getOfflineSignerAuto(CELESTIA_MOCHA_CHAIN_ID);
      console.log("[Authz] Got offline signer");

      const { SigningStargateClient } = await import("@cosmjs/stargate");
      const { Registry } = await import("@cosmjs/proto-signing");
      const { MsgGrant } = await import("cosmjs-types/cosmos/authz/v1beta1/tx");
      const { GenericAuthorization } = await import("cosmjs-types/cosmos/authz/v1beta1/authz");
      const { Any } = await import("cosmjs-types/google/protobuf/any");

      // Create client with authz registry
      const registry = new Registry();
      registry.register("/cosmos.authz.v1beta1.MsgGrant", MsgGrant as Parameters<typeof registry.register>[1]);
      registry.register("/cosmos.authz.v1beta1.GenericAuthorization", GenericAuthorization as Parameters<typeof registry.register>[1]);

      // Use Keplr's RPC for mocha-4
      const rpcEndpoint = "https://rpc-mocha.pops.one";
      console.log("[Authz] Connecting to RPC:", rpcEndpoint);
      const client = await SigningStargateClient.connectWithSigner(
        rpcEndpoint,
        offlineSigner,
        { registry }
      );
      console.log("[Authz] Connected to RPC");

      // Calculate expiration (1 year from now)
      const expirationDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      // Convert to seconds since epoch for protobuf Timestamp
      const expirationSeconds = BigInt(Math.floor(expirationDate.getTime() / 1000));

      // Create the GenericAuthorization
      const genericAuth = GenericAuthorization.fromPartial({
        msg: "/cosmos.feegrant.v1beta1.MsgGrantAllowance",
      });

      // Create the MsgGrant with properly encoded authorization
      const msgGrant = {
        granter: keplrAddress,
        grantee: backendData.backendAddress,
        grant: {
          authorization: Any.fromPartial({
            typeUrl: "/cosmos.authz.v1beta1.GenericAuthorization",
            value: GenericAuthorization.encode(genericAuth).finish(),
          }),
          expiration: {
            seconds: expirationSeconds,
            nanos: 0,
          },
        },
      };

      console.log("[Authz] MsgGrant prepared:", {
        granter: msgGrant.granter,
        grantee: msgGrant.grantee,
        expiration: expirationDate.toISOString(),
      });

      const fee = {
        amount: [{ denom: "utia", amount: "10000" }],
        gas: "200000",
      };

      console.log("[Authz] Broadcasting transaction...");
      const result = await client.signAndBroadcast(
        keplrAddress,
        [
          {
            typeUrl: "/cosmos.authz.v1beta1.MsgGrant",
            value: msgGrant,
          },
        ],
        fee,
        `Grant authz to ${backendData.backendAddress} for feegrant management`
      );

      console.log("[Authz] Broadcast result:", { code: result.code, txHash: result.transactionHash });

      if (result.code !== 0) {
        throw new Error(`Transaction failed: ${result.rawLog}`);
      }

      // Record the authz grant in our database
      await recordAuthzMutation.mutateAsync({
        celestiaAddress: keplrAddress,
        txHash: result.transactionHash,
        expiresAt: expirationDate.toISOString(),
      });

      console.log("[Authz] Authz grant recorded successfully");
    } catch (error) {
      console.error("[Authz] Failed to grant authz:", error);
      setConnectionError(error instanceof Error ? error.message : "Failed to grant authz");
    } finally {
      setIsGrantingAuthz(false);
    }
  };

  // Handle feegrant creation
  const handleCreateFeegrant = async () => {
    if (!keplrAddress || !recipientAddress.trim()) return;
    setIsGranting(true);

    try {
      await createFeegrantMutation.mutateAsync({
        adminAddress: keplrAddress,
        recipientAddress: recipientAddress.trim(),
        amountUtia: (parseFloat(feegrantAmount) * 1_000_000).toString(),
        note: feegrantNote.trim() || undefined,
      });
    } finally {
      setIsGranting(false);
    }
  };

  const copyToClipboard = (id: string, text: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Not connected state
  if (!keplrAddress) {
    return (
      <div className="min-h-screen pt-16">
        <div className="container mx-auto px-4 py-16">
          <Card className="max-w-md mx-auto glass border-primary/30">
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="font-mono">Admin Panel</CardTitle>
              <CardDescription>
                Connect your Keplr wallet to access admin features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={connectKeplr}
                disabled={isConnecting}
                className="w-full font-mono glow-green"
              >
                {isConnecting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Wallet className="w-4 h-4 mr-2" />
                )}
                Connect Keplr
              </Button>
              {connectionError && (
                <p className="text-sm text-destructive text-center">{connectionError}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Loading admin status
  if (isCheckingAdmin) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="font-mono text-muted-foreground">Checking admin status...</p>
        </div>
      </div>
    );
  }

  // Not an admin - registration form
  if (!adminStatus?.isAdmin) {
    return (
      <div className="min-h-screen pt-16">
        <div className="container mx-auto px-4 py-16">
          <Card className="max-w-md mx-auto glass border-primary/30">
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-yellow-500/20 to-yellow-500/5 border border-yellow-500/20 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-yellow-500" />
              </div>
              <CardTitle className="font-mono">Register as Admin</CardTitle>
              <CardDescription>
                Your address is not registered as an admin yet
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/20 border border-border">
                <p className="text-xs text-muted-foreground mb-1">Connected Address</p>
                <code className="font-mono text-xs text-primary break-all">{keplrAddress}</code>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-mono">Display Name</label>
                <Input
                  placeholder="e.g., QuickNode DevRel"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  className="font-mono"
                />
              </div>

              <Button
                onClick={handleRegister}
                disabled={isRegistering || !adminName.trim()}
                className="w-full font-mono"
              >
                {isRegistering ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Shield className="w-4 h-4 mr-2" />
                )}
                Register as Admin
              </Button>

              {registerMutation.error && (
                <p className="text-sm text-destructive text-center">
                  {registerMutation.error.message}
                </p>
              )}

              <Button
                variant="ghost"
                onClick={() => setKeplrAddress(null)}
                className="w-full font-mono text-muted-foreground"
              >
                Disconnect
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const admin = adminStatus.admin!;

  // Admin dashboard
  return (
    <div className="min-h-screen pt-16">
      {/* Header */}
      <div className="border-b border-border bg-void/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold font-mono">{admin.name}</h1>
                  <Badge variant="default" className="font-mono">
                    {admin.hasAuthzGrant ? "Active" : "Setup Required"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <code className="font-mono text-xs text-muted-foreground">
                    {keplrAddress.slice(0, 12)}...{keplrAddress.slice(-8)}
                  </code>
                  <button
                    onClick={() => copyToClipboard("admin-address", keplrAddress)}
                    className="p-1 hover:bg-muted/50 rounded"
                  >
                    {copiedId === "admin-address" ? (
                      <Check className="w-3 h-3 text-primary" />
                    ) : (
                      <Copy className="w-3 h-3 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                void refetchAdminStatus();
                void refetchStats();
                void refetchHistory();
              }}
              className="font-mono"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Authz Setup Banner */}
        {!admin.hasAuthzGrant && (
          <Card className="glass border-yellow-500/30 mb-8">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-yellow-500/20 to-yellow-500/5 border border-yellow-500/20 flex items-center justify-center">
                  <AlertCircle className="w-7 h-7 text-yellow-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-mono font-semibold mb-1">Complete Authz Setup</h3>
                  <p className="text-sm text-muted-foreground">
                    Grant permission to the backend to execute feegrants on your behalf.
                    This is a one-time setup using Keplr.
                  </p>
                  {backendData && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Backend address: <code className="text-primary">{backendData.backendAddress}</code>
                    </p>
                  )}
                </div>
                <Button
                  onClick={handleGrantAuthz}
                  disabled={isGrantingAuthz}
                  className="font-mono glow-green"
                >
                  {isGrantingAuthz ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                  )}
                  Sign Authz Grant
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        {adminStats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card className="glass border-primary/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-2">
                  <Send className="w-5 h-5 text-primary" />
                  <span className="font-mono text-sm text-muted-foreground">Feegrants Issued</span>
                </div>
                <div className="text-3xl font-bold font-mono text-primary">
                  {adminStats.totalFeegrantsIssued}
                </div>
                <div className="flex gap-2 mt-2 text-xs">
                  <span className="text-green-500">{adminStats.successCount} success</span>
                  <span className="text-muted-foreground">{adminStats.pendingCount} pending</span>
                  {adminStats.failedCount > 0 && (
                    <span className="text-destructive">{adminStats.failedCount} failed</span>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="glass border-accent/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-2">
                  <Coins className="w-5 h-5 text-accent" />
                  <span className="font-mono text-sm text-muted-foreground">TIA Granted</span>
                </div>
                <div className="text-3xl font-bold font-mono text-accent">
                  {adminStats.totalTiaGranted} TIA
                </div>
              </CardContent>
            </Card>

            <Card className="glass border-coral/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-[hsl(15_85%_55%)]" />
                  <span className="font-mono text-sm text-muted-foreground">Default Grant</span>
                </div>
                <div className="text-3xl font-bold font-mono">
                  {Number(admin.defaultAmountUtia) / 1_000_000} TIA
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  {admin.defaultExpirationDays} day expiration
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === "grant" ? "default" : "ghost"}
            onClick={() => setActiveTab("grant")}
            className="font-mono"
          >
            <Send className="w-4 h-4 mr-2" />
            Issue Feegrant
          </Button>
          <Button
            variant={activeTab === "history" ? "default" : "ghost"}
            onClick={() => setActiveTab("history")}
            className="font-mono"
          >
            <History className="w-4 h-4 mr-2" />
            History
          </Button>
          <Button
            variant={activeTab === "settings" ? "default" : "ghost"}
            onClick={() => setActiveTab("settings")}
            className="font-mono"
          >
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>

        {/* Tab Content */}
        {activeTab === "grant" && (
          <Card className="glass">
            <CardHeader>
              <CardTitle className="font-mono text-sm flex items-center gap-2">
                <Send className="w-4 h-4 text-primary" />
                <span className="text-primary">ISSUE FEEGRANT</span>
              </CardTitle>
              <CardDescription>
                Grant fee allowance to a Celestia address from your wallet
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-mono">Recipient Address</label>
                <Input
                  placeholder="celestia1..."
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  className="font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-mono">Amount (TIA)</label>
                  <Input
                    type="number"
                    placeholder="10"
                    value={feegrantAmount}
                    onChange={(e) => setFeegrantAmount(e.target.value)}
                    className="font-mono"
                    min="0.1"
                    step="0.1"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-mono">Note (optional)</label>
                  <Input
                    placeholder="e.g., Hackathon winner"
                    value={feegrantNote}
                    onChange={(e) => setFeegrantNote(e.target.value)}
                    className="font-mono"
                  />
                </div>
              </div>

              <Button
                onClick={handleCreateFeegrant}
                disabled={
                  isGranting ||
                  !admin.hasAuthzGrant ||
                  !recipientAddress.startsWith("celestia1")
                }
                className="w-full font-mono glow-green"
              >
                {isGranting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Issue Feegrant ({feegrantAmount} TIA)
              </Button>

              {createFeegrantMutation.error && (
                <p className="text-sm text-destructive">
                  {createFeegrantMutation.error.message}
                </p>
              )}

              {!admin.hasAuthzGrant && (
                <p className="text-sm text-yellow-500 text-center">
                  Complete authz setup above before issuing feegrants
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "history" && (
          <Card className="glass">
            <CardHeader>
              <CardTitle className="font-mono text-sm flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                <span className="text-primary">FEEGRANT HISTORY</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {historyData?.feegrants && historyData.feegrants.length > 0 ? (
                <div className="space-y-3">
                  {historyData.feegrants.map((fg) => (
                    <div
                      key={fg.id}
                      className="p-4 rounded-lg bg-muted/20 border border-border/50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <code className="font-mono text-xs text-primary">
                          {fg.recipientAddress.slice(0, 12)}...{fg.recipientAddress.slice(-8)}
                        </code>
                        <Badge
                          variant={
                            fg.status === "success"
                              ? "default"
                              : fg.status === "failed"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {fg.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{Number(fg.amountUtia) / 1_000_000} TIA</span>
                        <span>{new Date(fg.createdAt).toLocaleDateString()}</span>
                        {fg.note && <span>&quot;{fg.note}&quot;</span>}
                      </div>
                      {fg.txHash && (
                        <a
                          href={`https://mocha.celenium.io/tx/${fg.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                        >
                          View on Celenium
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {fg.errorMessage && (
                        <p className="text-xs text-destructive mt-2">{fg.errorMessage}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No feegrants issued yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "settings" && (
          <Card className="glass">
            <CardHeader>
              <CardTitle className="font-mono text-sm flex items-center gap-2">
                <Settings className="w-4 h-4 text-primary" />
                <span className="text-primary">ADMIN SETTINGS</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/20 border border-border">
                <h4 className="font-mono text-sm mb-2">Default Feegrant Settings</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Default Amount:</span>
                    <span className="ml-2 font-mono">
                      {Number(admin.defaultAmountUtia) / 1_000_000} TIA
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Expiration:</span>
                    <span className="ml-2 font-mono">{admin.defaultExpirationDays} days</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted/20 border border-border">
                <h4 className="font-mono text-sm mb-2">Authz Status</h4>
                <div className="flex items-center gap-2">
                  {admin.hasAuthzGrant ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span className="text-green-500 text-sm">Authz granted</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-yellow-500" />
                      <span className="text-yellow-500 text-sm">Authz not granted</span>
                    </>
                  )}
                </div>
              </div>

              <Button
                variant="ghost"
                onClick={() => setKeplrAddress(null)}
                className="w-full font-mono text-muted-foreground"
              >
                Disconnect Wallet
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
