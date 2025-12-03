import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { SigningStargateClient, GasPrice } from "@cosmjs/stargate";
import { Registry } from "@cosmjs/proto-signing";
import { defaultRegistryTypes } from "@cosmjs/stargate";
import { MsgGrantAllowance, MsgRevokeAllowance } from "cosmjs-types/cosmos/feegrant/v1beta1/tx";
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

  // Create registry with feegrant and celestia message types
  const registry = new Registry([
    ...defaultRegistryTypes,
    ["/cosmos.feegrant.v1beta1.MsgGrantAllowance", MsgGrantAllowance],
    ["/cosmos.feegrant.v1beta1.MsgRevokeAllowance", MsgRevokeAllowance],
  ]);

  console.log(`🔍 Registry created with feegrant and celestia message types`);

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

// REST API for querying feegrants
const CELESTIA_REST_API = "https://celestia-testnet-api.polkachu.com";

interface FeegrantAllowanceResponse {
  allowance: {
    granter: string;
    grantee: string;
    allowance: {
      "@type": string;
      spend_limit?: Array<{ denom: string; amount: string }>;
      expiration?: string | null;
      // For AllowedMsgAllowance, the actual allowance is nested
      allowance?: {
        "@type": string;
        spend_limit?: Array<{ denom: string; amount: string }>;
        expiration?: string | null;
      };
      allowed_messages?: string[];
    };
  };
}

/**
 * Query the remaining feegrant allowance for a grantee from a specific granter.
 * Returns the remaining allowance in utia, or null if no grant exists.
 */
export async function getFeegrantAllowance(
  granter: string,
  grantee: string
): Promise<{ remaining: string; spendLimit: string | null; expiration: string | null } | null> {
  try {
    const response = await fetch(
      `${CELESTIA_REST_API}/cosmos/feegrant/v1beta1/allowance/${granter}/${grantee}`
    );

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      // Check for "fee-grant not found" error in the response body
      const errorBody = await response.text();
      if (errorBody.includes("fee-grant not found") || errorBody.includes("not found")) {
        return null;
      }
      console.error(`[Celestia] getFeegrantAllowance error: ${response.status}`, errorBody);
      return null;
    }

    const data = (await response.json()) as FeegrantAllowanceResponse;
    const outerAllowance = data.allowance?.allowance;

    if (!outerAllowance) {
      return null;
    }

    // Handle both BasicAllowance and AllowedMsgAllowance types
    let spendLimit: Array<{ denom: string; amount: string }> | undefined;
    let expiration: string | null = null;

    if (outerAllowance["@type"] === "/cosmos.feegrant.v1beta1.AllowedMsgAllowance") {
      // AllowedMsgAllowance wraps another allowance (usually BasicAllowance)
      const innerAllowance = outerAllowance.allowance;
      spendLimit = innerAllowance?.spend_limit;
      expiration = innerAllowance?.expiration ?? null;
    } else if (outerAllowance["@type"] === "/cosmos.feegrant.v1beta1.BasicAllowance") {
      // Direct BasicAllowance
      spendLimit = outerAllowance.spend_limit;
      expiration = outerAllowance.expiration ?? null;
    } else {
      // Unknown allowance type, try to extract spend_limit anyway
      spendLimit = outerAllowance.spend_limit ?? outerAllowance.allowance?.spend_limit;
      expiration = outerAllowance.expiration ?? outerAllowance.allowance?.expiration ?? null;
    }

    // Find utia amount
    const utiaAllowance = spendLimit?.find((coin) => coin.denom === "utia");

    console.log(`[Celestia] Feegrant for ${grantee}: type=${outerAllowance["@type"]}, remaining=${utiaAllowance?.amount ?? "0"} utia`);

    return {
      remaining: utiaAllowance?.amount ?? "0",
      spendLimit: utiaAllowance?.amount ?? null,
      expiration,
    };
  } catch (error) {
    console.error("[Celestia] getFeegrantAllowance error:", error);
    return null;
  }
}
