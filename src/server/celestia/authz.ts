/**
 * Authz module for admin feegrant execution
 *
 * Allows admins to grant MsgGrantAllowance permission to the backend,
 * which then executes feegrants on their behalf using MsgExec.
 */

import { getCelestiaClient, getBackendAddress } from "./client";
import { Registry, type GeneratedType } from "@cosmjs/proto-signing";
import { defaultRegistryTypes } from "@cosmjs/stargate";
import {
  MsgGrantAllowance,
  MsgRevokeAllowance,
} from "cosmjs-types/cosmos/feegrant/v1beta1/tx";
import { MsgExec, MsgGrant, MsgRevoke } from "cosmjs-types/cosmos/authz/v1beta1/tx";
import { GenericAuthorization } from "cosmjs-types/cosmos/authz/v1beta1/authz";
import { BasicAllowance } from "cosmjs-types/cosmos/feegrant/v1beta1/feegrant";
import { Timestamp } from "cosmjs-types/google/protobuf/timestamp";
import { Any } from "cosmjs-types/google/protobuf/any";

// REST API for querying authz grants
const CELESTIA_REST_API = "https://celestia-testnet-api.polkachu.com";

interface AuthzGrantResponse {
  grants: Array<{
    authorization: {
      "@type": string;
      msg?: string;
    };
    expiration: string | null;
  }>;
}

/**
 * Query if an authz grant exists from granter to grantee for MsgGrantAllowance
 */
export async function queryAuthzGrant(
  granter: string,
  grantee: string
): Promise<{ exists: boolean; expiration: string | null } | null> {
  try {
    const msgType = encodeURIComponent("/cosmos.feegrant.v1beta1.MsgGrantAllowance");
    const response = await fetch(
      `${CELESTIA_REST_API}/cosmos/authz/v1beta1/grants?granter=${granter}&grantee=${grantee}&msg_type_url=${msgType}`
    );

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      console.error(`[Authz] queryAuthzGrant error: ${response.status}`);
      return null;
    }

    const data = (await response.json()) as AuthzGrantResponse;

    if (!data.grants || data.grants.length === 0) {
      return null;
    }

    const grant = data.grants[0];
    return {
      exists: true,
      expiration: grant?.expiration ?? null,
    };
  } catch (error) {
    console.error("[Authz] queryAuthzGrant error:", error);
    return null;
  }
}

/**
 * Execute a feegrant on behalf of an admin using MsgExec
 *
 * The admin must have previously granted authz permission to the backend
 * for /cosmos.feegrant.v1beta1.MsgGrantAllowance
 */
export async function executeAdminFeegrant(params: {
  granter: string; // Admin's address (who pays for the feegrant)
  grantee: string; // Recipient's address (who receives the feegrant)
  amountUtia: string; // Amount in utia (e.g., "10000000" for 10 TIA)
  expirationDate: Date; // When the feegrant expires
}): Promise<{ txHash: string }> {
  const { granter, grantee, amountUtia, expirationDate } = params;

  console.log(`[Authz] Executing admin feegrant:`);
  console.log(`  Granter (admin): ${granter}`);
  console.log(`  Grantee (recipient): ${grantee}`);
  console.log(`  Amount: ${amountUtia} utia`);
  console.log(`  Expires: ${expirationDate.toISOString()}`);

  const { client, address: backendAddr } = await getCelestiaClient();

  // Verify authz grant exists
  const authzGrant = await queryAuthzGrant(granter, backendAddr);
  if (!authzGrant) {
    throw new Error(
      `No authz grant found from ${granter} to ${backendAddr} for MsgGrantAllowance`
    );
  }

  // Convert expiration date to protobuf Timestamp
  const expirationTimestamp = Timestamp.fromPartial({
    seconds: BigInt(Math.floor(expirationDate.getTime() / 1000)),
    nanos: 0,
  });

  // Create the inner MsgGrantAllowance that admin would send
  // This grants a BasicAllowance from admin to recipient
  const innerMsg: MsgGrantAllowance = {
    granter: granter, // Admin pays
    grantee: grantee, // Recipient receives
    allowance: Any.fromPartial({
      typeUrl: "/cosmos.feegrant.v1beta1.BasicAllowance",
      value: BasicAllowance.encode({
        spendLimit: [{ denom: "utia", amount: amountUtia }],
        expiration: expirationTimestamp,
      }).finish(),
    }),
  };

  // Wrap in MsgExec - backend executes on behalf of admin
  const msgExec: MsgExec = {
    grantee: backendAddr, // Backend is the grantee of the authz
    msgs: [
      Any.fromPartial({
        typeUrl: "/cosmos.feegrant.v1beta1.MsgGrantAllowance",
        value: MsgGrantAllowance.encode(innerMsg).finish(),
      }),
    ],
  };

  // Create extended registry with authz types
  const registry = new Registry([
    ...defaultRegistryTypes,
    ["/cosmos.feegrant.v1beta1.MsgGrantAllowance", MsgGrantAllowance as GeneratedType],
    ["/cosmos.feegrant.v1beta1.MsgRevokeAllowance", MsgRevokeAllowance as GeneratedType],
    ["/cosmos.authz.v1beta1.MsgExec", MsgExec as GeneratedType],
    ["/cosmos.authz.v1beta1.MsgGrant", MsgGrant as GeneratedType],
    ["/cosmos.authz.v1beta1.MsgRevoke", MsgRevoke as GeneratedType],
    ["/cosmos.authz.v1beta1.GenericAuthorization", GenericAuthorization as GeneratedType],
  ]);

  // Sign and broadcast using MsgExec
  const fee = {
    amount: [{ denom: "utia", amount: "10000" }],
    gas: "200000",
  };

  console.log(`[Authz] Broadcasting MsgExec from ${backendAddr}`);

  const result = await client.signAndBroadcast(
    backendAddr,
    [
      {
        typeUrl: "/cosmos.authz.v1beta1.MsgExec",
        value: msgExec,
      },
    ],
    fee,
    `Admin feegrant: ${granter} -> ${grantee} (${Number(amountUtia) / 1_000_000} TIA)`
  );

  if (result.code !== 0) {
    console.error(`[Authz] MsgExec failed: code=${result.code}, log=${result.rawLog}`);
    throw new Error(`MsgExec failed: code=${result.code} log=${result.rawLog}`);
  }

  console.log(`[Authz] MsgExec successful: ${result.transactionHash}`);

  return { txHash: result.transactionHash };
}

/**
 * Get the message that admin needs to sign to grant authz to backend
 *
 * Returns the message structure for client-side signing with Keplr
 */
export async function getAuthzGrantMessage(
  adminAddress: string,
  expirationDate?: Date
): Promise<{
  typeUrl: string;
  value: {
    granter: string;
    grantee: string;
    grant: {
      authorization: { typeUrl: string; msg: string };
      expiration: string | null;
    };
  };
}> {
  const backendAddress = await getBackendAddress();

  // Calculate expiration (default 1 year)
  const expiration = expirationDate ?? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

  return {
    typeUrl: "/cosmos.authz.v1beta1.MsgGrant",
    value: {
      granter: adminAddress,
      grantee: backendAddress,
      grant: {
        authorization: {
          typeUrl: "/cosmos.authz.v1beta1.GenericAuthorization",
          msg: "/cosmos.feegrant.v1beta1.MsgGrantAllowance",
        },
        expiration: expiration.toISOString(),
      },
    },
  };
}
