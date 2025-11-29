import { sendDust } from "./workers";
import { grantFeeAllowance } from "./feegrant";

// Direct execution without database logging
// Transaction history can be viewed on Celenium explorer

export async function executeDustJob(
  address: string
): Promise<{ txHash: string }> {
  console.log(`[Job] Executing dust job for ${address}`);

  try {
    const result = await sendDust(address);
    console.log(`[Job] Dust job completed: ${result.txHash}`);
    return result;
  } catch (error) {
    console.error(`[Job] Dust job failed:`, error);
    throw error;
  }
}

export async function executeFeegrantJob(
  address: string
): Promise<{ txHash: string }> {
  console.log(`[Job] Executing feegrant job for ${address}`);

  try {
    const result = await grantFeeAllowance(address);
    console.log(`[Job] Feegrant job completed: ${result.txHash}`);
    return result;
  } catch (error) {
    console.error(`[Job] Feegrant job failed:`, error);
    throw error;
  }
}
