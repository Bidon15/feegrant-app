"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

export function BlobSubmit() {
  const [blobData, setBlobData] = useState("");
  const [namespace, setNamespace] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { data: user } = api.user.me.useQuery();
  const utils = api.useUtils();

  const submitBlobMutation = api.blob.submit.useMutation({
    onSuccess: (result) => {
      setSuccess(`Blob submitted successfully! Transaction: ${result.txHash}`);
      setBlobData("");
      setNamespace("");
      setError(null);
      utils.blob.txs.invalidate();
    },
    onError: (error) => {
      setError(error.message);
      setSuccess(null);
    },
  });

  const generateNamespace = () => {
    // Generate namespace following ADR-015: 0x00 + 18 zeros + 10 random bytes
    const randomHex = Array.from({ length: 10 }, () => 
      Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
    ).join('');
    const newNamespace = '00' + '0'.repeat(36) + randomHex;
    setNamespace(newNamespace);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!blobData.trim()) {
      setError("Please enter blob data");
      return;
    }

    if (!namespace.trim()) {
      setError("Please generate or enter a namespace");
      return;
    }

    if (namespace.length !== 58) {
      setError("Namespace must be exactly 58 characters (29 bytes in hex)");
      return;
    }

    if (new Blob([blobData]).size > 2 * 1024 * 1024) {
      setError("Blob data must be less than 2MB");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // Convert text to base64
      const blobBase64 = Buffer.from(blobData, 'utf-8').toString('base64');
      
      await submitBlobMutation.mutateAsync({
        namespace,
        blobBase64,
      });
    } catch (err) {
      // Error handled by mutation
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = user?.address?.isDusted && user?.address?.hasAuthzGranted;

  if (!user?.address) {
    return (
      <div className="rounded-lg bg-yellow-50 p-4 border border-yellow-200">
        <p className="text-yellow-800">Please connect and bind your Para wallet first.</p>
      </div>
    );
  }

  if (!canSubmit) {
    return (
      <div className="rounded-lg bg-yellow-50 p-4 border border-yellow-200">
        <h3 className="text-lg font-medium text-yellow-800 mb-2">Setup Required</h3>
        <div className="space-y-2 text-sm text-yellow-700">
          <p>Before submitting blobs, you need to:</p>
          <ul className="list-disc list-inside space-y-1">
            {!user.address.isDusted && <li>Get your address dusted (receive initial TIA)</li>}
            {!user.address.hasAuthzGranted && <li>Grant authorization to the backend</li>}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-white p-6 border border-gray-200 shadow-sm">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Submit Blob to Celestia
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="namespace" className="block text-sm font-medium text-gray-700 mb-2">
              Namespace
            </label>
            <div className="flex space-x-2">
              <input
                id="namespace"
                type="text"
                value={namespace}
                onChange={(e) => setNamespace(e.target.value)}
                placeholder="Generate or enter a 58-character namespace..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                type="button"
                onClick={generateNamespace}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Generate
              </button>
            </div>
            <div className="mt-1 text-xs text-gray-500">
              Namespace: {namespace.length}/58 characters (follows ADR-015 format)
            </div>
          </div>

          <div>
            <label htmlFor="blob-data" className="block text-sm font-medium text-gray-700 mb-2">
              Blob Data
            </label>
            <textarea
              id="blob-data"
              rows={6}
              value={blobData}
              onChange={(e) => setBlobData(e.target.value)}
              placeholder="Enter your blob data here (max 2MB)..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="mt-1 text-xs text-gray-500">
              Size: {new Blob([blobData]).size} bytes / 2MB max
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          {success && (
            <div className="rounded-md bg-green-50 p-4">
              <div className="text-sm text-green-700">{success}</div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || submitBlobMutation.isPending || !blobData.trim() || !namespace.trim()}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isSubmitting || submitBlobMutation.isPending ? "Submitting..." : "Submit Blob"}
          </button>
        </form>

        <div className="mt-4 text-xs text-gray-500 space-y-1">
          <p>• Blobs are submitted to Celestia Mocha testnet</p>
          <p>• Backend pays transaction fees via Authz delegation</p>
          <p>• Namespace follows ADR-015 format</p>
        </div>
      </div>
    </div>
  );
}
