import { useClient, useAccount, useWallet } from "@getpara/react-sdk";
import { ParaProtoSigner } from "@getpara/cosmjs-v0-integration";
import { SigningStargateClient, StargateClient } from "@cosmjs/stargate";
import { useState, useEffect } from "react";

export function useCosmosClient(rpcUrl: string, prefix: string = "cosmos") {
  const para = useClient();
  const { isConnected, embedded } = useAccount();
  const [publicClient, setPublicClient] = useState<StargateClient>();
  const [signingClient, setSigningClient] = useState<SigningStargateClient>();

  useEffect(() => {
    StargateClient.connect(rpcUrl).then(setPublicClient);
  }, [rpcUrl]);

  useEffect(() => {
    if (!para || !isConnected || !embedded.isConnected) {
      setSigningClient(undefined);
      return;
    }

    const wallets = para.getWalletsByType("COSMOS");
    if (wallets.length === 0) return;
    
    const signer = new ParaProtoSigner(para, prefix);
    SigningStargateClient.connectWithSigner(rpcUrl, signer)
      .then(setSigningClient)
      .catch(() => setSigningClient(undefined));
  }, [para, isConnected, embedded.isConnected, rpcUrl, prefix]);

  return { publicClient, signingClient };
}

// Hook to get Celestia address - only returns address if wallet actually exists in Para account
export function useCelestiaAddress() {
  const para = useClient();
  const { isConnected, embedded } = useAccount();
  const { data: wallet } = useWallet();
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    if (!para || !isConnected || !embedded.isConnected || !wallet) {
      setAddress(null);
      return;
    }

    // Only proceed if we have an actual wallet from Para (not just local/phantom wallets)
    const wallets = para.getWalletsByType("COSMOS");
    console.log("Para COSMOS wallets:", wallets);
    
    if (wallets.length === 0) {
      console.log("No COSMOS wallets found in Para account");
      setAddress(null);
      return;
    }
    
    // Verify the wallet actually exists and is accessible
    try {
      const signer = new ParaProtoSigner(para, "celestia");
      signer.getAccounts()
        .then((accounts) => {
          console.log("Signer accounts:", accounts);
          setAddress(accounts.length > 0 ? accounts[0]!.address : null);
        })
        .catch((err) => {
          console.log("Failed to get signer accounts:", err);
          setAddress(null);
        });
    } catch (err) {
      console.log("Failed to create signer:", err);
      setAddress(null);
    }
  }, [para, isConnected, embedded.isConnected, wallet]);

  return address;
}

// Convenience hook specifically for Celestia
export function useCelestiaClient(rpcUrl: string = "https://rpc.celestia-mocha-4.com") {
  return useCosmosClient(rpcUrl, "celestia");
}
