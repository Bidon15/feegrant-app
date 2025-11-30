"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import AuthStepper from "~/components/auth-stepper";
import { Github, Wallet, Check, ExternalLink, Loader2, AlertCircle, Terminal, ChevronRight, Zap } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { api } from "~/trpc/react";
import type { Window as KeplrWindow } from "@keplr-wallet/types";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Window extends KeplrWindow {}
}

const CELESTIA_MOCHA_CHAIN_ID = "mocha-4";

const celestiaMochaConfig = {
  chainId: CELESTIA_MOCHA_CHAIN_ID,
  chainName: "Celestia Mocha Testnet",
  rpc: "https://rpc-mocha.pops.one",
  rest: "https://api-mocha.pops.one",
  bip44: { coinType: 118 },
  bech32Config: {
    bech32PrefixAccAddr: "celestia",
    bech32PrefixAccPub: "celestiapub",
    bech32PrefixValAddr: "celestiavaloper",
    bech32PrefixValPub: "celestiavaloperpub",
    bech32PrefixConsAddr: "celestiavalcons",
    bech32PrefixConsPub: "celestiavalconspub",
  },
  currencies: [{ coinDenom: "TIA", coinMinimalDenom: "utia", coinDecimals: 6 }],
  feeCurrencies: [{
    coinDenom: "TIA",
    coinMinimalDenom: "utia",
    coinDecimals: 6,
    gasPriceStep: { low: 0.01, average: 0.02, high: 0.1 },
  }],
  stakeCurrency: { coinDenom: "TIA", coinMinimalDenom: "utia", coinDecimals: 6 },
};

