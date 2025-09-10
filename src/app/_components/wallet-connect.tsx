"use client";

import { useState } from "react";
import { useModal, useAccount, useWallet, useCreateWallet, useClient } from "@getpara/react-sdk";
import { api } from "~/trpc/react";
import { useCelestiaAddress } from "~/lib/celestia-client";
import { ParaProtoSigner } from "@getpara/cosmjs-v0-integration";

export function WalletConnect() {
  const { openModal } = useModal();
  const { data: wallet } = useWallet();
  const { isConnected } = useAccount();
  const { createWalletAsync, isPending: isCreatingWallet } = useCreateWallet();
  const [isBinding, setIsBinding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const para = useClient();
  const utils = api.useUtils();
  const { data: user } = api.user.me.useQuery();
  const { data: nonce } = api.user.getNonce.useQuery();
  
  // Get Celestia address using the hook
  const celestiaAddress = useCelestiaAddress();
  
  // Check Para connection state
  const hasParaAccount = para && isConnected;
  const hasWallet = wallet && celestiaAddress;
  const needsWalletConnection = hasParaAccount && !hasWallet;

  const bindAddressMutation = api.user.bindAddress.useMutation({
    onSuccess: () => {
      utils.user.me.invalidate();
      setError(null);
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  const handleCreateWallet = async () => {
    try {
      setError(null);
      
      // First, ensure Para connection is established
      if (!isConnected) {
        console.log("Opening Para modal to establish connection...");
        openModal();
        return;
      }
      
      // If connected but no Para client, wait a moment and retry
      if (!para) {
        setError("Para client not available. Please try again.");
        return;
      }

      console.log("Creating COSMOS wallet...");
      await createWalletAsync({
        type: "COSMOS",
      });
      
      console.log("COSMOS wallet created successfully");
      
    } catch (err) {
      console.error("Failed to create Celestia wallet:", err);
      setError("Failed to create Celestia wallet. Please try again.");
    }
  };

  const handleConnectWallet = () => {
    // Open Para modal to connect/authenticate existing wallet
    openModal();
  };

  const handleSignOutPara = async () => {
    // Sign out from Para wallet while keeping GitHub session
    try {
      // Clear all Para-related data from localStorage and sessionStorage
      const keysToRemove = [];
      
      // Check localStorage for Para keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('para') || key.includes('Para') || key.includes('PARA') || 
                   key.includes('wallet') || key.includes('capsule'))) {
          keysToRemove.push(key);
        }
      }
      
      // Remove Para keys from localStorage
      keysToRemove.forEach(key => {
        console.log('Removing localStorage key:', key);
        localStorage.removeItem(key);
      });
      
      // Clear sessionStorage as well
      const sessionKeysToRemove = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (key.includes('para') || key.includes('Para') || key.includes('PARA') || 
                   key.includes('wallet') || key.includes('capsule'))) {
          sessionKeysToRemove.push(key);
        }
      }
      
      sessionKeysToRemove.forEach(key => {
        console.log('Removing sessionStorage key:', key);
        sessionStorage.removeItem(key);
      });
      
      console.log('Cleared Para session data, reloading page...');
      
      // Reload the page to reset Para state
      window.location.reload();
      
    } catch (error) {
      console.error("Failed to sign out from Para:", error);
      // Fallback: clear all storage and reload
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    }
  };

  const handleBindAddress = async () => {
    if (!isConnected || !celestiaAddress || !nonce || !para) {
      setError("Wallet not connected or Celestia address not available");
      return;
    }

    setIsBinding(true);
    setError(null);

    try {
      console.log("Starting address binding process...");
      console.log("Celestia address:", celestiaAddress);
      console.log("Nonce:", nonce.nonce);
      
      // Check if we have the current wallet
      if (!wallet?.id) {
        throw new Error("No wallet ID available");
      }
      
      console.log("Using wallet ID:", wallet.id);
      
      // Get the COSMOS wallets to verify we're using the right one
      const cosmosWallets = para.getWalletsByType("COSMOS");
      console.log("Available COSMOS wallets:", cosmosWallets);
      
      if (cosmosWallets.length === 0) {
        throw new Error("No COSMOS wallets found");
      }
      
      // Verify the wallet ID matches
      const targetWallet = cosmosWallets.find(w => w.id === wallet.id);
      if (!targetWallet) {
        throw new Error(`Wallet ID ${wallet.id} not found in COSMOS wallets`);
      }
      
      console.log("Target wallet:", targetWallet);
      
      // Use ParaProtoSigner to create a proper cryptographic signature
      const signer = new ParaProtoSigner(para, "celestia");
      const accounts = await signer.getAccounts();
      
      if (accounts.length === 0) {
        throw new Error("No accounts available");
      }

      console.log("Account address:", accounts[0]!.address);
      console.log("Preparing to sign nonce message...");

      // Create the sign doc for the nonce message
      const signDoc = {
        bodyBytes: new Uint8Array(Buffer.from(nonce.nonce, 'utf-8')),
        authInfoBytes: new Uint8Array(),
        chainId: "mocha-4",
        accountNumber: BigInt(0),
      };

      console.log("Sign doc:", signDoc);
      console.log("About to call signDirect with address:", accounts[0]!.address);

      // Sign the message
      const signResponse = await signer.signDirect(accounts[0]!.address, signDoc);
      console.log("Sign response received:", signResponse);
      
      console.log("Signing completed, preparing data for backend...");
      
      // Convert signature and public key to hex format as expected by backend
      console.log("Raw signature from Para:", signResponse.signature.signature);
      console.log("Signature type:", typeof signResponse.signature.signature);
      console.log("Is signature Uint8Array?", (signResponse.signature.signature as any) instanceof Uint8Array);
      
      // Handle different signature formats from Para SDK
      let signatureBytes;
      if ((signResponse.signature.signature as any) instanceof Uint8Array) {
        signatureBytes = signResponse.signature.signature;
      } else if (typeof signResponse.signature.signature === 'string') {
        // If it's a base64 string, decode it first
        signatureBytes = Buffer.from(signResponse.signature.signature, 'base64');
      } else {
        signatureBytes = Buffer.from(signResponse.signature.signature);
      }
      
      const signatureHex = Buffer.from(signatureBytes).toString('hex');
      const publicKeyHex = Buffer.from(accounts[0]!.pubkey).toString('hex');
      
      console.log("Signature bytes length:", signatureBytes.length);
      console.log("Signature (hex):", signatureHex);
      console.log("Public key (hex):", publicKeyHex);
      
      const mutationInput = {
        address: celestiaAddress,
        signedNonce: signatureHex,
        publicKey: publicKeyHex,
      };
      
      console.log("Mutation input:", mutationInput);
      console.log("Input validation:");
      console.log("- address:", typeof celestiaAddress, celestiaAddress?.length);
      console.log("- signedNonce:", typeof signatureHex, signatureHex?.length);
      console.log("- publicKey:", typeof publicKeyHex, publicKeyHex?.length);
      
      await bindAddressMutation.mutateAsync(mutationInput);

      console.log("Backend call completed successfully");
      setIsBinding(false);
    } catch (err) {
      console.error("Binding error:", err);
      setError(`Failed to bind address: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsBinding(false);
    }
  };

  // If user already has bound address, show status
  if (user?.address) {
    return (
      <div className="rounded-lg bg-green-50 p-4 border border-green-200">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-green-800">
              Wallet Connected & Bound
            </h3>
            <div className="mt-2 text-sm text-green-700">
              <p>Address: {user.address.bech32}</p>
              <p>Dusted: {user.address.isDusted ? "Yes" : "No"}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-blue-50 p-4 border border-blue-200">
        <h3 className="text-lg font-medium text-blue-900 mb-2">
          Connect Para Wallet
        </h3>
        <p className="text-sm text-blue-700 mb-4">
          Connect your Para wallet and bind it to your GitHub account to submit blobs to Celestia.
        </p>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        <div className="space-y-3">
          {!hasWallet ? (
            <button
              onClick={handleCreateWallet}
              disabled={isCreatingWallet}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
            >
              {isCreatingWallet ? "Creating..." : "Create Celestia Wallet"}
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-white rounded-md border">
                <div>
                  <p className="text-sm font-medium text-gray-900">Wallet Connected</p>
                  <p className="text-xs text-gray-500">
                    {celestiaAddress ? 
                      `${celestiaAddress.slice(0, 12)}...${celestiaAddress.slice(-8)}` : 
                      'Loading Celestia address...'
                    }
                  </p>
                </div>
                <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              
              <button
                onClick={handleBindAddress}
                disabled={isBinding || bindAddressMutation.isPending}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                {isBinding || bindAddressMutation.isPending ? "Binding Address..." : "Bind Address to Account"}
              </button>
            </div>
          )}
        </div>

        {/* Para Sign Out Button - only show when Para is connected */}
        {isConnected && (
          <div className="mt-4 pt-4 border-t border-blue-200">
            <button
              onClick={handleSignOutPara}
              className="w-full flex justify-center py-2 px-4 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Sign Out from Para Wallet
            </button>
            <p className="mt-2 text-xs text-gray-500 text-center">
              This will disconnect your Para wallet but keep your GitHub session active.
            </p>
          </div>
        )}

        <div className="mt-4 text-xs text-blue-600">
          <p>• Para wallet extension is required for connecting existing wallets</p>
          <p>• Create Celestia Wallet generates a new Cosmos-compatible address</p>
          <p>• Your address will be bound to your GitHub account</p>
          <p>• You can submit up to 3 blobs per day</p>
        </div>
      </div>
    </div>
  );
}
