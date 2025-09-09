import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { SigningStargateClient, GasPrice } from "@cosmjs/stargate";
import { Registry } from "@cosmjs/proto-signing";
import { defaultRegistryTypes } from "@cosmjs/stargate";
import { MsgGrantAllowance, MsgRevokeAllowance } from "cosmjs-types/cosmos/feegrant/v1beta1/tx";
import { MsgGrant, MsgRevoke, MsgExec } from "cosmjs-types/cosmos/authz/v1beta1/tx";
import { env } from "~/env";

let clientCache: {
  client: SigningStargateClient;
  address: string;
} | null = null;

export async function getCelestiaClient() {
  if (clientCache) {
    return clientCache;
  }

  // Validate environment variable
  if (!env.MOCHA_RECOVERY_WALLET) {
    throw new Error("MOCHA_RECOVERY_WALLET environment variable is not set");
  }

  console.log(`🔍 Creating wallet from mnemonic (length: ${env.MOCHA_RECOVERY_WALLET.split(' ').length} words)`);

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

  console.log(`🔍 Backend wallet address: ${account.address}`);

  // Create registry with feegrant and authz message types
  const registry = new Registry([
    ...defaultRegistryTypes,
    ["/cosmos.feegrant.v1beta1.MsgGrantAllowance", MsgGrantAllowance],
    ["/cosmos.feegrant.v1beta1.MsgRevokeAllowance", MsgRevokeAllowance],
    ["/cosmos.authz.v1beta1.MsgGrant", MsgGrant],
    ["/cosmos.authz.v1beta1.MsgRevoke", MsgRevoke],
    ["/cosmos.authz.v1beta1.MsgExec", MsgExec],
  ]);

  console.log(`🔍 Registry created with feegrant and authz message types`);

  // Connect to Mocha testnet
  const client = await SigningStargateClient.connectWithSigner(
    env.QUICKNODE_RPC,
    wallet,
    {
      gasPrice: GasPrice.fromString("0.025utia"),
      registry,
    }
  );

  clientCache = {
    client,
    address: account.address,
  };

  console.log(`✅ Celestia client initialized successfully with address: ${account.address}`);

  return clientCache;
}

export async function getBackendAddress(): Promise<string> {
  const { address } = await getCelestiaClient();
  return address;
}
