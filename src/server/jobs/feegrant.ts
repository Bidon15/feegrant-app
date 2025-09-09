import { db } from "~/server/db";
import { getCelestiaClient } from "~/server/celestia/client";
import { MsgGrantAllowance } from "cosmjs-types/cosmos/feegrant/v1beta1/tx";
import { BasicAllowance, AllowedMsgAllowance } from "cosmjs-types/cosmos/feegrant/v1beta1/feegrant";
import { Any } from "cosmjs-types/google/protobuf/any";

export async function grantFeeAllowance(granteeAddress: string, jobId?: string) {
  const { client, address: backendAddr } = await getCelestiaClient();
  
  console.log(`🔍 Granting fee allowance from ${backendAddr} to ${granteeAddress}`);
  
  // Validate addresses are not empty
  if (!backendAddr) {
    throw new Error("Backend address is empty");
  }
  if (!granteeAddress) {
    throw new Error("Grantee address is empty");
  }
  
  // Create AllowedMsgAllowance that explicitly allows authz messages
  const basicAllowance = BasicAllowance.fromPartial({
    spendLimit: [{ denom: "utia", amount: "1000000" }], // 1 TIA = 1,000,000 utia (matching CLI)
    expiration: undefined, // No expiration
  });

  const allowedMsgAllowance = AllowedMsgAllowance.fromPartial({
    allowance: Any.fromPartial({
      typeUrl: "/cosmos.feegrant.v1beta1.BasicAllowance",
      value: BasicAllowance.encode(basicAllowance).finish(),
    }),
    allowedMessages: [
      "/cosmos.authz.v1beta1.MsgGrant",
      "/cosmos.authz.v1beta1.MsgRevoke", 
      "/cosmos.authz.v1beta1.MsgExec",
      "/celestia.blob.v1.MsgPayForBlobs", // Also allow PFB messages
    ],
  });
  
  const allowanceAny = Any.fromPartial({
    typeUrl: "/cosmos.feegrant.v1beta1.AllowedMsgAllowance",
    value: AllowedMsgAllowance.encode(allowedMsgAllowance).finish(),
  });
  
  const msgGrantAllowance = MsgGrantAllowance.fromPartial({
    granter: backendAddr,
    grantee: granteeAddress,
    allowance: allowanceAny,
  });

  const msgGrantAllowanceEncodeObject = {
    typeUrl: "/cosmos.feegrant.v1beta1.MsgGrantAllowance",
    value: msgGrantAllowance,
  };

  // Try simulation first to check if allowance already exists
  try {
    console.log(`🔍 Simulating transaction to check for existing allowance...`);
    await client.simulate(backendAddr, [msgGrantAllowanceEncodeObject], "Grant fee allowance simulation");
    console.log(`✅ Simulation successful, proceeding with transaction`);
  } catch (simError: any) {
    if (simError.message?.includes("fee allowance already exists")) {
      console.log(`✅ Fee allowance already exists, updating database and returning`);
      
      // Update database to reflect existing allowance
      await db.address.update({
        where: { bech32: granteeAddress },
        data: { 
          hasFeeGrant: true,
          feeAllowanceRemaining: "1000000", // Assume 1 TIA remaining
        },
      });
      
      // Log the job completion
      if (jobId) {
        await db.jobLog.create({
          data: {
            jobName: "feegrant.grant",
            payload: { granteeAddress },
            status: "completed",
            txHash: "existing_allowance",
          },
        });
      }
      
      return { txHash: "existing_allowance" };
    } else {
      console.error(`❌ Simulation failed with unexpected error:`, simError);
      throw new Error(`Transaction simulation failed: ${simError}`);
    }
  }

  // If we get here, the allowance doesn't exist, so proceed with the transaction
  const fee = {
    amount: [{ denom: "utia", amount: "20000" }], // Match CLI fee
    gas: "210000", // Match CLI gas
  };

  console.log(`🔍 Broadcasting feegrant transaction...`);

  const res = await client.signAndBroadcast(
    backendAddr,
    [msgGrantAllowanceEncodeObject],
    fee,
    "Grant fee allowance for authz transactions"
  );
  
  console.log(`✅ Transaction broadcast result: code=${res.code}, hash=${res.transactionHash}`);
  
  if (res.code !== 0) {
    console.error(`❌ Transaction failed: code=${res.code}, log=${res.rawLog}`);
    throw new Error(`Fee grant failed: code=${res.code} log=${res.rawLog}`);
  }
  
  // Update database to track fee grant (use actual amount granted)
  await db.address.update({
    where: { bech32: granteeAddress },
    data: { 
      hasFeeGrant: true,
      feeAllowanceRemaining: "1000000", // 1 TIA in utia (matching our grant amount)
    },
  });
  
  // Log the job completion
  if (jobId) {
    await db.jobLog.create({
      data: {
        jobName: "feegrant.grant",
        payload: { granteeAddress },
        status: "completed",
        txHash: res.transactionHash,
      },
    });
  }
  
  return { txHash: res.transactionHash };
}
