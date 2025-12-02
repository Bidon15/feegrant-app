import { createClient, type OnChainDBClient as SDKClient } from "@onchaindb/sdk";
import { env } from "~/env";
import { createPaymentCallback, type PaymentQuote } from "~/server/onchaindb/payment";

// Collection names matching our data model
// Note: sessions are handled via JWT, not stored in database
export const COLLECTIONS = {
  users: "users",
  accounts: "accounts",
  addresses: "addresses",
  verificationTokens: "verification_tokens",
  namespaces: "namespaces",
  linkedRepos: "linked_repos",
} as const;

// Type definitions for our data models
export interface User {
  id: string;
  githubId: string;
  githubLogin: string; // GitHub username for profile URL
  githubCreated: string; // ISO date string
  name: string | null;
  email: string | null;
  emailVerified: string | null; // ISO date string
  image: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Account {
  id: string;
  userId: string;
  type: string;
  provider: string;
  providerAccountId: string;
  refresh_token: string | null;
  access_token: string | null;
  expires_at: number | null;
  token_type: string | null;
  scope: string | null;
  id_token: string | null;
  session_state: string | null;
  refresh_token_expires_in: number | null;
}

// Sessions are handled via JWT cookies, not stored in database

export interface Address {
  id: string;
  userId: string;
  bech32: string;
  isDusted: boolean;
  hasFeeGrant: boolean;
  feeAllowanceRemaining: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VerificationToken {
  identifier: string;
  token: string;
  expires: string; // ISO date string
}

// Namespace - Celestia blob namespace owned by a user
export interface Namespace {
  id: string;
  userId: string;
  name: string; // e.g., "myapp/production"
  namespaceId: string; // Celestia namespace ID (hex)
  description: string | null;
  blobCount: number;
  totalBytes: number;
  lastActivityAt: string | null;
  isActive: boolean;
  linkedRepoId: string | null; // Reference to LinkedRepo.id (one repo can have many namespaces)
  createdAt: string;
  updatedAt: string;
}

// LinkedRepo - GitHub repository linked to a user's BlobCell profile
export interface LinkedRepo {
  id: string;
  userId: string;
  repoId: number; // GitHub repo ID
  fullName: string; // e.g., "owner/repo"
  name: string; // e.g., "repo"
  owner: string; // e.g., "owner"
  description: string | null;
  isPrivate: boolean;
  htmlUrl: string;
  defaultBranch: string;
  language: string | null;
  stargazersCount: number;
  forksCount: number;
  createdAt: string;
  updatedAt: string;
}

// Initialize OnChainDB client
const onchaindbClient: SDKClient = createClient({
  endpoint: env.ONCHAINDB_ENDPOINT,
  appId: env.ONCHAINDB_APP_ID,
  appKey: env.ONCHAINDB_APP_API_KEY,
  timeout: 30000,
  retryCount: 3,
  retryDelay: 1000,
});

// Export the app wallet address for payment operations
export const ONCHAINDB_APP_WALLET = env.ONCHAINDB_APP_WALLET;

// Helper function to generate IDs (similar to cuid)
export function generateId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `${timestamp}${randomPart}`;
}

// Helper function to get current ISO timestamp
export function nowISO(): string {
  return new Date().toISOString();
}

// Define the database client interface for our wrapper
interface FindManyOptions {
  limit?: number;
  offset?: number;
  sort?: { field: string; order: "asc" | "desc" };
}

interface DBClient {
  findUnique<T>(
    collection: string,
    query: Record<string, unknown>
  ): Promise<T | null>;
  findMany<T>(
    collection: string,
    query: Record<string, unknown>,
    options?: FindManyOptions
  ): Promise<T[]>;
  createDocument<T>(collection: string, data: T): Promise<T>;
  updateDocument<T>(
    collection: string,
    query: Record<string, unknown>,
    data: Partial<T>
  ): Promise<T | null>;
  deleteDocument(
    collection: string,
    query: Record<string, unknown>
  ): Promise<boolean>;
  countDocuments(
    collection: string,
    query: Record<string, unknown>
  ): Promise<number>;
}

// Wrapper around OnChainDB client with simplified interface
// Uses the store() method with payment callbacks for write operations
export const db: DBClient = {
  async findUnique<T>(
    collection: string,
    query: Record<string, unknown>
  ): Promise<T | null> {
    try {
      const result = await onchaindbClient.findUnique<T & Record<string, unknown> & { _deleted?: boolean }>(
        collection,
        query
      );
      // Filter out soft-deleted documents
      if (result && result._deleted) {
        return null;
      }
      return result as T | null;
    } catch (error) {
      console.error(`[OnChainDB] findUnique error in ${collection}:`, error);
      // Re-throw the error instead of silently returning null
      // This prevents false negatives on validation checks (e.g., duplicate address detection)
      throw error;
    }
  },

  async findMany<T>(
    collection: string,
    query: Record<string, unknown>,
    options?: FindManyOptions
  ): Promise<T[]> {
    try {
      const result = await onchaindbClient.findMany<T & { _deleted?: boolean }>(collection, query, {
        limit: options?.limit,
        sort: options?.sort,
      });
      // Filter out soft-deleted documents
      return result.filter((item) => !item._deleted) as T[];
    } catch (error) {
      console.error(`[OnChainDB] findMany error in ${collection}:`, error);
      return [];
    }
  },

  async createDocument<T>(collection: string, data: T): Promise<T> {
    try {
      // Add timestamps and ID if not present
      const now = nowISO();
      const record = data as Record<string, unknown>;
      const dataWithMeta = {
        ...record,
        id: (record.id as string) || generateId(),
        createdAt: (record.createdAt as string) || now,
        updatedAt: (record.updatedAt as string) || now,
      };

      // Use the store method for write operations
      // This handles x402 payment flow automatically
      await onchaindbClient.store(
        {
          collection,
          data: [dataWithMeta],
        },
        // Payment callback - will be invoked if server returns 402
        createPaymentCallback() as (quote: PaymentQuote) => Promise<{ txHash: string; network?: string }>,
        true // waitForConfirmation
      );

      return dataWithMeta as T;
    } catch (error) {
      console.error(
        `[OnChainDB] createDocument error in ${collection}:`,
        error
      );
      throw error;
    }
  },

  async updateDocument<T>(
    collection: string,
    query: Record<string, unknown>,
    data: Partial<T>
  ): Promise<T | null> {
    try {
      // First find the existing document
      const existing = await onchaindbClient.findUnique<T & Record<string, unknown>>(
        collection,
        query
      );
      if (!existing) {
        return null;
      }

      // Merge with updates
      const updated = {
        ...existing,
        ...(data as Record<string, unknown>),
        updatedAt: nowISO(),
      };

      // Store the updated document
      await onchaindbClient.store(
        {
          collection,
          data: [updated],
        },
        createPaymentCallback() as (quote: PaymentQuote) => Promise<{ txHash: string; network?: string }>,
        true
      );

      return updated as T;
    } catch (error) {
      console.error(
        `[OnChainDB] updateDocument error in ${collection}:`,
        error
      );
      return null;
    }
  },

  async deleteDocument(
    collection: string,
    query: Record<string, unknown>
  ): Promise<boolean> {
    try {
      // OnChainDB doesn't have a direct delete via store
      // We need to use the deleteDocument method with payment proof
      // For now, we'll mark as deleted with a flag
      const existing = await onchaindbClient.findUnique<Record<string, unknown>>(
        collection,
        query
      );
      if (!existing) {
        return false;
      }

      // Soft delete by marking as deleted
      await onchaindbClient.store(
        {
          collection,
          data: [{ ...existing, _deleted: true, updatedAt: nowISO() }],
        },
        createPaymentCallback() as (quote: PaymentQuote) => Promise<{ txHash: string; network?: string }>,
        true
      );

      return true;
    } catch (error) {
      console.error(
        `[OnChainDB] deleteDocument error in ${collection}:`,
        error
      );
      return false;
    }
  },

  async countDocuments(
    collection: string,
    query: Record<string, unknown>
  ): Promise<number> {
    try {
      // OnChainDB countDocuments doesn't support _deleted filter,
      // so we need to use findMany and filter manually
      const results = await onchaindbClient.findMany<{ _deleted?: boolean }>(collection, query, {});
      return results.filter((item) => !item._deleted).length;
    } catch (error) {
      console.error(
        `[OnChainDB] countDocuments error in ${collection}:`,
        error
      );
      return 0;
    }
  },
};

// Export the raw client for advanced operations that need direct access
export { onchaindbClient };
