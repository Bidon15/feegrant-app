import { onchaindbClient, COLLECTIONS } from "~/server/db";
import { env } from "~/env";
import type { Index, CollectionSchema } from "@onchaindb/sdk";

// Collection schemas for data validation and structure
export const SCHEMAS: Record<string, CollectionSchema> = {
  users: {
    fields: {
      id: { type: "string", required: true, unique: true },
      githubId: { type: "string", required: true, unique: true },
      githubCreated: { type: "string", required: true },
      name: { type: "string" },
      email: { type: "string", unique: true },
      emailVerified: { type: "string" },
      image: { type: "string" },
      createdAt: { type: "string", required: true },
      updatedAt: { type: "string", required: true },
    },
    required: ["id", "githubId", "githubCreated", "createdAt", "updatedAt"],
  },

  accounts: {
    fields: {
      id: { type: "string", required: true, unique: true },
      userId: { type: "string", required: true, index: true },
      type: { type: "string", required: true },
      provider: { type: "string", required: true, index: true },
      providerAccountId: { type: "string", required: true, index: true },
      refresh_token: { type: "string" },
      access_token: { type: "string" },
      expires_at: { type: "number" },
      token_type: { type: "string" },
      scope: { type: "string" },
      id_token: { type: "string" },
      session_state: { type: "string" },
      refresh_token_expires_in: { type: "number" },
    },
    required: ["id", "userId", "type", "provider", "providerAccountId"],
    relationships: [
      {
        type: "one-to-many",
        collection: "users",
        localField: "userId",
        foreignField: "id",
        cascade: true,
      },
    ],
  },

  sessions: {
    fields: {
      id: { type: "string", required: true, unique: true },
      sessionToken: { type: "string", required: true, unique: true },
      userId: { type: "string", required: true, index: true },
      expires: { type: "string", required: true },
    },
    required: ["id", "sessionToken", "userId", "expires"],
    relationships: [
      {
        type: "one-to-many",
        collection: "users",
        localField: "userId",
        foreignField: "id",
        cascade: true,
      },
    ],
  },

  addresses: {
    fields: {
      id: { type: "string", required: true, unique: true },
      userId: { type: "string", required: true, unique: true, index: true },
      bech32: { type: "string", required: true, unique: true },
      isDusted: { type: "boolean", required: true },
      hasFeeGrant: { type: "boolean", required: true },
      feeAllowanceRemaining: { type: "string" },
      createdAt: { type: "string", required: true },
      updatedAt: { type: "string", required: true },
    },
    required: ["id", "userId", "bech32", "isDusted", "hasFeeGrant", "createdAt", "updatedAt"],
    relationships: [
      {
        type: "one-to-one",
        collection: "users",
        localField: "userId",
        foreignField: "id",
        cascade: false, // Don't delete address when user is deleted (blockchain record)
      },
    ],
  },

  job_logs: {
    fields: {
      id: { type: "string", required: true, unique: true },
      jobName: { type: "string", required: true, index: true },
      payload: { type: "object", required: true },
      status: { type: "string", required: true, index: true },
      txHash: { type: "string" },
      error: { type: "string" },
      createdAt: { type: "string", required: true },
      updatedAt: { type: "string", required: true },
    },
    required: ["id", "jobName", "payload", "status", "createdAt", "updatedAt"],
  },

  verification_tokens: {
    fields: {
      identifier: { type: "string", required: true, index: true },
      token: { type: "string", required: true, index: true },
      expires: { type: "string", required: true },
    },
    required: ["identifier", "token", "expires"],
  },
};

// Index definitions for optimized queries
type IndexDefinition = Omit<Index, "status" | "statistics">;

