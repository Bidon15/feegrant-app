"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import AuthStepper from "~/components/auth-stepper";
import { Github, Wallet, Check, ExternalLink, Loader2, AlertCircle, Terminal, ChevronRight, FolderPlus } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { api } from "~/trpc/react";

// Suggested namespace patterns
const suggestedNamespacePatterns = [
  "myapp/production",
  "myapp/staging",
  "dev/experiments",
  "project/data",
];

export default function AuthPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [, setGithubConnected] = useState(false);
  const [, setWalletConnected] = useState(false);
  const [feegrantReceived, setFeegrantReceived] = useState(false);

  // State for demo flow
  const [walletAddress, setWalletAddress] = useState("");
  const [selectedNamespace, setSelectedNamespace] = useState("");
  const [customNamespace, setCustomNamespace] = useState("");
  const [feegrantDetails, setFeegrantDetails] = useState({
    allowance: "1 TIA",
    expiry: "No expiration",
    txHash: "",
  });

  // Fetch user's existing namespaces
  const { data: userNamespaces } = api.namespace.list.useQuery(undefined, {
    enabled: currentStep >= 2,
  });

  // Create namespace mutation
  const createNamespace = api.namespace.create.useMutation();

  const steps = ["GitHub", "Wallet", "Namespace", "Feegrant"];

  const handleGithubConnect = async () => {
    setIsLoading(true);
    // Simulate GitHub OAuth
    await new Promise((r) => setTimeout(r, 1500));
    setGithubConnected(true);
    setCurrentStep(1);
    setIsLoading(false);
  };

  const handleWalletConnect = async () => {
    setIsLoading(true);
    // Simulate Keplr connection
    await new Promise((r) => setTimeout(r, 1500));
    setWalletAddress("celestia1abc...xyz789");
    setWalletConnected(true);
    setCurrentStep(2);
    setIsLoading(false);
  };

  const handleNamespaceSelect = async () => {
    const namespaceName = customNamespace || selectedNamespace;
    if (!namespaceName) return;

    setIsLoading(true);

    try {
      // Create namespace if it's a new one
      const existingNs = userNamespaces?.find((ns) => ns.name === namespaceName);
      if (!existingNs && customNamespace) {
        await createNamespace.mutateAsync({
          name: customNamespace,
          description: `Namespace created during onboarding`,
        });
      }

      setCurrentStep(3);

      // Auto-trigger feegrant
      await handleFeegrant();
    } catch (error) {
      console.error("Failed to create namespace:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeegrant = async () => {
    setIsLoading(true);
    // Simulate dusting and feegrant
    await new Promise((r) => setTimeout(r, 2000));
    setFeegrantDetails({
      allowance: "1 TIA",
      expiry: "No expiration",
      txHash: "FEEGRANT_TX_" + Date.now().toString(36).toUpperCase(),
    });
    setFeegrantReceived(true);
    setCurrentStep(4);
    setIsLoading(false);
  };

  const finalNamespace = customNamespace || selectedNamespace;

  // Combine user's existing namespaces with suggested patterns
  const availableNamespaces = [
    ...(userNamespaces?.map((ns) => ns.name) ?? []),
    ...suggestedNamespacePatterns.filter(
      (pattern) => !userNamespaces?.some((ns) => ns.name === pattern)
    ),
  ].slice(0, 4);

  return (
    <div className="min-h-screen relative">
      {/* Subtle background pattern */}
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
                      Authenticating...
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
                </div>
                <Button
                  onClick={handleWalletConnect}
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
                      <Wallet className="w-4 h-4" />
                      Connect Keplr
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Namespace Selection */}
          {currentStep === 2 && (
            <Card className="glass overflow-hidden">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 mx-auto mb-4 relative">
                  <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-xl" />
                  <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
                    <FolderPlus className="w-8 h-8 text-primary" />
                  </div>
                </div>
                <CardTitle className="font-mono">namespace select</CardTitle>
                <CardDescription>
                  Choose your blob namespace for data submissions
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
                    <span className="text-xs text-muted-foreground ml-auto font-mono">{walletAddress}</span>
                  </div>
                </div>

                {/* Namespace input */}
                <div className="space-y-3">
                  <Label htmlFor="namespace" className="font-mono text-sm">
                    Create new namespace
                  </Label>
                  <Input
                    id="namespace"
                    placeholder="myapp/production"
                    value={customNamespace}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setCustomNamespace(e.target.value);
                      setSelectedNamespace("");
                    }}
                    className="font-mono bg-void border-border focus:border-primary"
                  />
                  <p className="text-xs text-muted-foreground">
                    Format: project/environment (e.g., myapp/production)
                  </p>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground font-mono">or select existing</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                {/* Suggested namespaces */}
                <div className="grid grid-cols-2 gap-2">
                  {availableNamespaces.map((ns) => (
                    <button
                      key={ns}
                      onClick={() => {
                        setSelectedNamespace(ns);
                        setCustomNamespace("");
                      }}
                      className={`p-3 rounded-lg border font-mono text-sm text-left transition-all ${
                        selectedNamespace === ns
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-muted/20 text-muted-foreground hover:border-primary/50 hover:bg-muted/30"
                      }`}
                    >
                      {ns}
                      {userNamespaces?.some((existing) => existing.name === ns) && (
                        <span className="ml-1 text-xs text-primary">(yours)</span>
                      )}
                    </button>
                  ))}
                </div>

                <Button
                  onClick={handleNamespaceSelect}
                  disabled={isLoading || (!selectedNamespace && !customNamespace)}
                  className="w-full font-mono glow-green"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating namespace...
                    </>
                  ) : (
                    <>
                      <FolderPlus className="w-4 h-4" />
                      Continue
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Processing Feegrant */}
          {currentStep === 3 && !feegrantReceived && (
            <Card className="glass overflow-hidden">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 mx-auto mb-4 relative">
                  <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-xl animate-pulse" />
                  <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  </div>
                </div>
                <CardTitle className="font-mono">tx broadcast --feegrant</CardTitle>
                <CardDescription>
                  Creating your feegrant on Celestia Mocha...
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <Check className="w-4 h-4 text-primary" />
                    <span className="text-sm font-mono text-primary">GitHub verified</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <Check className="w-4 h-4 text-primary" />
                    <span className="text-sm font-mono text-primary">Wallet connected</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <Check className="w-4 h-4 text-primary" />
                    <span className="text-sm font-mono text-primary">Namespace: {finalNamespace}</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-[hsl(185_90%_50%)]/5 border border-[hsl(185_90%_50%)]/20">
                    <Loader2 className="w-4 h-4 text-[hsl(185_90%_50%)] animate-spin" />
                    <span className="text-sm font-mono text-[hsl(185_90%_50%)]">Broadcasting transaction...</span>
                  </div>
                </div>

                {/* Terminal-style progress */}
                <div className="mt-4 terminal-box rounded-lg p-4">
                  <div className="text-xs font-mono space-y-1">
                    <div className="text-muted-foreground">$ celestia tx feegrant grant \</div>
                    <div className="text-muted-foreground pl-4">--granter blobcell \</div>
                    <div className="text-muted-foreground pl-4">--grantee {walletAddress || "..."} \</div>
                    <div className="text-muted-foreground pl-4">--namespace {finalNamespace} \</div>
                    <div className="text-primary pl-4 animate-pulse">--spend-limit 1000000utia</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 5: Success */}
          {feegrantReceived && (
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
                {/* Feegrant Details - Terminal style */}
                <div className="terminal-box rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-primary/20">
                    <Terminal className="w-4 h-4 text-primary" />
                    <span className="font-mono text-xs text-muted-foreground">grant details</span>
                  </div>
                  <div className="space-y-2 font-mono text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">grantee</span>
                      <span className="text-foreground">{walletAddress}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">namespace</span>
                      <Badge className="bg-[hsl(185_90%_50%)]/20 text-[hsl(185_90%_50%)] border-[hsl(185_90%_50%)]/30">
                        {finalNamespace}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">allowance</span>
                      <Badge className="bg-primary/20 text-primary border-primary/30 hover:bg-primary/30">
                        {feegrantDetails.allowance}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">expires</span>
                      <span className="text-foreground">{feegrantDetails.expiry}</span>
                    </div>
                    {feegrantDetails.txHash && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">tx_hash</span>
                        <a
                          href={`https://mocha.celenium.io/tx/${feegrantDetails.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[hsl(185_90%_50%)] hover:underline"
                        >
                          {feegrantDetails.txHash.slice(0, 12)}...
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
                      href="https://mocha.celenium.io"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open Explorer
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
