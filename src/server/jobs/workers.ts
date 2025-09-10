import { db } from "~/server/db";
import { getCelestiaClient } from "~/server/celestia/client";

export async function sendDust(address: string, jobId?: string) {
  const addr = await db.address.findUnique({ where: { bech32: address } });
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

  await db.address.update({ 
    where: { bech32: address }, 
    data: { isDusted: true } 
  });

  // Log the job completion
  if (jobId) {
    await db.jobLog.create({
      data: {
        jobName: "dust.send",
        payload: { address },
        status: "completed",
        txHash: res.transactionHash,
      },
    });
  }

  return { txHash: res.transactionHash };
}
