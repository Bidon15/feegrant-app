import { Any } from "cosmjs-types/google/protobuf/any";
import { MsgExec } from "cosmjs-types/cosmos/authz/v1beta1/tx";
import { coins } from "@cosmjs/stargate";
import { MsgPayForBlobs } from "~/generated/celestia/blob/v1/tx";
import { getCelestiaClient } from "./client";

function assert29(ns: Uint8Array) {
  if (ns.length !== 29) throw new Error("namespace must be 29 bytes (ADR-015)");
}

export async function buildAndBroadcastExecPfb(opts: {
  backendAddr: string;            // fee payer & outer signer
  devAddr: string;                // logical inner signer in PFB
  namespaceHex: string;           // 58 hex chars → 29 bytes
  blob: Uint8Array;               // ≤ 2 MB
  commitment: Uint8Array;         // from sidecar for (namespace, blob)
  shareVersion?: number;          // default 0
  fee?: { amount: string; denom: string; gas: string };
}) {
  const {
    backendAddr,
    devAddr,
    namespaceHex,
    blob,
    commitment,
    shareVersion = 0,
    fee = { amount: "3000", denom: "utia", gas: "400000" },
  } = opts;

  const ns = Buffer.from(namespaceHex, "hex");
  assert29(ns);

  // Inner: MsgPayForBlobs
  const pfb = MsgPayForBlobs.fromPartial({
    signer: devAddr,
    namespaces: [ns],
    blobSizes: [blob.length],
    shareCommitments: [commitment],
    shareVersions: [shareVersion],
  });

  const pfbAny: Any = {
    typeUrl: "/celestia.blob.v1.MsgPayForBlobs",
    value: MsgPayForBlobs.encode(pfb).finish(),
  };

  // Outer: MsgExec (signed & fee-paid by backend)
  const exec = MsgExec.fromPartial({
    grantee: backendAddr,
    msgs: [pfbAny],
  });

  const execAny: Any = {
    typeUrl: "/cosmos.authz.v1beta1.MsgExec",
    value: MsgExec.encode(exec).finish(),
  };

  const { client } = await getCelestiaClient();
  const res = await client.signAndBroadcast(
    backendAddr,
    [execAny],
    { amount: coins(fee.amount, fee.denom), gas: fee.gas },
    ""
  );

  if (res.code && res.code !== 0) {
    throw new Error(`PFB broadcast failed: code=${res.code} log=${res.rawLog}`);
  }
  return res.transactionHash!;
}
