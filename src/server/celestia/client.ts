import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { SigningStargateClient, GasPrice } from "@cosmjs/stargate";
import { env } from "~/env";

let clientCache: {
  client: SigningStargateClient;
  address: string;
} | null = null;

export async function getCelestiaClient() {
  if (clientCache) {
    return clientCache;
  }

  // Create wallet from mnemonic
  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(
    env.MOCHA_RECOVERY_WALLET,
    {
      prefix: "celestia",
    }
  );

  const [account] = await wallet.getAccounts();
  if (!account) {
    throw new Error("No account found in wallet");
  }

  // Connect to Mocha testnet
  const client = await SigningStargateClient.connectWithSigner(
    env.QUICKNODE_RPC,
    wallet,
    {
      gasPrice: GasPrice.fromString("0.025utia"),
    }
  );

  clientCache = {
    client,
    address: account.address,
  };

  return clientCache;
}

export async function getBackendAddress(): Promise<string> {
  const { address } = await getCelestiaClient();
  return address;
}
