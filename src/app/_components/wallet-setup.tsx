"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { useWallet, useAccount, useModal, useClient } from "@getpara/react-sdk";
import { ParaProtoSigner } from "@getpara/cosmjs-v0-integration";
import { MsgGrant } from "cosmjs-types/cosmos/authz/v1beta1/tx";
import { GenericAuthorization } from "cosmjs-types/cosmos/authz/v1beta1/authz";
import { Any } from "cosmjs-types/google/protobuf/any";
import { Timestamp } from "cosmjs-types/google/protobuf/timestamp";
import { TxRaw, TxBody, AuthInfo, SignerInfo, ModeInfo } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { SignMode } from "cosmjs-types/cosmos/tx/signing/v1beta1/signing";
import { PubKey } from "cosmjs-types/cosmos/crypto/secp256k1/keys";

export function WalletSetup() {
  const [isDusting, setIsDusting] = useState(false);
  const [isGrantingAuthz, setIsGrantingAuthz] = useState(false);
  const [isGrantingFeeAllowance, setIsGrantingFeeAllowance] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { data: user } = api.user.me.useQuery();
  const { data: wallet } = useWallet();
  const { isConnected } = useAccount();
  const { openModal } = useModal();
  const para = useClient();
  const utils = api.useUtils();

  const dustMutation = api.authz.dust.useMutation({
    onSuccess: (result) => {
      setSuccess(`Dusting ${result.message}. Transaction: ${result.txHash}`);
      setError(null);
      utils.user.me.invalidate();
    },
    onError: (error) => {
      setError(error.message);
      setSuccess(null);
    },
  });

  const grantAuthzMutation = api.authz.grantAuthz.useMutation({
    onSuccess: (result) => {
      setSuccess(`Authorization ${result.message}. Transaction: ${result.txHash}`);
      setError(null);
      utils.user.me.invalidate();
    },
    onError: (error) => {
      setError(error.message);
      setSuccess(null);
    },
  });

  const grantFeeAllowanceMutation = api.authz.grantFeeAllowance.useMutation({
    onSuccess: (result) => {
      setSuccess(`Fee allowance ${result.message}. Transaction: ${result.txHash}`);
      setError(null);
      utils.user.me.invalidate();
    },
    onError: (error) => {
      setError(error.message);
      setSuccess(null);
    },
  });

  const handleDust = async () => {
    if (!user?.address?.bech32) {
      setError("No address found");
      return;
    }

    setIsDusting(true);
    setError(null);
    setSuccess(null);

    try {
      await dustMutation.mutateAsync({
        address: user.address.bech32,
      });
    } catch (err) {
      // Error handled by mutation
    } finally {
      setIsDusting(false);
    }
  };

  const handleGrantAuthz = async () => {
    if (!isConnected) {
      setError("Please connect your Para wallet first");
      return;
    }
    
    if (!wallet?.address || !user?.address?.bech32) {
      setError("Wallet address not found");
      return;
    }

    setIsGrantingAuthz(true);
    setError(null);
    setSuccess(null);

    try {
      if (!para) {
        setError("Para client not available");
        return;
      }

      const address = user.address.bech32;
      const signer = new ParaProtoSigner(para, "celestia");
      const accounts = await signer.getAccounts();
      
      // Get account info from backend API to avoid CORS issues
      const accountInfoQuery = await utils.account.getAccountInfo.fetch({ 
        address: accounts[0]!.address 
      });
      const accountInfo = {
        sequence: accountInfoQuery.sequence,
        account_number: accountInfoQuery.accountNumber,
      };
      
      if (accounts.length === 0) {
        setError("No accounts available");
        return;
      }

      const granter = accounts[0]!.address;
      const grantee = process.env.NEXT_PUBLIC_BACKEND_ADDRESS || "celestia1fm860mgjcrr654sphu8r29u0ahhllce2z0z47d";
      
      // Check if user has sufficient funds for transaction (5000utia)
      // If not, ensure feegrant allowance exists first
      // Users who were dusted only got 4000utia, which is insufficient for 5000utia fee
      let needsFeegrant = user.address.isDusted; // Dusted users have insufficient funds
      
      console.log("🔍 Frontend authz setup:", {
        isDusted: user.address.isDusted,
        hasFeeGrant: user.address.hasFeeGrant,
        needsFeegrant,
        grantee
      });
      
      if (needsFeegrant && !user.address.hasFeeGrant) {
        console.log("User has insufficient funds, creating feegrant allowance first...");
        await grantFeeAllowanceMutation.mutateAsync({
          address: user.address.bech32,
        });
        // Refresh user data to get updated feegrant status
        await utils.user.me.invalidate();
      }
      
      // Create MsgGrant for MsgPayForBlobs authorization
      const authorization = GenericAuthorization.fromPartial({
        msg: "/celestia.blob.v1.MsgPayForBlobs",
      });
      
      const authzAny = Any.fromPartial({
        typeUrl: "/cosmos.authz.v1beta1.GenericAuthorization",
        value: GenericAuthorization.encode(authorization).finish(),
      });
      
      // Set expiration to 1 year from now
      const expiration = Timestamp.fromPartial({
        seconds: BigInt(Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60),
        nanos: 0,
      });
      
      const msgGrant = MsgGrant.fromPartial({
        granter,
        grantee,
        grant: {
          authorization: authzAny,
          expiration,
        },
      });
      
      // Create transaction body
      const msgAny = Any.fromPartial({
        typeUrl: "/cosmos.authz.v1beta1.MsgGrant",
        value: MsgGrant.encode(msgGrant).finish(),
      });
      
      const txBody = TxBody.fromPartial({
        messages: [msgAny],
        memo: "Grant authorization for blob submission",
      });
      
      const bodyBytes = TxBody.encode(txBody).finish();
      
      // Create fee object with conditional granter
      const feeObject = {
        amount: [{ denom: "utia", amount: "5000" }],
        gasLimit: BigInt(200000),
        ...(needsFeegrant ? { granter: grantee } : {}), // Only include granter if needed
      };
      
      console.log("🔍 Fee object being used:", feeObject);
      
      // Create auth info (simplified for demo)
      const authInfo = AuthInfo.fromPartial({
        signerInfos: [{
          publicKey: Any.fromPartial({
            typeUrl: "/cosmos.crypto.secp256k1.PubKey",
            value: PubKey.encode({
              key: accounts[0]!.pubkey,
            }).finish(),
          }),
          modeInfo: {
            single: {
              mode: SignMode.SIGN_MODE_DIRECT,
            },
          },
          sequence: BigInt(accountInfo.sequence || 0),
        }],
        fee: feeObject,
      });
      
      const authInfoBytes = AuthInfo.encode(authInfo).finish();
      
      console.log("🔍 Account info for signing:", {
        accountNumber: accountInfo.account_number,
        sequence: accountInfo.sequence,
        address: accounts[0]!.address
      });
      
      // Sign the transaction
      const signResponse = await signer.signDirect(
        granter,
        {
          bodyBytes,
          authInfoBytes,
          chainId: "mocha-4",
          accountNumber: BigInt(accountInfo.account_number || 0),
        }
      );
      
      // Create final transaction
      const signatureBytes = typeof signResponse.signature.signature === 'string' 
        ? Buffer.from(signResponse.signature.signature, 'base64')
        : signResponse.signature.signature;
        
      const txRaw = TxRaw.fromPartial({
        bodyBytes,
        authInfoBytes,
        signatures: [signatureBytes],
      });
      
      const signedTxBase64 = Buffer.from(TxRaw.encode(txRaw).finish()).toString("base64");
      
      await grantAuthzMutation.mutateAsync({
        address,
        signedGrantTxBase64: signedTxBase64,
      });
    } catch (err) {
      setError("Failed to grant authorization");
    } finally {
      setIsGrantingAuthz(false);
    }
  };

  const handleGrantFeeAllowance = async () => {
    if (!user?.address?.bech32) {
      setError("No address found");
      return;
    }

    setIsGrantingFeeAllowance(true);
    setError(null);
    setSuccess(null);

    try {
      await grantFeeAllowanceMutation.mutateAsync({
        address: user.address.bech32,
      });
    } catch (err) {
      // Error handled by mutation
    } finally {
      setIsGrantingFeeAllowance(false);
    }
  };

  if (!user?.address) {
    return null;
  }

  const { isDusted, hasAuthzGranted, hasFeeGrant } = user.address;

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-white p-6 border border-gray-200 shadow-sm">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Wallet Setup
        </h3>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-md bg-green-50 p-4">
            <div className="text-sm text-green-700">{success}</div>
          </div>
        )}

        <div className="space-y-4">
          {/* Dusting Step */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-3">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                isDusted ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
              }`}>
                {isDusted ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <span className="text-sm font-medium">1</span>
                )}
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900">
                  Get Dusted (Receive TIA)
                </h4>
                <p className="text-sm text-gray-500">
                  Receive initial TIA tokens to pay for transactions
                </p>
              </div>
            </div>
            {!isDusted && (
              <button
                onClick={handleDust}
                disabled={isDusting || dustMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isDusting || dustMutation.isPending ? "Dusting..." : "Get Dusted"}
              </button>
            )}
          </div>

          {/* Fee Allowance Step */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-3">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                hasFeeGrant ? 'bg-green-100 text-green-600' : isDusted ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
              }`}>
                {hasFeeGrant ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <span className="text-sm font-medium">2</span>
                )}
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900">
                  Grant Fee Allowance
                </h4>
                <p className="text-sm text-gray-500">
                  Allow backend to pay for transactions on your behalf
                </p>
              </div>
            </div>
            {isDusted && !hasFeeGrant && (
              <button
                onClick={handleGrantFeeAllowance}
                disabled={isGrantingFeeAllowance || grantFeeAllowanceMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                {isGrantingFeeAllowance || grantFeeAllowanceMutation.isPending ? "Granting..." : "Grant Fee Allowance"}
              </button>
            )}
          </div>

          {/* Grant Authorization Step */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-3">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                hasAuthzGranted ? 'bg-green-100 text-green-600' : isDusted && hasFeeGrant ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
              }`}>
                {hasAuthzGranted ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <span className="text-sm font-medium">3</span>
                )}
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900">
                  Grant Authorization
                </h4>
                <p className="text-sm text-gray-500">
                  Allow backend to submit blobs on your behalf
                </p>
              </div>
            </div>
            {isDusted && hasFeeGrant && !hasAuthzGranted && (
              <div className="flex flex-col items-end space-y-2">
                {!isConnected ? (
                  <p className="text-xs text-amber-600 text-right">
                    Connect Para wallet (top-right) to grant authorization
                  </p>
                ) : (
                  <button
                    onClick={handleGrantAuthz}
                    disabled={isGrantingAuthz || grantAuthzMutation.isPending}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                  >
                    {isGrantingAuthz || grantAuthzMutation.isPending ? "Granting..." : "Grant Authorization"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {isDusted && hasAuthzGranted && hasFeeGrant && (
          <div className="mt-4 p-4 bg-green-50 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium text-green-800">
                Setup complete! You can now submit blobs.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
