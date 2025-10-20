import { db } from "~/server/db";
import { getCelestiaClient } from "~/server/celestia/client";
import { createAppPaymentProof } from "~/lib/onchaindb";

export async function sendDust(address: string) {
  // Check if address exists and is already dusted (OnChainDB)
  const addr = await db.findUnique<{
    id: string;
    userId: string;
    bech32: string;
    isDusted: boolean;
    hasFeeGrant: boolean;
  }>('addresses', { bech32: address });

  if (!addr || addr.isDusted) return { txHash: "already-dusted" };

  const { client, address: backendAddr } = await getCelestiaClient();

  // Add validation to ensure addresses are not empty
  if (!backendAddr) {
    throw new Error("Backend address is empty - check MOCHA_RECOVERY_WALLET environment variable");
  }

  if (!address) {
    throw new Error("Target address is empty");
  }

  console.log(`🔄 Sending dust from ${backendAddr} to ${address}`);

  const res = await client.sendTokens(
    backendAddr,
    address,
    [{ denom: "utia", amount: "2000" }],
    "auto"
  );

  // Update address to mark as dusted (OnChainDB)
  await db.updateDocument('addresses',
    { bech32: address },
    { isDusted: true },
    createAppPaymentProof()
  );

  return { txHash: res.transactionHash };
}
