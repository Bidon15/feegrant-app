import { db } from "~/server/db";
import { sendDust } from "./workers";
import { grantFeeAllowance } from "./feegrant";

// Direct execution with database logging
export async function executeDustJob(address: string): Promise<{ txHash: string }> {
  console.log(` Executing dust job for ${address}`);
  
  try {
    const result = await sendDust(address);
    
    // Log successful execution
    await db.jobLog.create({
      data: {
        jobName: "dust.send",
        payload: { address },
        status: "completed",
        txHash: result.txHash,
      },
    });
    
    return result;
  } catch (error) {
    // Log failed execution
    await db.jobLog.create({
      data: {
        jobName: "dust.send",
        payload: { address },
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }
}

export async function executeFeegrantJob(address: string): Promise<{ txHash: string }> {
  console.log(` Executing feegrant job for ${address}`);
  
  try {
    const result = await grantFeeAllowance(address);
    
    // Log successful execution
    await db.jobLog.create({
      data: {
        jobName: "feegrant.grant",
        payload: { address },
        status: "completed",
        txHash: result.txHash,
      },
    });
    
    return result;
  } catch (error) {
    // Log failed execution
    await db.jobLog.create({
      data: {
        jobName: "feegrant.grant",
        payload: { address },
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }
}
