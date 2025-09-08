import { sendDust, broadcastAuthz, execPfb, cleanupExpiredBlobs } from "./workers";

// Direct job execution without pg-boss
export async function executeJob(jobName: string, data: any) {
  console.log(`🔄 Executing ${jobName} directly`);
  
  switch (jobName) {
    case "dust.send":
      return await sendDust(data.address);
    case "authz.broadcast":
      return await broadcastAuthz(data.signedTxBase64, data.address);
    case "pfb.exec":
      return await execPfb({ blobId: data.blobId });
    case "blob.cleanup":
      return await cleanupExpiredBlobs();
    default:
      throw new Error(`Unknown job type: ${jobName}`);
  }
}

// Schedule cleanup to run periodically (can be called from a cron job or similar)
export async function scheduleCleanup() {
  try {
    await cleanupExpiredBlobs();
    console.log("✅ Blob cleanup completed");
  } catch (error) {
    console.error("❌ Blob cleanup failed:", error);
  }
}
