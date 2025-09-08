"use client";

import { useModal, useAccount, useWallet } from "@getpara/react-sdk";
import { api } from "~/trpc/react";
import { useState } from "react";

export function ParaConnect() {
  const { openModal } = useModal();
  const { data: wallet } = useWallet();
  const { isConnected } = useAccount();
  const [isBinding, setIsBinding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: user } = api.user.me.useQuery();
  const { data: nonce } = api.user.getNonce.useQuery();
  const utils = api.useUtils();

  const bindAddressMutation = api.user.bindAddress.useMutation({
    onSuccess: () => {
      utils.user.me.invalidate();
      setError(null);
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  const handleBindAddress = async () => {
    if (!wallet?.address || !nonce) {
      setError("Wallet not connected or nonce not available");
      return;
    }

    setIsBinding(true);
    setError(null);

    try {
      // In a real implementation, you would use Para SDK's sign message functionality
      // For now, we'll use placeholder values
      const mockSignature = "mock-signature-from-para-wallet";
      const mockPublicKey = "mock-public-key-from-para-wallet";

      await bindAddressMutation.mutateAsync({
        address: wallet.address,
        signedNonce: mockSignature,
        publicKey: mockPublicKey,
      });
    } catch (err) {
      setError("Failed to bind address");
    } finally {
      setIsBinding(false);
    }
  };

  const hasAddress = user?.address !== null;

  if (hasAddress && user?.address) {
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
              Para Wallet Connected
            </h3>
            <div className="mt-2 text-sm text-green-700">
              <p>Address: {user.address.bech32}</p>
              <p>Dusted: {user.address.isDusted ? "Yes" : "No"}</p>
              <p>Authz Granted: {user.address.hasAuthzGranted ? "Yes" : "No"}</p>
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
          Connect your Para wallet to submit blobs to Celestia Mocha testnet.
        </p>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        <div className="space-y-3">
          {!isConnected ? (
            <button
              onClick={() => openModal()}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Connect Para Wallet
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-blue-100 rounded-md">
                <span className="text-sm text-blue-800">
                  Connected: {wallet?.address?.slice(0, 6)}...{wallet?.address?.slice(-4)}
                </span>
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

        <div className="mt-4 text-xs text-blue-600">
          <p>• Para wallet extension is required</p>
          <p>• Your address will be bound to your GitHub account</p>
          <p>• You can submit up to 3 blobs per day</p>
        </div>
      </div>
    </div>
  );
}
