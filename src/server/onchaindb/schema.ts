import { onchaindbClient, COLLECTIONS } from "~/server/db";
import { env } from "~/env";
import type { Index, CollectionSchema } from "@onchaindb/sdk";

// Materialized view definitions for optimized queries
export interface MaterializedViewDefinition {
  name: string;
  description: string;
  source_collections: string[];
  query: Record<string, unknown>;
}

export const MATERIALIZED_VIEWS: MaterializedViewDefinition[] = [
  // Leaderboard view: Join users with addresses for fast leaderboard queries
  {
    name: "leaderboard_view",
    description: "Pre-joined user and address data for leaderboard display",
    source_collections: [COLLECTIONS.addresses, COLLECTIONS.users],
    query: {
      collection: COLLECTIONS.addresses,
      join: {
        collection: COLLECTIONS.users,
        localField: "userId",
        foreignField: "id",
        as: "user",
      },
      select: [
        "id",
        "userId",
        "bech32",
        "isDusted",
        "hasFeeGrant",
        "feeAllowanceRemaining",
        "createdAt",
        "user.name",
        "user.email",
        "user.image",
      ],
      sort: { createdAt: -1 },
      limit: 100,
    },
  },
  // Network stats aggregation view
  {
    name: "network_stats_view",
    description: "Aggregated network statistics",
    source_collections: [COLLECTIONS.addresses],
    query: {
      collection: COLLECTIONS.addresses,
      aggregate: {
        total_addresses: { $count: "*" },
        dusted_count: { $sum: { $cond: ["isDusted", 1, 0] } },
        feegrant_count: { $sum: { $cond: ["hasFeeGrant", 1, 0] } },
      },
    },
  },
];

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

  // Note: sessions are handled via JWT cookies, not stored in database

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

  verification_tokens: {
    fields: {
      identifier: { type: "string", required: true, index: true },
      token: { type: "string", required: true, index: true },
      expires: { type: "string", required: true },
    },
    required: ["identifier", "token", "expires"],
  },

  namespaces: {
    fields: {
      id: { type: "string", required: true, unique: true },
      userId: { type: "string", required: true, index: true },
      name: { type: "string", required: true, unique: true },
      namespaceId: { type: "string", required: true, unique: true },
      description: { type: "string" },
      blobCount: { type: "number", required: true },
      totalBytes: { type: "number", required: true },
      lastActivityAt: { type: "string" },
      isActive: { type: "boolean", required: true },
      createdAt: { type: "string", required: true },
      updatedAt: { type: "string", required: true },
    },
    required: ["id", "userId", "name", "namespaceId", "blobCount", "totalBytes", "isActive", "createdAt", "updatedAt"],
    relationships: [
      {
        type: "one-to-many",
        collection: "users",
        localField: "userId",
        foreignField: "id",
        cascade: false,
      },
    ],
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
    name: "idx_accounts_provider",
    collection: COLLECTIONS.accounts,
    field_name: "provider",
    index_type: "hash",
  },
  {
    name: "idx_accounts_providerAccountId",
    collection: COLLECTIONS.accounts,
    field_name: "providerAccountId",
    index_type: "hash",
  },

  // Note: sessions are handled via JWT cookies, not stored in database

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

  // Verification tokens collection indexes
  {
    name: "idx_verification_tokens_identifier",
    collection: COLLECTIONS.verificationTokens,
    field_name: "identifier",
    index_type: "hash",
  },
  {
    name: "idx_verification_tokens_token",
    collection: COLLECTIONS.verificationTokens,
    field_name: "token",
    index_type: "hash",
  },

  // Namespaces collection indexes
  {
    name: "idx_namespaces_id",
    collection: COLLECTIONS.namespaces,
    field_name: "id",
    index_type: "hash",
    options: { unique: true },
  },
  {
    name: "idx_namespaces_userId",
    collection: COLLECTIONS.namespaces,
    field_name: "userId",
    index_type: "hash",
  },
  {
    name: "idx_namespaces_name",
    collection: COLLECTIONS.namespaces,
    field_name: "name",
    index_type: "hash",
    options: { unique: true },
  },
  {
    name: "idx_namespaces_namespaceId",
    collection: COLLECTIONS.namespaces,
    field_name: "namespaceId",
    index_type: "hash",
    options: { unique: true },
  },
  {
    name: "idx_namespaces_isActive",
    collection: COLLECTIONS.namespaces,
    field_name: "isActive",
    index_type: "hash",
  },
  {
    name: "idx_namespaces_blobCount",
    collection: COLLECTIONS.namespaces,
    field_name: "blobCount",
    index_type: "btree",
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
  // Note: sessions are handled via JWT cookies, not stored in database
  {
    name: COLLECTIONS.addresses,
    namespace: `${env.ONCHAINDB_APP_ID}_addresses`,
    primary_column: "id",
    sort_column: "createdAt",
  },
  {
    name: COLLECTIONS.verificationTokens,
    namespace: `${env.ONCHAINDB_APP_ID}_verification_tokens`,
    primary_column: "identifier",
    sort_column: "expires",
  },
  {
    name: COLLECTIONS.namespaces,
    namespace: `${env.ONCHAINDB_APP_ID}_namespaces`,
    primary_column: "id",
    sort_column: "createdAt",
  },
];

