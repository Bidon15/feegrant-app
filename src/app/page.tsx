import Link from "next/link";
import { Button } from "~/components/ui/button";
import HeroBlob from "~/components/hero-blob";
import FeatureCard from "~/components/feature-card";
import StepCard from "~/components/step-card";
import { Github, Wallet, Zap, Terminal, Code2, Cpu } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 min-h-[85vh] flex items-center overflow-hidden">
        {/* Background network visualization */}
        <HeroBlob />

        {/* Dark gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/40 z-[1]" />

        <div className="container mx-auto relative z-10">
          <div className="max-w-2xl">
            {/* Terminal-style label */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 mb-6">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="font-mono text-xs text-primary">celestia testnet active</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              <span className="gradient-text">Zero-fee blob submission</span>
              <br />
              <span className="text-foreground">for developers</span>
            </h1>

            <p className="text-lg text-muted-foreground mb-4 font-mono">
              <span className="text-primary">$</span> We cover your transaction fees.
            </p>
            <p className="text-muted-foreground mb-8">
              Get 10 TIA free to start building on Celestia&apos;s data availability layer.
              No strings attached.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg" className="font-mono glow-green">
                <Link href="/auth">
                  <Terminal className="w-4 h-4" />
                  ./init --feegrant
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="font-mono">
                <Link href="/get-started">
                  <Code2 className="w-4 h-4" />
                  cat README.md
                </Link>
              </Button>
            </div>

            {/* Stats bar */}
            <div className="mt-12 pt-8 border-t border-border/50 grid grid-cols-3 gap-6">
              <div>
                <div className="font-mono text-2xl font-bold text-primary">10 TIA</div>
                <div className="text-sm text-muted-foreground">free allowance</div>
              </div>
              <div>
                <div className="font-mono text-2xl font-bold text-foreground">30 days</div>
                <div className="text-sm text-muted-foreground">grant duration</div>
              </div>
              <div>
                <div className="font-mono text-2xl font-bold text-[hsl(185_90%_50%)]">mocha-4</div>
                <div className="text-sm text-muted-foreground">testnet</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-24 px-4 relative">
        {/* Section background accent */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-secondary/20 to-transparent" />

        <div className="container mx-auto relative">
          <div className="text-center mb-16">
            <div className="font-mono text-sm text-primary mb-4">{"// workflow"}</div>
            <h2 className="text-3xl md:text-4xl font-bold">
              Three steps to <span className="gradient-text">zero fees</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <StepCard
              number={1}
              icon={Github}
              title="Connect GitHub"
              description="Authenticate with your GitHub account (30+ days old)"
            />
            <StepCard
              number={2}
              icon={Wallet}
              title="Link Keplr"
              description="Connect your Keplr wallet to Celestia Mocha"
            />
            <StepCard
              number={3}
              icon={Zap}
              title="Submit Blobs"
              description="Start submitting data with covered fees"
            />
          </div>

          {/* Connection lines (desktop only) */}
          <div className="hidden md:block absolute top-1/2 left-1/2 -translate-x-1/2 w-[60%] max-w-2xl">
            <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <div className="font-mono text-sm text-primary mb-4">{"// features"}</div>
            <h2 className="text-3xl md:text-4xl font-bold">
              Built for <span className="gradient-text">developers</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <FeatureCard
              icon={Cpu}
              title="Feegrant Protocol"
              description="Native Cosmos SDK feegrant module handles all transaction fees automatically."
            />
            <FeatureCard
              icon={Code2}
              title="Copy-Paste Ready"
              description="Get code snippets in TypeScript, Go, and CLI commands to start immediately."
            />
            <FeatureCard
              icon={Terminal}
              title="10 TIA Allowance"
              description="Enough for thousands of blob submissions. Focus on building, not funding."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4">
        <div className="container mx-auto">
          <div className="glass rounded-2xl p-8 md:p-12 max-w-3xl mx-auto relative overflow-hidden">
            {/* Background glow effect */}
            <div className="absolute -right-20 -top-20 w-60 h-60 bg-primary/20 rounded-full blur-3xl" />
            <div className="absolute -left-20 -bottom-20 w-40 h-40 bg-[hsl(185_90%_50%)]/20 rounded-full blur-3xl" />

            <div className="relative text-center">
              <div className="font-mono text-sm text-primary mb-4">{"// ready?"}</div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Start submitting blobs
              </h2>
              <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
                Join the network of developers building on Celestia&apos;s modular data availability layer.
              </p>

              {/* Terminal-style command preview */}
              <div className="terminal-box rounded-lg p-4 mb-8 text-left max-w-md mx-auto">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-3 h-3 rounded-full bg-[hsl(0_70%_50%)]" />
                  <span className="w-3 h-3 rounded-full bg-[hsl(45_100%_55%)]" />
                  <span className="w-3 h-3 rounded-full bg-primary" />
                </div>
                <code className="text-primary">
                  <span className="text-muted-foreground">$</span> celestia blob submit 0x... --feegrant
                </code>
              </div>

              <Button asChild size="lg" className="font-mono glow-green">
                <Link href="/auth">
                  <Terminal className="w-4 h-4" />
                  Get Started
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-primary" />
            <span className="font-mono text-sm text-muted-foreground">
              blobcell <span className="text-primary">v1.0.0</span>
            </span>
          </div>
          <div className="flex gap-6">
            <a
              href="https://celestia.org"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              celestia.org
            </a>
            <a
              href="https://mocha-4.celenium.io"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              explorer
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
