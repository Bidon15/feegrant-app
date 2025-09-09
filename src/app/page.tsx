import Link from "next/link";

import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";
import { WalletConnect } from "~/app/_components/wallet-connect";
import { WalletSetup } from "~/app/_components/wallet-setup";
import { BlobSubmit } from "~/app/_components/blob-submit";
import { BlobHistory } from "~/app/_components/blob-history";
import { GitHubSignInButton } from "~/app/_components/github-signin-popup";
import { ParaWalletStatus } from "~/app/_components/para-wallet-status";

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    void api.user.me.prefetch();
  }

  return (
    <HydrateClient>
      <main className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-blue-600 to-purple-700 text-white">
          <div className="container mx-auto px-4 py-16">
            <div className="text-center">
              <h1 className="text-4xl font-bold mb-4">
                Celestia Blob Demo
              </h1>
              <p className="text-xl text-blue-100 mb-8">
                Submit data blobs to Celestia Mocha testnet using Para wallet
              </p>
              
              <div className="flex flex-col items-center gap-4">
                {session ? (
                  <div className="flex items-center justify-between w-full max-w-4xl">
                    <div className="flex items-center gap-4">
                      <span className="text-lg">Welcome, {session.user?.name}!</span>
                      <Link
                        href="/api/auth/signout"
                        className="px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition"
                      >
                        Sign out
                      </Link>
                    </div>
                    <ParaWalletStatus />
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="mb-4 text-blue-100">
                      Connect with GitHub to get started (account must be ≥30 days old)
                    </p>
                    <GitHubSignInButton />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {session?.user ? (
            <div className="max-w-4xl mx-auto space-y-8">
              {/* Para Wallet Connection */}
              <WalletConnect />
              
              {/* Wallet Setup (Dusting & Authz) */}
              <WalletSetup />
              
              {/* Blob Submission */}
              <BlobSubmit />
              
              {/* Blob History */}
              <BlobHistory />
            </div>
          ) : (
            <div className="max-w-2xl mx-auto text-center py-16">
              <div className="bg-white rounded-lg shadow-sm p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  How it works
                </h2>
                <div className="space-y-4 text-left">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                      1
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Connect GitHub</h3>
                      <p className="text-gray-600">Sign in with your GitHub account (must be ≥30 days old)</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                      2
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Connect Para Wallet</h3>
                      <p className="text-gray-600">Install and connect your Para wallet extension</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                      3
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Get Setup</h3>
                      <p className="text-gray-600">Receive initial TIA tokens and grant authorization</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                      4
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Submit Blobs</h3>
                      <p className="text-gray-600">Upload data blobs (up to 2MB, 3 per day) to Celestia</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-8 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Technical Details</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Uses Celestia Mocha testnet</li>
                    <li>• Backend pays fees via Authz delegation</li>
                    <li>• Namespaces follow ADR-015 format</li>
                    <li>• Built with Next.js, tRPC, and Prisma</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </HydrateClient>
  );
}
