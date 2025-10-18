import { db } from "~/server/db";
import { getCelestiaClient } from "~/server/celestia/client";
import { MsgGrantAllowance } from "cosmjs-types/cosmos/feegrant/v1beta1/tx";
import { BasicAllowance, AllowedMsgAllowance } from "cosmjs-types/cosmos/feegrant/v1beta1/feegrant";
import { Any } from "cosmjs-types/google/protobuf/any";
import { createAppPaymentProof } from "~/lib/onchaindb";

export async function grantFeeAllowance(address: string) {
  const { client, address: backendAddr } = await getCelestiaClient();
  
  console.log(`🔍 Granting fee allowance from ${backendAddr} to ${address}`);
  
  // Validate addresses are not empty
  if (!backendAddr) {
    throw new Error("Backend address is empty");
  }
  if (!address) {
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
      "/cosmos.bank.v1beta1.MsgSend", // Allow basic send transactions
      "/celestia.blob.v1.MsgPayForBlobs", // Also allow PFB messages
    ],
  });
  
  const allowanceAny = Any.fromPartial({
    typeUrl: "/cosmos.feegrant.v1beta1.AllowedMsgAllowance",
    value: AllowedMsgAllowance.encode(allowedMsgAllowance).finish(),
  });
  
  const msgGrantAllowance = MsgGrantAllowance.fromPartial({
    granter: backendAddr,
    grantee: address,
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
  } catch (simError: unknown) {
    if (simError instanceof Error && simError.message?.includes("fee allowance already exists")) {
      console.log(`✅ Fee allowance already exists, updating database and returning`);

      // Update database to reflect existing allowance (OnChainDB)
      await db.update('addresses',
        { bech32: address },
        {
          hasFeeGrant: true,
          feeAllowanceRemaining: "1000000", // Assume 1 TIA remaining
        },
        createAppPaymentProof()
      );

      return { txHash: "existing_allowance" };
    } else {
      console.error(`❌ Simulation failed with unexpected error:`, simError);
      throw new Error(`Transaction simulation failed: ${simError instanceof Error ? simError.message : String(simError)}`);
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
    "Grant fee allowance for transactions"
  );
  
  console.log(`✅ Transaction broadcast result: code=${res.code}, hash=${res.transactionHash}`);
  
  if (res.code !== 0) {
    console.error(`❌ Transaction failed: code=${res.code}, log=${res.rawLog}`);
    throw new Error(`Fee grant failed: code=${res.code} log=${res.rawLog}`);
  }

  // Update database to track fee grant (OnChainDB)
  await db.update('addresses',
    { bech32: address },
    {
      hasFeeGrant: true,
      feeAllowanceRemaining: "1000000", // 1 TIA in utia (matching our grant amount)
    },
    createAppPaymentProof()
  );

  return { txHash: res.transactionHash };
}
