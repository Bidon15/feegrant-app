"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Button } from "~/components/ui/button";
import { Terminal, Menu, X, ChevronRight, User, LogOut } from "lucide-react";
import { useState } from "react";

const Navigation = () => {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: session } = useSession();

  const navLinks = [
    { href: "/", label: "home" },
    { href: "/get-started", label: "docs" },
    { href: "/htop", label: "htop" },
    { href: "/profile", label: "profile" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-strong">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo - Terminal style */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative">
              <Terminal className="w-7 h-7 text-primary group-hover:text-accent transition-colors" />
              <div className="absolute inset-0 blur-md bg-primary/30 group-hover:bg-accent/30 transition-colors" />
            </div>
            <span className="font-mono font-bold text-lg tracking-tight">
              <span className="text-primary">blob</span>
              <span className="text-muted-foreground">cell</span>
            </span>
            <span className="text-primary/60 font-mono text-sm hidden sm:inline">_</span>
          </Link>

          {/* Desktop Nav - Terminal style */}
          <div className="hidden md:flex items-center gap-1">
            <span className="text-muted-foreground font-mono text-sm mr-2">$</span>
            {navLinks.map((link, index) => (
              <div key={link.href} className="flex items-center">
                <Link
                  href={link.href}
                  className={`font-mono text-sm px-3 py-1.5 rounded transition-all flex items-center gap-1.5 ${
                    pathname === link.href
                      ? "text-primary bg-primary/10 text-glow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  {link.label === "profile" && <User className="w-3.5 h-3.5" />}
                  {link.label}
                </Link>
                {index < navLinks.length - 1 && (
                  <span className="text-border mx-1">|</span>
                )}
              </div>
            ))}
            <div className="ml-4 pl-4 border-l border-border">
              {session ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="font-mono"
                  onClick={() => void signOut({ callbackUrl: "/", redirect: true })}
                >
                  <LogOut className="w-4 h-4 mr-1" />
                  exit
                </Button>
              ) : (
                <Button asChild size="sm" className="font-mono glow-green">
                  <Link href="/auth">
                    <ChevronRight className="w-4 h-4" />
                    init
                  </Link>
                </Button>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <div className="font-mono text-sm text-muted-foreground mb-3">
              $ ls ./pages
            </div>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 py-2 px-3 font-mono text-sm transition-all rounded ${
                  pathname === link.href
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label === "profile" ? <User className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                {link.label}
              </Link>
            ))}
            <div className="mt-4 pt-4 border-t border-border">
              {session ? (
                <Button
                  variant="outline"
                  className="w-full font-mono"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    void signOut({ callbackUrl: "/" });
                  }}
                >
                  <LogOut className="w-4 h-4" />
                  exit
                </Button>
              ) : (
                <Button asChild className="w-full font-mono glow-green">
                  <Link href="/auth" onClick={() => setMobileMenuOpen(false)}>
                    <Terminal className="w-4 h-4" />
                    ./init --start
                  </Link>
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