export const INDEXES: IndexDefinition[] = [
  // Users collection indexes
  {
    name: "idx_users_id",
    collection: COLLECTIONS.users,
    field_name: "id",
    index_type: "hash",
    options: { unique: true },
  },
  {
    name: "idx_users_email",
    collection: COLLECTIONS.users,
    field_name: "email",
    index_type: "hash",
    options: { unique: true, sparse: true }, // sparse: null emails are allowed
  },
  {
    name: "idx_users_githubId",
    collection: COLLECTIONS.users,
    field_name: "githubId",
    index_type: "hash",
    options: { unique: true },
  },
  {
    name: "idx_users_createdAt",
    collection: COLLECTIONS.users,
    field_name: "createdAt",
    index_type: "btree",
  },

  // Accounts collection indexes
  {
    name: "idx_accounts_id",
    collection: COLLECTIONS.accounts,
    field_name: "id",
    index_type: "hash",
    options: { unique: true },
  },
  {
    name: "idx_accounts_userId",
    collection: COLLECTIONS.accounts,
    field_name: "userId",
    index_type: "hash",
  },
  {
    name: "idx_accounts_provider_providerAccountId",
    collection: COLLECTIONS.accounts,
    field_name: "provider",
    index_type: "composite",
    fields: ["provider", "providerAccountId"],
    options: { unique: true },
  },

  // Sessions collection indexes (CRITICAL - queried on every request)
  {
    name: "idx_sessions_id",
    collection: COLLECTIONS.sessions,
    field_name: "id",
    index_type: "hash",
    options: { unique: true },
  },
  {
    name: "idx_sessions_sessionToken",
    collection: COLLECTIONS.sessions,
    field_name: "sessionToken",
    index_type: "hash",
    options: { unique: true },
  },
  {
    name: "idx_sessions_userId",
    collection: COLLECTIONS.sessions,
    field_name: "userId",
    index_type: "hash",
  },
  {
    name: "idx_sessions_expires",
    collection: COLLECTIONS.sessions,
    field_name: "expires",
    index_type: "btree",
  },

  // Addresses collection indexes
  {
    name: "idx_addresses_id",
    collection: COLLECTIONS.addresses,
    field_name: "id",
    index_type: "hash",
    options: { unique: true },
  },
  {
    name: "idx_addresses_userId",
    collection: COLLECTIONS.addresses,
    field_name: "userId",
    index_type: "hash",
    options: { unique: true }, // One address per user
  },
  {
    name: "idx_addresses_bech32",
    collection: COLLECTIONS.addresses,
    field_name: "bech32",
    index_type: "hash",
    options: { unique: true },
  },
  {
    name: "idx_addresses_isDusted",
    collection: COLLECTIONS.addresses,
    field_name: "isDusted",
    index_type: "hash",
  },
  {
    name: "idx_addresses_hasFeeGrant",
    collection: COLLECTIONS.addresses,
    field_name: "hasFeeGrant",
    index_type: "hash",
  },

  // Job logs collection indexes
  {
    name: "idx_job_logs_id",
    collection: COLLECTIONS.jobLogs,
    field_name: "id",
    index_type: "hash",
    options: { unique: true },
  },
  {
    name: "idx_job_logs_jobName",
    collection: COLLECTIONS.jobLogs,
    field_name: "jobName",
    index_type: "hash",
  },
  {
    name: "idx_job_logs_status",
    collection: COLLECTIONS.jobLogs,
    field_name: "status",
    index_type: "hash",
  },
  {
    name: "idx_job_logs_createdAt",
    collection: COLLECTIONS.jobLogs,
    field_name: "createdAt",
    index_type: "btree",
  },

  // Verification tokens collection indexes
  {
    name: "idx_verification_tokens_identifier_token",
    collection: COLLECTIONS.verificationTokens,
    field_name: "identifier",
    index_type: "composite",
    fields: ["identifier", "token"],
    options: { unique: true },
  },
];

// Collection configurations for creation
export const COLLECTION_CONFIGS = [
  {
    name: COLLECTIONS.users,
    namespace: `${env.ONCHAINDB_APP_ID}_users`,
    primary_column: "id",
    sort_column: "createdAt",
  },
  {
    name: COLLECTIONS.accounts,
    namespace: `${env.ONCHAINDB_APP_ID}_accounts`,
    primary_column: "id",
    sort_column: "userId",
  },
  {
    name: COLLECTIONS.sessions,
    namespace: `${env.ONCHAINDB_APP_ID}_sessions`,
    primary_column: "id",
    sort_column: "expires",
  },
  {
    name: COLLECTIONS.addresses,
    namespace: `${env.ONCHAINDB_APP_ID}_addresses`,
    primary_column: "id",
    sort_column: "createdAt",
  },
  {
    name: COLLECTIONS.jobLogs,
    namespace: `${env.ONCHAINDB_APP_ID}_job_logs`,
    primary_column: "id",
    sort_column: "createdAt",
  },
  {
    name: COLLECTIONS.verificationTokens,
    namespace: `${env.ONCHAINDB_APP_ID}_verification_tokens`,
    primary_column: "identifier",
    sort_column: "expires",
  },
];

