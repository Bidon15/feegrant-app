import { db } from "~/server/db";
import { sendDust } from "./workers";
import { grantFeeAllowance } from "./feegrant";
import { createAppPaymentProof } from "~/lib/onchaindb";

// Direct execution with database logging
export async function executeDustJob(address: string): Promise<{ txHash: string }> {
  console.log(` Executing dust job for ${address}`);

  try {
    const result = await sendDust(address);

    // Log successful execution (OnChainDB)
    await db.create('job_logs', {
      jobName: "dust.send",
      payload: { address },
      status: "completed",
      txHash: result.txHash,
    }, createAppPaymentProof());

    return result;
  } catch (error) {
    // Log failed execution (OnChainDB)
    await db.create('job_logs', {
      jobName: "dust.send",
      payload: { address },
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
    }, createAppPaymentProof());
    throw error;
  }
}

export async function executeFeegrantJob(address: string): Promise<{ txHash: string }> {
  console.log(` Executing feegrant job for ${address}`);

  try {
    const result = await grantFeeAllowance(address);

    // Log successful execution (OnChainDB)
    await db.create('job_logs', {
      jobName: "feegrant.grant",
      payload: { address },
      status: "completed",
      txHash: result.txHash,
    }, createAppPaymentProof());

    return result;
  } catch (error) {
    // Log failed execution (OnChainDB)
    await db.create('job_logs', {
      jobName: "feegrant.grant",
      payload: { address },
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
    }, createAppPaymentProof());
    throw error;
  }
}