// Schema initialization result
export interface SchemaInitResult {
  success: boolean;
  collections: { name: string; created: boolean; error?: string }[];
  indexes: { name: string; created: boolean; error?: string }[];
  views: { name: string; created: boolean; error?: string }[];
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
    views: [],
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
      // Collection might already exist - 400 status or "already exists" message
      // OnChainDB returns 400 when collection already exists
      if (errorMsg.includes("already exists") || errorMsg.includes("400")) {
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
      // Index might already exist - 400 status or "already exists" message
      if (errorMsg.includes("already exists") || errorMsg.includes("400")) {
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

  // Step 3: Create materialized views via REST API
  // Note: Views are not supported via SDK DatabaseManager, must use direct HTTP calls
  console.log("[OnChainDB Schema] Creating materialized views...");
  for (const viewDef of MATERIALIZED_VIEWS) {
    try {
      const response = await fetch(`${env.ONCHAINDB_ENDPOINT}/apps/${env.ONCHAINDB_APP_ID}/views`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-App-Key": env.ONCHAINDB_APP_API_KEY,
        },
        body: JSON.stringify({
          name: viewDef.name,
          source_collections: viewDef.source_collections,
          query: viewDef.query,
          description: viewDef.description,
        }),
      });

      if (response.ok) {
        console.log(`[OnChainDB Schema] Created view: ${viewDef.name}`);
        result.views.push({ name: viewDef.name, created: true });
      } else {
        const errorData = await response.text();
        // View might already exist, which is fine
        if (errorData.includes("already exists") || response.status === 409) {
          console.log(`[OnChainDB Schema] View already exists: ${viewDef.name}`);
          result.views.push({ name: viewDef.name, created: false, error: "already exists" });
        } else {
          console.error(`[OnChainDB Schema] Failed to create view ${viewDef.name}:`, errorData);
          result.views.push({ name: viewDef.name, created: false, error: errorData });
          result.errors.push(`View ${viewDef.name}: ${errorData}`);
          // Don't fail the whole init for view errors - they're optional optimizations
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[OnChainDB Schema] Failed to create view ${viewDef.name}:`, errorMsg);
      result.views.push({ name: viewDef.name, created: false, error: errorMsg });
      result.errors.push(`View ${viewDef.name}: ${errorMsg}`);
      // Don't fail the whole init for view errors - they're optional optimizations
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
  } catch {
    return {
      valid: false,
      missing: INDEXES.map((i) => i.name),
      existing: [],
    };
  }
}