// Schema initialization result
export interface SchemaInitResult {
  success: boolean;
  collections: { name: string; created: boolean; error?: string }[];
  indexes: { name: string; created: boolean; error?: string }[];
  errors: string[];
}

/**
 * Initialize the database schema with all collections and indexes.
 * This should be run once during app setup or deployment.
 */
export async function initializeSchema(): Promise<SchemaInitResult> {
  const result: SchemaInitResult = {
    success: true,
    collections: [],
    indexes: [],
    errors: [],
  };

  const dbManager = onchaindbClient.database(env.ONCHAINDB_APP_ID);

  // Step 1: Create collections
  console.log("[OnChainDB Schema] Creating collections...");
  for (const config of COLLECTION_CONFIGS) {
    try {
      await dbManager.createCollection(config.name, {
        namespace: config.namespace,
        primary_column: config.primary_column,
        sort_column: config.sort_column,
        schema_definition: SCHEMAS[config.name],
      });
      console.log(`[OnChainDB Schema] Created collection: ${config.name}`);
      result.collections.push({ name: config.name, created: true });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      // Collection might already exist, which is fine
      if (errorMsg.includes("already exists")) {
        console.log(`[OnChainDB Schema] Collection already exists: ${config.name}`);
        result.collections.push({ name: config.name, created: false, error: "already exists" });
      } else {
        console.error(`[OnChainDB Schema] Failed to create collection ${config.name}:`, errorMsg);
        result.collections.push({ name: config.name, created: false, error: errorMsg });
        result.errors.push(`Collection ${config.name}: ${errorMsg}`);
        result.success = false;
      }
    }
  }

  // Step 2: Create indexes
  console.log("[OnChainDB Schema] Creating indexes...");
  for (const indexDef of INDEXES) {
    try {
      await dbManager.createIndex(indexDef);
      console.log(`[OnChainDB Schema] Created index: ${indexDef.name}`);
      result.indexes.push({ name: indexDef.name, created: true });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      // Index might already exist, which is fine
      if (errorMsg.includes("already exists")) {
        console.log(`[OnChainDB Schema] Index already exists: ${indexDef.name}`);
        result.indexes.push({ name: indexDef.name, created: false, error: "already exists" });
      } else {
        console.error(`[OnChainDB Schema] Failed to create index ${indexDef.name}:`, errorMsg);
        result.indexes.push({ name: indexDef.name, created: false, error: errorMsg });
        result.errors.push(`Index ${indexDef.name}: ${errorMsg}`);
        result.success = false;
      }
    }
  }

  console.log("[OnChainDB Schema] Schema initialization complete");
  return result;
}

/**
 * Get the current schema status - lists all collections and indexes
 */
export async function getSchemaStatus() {
  const dbManager = onchaindbClient.database(env.ONCHAINDB_APP_ID);

  try {
    const [collections, indexes, stats] = await Promise.all([
      dbManager.listCollections(true),
      dbManager.listIndexes(undefined, true),
      dbManager.getDatabaseStats(),
    ]);

    return {
      success: true,
      collections,
      indexes,
      stats,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Verify that all required indexes exist
 */
export async function verifyIndexes(): Promise<{
  valid: boolean;
  missing: string[];
  existing: string[];
}> {
  const dbManager = onchaindbClient.database(env.ONCHAINDB_APP_ID);

  try {
    const existingIndexes = await dbManager.listIndexes();
    const existingNames = new Set(existingIndexes.map((idx) => idx.name));

    const missing: string[] = [];
    const existing: string[] = [];

    for (const indexDef of INDEXES) {
      if (existingNames.has(indexDef.name)) {
        existing.push(indexDef.name);
      } else {
        missing.push(indexDef.name);
      }
    }

    return {
      valid: missing.length === 0,
      missing,
      existing,
    };
  } catch (error) {
    return {
      valid: false,
      missing: INDEXES.map((i) => i.name),
      existing: [],
    };
  }
}
