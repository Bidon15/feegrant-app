import Link from "next/link";
import { Button } from "~/components/ui/button";
import HeroBlob from "~/components/hero-blob";
import FeatureCard from "~/components/feature-card";
import StepCard from "~/components/step-card";
import { Github, Wallet, Zap, Coffee, Code, Gift } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 min-h-[80vh] flex items-center overflow-hidden">
        {/* Background spore visualization */}
        <HeroBlob />

        {/* Dark gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent z-[1]" />

        <div className="container mx-auto relative z-10">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              <span className="text-primary">We cover the fees.</span>
              <br />
              Submit blobs to Celestia
            </h1>
            <p className="text-xl text-foreground/80 mb-8">
              Get 10 TIA free to start — on us
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg" className="glow-purple">
                <Link href="/auth">Get Started</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/get-started">View Docs</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 px-4 bg-secondary/30">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">How it Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <StepCard
              number={1}
              icon={Github}
              title="Connect GitHub"
              description="Sign in with your GitHub account (30+ days old)"
            />
            <StepCard
              number={2}
              icon={Wallet}
              title="Link Keplr Wallet"
              description="Connect your Keplr wallet to receive funds"
            />
            <StepCard
              number={3}
              icon={Zap}
              title="Start Submitting"
              description="Submit blobs with fees covered by us"
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Why BlobCell?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <FeatureCard
              icon={Gift}
              title="Free Fees via Feegrant"
              description="We cover your transaction fees so you can focus on building, not paying gas."
            />
            <FeatureCard
              icon={Code}
              title="Developer Friendly"
              description="Simple API and code snippets to get you submitting blobs in minutes."
            />
            <FeatureCard
              icon={Coffee}
              title="10 TIA Free"
              description="We give you 10 TIA to start — worth about a cup of coffee."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <div className="glass rounded-2xl p-12 max-w-2xl mx-auto glow-purple">
            <h2 className="text-3xl font-bold mb-4">Ready to submit your first blob?</h2>
            <p className="text-muted-foreground mb-8">
              Join developers who are building on Celestia with zero gas fees.
            </p>
            <Button asChild size="lg">
              <Link href="/auth">Start Now</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © 2024 BlobCell. Built for developers.
          </p>
          <div className="flex gap-6">
            <a href="https://celestia.org" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Celestia
            </a>
            <a href="https://celenium.io" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Celenium Explorer
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
