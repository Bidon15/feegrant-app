import { sendDust } from "./workers";
import { grantFeeAllowance } from "./feegrant";

// Direct job execution without pg-boss
export async function executeJob(jobName: string, data: any) {
  console.log(`🔄 Executing ${jobName} directly`);
  
  switch (jobName) {
    case "dust.send":
      return await sendDust(data.address);
    case "feegrant.grant":
      return await grantFeeAllowance(data.address);
    default:
      throw new Error(`Unknown job type: ${jobName}`);
  }
}
