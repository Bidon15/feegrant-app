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

// Check if we should use mock data (no API key yet)
const USE_MOCK = !env.CELENIUM_API_KEY;

// Generate mock data for development
function generateMockBlobs(namespaceId: string, count: number): CeleniumBlobLog[] {
  const blobs: CeleniumBlobLog[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const height = 2000000 + Math.floor(Math.random() * 100000);
    blobs.push({
      height,
      time: new Date(now - i * 3600000).toISOString(), // 1 hour apart
      size: Math.floor(Math.random() * 10000) + 100,
      namespace: {
        id: Math.floor(Math.random() * 1000),
        namespace_id: namespaceId,
        hash: `hash_${namespaceId}_${i}`,
        version: 0,
      },
      commitment: `commitment_${namespaceId}_${i}_${Math.random().toString(36).substring(7)}`,
      content_type: "application/octet-stream",
      tx: {
        id: height + i,
        hash: `tx_hash_${Math.random().toString(36).substring(7)}`,
        position: 0,
        gas_wanted: 200000,
        gas_used: 150000 + Math.floor(Math.random() * 50000),
        timeout_height: 0,
        events_count: 3,
        messages_count: 1,
        fee: String(Math.floor(Math.random() * 5000) + 1000),
        status: "success",
        error: null,
        codespace: "",
        signer: `celestia1${Math.random().toString(36).substring(2, 15)}`,
      },
    });
  }

  return blobs;
}

function generateMockNamespace(namespaceId: string): CeleniumNamespace {
  return {
    id: Math.floor(Math.random() * 10000),
    size: Math.floor(Math.random() * 100000) + 1000,
    version: 0,
    namespace_id: namespaceId,
    hash: `hash_${namespaceId}`,
    pfb_count: Math.floor(Math.random() * 50) + 1,
    reserved: false,
    last_height: 2000000 + Math.floor(Math.random() * 100000),
    last_message_time: new Date().toISOString(),
  };
}

function generateMockStats(_namespaceId: string): CeleniumNamespaceStats {
  return {
    size: Math.floor(Math.random() * 100000) + 1000,
    blobs_count: Math.floor(Math.random() * 50) + 1,
    fee: String(Math.floor(Math.random() * 50000) + 5000),
    commits_count: Math.floor(Math.random() * 30) + 1,
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
 * Get namespace information by namespace ID (hex)
 */
export async function getNamespace(namespaceId: string): Promise<CeleniumNamespace | null> {
  // Return mock data if no API key
  if (USE_MOCK) {
    console.log("[Celenium] Using mock data for getNamespace (no API key)");
    return generateMockNamespace(namespaceId);
  }

  try {
    const response = await fetch(`${CELENIUM_API_BASE}/namespace/${namespaceId}`, {
      headers: {
        "Authorization": `Bearer ${env.CELENIUM_API_KEY}`,
      },
    });
    if (!response.ok) {
      if (response.status === 404) return null;
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
  options?: { limit?: number; offset?: number }
): Promise<CeleniumBlobLog[]> {
  // Return mock data if no API key
  if (USE_MOCK) {
    console.log("[Celenium] Using mock data for getNamespaceBlobs (no API key)");
    const count = options?.limit ?? 10;
    return generateMockBlobs(namespaceId, count);
  }

  try {
    const params = new URLSearchParams();
    if (options?.limit) params.set("limit", String(options.limit));
    if (options?.offset) params.set("offset", String(options.offset));

    const url = `${CELENIUM_API_BASE}/namespace/${namespaceId}/blobs${params.toString() ? `?${params}` : ""}`;
    const response = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${env.CELENIUM_API_KEY}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) return [];
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
  // Return mock data if no API key
  if (USE_MOCK) {
    console.log("[Celenium] Using mock data for getAddressBlobs (no API key)");
    const count = options?.limit ?? 10;
    const blobs = generateMockBlobs("mock_namespace", count);
    return { total: count + Math.floor(Math.random() * 20), items: blobs };
  }

  try {
    const params = new URLSearchParams();
    if (options?.limit) params.set("limit", String(options.limit));
    if (options?.offset) params.set("offset", String(options.offset));

    const url = `${CELENIUM_API_BASE}/address/${address}/blobs${params.toString() ? `?${params}` : ""}`;
    const response = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${env.CELENIUM_API_KEY}`,
      },
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
  // Return mock data if no API key
  if (USE_MOCK) {
    console.log("[Celenium] Using mock data for getBlob (no API key)");
    return {
      namespace: namespaceId,
      data: Buffer.from("Mock blob data from BlobCell").toString("base64"),
      share_version: 0,
      commitment,
      content_type: "application/octet-stream",
    };
  }

  try {
    const response = await fetch(
      `${CELENIUM_API_BASE}/blob/${namespaceId}/${commitment}`,
      {
        headers: {
          "Authorization": `Bearer ${env.CELENIUM_API_KEY}`,
        },
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
 * Get namespace statistics (aggregated data)
 */
export async function getNamespaceStats(namespaceId: string): Promise<CeleniumNamespaceStats | null> {
  // Return mock data if no API key
  if (USE_MOCK) {
    console.log("[Celenium] Using mock data for getNamespaceStats (no API key)");
    return generateMockStats(namespaceId);
  }

  try {
    const response = await fetch(`${CELENIUM_API_BASE}/namespace/${namespaceId}/stats`, {
      headers: {
        "Authorization": `Bearer ${env.CELENIUM_API_KEY}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Celenium API error: ${response.status}`);
    }

    return await response.json() as CeleniumNamespaceStats;
  } catch (error) {
    console.error("[Celenium] getNamespaceStats error:", error);
    return null;
  }
}

// Re-export formatBytes from shared utilities for convenience
export { formatBytes } from "~/lib/formatting";
