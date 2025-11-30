"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Dynamic import with SSR disabled to prevent prerendering issues with useSession
const AuthContent = dynamic(() => import("./auth-content"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
        <p className="font-mono text-muted-foreground">Loading...</p>
      </div>
    </div>
  ),
});

export default function AuthPage() {
  return <AuthContent />;
}
