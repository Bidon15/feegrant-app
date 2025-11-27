import {
  db,
  COLLECTIONS,
  generateId,
  nowISO,
  type JobLog,
} from "~/server/db";
import { sendDust } from "./workers";
import { grantFeeAllowance } from "./feegrant";

// Direct execution with database logging
export async function executeDustJob(
  address: string
): Promise<{ txHash: string }> {
  console.log(` Executing dust job for ${address}`);

  try {
    const result = await sendDust(address);

    // Log successful execution
    const now = nowISO();
    const jobLog: JobLog = {
      id: generateId(),
      jobName: "dust.send",
      payload: { address },
      status: "completed",
      txHash: result.txHash,
      error: null,
      createdAt: now,
      updatedAt: now,
    };
    await db.createDocument(COLLECTIONS.jobLogs, jobLog);

    return result;
  } catch (error) {
    // Log failed execution
    const now = nowISO();
    const jobLog: JobLog = {
      id: generateId(),
      jobName: "dust.send",
      payload: { address },
      status: "failed",
      txHash: null,
      error: error instanceof Error ? error.message : String(error),
      createdAt: now,
      updatedAt: now,
    };
    await db.createDocument(COLLECTIONS.jobLogs, jobLog);
    throw error;
  }
}

export async function executeFeegrantJob(
  address: string
): Promise<{ txHash: string }> {
  console.log(` Executing feegrant job for ${address}`);

  try {
    const result = await grantFeeAllowance(address);

    // Log successful execution
    const now = nowISO();
    const jobLog: JobLog = {
      id: generateId(),
      jobName: "feegrant.grant",
      payload: { address },
      status: "completed",
      txHash: result.txHash,
      error: null,
      createdAt: now,
      updatedAt: now,
    };
    await db.createDocument(COLLECTIONS.jobLogs, jobLog);

    return result;
  } catch (error) {
    // Log failed execution
    const now = nowISO();
    const jobLog: JobLog = {
      id: generateId(),
      jobName: "feegrant.grant",
      payload: { address },
      status: "failed",
      txHash: null,
      error: error instanceof Error ? error.message : String(error),
      createdAt: now,
      updatedAt: now,
    };
    await db.createDocument(COLLECTIONS.jobLogs, jobLog);
    throw error;
  }
}
