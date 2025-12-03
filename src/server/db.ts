import { createClient, type OnChainDBClient as SDKClient } from "@onchaindb/sdk";
import { env } from "~/env";
import { createPaymentCallback } from "~/server/onchaindb/payment";

// Collection names matching our data model
// Note: sessions are handled via JWT, not stored in database
export const COLLECTIONS = {
  users: "users",
  accounts: "accounts",
  addresses: "addresses",
  verificationTokens: "verification_tokens",
  namespaces: "namespaces",
  namespaceRepos: "namespace_repos", // Junction table: namespace <-> repo (many-to-many)
  // Admin panel collections
  admins: "admins",
  adminFeegrants: "admin_feegrants",
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
  createdAt: string;
  updatedAt: string;
}

// NamespaceRepo - Junction table linking namespaces to GitHub repos (many-to-many)
// Stores repo info directly to avoid extra lookups
export interface NamespaceRepo {
  id: string;
  namespaceId: string; // Reference to Namespace.id
  userId: string; // For easy querying
  // GitHub repo info (denormalized for performance)
  repoId: number; // GitHub repo ID
  fullName: string; // e.g., "owner/repo"
  name: string; // e.g., "repo"
  owner: string; // e.g., "owner"
  description: string | null;
  isPrivate: boolean;
  htmlUrl: string;
  language: string | null;
  stargazersCount: number;
  forksCount: number;
  createdAt: string;
}

// Admin - Users who can issue feegrants via authz
// Use case: RPC providers, ecosystem funds, hackathon sponsors
export interface Admin {
  id: string;
  celestiaAddress: string; // Admin's bech32 address (unique identifier)
  userId: string | null; // Optional link to GitHub user
  name: string; // Display name (e.g., "QuickNode DevRel")
  // Authz grant tracking - admin signs once to allow backend to execute MsgGrantAllowance
  hasAuthzGrant: boolean;
  authzGrantTxHash: string | null; // Tx hash of MsgGrant
  authzExpiresAt: string | null; // ISO date when authz expires
  // Default feegrant settings
  defaultAmountUtia: string; // Default amount for new feegrants (e.g., "10000000" = 10 TIA)
  defaultExpirationDays: number; // Default expiration in days (e.g., 30)
  // Activity tracking
  totalFeegrantsIssued: number;
  totalUtiaGranted: string; // BigInt as string for precision
  isActive: boolean; // Can be deactivated without deletion
  createdAt: string;
  updatedAt: string;
}

// AdminFeegrant - Individual feegrant issued by an admin
// Tracks the full lifecycle: pending → executing → success/failed
export interface AdminFeegrant {
  id: string;
  adminId: string; // FK → admins
  adminAddress: string; // Denormalized for queries without joins
  // Recipient info
  recipientAddress: string; // Celestia bech32 address receiving feegrant
  recipientUserId: string | null; // Optional link to user (if they're registered)
  recipientName: string | null; // Optional display name
  // Feegrant details
  amountUtia: string; // Amount in utia (e.g., "10000000" = 10 TIA)
  expiresAt: string | null; // ISO date when feegrant expires
  // Execution tracking
  txHash: string | null; // Tx hash of MsgExec(MsgGrantAllowance)
  status: "pending" | "executing" | "success" | "failed";
  errorMessage: string | null; // Error details if failed
  // Metadata
  note: string | null; // Admin's note (e.g., "Hackathon winner", "Active contributor")
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
      const result = await onchaindbClient.findUnique<T & Record<string, unknown> & { deleted?: boolean }>(
        collection,
        query
      );
      // Filter out soft-deleted documents
      if (result && result.deleted) {
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
      console.log(`[OnChainDB] findMany in ${collection}:`, { query, options });
      const result = await onchaindbClient.findMany<T & { deleted?: boolean }>(collection, query, {
        limit: options?.limit,
        sort: options?.sort,
      });
      console.log(`[OnChainDB] findMany result in ${collection}:`, { count: result.length });
      // Filter out soft-deleted documents
      return result.filter((item) => !item.deleted) as T[];
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

      console.log(`[OnChainDB] createDocument in ${collection}:`, { id: dataWithMeta.id });

      // Use the store method for write operations
      // This handles x402 payment flow automatically (SDK v0.0.7+)
      const result = await onchaindbClient.store(
        {
          collection,
          data: [dataWithMeta],
        },
        // Payment callback - will be invoked if server returns 402
        createPaymentCallback(),
        true // waitForConfirmation
      );

      console.log(`[OnChainDB] createDocument success in ${collection}:`, { id: dataWithMeta.id, result });

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

      // Store the updated document (SDK v0.0.7+)
      await onchaindbClient.store(
        {
          collection,
          data: [updated],
        },
        createPaymentCallback(),
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
      // First check if document exists and is not already deleted
      const existing = await onchaindbClient.findUnique<Record<string, unknown> & { deleted?: boolean }>(
        collection,
        query
      );
      if (!existing || existing.deleted) {
        console.log(`[OnChainDB] deleteDocument: Document not found or already deleted in ${collection}`);
        return false;
      }

      // Call SDK's deleteDocument with payment callback (SDK v0.0.7+)
      const result = await onchaindbClient.deleteDocument(
        collection,
        query,
        createPaymentCallback()
      );

      console.log(`[OnChainDB] deleteDocument: Result = ${result}`);
      return result;
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
      // OnChainDB countDocuments doesn't support deleted filter,
      // so we need to use findMany and filter manually
      const results = await onchaindbClient.findMany<{ deleted?: boolean }>(collection, query, {});
      return results.filter((item) => !item.deleted).length;
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
