"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

export function WalletSetup() {
  const [isDusting, setIsDusting] = useState(false);
  const [isGrantingFeeAllowance, setIsGrantingFeeAllowance] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { data: user } = api.user.me.useQuery();
  const utils = api.useUtils();

  const dustMutation = api.wallet.dust.useMutation({
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


  const grantFeeAllowanceMutation = api.wallet.grantFeeAllowance.useMutation({
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

  const { isDusted, hasFeeGrant } = user.address;

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

        </div>

        {isDusted && hasFeeGrant && (
          <div className="mt-4 p-4 bg-green-50 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium text-green-800">
                Setup complete! Your wallet is ready for feegrant transactions.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
