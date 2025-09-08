"use client";

import { api } from "~/trpc/react";

type BlobTx = {
  id: string;
  userId: string;
  createdAt: Date;
  txHash: string;
  namespace: string;
  devAddr: string;
};

export function BlobHistory() {
  const { data: blobs, isLoading } = api.blob.txs.useQuery();

  if (isLoading) {
    return (
      <div className="rounded-lg bg-white p-6 border border-gray-200 shadow-sm">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Blob History</h3>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  if (!blobs || blobs.length === 0) {
    return (
      <div className="rounded-lg bg-white p-6 border border-gray-200 shadow-sm">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Blob History</h3>
        <p className="text-gray-500 text-center py-8">
          No blobs submitted yet. Submit your first blob above!
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white p-6 border border-gray-200 shadow-sm">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Blob History</h3>
      
      <div className="space-y-4">
        {blobs.map((blob: BlobTx) => (
          <div key={blob.id} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-900">
                  Blob #{blob.id}
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  completed
                </span>
              </div>
              <span className="text-sm text-gray-500">
                {new Date(blob.createdAt).toLocaleString()}
              </span>
            </div>
            
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-gray-700">Namespace:</span>
                <span className="ml-2 font-mono text-gray-600">{blob.namespace}</span>
              </div>
              
              <div>
                <span className="font-medium text-gray-700">Address:</span>
                <span className="ml-2 text-gray-600">{blob.devAddr}</span>
              </div>
              
              {blob.txHash && (
                <div>
                  <span className="font-medium text-gray-700">Transaction:</span>
                  <a 
                    href={`https://mocha-4.celenium.io/tx/${blob.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-blue-600 hover:text-blue-800 font-mono text-xs"
                  >
                    {blob.txHash.slice(0, 8)}...{blob.txHash.slice(-8)}
                  </a>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
