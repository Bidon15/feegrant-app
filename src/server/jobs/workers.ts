import { db } from "~/server/db";
import { getCelestiaClient } from "~/server/celestia/client";
import { getCommitmentFromSidecar } from "~/server/celestia/commitments";
import { buildAndBroadcastExecPfb } from "~/server/celestia/buildAndBroadcastExecPfb";
import { Tx } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { MsgGrant } from "cosmjs-types/cosmos/authz/v1beta1/tx";
import { env } from "~/env";

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

export async function broadcastAuthz(signedTxBase64: string, address: string, jobId?: string) {
  const { client, address: backendAddr } = await getCelestiaClient();
  
  // Check if user has sufficient funds for the transaction
  const userAccount = await client.getAccount(address);
  const userBalance = await client.getBalance(address, "utia");
  
  console.log(`🔍 User account balance: ${userBalance.amount}utia`);
  
  // Check if the transaction includes a fee granter field
  const rawTx = Buffer.from(signedTxBase64, "base64");
  const decodedTx = Tx.decode(rawTx);
  const feeGranter = decodedTx.authInfo?.fee?.granter;
  
  console.log(`🔍 Transaction fee granter: ${feeGranter || 'none'}`);
  
  if (parseInt(userBalance.amount) < 5000 && !feeGranter) {
    throw new Error(`User has insufficient funds (${userBalance.amount}utia < 5000utia) and transaction doesn't include fee granter. Please ensure feegrant allowance exists and transaction is signed with feeGranter field set to: ${backendAddr}`);
  }
  
  console.log(`🔍 Broadcasting user's signed authz transaction...`);
  
  const originalTxBytes = Buffer.from(signedTxBase64, "base64");
  const res = await client.broadcastTx(originalTxBytes);
  
  if (res.code !== 0) {
    console.error(`❌ Authz broadcast failed: code=${res.code}, log=${res.rawLog}`);
    throw new Error(`Authz broadcast failed: code=${res.code} log=${res.rawLog}`);
  }
  
  console.log(`✅ Successfully broadcast authz transaction: ${res.transactionHash}`);
  
  await db.address.update({ 
    where: { bech32: address }, 
    data: { hasAuthzGranted: true } 
  });

  // Log the job completion
  if (jobId) {
    await db.jobLog.create({
      data: {
        jobName: "authz.broadcast",
        payload: { address, signedTxBase64 },
        status: "completed",
        txHash: res.transactionHash,
      },
    });
  }

  return { txHash: res.transactionHash };
}

export async function execPfb({ blobId, jobId }: { blobId: string; jobId?: string }) {
  const row = await db.blobPayload.findUnique({ where: { id: blobId } });
  if (!row) return { txHash: "blob-missing" };

  const nsHex = row.namespace;                 // 58-hex string
  const blob = Buffer.from(row.blob);          // bytea → Buffer

  try {
    // 1) fetch commitment from sidecar
    const commitment = await getCommitmentFromSidecar(nsHex, blob);

    // 2) build & broadcast MsgExec(PFB)
    const { address: backendAddr } = await getCelestiaClient();
    const txHash = await buildAndBroadcastExecPfb({
      backendAddr,
      devAddr: row.devAddr,
      namespaceHex: nsHex,
      blob,
      commitment,
      shareVersion: 0,
    });

    // 3) persist + cleanup
    await db.$transaction([
      db.blobTx.create({
        data: { userId: row.userId, devAddr: row.devAddr, namespace: nsHex, txHash },
      }),
      db.blobPayload.delete({ where: { id: row.id } }),
    ]);

    // Log success
    if (jobId) {
      await db.jobLog.create({
        data: {
          jobName: "pfb.exec",
          payload: { blobId },
          status: "completed",
          txHash,
        },
      });
    }

    return { txHash };
  } catch (error) {
    // Log error but keep blob for retry
    if (jobId) {
      await db.jobLog.create({
        data: {
          jobName: "pfb.exec",
          payload: { blobId },
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }
    throw error;
  }
}

export async function cleanupExpiredBlobs() {
  const deleted = await db.blobPayload.deleteMany({ 
    where: { expireAt: { lt: new Date() } } 
  });
  return { deleted: deleted.count };
}
