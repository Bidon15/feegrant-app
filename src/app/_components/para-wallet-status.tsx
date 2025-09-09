"use client";

import { useWallet, useAccount, useModal } from "@getpara/react-sdk";

export function ParaWalletStatus() {
  const { data: wallet } = useWallet();
  const { isConnected } = useAccount();
  const { openModal } = useModal();

  if (isConnected && wallet) {
    return (
      <div className="flex items-center space-x-2 text-sm">
        <div className="flex items-center space-x-2 px-3 py-1 bg-green-100 text-green-800 rounded-full">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span>Para Connected</span>
        </div>
        <button
          onClick={() => openModal()}
          className="px-3 py-1 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition"
        >
          Manage
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => openModal()}
      className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition text-sm"
    >
      Connect Para Wallet
    </button>
  );
}
