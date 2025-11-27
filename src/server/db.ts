// Temporary stub while OnChainDB is disabled
// TODO: Re-enable when @onchaindb/sdk is available

// Collection names matching our data model
export const COLLECTIONS = {
  users: "users",
  accounts: "accounts",
  sessions: "sessions",
  addresses: "addresses",
  jobLogs: "job_logs",
  verificationTokens: "verification_tokens",
} as const;

// Type definitions for our data models
export interface User {
  id: string;
  githubId: string;
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

export interface Session {
  id: string;
  sessionToken: string;
  userId: string;
  expires: string; // ISO date string
}

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

export interface JobLog {
  id: string;
  jobName: string;
  payload: Record<string, unknown>;
  status: string;
  txHash: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VerificationToken {
  identifier: string;
  token: string;
  expires: string; // ISO date string
}

// Define the database client interface
interface FindManyOptions {
  limit?: number;
  offset?: number;
}

interface OnChainDBClient {
  findUnique<T>(collection: string, query: Record<string, unknown>): Promise<T | null>;
  findMany<T>(collection: string, query: Record<string, unknown>, options?: FindManyOptions): Promise<T[]>;
  createDocument<T>(collection: string, data: T): Promise<void>;
  updateDocument<T>(collection: string, query: Record<string, unknown>, data: Partial<T>): Promise<void>;
  deleteDocument(collection: string, query: Record<string, unknown>): Promise<void>;
}

// Stub client that throws when used
export const db: OnChainDBClient = {
  findUnique: async <T>(): Promise<T | null> => {
    throw new Error("OnChainDB is not configured. Please install @onchaindb/sdk");
  },
  findMany: async <T>(): Promise<T[]> => {
    throw new Error("OnChainDB is not configured. Please install @onchaindb/sdk");
  },
  createDocument: async (): Promise<void> => {
    throw new Error("OnChainDB is not configured. Please install @onchaindb/sdk");
  },
  updateDocument: async (): Promise<void> => {
    throw new Error("OnChainDB is not configured. Please install @onchaindb/sdk");
  },
  deleteDocument: async (): Promise<void> => {
    throw new Error("OnChainDB is not configured. Please install @onchaindb/sdk");
  },
};

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