export default function AuthContent() {
  const { data: session, status: sessionStatus } = useSession();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keplr state
  const [isKeplrAvailable, setIsKeplrAvailable] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  // Feegrant result state
  const [feegrantResult, setFeegrantResult] = useState<{
    dustTxHash: string;
    feegrantTxHash: string;
  } | null>(null);

  const steps = ["GitHub", "Wallet", "Feegrant", "Done"];

  // tRPC queries and mutations
  const utils = api.useUtils();
  const { data: user, isLoading: userLoading } = api.user.me.useQuery(undefined, {
    enabled: !!session,
  });
  const { data: nonce } = api.user.getNonce.useQuery(undefined, {
    enabled: !!session,
  });

  const bindAddressMutation = api.user.bindAddress.useMutation({
    onSuccess: () => {
      void utils.user.me.invalidate();
      setError(null);
    },
    onError: (err) => {
      setError(err.message);
      setIsLoading(false);
    },
  });

  const dustMutation = api.wallet.dust.useMutation({
    onSuccess: (data) => {
      setFeegrantResult({
        dustTxHash: data.txHash,
        feegrantTxHash: data.feeGrantTxHash ?? "",
      });
      void utils.user.me.invalidate();
      setCurrentStep(3);
      setIsLoading(false);
    },
    onError: (err) => {
      setError(err.message);
      setIsLoading(false);
    },
  });

  // Check Keplr availability
  useEffect(() => {
    const checkKeplr = () => {
      if (window.keplr) {
        setIsKeplrAvailable(true);
      }
    };
    checkKeplr();
    const timer = setTimeout(checkKeplr, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Determine current step based on state
  useEffect(() => {
    if (sessionStatus === "loading" || userLoading) return;

    if (!session) {
      setCurrentStep(0);
    } else if (!user?.address) {
      setCurrentStep(1);
    } else if (!user.address.isDusted || !user.address.hasFeeGrant) {
      setCurrentStep(2);
    } else {
      setCurrentStep(3);
    }
  }, [session, sessionStatus, user, userLoading]);

  // Check for existing Keplr connection
  useEffect(() => {
    const checkExistingConnection = async () => {
      if (!window.keplr || !isKeplrAvailable) return;
      try {
        const key = await window.keplr.getKey(CELESTIA_MOCHA_CHAIN_ID);
        if (key?.bech32Address) {
          setWalletAddress(key.bech32Address);
        }
      } catch {
        // Not connected yet
      }
    };
    if (isKeplrAvailable && session) {
      void checkExistingConnection();
    }
  }, [isKeplrAvailable, session]);

  // Handle GitHub sign in
  const handleGithubConnect = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signIn("github", { callbackUrl: "/auth" });
    } catch {
      setError("Failed to connect GitHub. Please try again.");
      setIsLoading(false);
    }
  };

  // Handle Keplr connection and address binding
  const handleWalletConnect = useCallback(async () => {
    if (!window.keplr) {
      setError("Keplr wallet not found. Please install the Keplr extension.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Suggest and enable chain
      await window.keplr.experimentalSuggestChain(celestiaMochaConfig);
      await window.keplr.enable(CELESTIA_MOCHA_CHAIN_ID);

      // Get address
      const key = await window.keplr.getKey(CELESTIA_MOCHA_CHAIN_ID);
      const address = key.bech32Address;
      setWalletAddress(address);

      // If user already has this address bound, skip binding
      if (user?.address?.bech32 === address) {
        setCurrentStep(2);
        setIsLoading(false);
        return;
      }

      // Sign and bind address
      if (!nonce) {
        throw new Error("Nonce not available");
      }

      const signResponse = await window.keplr.signArbitrary(
        CELESTIA_MOCHA_CHAIN_ID,
        address,
        nonce.nonce
      );

      const signatureHex = Buffer.from(signResponse.signature, "base64").toString("hex");
      const publicKeyHex = Buffer.from(signResponse.pub_key.value, "base64").toString("hex");

      await bindAddressMutation.mutateAsync({
        address,
        signedNonce: signatureHex,
        publicKey: publicKeyHex,
      });

      setCurrentStep(2);
      setIsLoading(false);
    } catch (err) {
      console.error("Wallet connection error:", err);
      setError(err instanceof Error ? err.message : "Failed to connect wallet");
      setIsLoading(false);
    }
  }, [nonce, user, bindAddressMutation]);

  // Handle dust and feegrant
  const handleFeegrant = useCallback(async () => {
    if (!user?.address?.bech32) {
      setError("No wallet address found");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await dustMutation.mutateAsync({ address: user.address.bech32 });
    } catch (err) {
      // Error handled in mutation onError
      console.error("Feegrant error:", err);
    }
  }, [user, dustMutation]);

  // Loading state
  if (sessionStatus === "loading" || (session && userLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="font-mono text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `
          linear-gradient(hsl(150 85% 50%) 1px, transparent 1px),
          linear-gradient(90deg, hsl(150 85% 50%) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
      }} />

      <main className="pt-32 pb-20 px-4 relative">
        <div className="container mx-auto max-w-lg">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="font-mono text-sm text-primary mb-2">{"// authentication"}</div>
            <h1 className="text-2xl font-bold">Initialize Feegrant</h1>
          </div>

          {/* Stepper */}
          <div className="mb-8">
            <AuthStepper currentStep={currentStep} steps={steps} />
          </div>

          {/* Error display */}
          {error && (
            <div className="mb-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{error}</span>
              </div>
            </div>
          )}

          {/* Step 1: GitHub */}
          {currentStep === 0 && (
            <Card className="glass overflow-hidden">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 mx-auto mb-4 relative">
                  <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-xl" />
                  <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
                    <Github className="w-8 h-8 text-primary" />
                  </div>
                </div>
                <CardTitle className="font-mono">git auth --github</CardTitle>
                <CardDescription>
                  Verify your developer identity with GitHub OAuth
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                  <AlertCircle className="w-4 h-4 text-[hsl(185_90%_50%)] flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <span className="text-foreground">Requirement:</span>
                    <span className="text-muted-foreground"> Account must be at least 30 days old</span>
                  </div>
                </div>
                <Button
                  onClick={handleGithubConnect}
                  disabled={isLoading}
                  className="w-full font-mono glow-green"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Github className="w-4 h-4" />
                      Connect GitHub
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Wallet */}
          {currentStep === 1 && (
            <Card className="glass overflow-hidden">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 mx-auto mb-4 relative">
                  <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-xl" />
                  <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
                    <Wallet className="w-8 h-8 text-primary" />
                  </div>
                </div>
                <CardTitle className="font-mono">keplr connect --mocha</CardTitle>
                <CardDescription>
                  Link your Keplr wallet to receive the feegrant
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-sm text-primary font-mono">GitHub authenticated</span>
                  <span className="text-xs text-muted-foreground ml-auto">{session?.user?.name}</span>
                </div>

                {!isKeplrAvailable && (
                  <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <div className="text-sm text-yellow-600">
                      Keplr wallet not detected.{" "}
                      <a
                        href="https://www.keplr.app/download"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline font-medium"
                      >
                        Install Keplr
                      </a>
                    </div>
                  </div>
                )}

                {walletAddress && !user?.address && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                    <Wallet className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-mono text-muted-foreground">
                      {walletAddress.slice(0, 12)}...{walletAddress.slice(-8)}
                    </span>
                  </div>
                )}

                <Button
                  onClick={handleWalletConnect}
                  disabled={isLoading || !isKeplrAvailable}
                  className="w-full font-mono glow-green"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {bindAddressMutation.isPending ? "Binding address..." : "Connecting..."}
                    </>
                  ) : (
                    <>
                      <Wallet className="w-4 h-4" />
                      {walletAddress ? "Sign & Bind Address" : "Connect Keplr"}
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Feegrant */}
          {currentStep === 2 && (
            <Card className="glass overflow-hidden">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 mx-auto mb-4 relative">
                  <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-xl" />
                  <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
                    <Zap className="w-8 h-8 text-primary" />
                  </div>
                </div>
                <CardTitle className="font-mono">tx broadcast --feegrant</CardTitle>
                <CardDescription>
                  Receive your initial TIA dust and fee grant
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Completed steps */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-sm text-primary font-mono">GitHub authenticated</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-sm text-primary font-mono">Wallet connected</span>
                    <span className="text-xs text-muted-foreground ml-auto font-mono">
                      {user?.address?.bech32?.slice(0, 10)}...{user?.address?.bech32?.slice(-6)}
                    </span>
                  </div>
                </div>

                {/* What you'll receive */}
                <div className="terminal-box rounded-lg p-4">
                  <div className="text-xs font-mono space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Initial dust:</span>
                      <span className="text-primary">0.002 TIA</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fee allowance:</span>
                      <span className="text-primary">1 TIA</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Allowed messages:</span>
                      <span className="text-foreground">MsgSend, MsgPayForBlobs</span>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleFeegrant}
                  disabled={isLoading || dustMutation.isPending}
                  className="w-full font-mono glow-green"
                  size="lg"
                >
                  {isLoading || dustMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Broadcasting transactions...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Request Feegrant
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Success */}
          {currentStep === 3 && (
            <Card className="glass overflow-hidden relative">
              {/* Success glow effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />

              <CardHeader className="text-center pb-4 relative">
                <div className="w-16 h-16 mx-auto mb-4 relative">
                  <div className="absolute inset-0 rounded-2xl bg-primary/30 blur-xl" />
                  <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/30 flex items-center justify-center">
                    <Check className="w-8 h-8 text-primary" />
                  </div>
                </div>
                <CardTitle className="gradient-text font-mono">Feegrant Active</CardTitle>
                <CardDescription>
                  Your wallet is ready to submit blobs with zero fees
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 relative">
                {/* Grant Details */}
                <div className="terminal-box rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-primary/20">
                    <Terminal className="w-4 h-4 text-primary" />
                    <span className="font-mono text-xs text-muted-foreground">grant details</span>
                  </div>
                  <div className="space-y-2 font-mono text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">grantee</span>
                      <span className="text-foreground">
                        {user?.address?.bech32?.slice(0, 12)}...{user?.address?.bech32?.slice(-6)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">allowance</span>
                      <Badge className="bg-primary/20 text-primary border-primary/30">
                        1 TIA
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">status</span>
                      <Badge className="bg-primary/20 text-primary border-primary/30">
                        {user?.address?.isDusted && user?.address?.hasFeeGrant ? "Active" : "Pending"}
                      </Badge>
                    </div>
                    {feegrantResult?.dustTxHash && feegrantResult.dustTxHash !== "already-dusted" && feegrantResult.dustTxHash !== "already-complete" && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">dust_tx</span>
                        <a
                          href={`https://mocha.celenium.io/tx/${feegrantResult.dustTxHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[hsl(185_90%_50%)] hover:underline"
                        >
                          {feegrantResult.dustTxHash.slice(0, 10)}...
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                    {feegrantResult?.feegrantTxHash && feegrantResult.feegrantTxHash !== "existing_allowance" && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">feegrant_tx</span>
                        <a
                          href={`https://mocha.celenium.io/tx/${feegrantResult.feegrantTxHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[hsl(185_90%_50%)] hover:underline"
                        >
                          {feegrantResult.feegrantTxHash.slice(0, 10)}...
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <Button asChild size="lg" className="font-mono glow-green">
                    <Link href="/profile">
                      <Terminal className="w-4 h-4" />
                      View Your Profile
                    </Link>
                  </Button>
                  <Button variant="outline" asChild className="font-mono">
                    <a
                      href={`https://mocha.celenium.io/address/${user?.address?.bech32}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View on Explorer
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
