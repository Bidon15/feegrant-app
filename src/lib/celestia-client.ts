import { SigningStargateClient, StargateClient } from "@cosmjs/stargate";
import { useState, useEffect, useCallback } from "react";
import type { Window as KeplrWindow } from "@keplr-wallet/types";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Window extends KeplrWindow {}
}

const CELESTIA_MOCHA_CHAIN_ID = "mocha-4";

export function useCosmosClient(rpcUrl: string) {
  const [publicClient, setPublicClient] = useState<StargateClient>();
  const [signingClient, setSigningClient] = useState<SigningStargateClient>();
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    void StargateClient.connect(rpcUrl).then(setPublicClient);
  }, [rpcUrl]);

  const connectWithKeplr = useCallback(async () => {
    if (!window.keplr) {
      throw new Error("Keplr wallet not found");
    }

    await window.keplr.enable(CELESTIA_MOCHA_CHAIN_ID);
    const offlineSigner = window.keplr.getOfflineSigner(CELESTIA_MOCHA_CHAIN_ID);
    const accounts = await offlineSigner.getAccounts();

    if (accounts.length === 0) {
      throw new Error("No accounts available");
    }

    const client = await SigningStargateClient.connectWithSigner(rpcUrl, offlineSigner);
    setSigningClient(client);
    setAddress(accounts[0]!.address);

    return { client, address: accounts[0]!.address };
  }, [rpcUrl]);

  const disconnect = useCallback(() => {
    setSigningClient(undefined);
    setAddress(null);
  }, []);

  return { publicClient, signingClient, address, connectWithKeplr, disconnect };
}

// Hook to get Celestia address from Keplr
export function useCelestiaAddress() {
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    const getAddress = async () => {
      if (!window.keplr) {
        setAddress(null);
        return;
      }

      try {
        const key = await window.keplr.getKey(CELESTIA_MOCHA_CHAIN_ID);
        setAddress(key.bech32Address);
      } catch {
        setAddress(null);
      }
    };

    void getAddress();

    // Listen for Keplr account changes
    const handleKeyStoreChange = () => {
      void getAddress();
    };

    window.addEventListener("keplr_keystorechange", handleKeyStoreChange);
    return () => {
      window.removeEventListener("keplr_keystorechange", handleKeyStoreChange);
    };
  }, []);

  return address;
}

// Convenience hook specifically for Celestia
export function useCelestiaClient(rpcUrl = "https://rpc-mocha.pops.one") {
  return useCosmosClient(rpcUrl);
}
