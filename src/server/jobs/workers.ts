import { db, COLLECTIONS, nowISO, type Address } from "~/server/db";
import { getCelestiaClient } from "~/server/celestia/client";

export async function sendDust(address: string) {
  const addr = await db.findUnique<Address>(COLLECTIONS.addresses, {
    bech32: address,
  });
  if (!addr || addr.isDusted) return { txHash: "already-dusted" };

  const { client, address: backendAddr } = await getCelestiaClient();

  // Add validation to ensure addresses are not empty
  if (!backendAddr) {
    throw new Error(
      "Backend address is empty - check MOCHA_RECOVERY_WALLET environment variable"
    );
  }

  if (!address) {
    throw new Error("Target address is empty");
  }

  console.log(`Sending dust from ${backendAddr} to ${address}`);

  const res = await client.sendTokens(
    backendAddr,
    address,
    [{ denom: "utia", amount: "2000" }],
    "auto"
  );

  // Verify transaction was successful before updating database
  console.log(`Dust transaction result: code=${res.code}, hash=${res.transactionHash}`);

  if (res.code !== 0) {
    console.error(`Dust transaction failed: code=${res.code}, log=${res.rawLog}`);
    throw new Error(`Dust transaction failed: code=${res.code} log=${res.rawLog}`);
  }

  // Only update address to mark as dusted AFTER successful transaction
  await db.updateDocument<Address>(
    COLLECTIONS.addresses,
    { bech32: address },
    { isDusted: true, updatedAt: nowISO() }
  );

  return { txHash: res.transactionHash };
}
