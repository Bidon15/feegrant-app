#!/usr/bin/env tsx
/**
 * OnChainDB Setup Script
 *
 * Creates all collections and indexes for the feegrant-app migration
 *
 * Usage: npx tsx scripts/setup-onchaindb.ts
 */

import "dotenv/config";

const API_URL = process.env.ONCHAINDB_API_URL || "http://localhost:3000";
const APP_ID = process.env.ONCHAINDB_APP_ID || "app_011ef0edbacd4391";

interface CollectionConfig {
  name: string;
  namespace: string;
  primary_column: string;
  sort_column: string;
}

interface IndexConfig {
  field_name: string;
  index_type: "hash" | "btree";
  unique: boolean;
  name: string;
}

const collections: Record<string, CollectionConfig> = {
  users: {
    name: "users",
    namespace: "users_ns",
    primary_column: "githubId",
    sort_column: "createdAt",
  },
  addresses: {
    name: "addresses",
    namespace: "addresses_ns",
    primary_column: "bech32",
    sort_column: "createdAt",
  },
  accounts: {
    name: "accounts",
    namespace: "accounts_ns",
    primary_column: "userId",
    sort_column: "id",
  },
  sessions: {
    name: "sessions",
    namespace: "sessions_ns",
    primary_column: "sessionToken",
    sort_column: "expires",
  },
  job_logs: {
    name: "job_logs",
    namespace: "job_logs_ns",
    primary_column: "id",
    sort_column: "createdAt",
  },
  verification_tokens: {
    name: "verification_tokens",
    namespace: "verification_tokens_ns",
    primary_column: "token",
    sort_column: "expires",
  },
};

const indexes: Record<string, IndexConfig[]> = {
  users: [
    {
      field_name: "githubId",
      index_type: "hash",
      unique: true,
      name: "idx_users_githubId",
    },
    {
      field_name: "email",
      index_type: "hash",
      unique: true,
      name: "idx_users_email",
    },
    {
      field_name: "id",
      index_type: "hash",
      unique: true,
      name: "idx_users_id",
    },
  ],
  addresses: [
    {
      field_name: "bech32",
      index_type: "hash",
      unique: true,
      name: "idx_addresses_bech32",
    },
    {
      field_name: "userId",
      index_type: "hash",
      unique: true,
      name: "idx_addresses_userId",
    },
    {
      field_name: "isDusted",
      index_type: "btree",
      unique: false,
      name: "idx_addresses_isDusted",
    },
    {
      field_name: "hasFeeGrant",
      index_type: "btree",
      unique: false,
      name: "idx_addresses_hasFeeGrant",
    },
  ],
  accounts: [
    {
      field_name: "userId",
      index_type: "hash",
      unique: false,
      name: "idx_accounts_userId",
    },
    {
      field_name: "provider",
      index_type: "hash",
      unique: false,
      name: "idx_accounts_provider",
    },
    {
      field_name: "providerAccountId",
      index_type: "hash",
      unique: false,
      name: "idx_accounts_providerAccountId",
    },
  ],
  sessions: [
    {
      field_name: "sessionToken",
      index_type: "hash",
      unique: true,
      name: "idx_sessions_sessionToken",
    },
    {
      field_name: "userId",
      index_type: "hash",
      unique: false,
      name: "idx_sessions_userId",
    },
    {
      field_name: "expires",
      index_type: "btree",
      unique: false,
      name: "idx_sessions_expires",
    },
  ],
  job_logs: [
    {
      field_name: "id",
      index_type: "hash",
      unique: true,
      name: "idx_job_logs_id",
    },
    {
      field_name: "jobName",
      index_type: "hash",
      unique: false,
      name: "idx_job_logs_jobName",
    },
    {
      field_name: "status",
      index_type: "btree",
      unique: false,
      name: "idx_job_logs_status",
    },
    {
      field_name: "createdAt",
      index_type: "btree",
      unique: false,
      name: "idx_job_logs_createdAt",
    },
    {
      field_name: "txHash",
      index_type: "hash",
      unique: false,
      name: "idx_job_logs_txHash",
    },
  ],
  verification_tokens: [
    {
      field_name: "token",
      index_type: "hash",
      unique: true,
      name: "idx_verification_tokens_token",
    },
    {
      field_name: "identifier",
      index_type: "hash",
      unique: false,
      name: "idx_verification_tokens_identifier",
    },
    {
      field_name: "expires",
      index_type: "btree",
      unique: false,
      name: "idx_verification_tokens_expires",
    },
  ],
};

async function createCollection(collection: CollectionConfig): Promise<void> {
  console.log(`📦 Creating collection: ${collection.name}...`);

  try {
    const response = await fetch(`${API_URL}/api/apps/${APP_ID}/collections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(collection),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ Failed to create collection ${collection.name}: ${error}`);
      return;
    }

    console.log(`✅ Created collection: ${collection.name}`);
  } catch (error) {
    console.error(`❌ Error creating collection ${collection.name}:`, error);
  }
}

async function createIndex(collectionName: string, index: IndexConfig): Promise<void> {
  console.log(`  🔍 Creating index: ${index.name}...`);

  try {
    const response = await fetch(
      `${API_URL}/api/apps/${APP_ID}/collections/${collectionName}/indexes`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(index),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error(`  ❌ Failed to create index ${index.name}: ${error}`);
      return;
    }

    console.log(`  ✅ Created index: ${index.name}`);
  } catch (error) {
    console.error(`  ❌ Error creating index ${index.name}:`, error);
  }
}

async function main() {
  console.log("🚀 Starting OnChainDB setup for feegrant-app\n");
  console.log(`📍 API URL: ${API_URL}`);
  console.log(`📱 App ID: ${APP_ID}\n`);

  // Create all collections
  for (const [key, collection] of Object.entries(collections)) {
    await createCollection(collection);

    // Small delay between operations
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log("\n");

  // Create all indexes
  for (const [collectionName, collectionIndexes] of Object.entries(indexes)) {
    console.log(`🔧 Setting up indexes for ${collectionName}:`);

    for (const index of collectionIndexes) {
      await createIndex(collectionName, index);

      // Small delay between operations
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    console.log("");
  }

  console.log("✅ OnChainDB setup complete!\n");
  console.log("📊 Summary:");
  console.log(`  - Collections created: ${Object.keys(collections).length}`);
  console.log(`  - Total indexes created: ${Object.values(indexes).flat().length}`);
  console.log("\nNext steps:");
  console.log("  1. Update .env with OnChainDB configuration");
  console.log("  2. Run migration script to import existing data");
  console.log("  3. Test the application with OnChainDB");
}

main().catch((error) => {
  console.error("❌ Setup failed:", error);
  process.exit(1);
});
