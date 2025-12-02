/**
 * Celenium API Client
 *
 * Client for fetching Celestia blob and namespace data from Celenium API.
 * Docs: https://api-docs.celenium.io/
 *
 * We use Celenium instead of storing blobs locally since they already
 * index all Celestia data and provide efficient query APIs.
 */

import { env } from "~/env";

// Base URL for Celenium API (mocha testnet)
const CELENIUM_API_BASE = "https://api-mocha-4.celenium.io/v1";

// Get authorization headers
function getHeaders(): HeadersInit {
  return {
    "Authorization": `Bearer ${env.CELENIUM_API_KEY}`,
  };
}

// Types matching Celenium API responses

export interface CeleniumNamespace {
  id: number;
  size: number;
  version: number;
  namespace_id: string; // hex string
  hash: string;
  pfb_count: number;
  reserved: boolean;
  last_height: number;
  last_message_time: string;
}

export interface CeleniumBlob {
  namespace: string;
  data: string; // base64 encoded
  share_version: number;
  commitment: string;
  content_type: string;
}

export interface CeleniumBlobLog {
  height: number;
  time: string;
  size: number;
  namespace: {
    id: number;
    namespace_id: string;
    hash: string;
    version: number;
  };
  commitment: string;
  content_type: string;
  tx: {
    id: number;
    hash: string;
    position: number;
    gas_wanted: number;
    gas_used: number;
    timeout_height: number;
    events_count: number;
    messages_count: number;
    fee: string;
    status: string;
    error: string | null;
    codespace: string;
    signer: string;
  };
}

export interface CeleniumAddressBlobs {
  total: number;
  items: CeleniumBlobLog[];
}

export interface CeleniumNamespaceStats {
  size: number;
  blobs_count: number;
  fee: string;
  commits_count: number;
}

// API client functions

/**
 * Get namespace information by namespace ID (hex) and version
 * The namespace ID must be 56 characters hex and version is typically 0
 */
export async function getNamespace(namespaceId: string, version = 0): Promise<CeleniumNamespace | null> {
  try {
    // API requires /namespace/{id}/{version} format
    const response = await fetch(`${CELENIUM_API_BASE}/namespace/${namespaceId}/${version}`, {
      headers: getHeaders(),
    });
    if (!response.ok) {
      if (response.status === 404 || response.status === 204) return null;
      throw new Error(`Celenium API error: ${response.status}`);
    }
    return await response.json() as CeleniumNamespace;
  } catch (error) {
    console.error("[Celenium] getNamespace error:", error);
    return null;
  }
}

/**
 * Get blobs for a specific namespace
 */
export async function getNamespaceBlobs(
  namespaceId: string,
  options?: { limit?: number; offset?: number; version?: number }
): Promise<CeleniumBlobLog[]> {
  try {
    const params = new URLSearchParams();
    if (options?.limit) params.set("limit", String(options.limit));
    if (options?.offset) params.set("offset", String(options.offset));

    const version = options?.version ?? 0;
    const url = `${CELENIUM_API_BASE}/namespace/${namespaceId}/${version}/blobs${params.toString() ? `?${params}` : ""}`;
    const response = await fetch(url, {
      headers: getHeaders(),
    });

    if (!response.ok) {
      if (response.status === 404 || response.status === 204) return [];
      throw new Error(`Celenium API error: ${response.status}`);
    }

    return await response.json() as CeleniumBlobLog[];
  } catch (error) {
    console.error("[Celenium] getNamespaceBlobs error:", error);
    return [];
  }
}

/**
 * Get blobs submitted by a specific address
 */
export async function getAddressBlobs(
  address: string,
  options?: { limit?: number; offset?: number }
): Promise<CeleniumAddressBlobs> {
  try {
    const params = new URLSearchParams();
    if (options?.limit) params.set("limit", String(options.limit));
    if (options?.offset) params.set("offset", String(options.offset));

    const url = `${CELENIUM_API_BASE}/address/${address}/blobs${params.toString() ? `?${params}` : ""}`;
    const response = await fetch(url, {
      headers: getHeaders(),
    });

    if (!response.ok) {
      if (response.status === 404) return { total: 0, items: [] };
      throw new Error(`Celenium API error: ${response.status}`);
    }

    return await response.json() as CeleniumAddressBlobs;
  } catch (error) {
    console.error("[Celenium] getAddressBlobs error:", error);
    return { total: 0, items: [] };
  }
}

/**
 * Get a specific blob by namespace and commitment
 */
export async function getBlob(
  namespaceId: string,
  commitment: string
): Promise<CeleniumBlob | null> {
  try {
    const response = await fetch(
      `${CELENIUM_API_BASE}/blob/${namespaceId}/${commitment}`,
      {
        headers: getHeaders(),
      }
    );

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Celenium API error: ${response.status}`);
    }

    return await response.json() as CeleniumBlob;
  } catch (error) {
    console.error("[Celenium] getBlob error:", error);
    return null;
  }
}

/**
 * Get namespace statistics (from namespace info)
 * Note: The Celenium API doesn't have a separate stats endpoint.
 * Stats are included in the namespace response (pfb_count, size, etc.)
 */
export async function getNamespaceStats(namespaceId: string, version = 0): Promise<CeleniumNamespaceStats | null> {
  const ns = await getNamespace(namespaceId, version);
  if (!ns) return null;

  return {
    size: ns.size,
    blobs_count: ns.pfb_count,
    fee: "0", // Fee data not available in namespace response
    commits_count: ns.pfb_count,
  };
}

// Re-export formatBytes from shared utilities for convenience
export { formatBytes } from "~/lib/formatting";
