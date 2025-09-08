"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export function GitHubSignInButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn("github", { callbackUrl: "/" });
    } catch (error) {
      setIsLoading(false);
      console.error("Sign-in error:", error);
    }
  };

  return (
    <button
      onClick={handleSignIn}
      disabled={isLoading}
      className="inline-block px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? (
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span>Signing in...</span>
        </div>
      ) : (
        "Sign in with GitHub"
      )}
    </button>
  );
}
