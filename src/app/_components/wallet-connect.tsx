"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "~/trpc/react";
import type { Window as KeplrWindow } from "@keplr-wallet/types";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Window extends KeplrWindow {}
}

const CELESTIA_MOCHA_CHAIN_ID = "mocha-4";

const celestiaMochaConfig = {
  chainId: CELESTIA_MOCHA_CHAIN_ID,
  chainName: "Celestia Mocha Testnet",
  rpc: "https://rpc-mocha.pops.one",
  rest: "https://api-mocha.pops.one",
  bip44: {
    coinType: 118,
  },
  bech32Config: {
    bech32PrefixAccAddr: "celestia",
    bech32PrefixAccPub: "celestiapub",
    bech32PrefixValAddr: "celestiavaloper",
    bech32PrefixValPub: "celestiavaloperpub",
    bech32PrefixConsAddr: "celestiavalcons",
    bech32PrefixConsPub: "celestiavalconspub",
  },
  currencies: [
    {
      coinDenom: "TIA",
      coinMinimalDenom: "utia",
      coinDecimals: 6,
    },
  ],
  feeCurrencies: [
    {
      coinDenom: "TIA",
      coinMinimalDenom: "utia",
      coinDecimals: 6,
      gasPriceStep: {
        low: 0.01,
        average: 0.02,
        high: 0.1,
      },
    },
  ],
  stakeCurrency: {
    coinDenom: "TIA",
    coinMinimalDenom: "utia",
    coinDecimals: 6,
  },
};

export function WalletConnect() {
  const [isKeplrAvailable, setIsKeplrAvailable] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [celestiaAddress, setCelestiaAddress] = useState<string | null>(null);
  const [isBinding, setIsBinding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const utils = api.useUtils();
  const { data: user } = api.user.me.useQuery();
  const { data: nonce } = api.user.getNonce.useQuery();

  const bindAddressMutation = api.user.bindAddress.useMutation({
    onSuccess: () => {
      void utils.user.me.invalidate();
      setError(null);
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  // Check if Keplr is available
  useEffect(() => {
    const checkKeplr = () => {
      if (window.keplr) {
        setIsKeplrAvailable(true);
      }
    };

    // Check immediately
    checkKeplr();

    // Also check after a delay (Keplr may inject after page load)
    const timer = setTimeout(checkKeplr, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Check for existing Keplr connection on mount
  useEffect(() => {
    const checkExistingConnection = async () => {
      if (!window.keplr) return;

      try {
        // Try to get the key without enabling - this will fail if not already connected
        const key = await window.keplr.getKey(CELESTIA_MOCHA_CHAIN_ID);
        if (key?.bech32Address) {
          setCelestiaAddress(key.bech32Address);
        }
      } catch {
        // Not connected yet, that's fine
      }
    };

    if (isKeplrAvailable) {
      void checkExistingConnection();
    }
  }, [isKeplrAvailable]);

  const handleConnectKeplr = useCallback(async () => {
    if (!window.keplr) {
      setError("Keplr wallet not found. Please install the Keplr extension.");
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Suggest the Celestia Mocha chain to Keplr
      await window.keplr.experimentalSuggestChain(celestiaMochaConfig);

      // Enable the chain
      await window.keplr.enable(CELESTIA_MOCHA_CHAIN_ID);

      // Get the address
      const key = await window.keplr.getKey(CELESTIA_MOCHA_CHAIN_ID);
      setCelestiaAddress(key.bech32Address);
    } catch (err) {
      console.error("Failed to connect Keplr:", err);
      setError("Failed to connect Keplr wallet. Please try again.");
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const handleDisconnectKeplr = useCallback(() => {
    setCelestiaAddress(null);
    setError(null);
  }, []);

  const handleBindAddress = useCallback(async () => {
    if (!celestiaAddress || !nonce || !window.keplr) {
      setError("Wallet not connected or nonce not available");
      return;
    }

    setIsBinding(true);
    setError(null);

    try {
      // Sign the nonce message with Keplr using signArbitrary (ADR-036)
      const signResponse = await window.keplr.signArbitrary(
        CELESTIA_MOCHA_CHAIN_ID,
        celestiaAddress,
        nonce.nonce
      );

      // Convert base64 signature to hex
      const signatureHex = Buffer.from(signResponse.signature, "base64").toString("hex");
      const publicKeyHex = Buffer.from(signResponse.pub_key.value, "base64").toString("hex");

      await bindAddressMutation.mutateAsync({
        address: celestiaAddress,
        signedNonce: signatureHex,
        publicKey: publicKeyHex,
      });

      setIsBinding(false);
    } catch (err) {
      console.error("Binding error:", err);
      setError(
        `Failed to bind address: ${err instanceof Error ? err.message : "Unknown error"}`
      );
      setIsBinding(false);
    }
  }, [celestiaAddress, nonce, bindAddressMutation]);

  // If user already has bound address, show status
  if (user?.address) {
    return (
      <div className="rounded-lg bg-green-50 p-4 border border-green-200">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-green-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
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
          Connect Keplr Wallet
        </h3>
        <p className="text-sm text-blue-700 mb-4">
          Connect your Keplr wallet and bind it to your GitHub account to use
          Celestia testnet.
        </p>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        {!isKeplrAvailable && (
          <div className="mb-4 rounded-md bg-yellow-50 p-4">
            <div className="text-sm text-yellow-700">
              Keplr wallet not detected. Please{" "}
              <a
                href="https://www.keplr.app/download"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-medium"
              >
                install the Keplr extension
              </a>{" "}
              to continue.
            </div>
          </div>
        )}

        <div className="space-y-3">
          {!celestiaAddress ? (
            <button
              onClick={handleConnectKeplr}
              disabled={isConnecting || !isKeplrAvailable}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
            >
              {isConnecting ? "Connecting..." : "Connect Keplr Wallet"}
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-white rounded-md border">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Wallet Connected
                  </p>
                  <p className="text-xs text-gray-500">
                    {celestiaAddress.slice(0, 12)}...{celestiaAddress.slice(-8)}
                  </p>
                </div>
                <svg
                  className="h-5 w-5 text-green-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>

              <button
                onClick={handleBindAddress}
                disabled={isBinding || bindAddressMutation.isPending}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                {isBinding || bindAddressMutation.isPending
                  ? "Binding Address..."
                  : "Bind Address to Account"}
              </button>
            </div>
          )}
        </div>

        {/* Disconnect Button - only show when Keplr is connected */}
        {celestiaAddress && (
          <div className="mt-4 pt-4 border-t border-blue-200">
            <button
              onClick={handleDisconnectKeplr}
              className="w-full flex justify-center py-2 px-4 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Disconnect Keplr Wallet
            </button>
            <p className="mt-2 text-xs text-gray-500 text-center">
              This will disconnect your Keplr wallet but keep your GitHub
              session active.
            </p>
          </div>
        )}

        <div className="mt-4 text-xs text-blue-600">
          <p>• Keplr browser extension is required</p>
          <p>• Celestia Mocha testnet will be added to your Keplr</p>
          <p>• Your address will be bound to your GitHub account</p>
        </div>
      </div>
    </div>
  );
}
