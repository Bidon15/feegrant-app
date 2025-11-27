"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import AuthStepper from "~/components/auth-stepper";
import { Github, Wallet, Check, ExternalLink, Loader2, AlertCircle } from "lucide-react";
import { Badge } from "~/components/ui/badge";

export default function AuthPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [, setGithubConnected] = useState(false);
  const [, setWalletConnected] = useState(false);
  const [feegrantReceived, setFeegrantReceived] = useState(false);

  // Mock data for demo
  const [walletAddress, setWalletAddress] = useState("");
  const [feegrantDetails] = useState({
    allowance: "10 TIA",
    expiry: "30 days",
    txHash: "ABC123DEF456789",
  });

  const steps = ["GitHub", "Wallet", "Feegrant"];

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

    // Auto-trigger dusting + feegrant
    await handleFeegrant();
  };

  const handleFeegrant = async () => {
    setIsLoading(true);
    // Simulate dusting and feegrant
    await new Promise((r) => setTimeout(r, 2000));
    setFeegrantReceived(true);
    setCurrentStep(3);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-lg">
          {/* Stepper */}
          <div className="mb-8">
            <AuthStepper currentStep={currentStep} steps={steps} />
          </div>

          {/* Step 1: GitHub */}
          {currentStep === 0 && (
            <Card className="glass">
              <CardHeader className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Github className="w-8 h-8 text-primary" />
                </div>
                <CardTitle>Connect GitHub</CardTitle>
                <CardDescription>
                  Sign in with your GitHub account to verify your developer status
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>Account must be at least 30 days old</span>
                </div>
                <Button
                  onClick={handleGithubConnect}
                  disabled={isLoading}
                  className="w-full"
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
                      Continue with GitHub
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Wallet */}
          {currentStep === 1 && (
            <Card className="glass">
              <CardHeader className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Wallet className="w-8 h-8 text-primary" />
                </div>
                <CardTitle>Connect Keplr Wallet</CardTitle>
                <CardDescription>
                  Link your Keplr wallet to receive your feegrant
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 text-sm text-green-400">
                  <Check className="w-4 h-4 flex-shrink-0" />
                  <span>GitHub connected successfully</span>
                </div>
                <Button
                  onClick={handleWalletConnect}
                  disabled={isLoading}
                  className="w-full"
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
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Processing Feegrant */}
          {currentStep === 2 && !feegrantReceived && (
            <Card className="glass">
              <CardHeader className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
                <CardTitle>Setting Up Your Account</CardTitle>
                <CardDescription>
                  Dusting your wallet and creating feegrant...
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm">
                    <Check className="w-4 h-4 text-green-400" />
                    <span>GitHub verified</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm">
                    <Check className="w-4 h-4 text-green-400" />
                    <span>Wallet connected</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 text-sm text-primary">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating feegrant...</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Success */}
          {feegrantReceived && (
            <Card className="glass glow-purple">
              <CardHeader className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-400" />
                </div>
                <CardTitle>You&apos;re All Set!</CardTitle>
                <CardDescription>
                  Your feegrant is active. Start submitting blobs now.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Feegrant Details */}
                <div className="space-y-3 p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Wallet</span>
                    <span className="font-mono text-sm">{walletAddress}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Allowance</span>
                    <Badge variant="default">{feegrantDetails.allowance}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Expires In</span>
                    <span className="text-sm">{feegrantDetails.expiry}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Grant Tx</span>
                    <a
                      href={`https://mocha.celenium.io/tx/${feegrantDetails.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      {feegrantDetails.txHash.slice(0, 8)}...
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Button asChild size="lg">
                    <Link href="/get-started">View Code Snippets</Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <a
                      href="https://mocha.celenium.io"
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
