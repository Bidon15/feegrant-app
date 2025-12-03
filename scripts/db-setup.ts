/**
 * OnChainDB Schema Setup Script
 *
 * This script creates all collections and indexes for the para-demo application.
 * Run this manually before deploying or when setting up a new environment.
 *
 * Usage:
 *   pnpm db:setup
 *
 * Prerequisites:
 *   - ONCHAINDB_ENDPOINT, ONCHAINDB_APP_ID, ONCHAINDB_APP_API_KEY must be set in .env
 */

import "dotenv/config";
import { createClient } from "@onchaindb/sdk";

const ONCHAINDB_ENDPOINT = process.env.ONCHAINDB_ENDPOINT ?? "https://api.onchaindb.io";
const ONCHAINDB_APP_ID = process.env.ONCHAINDB_APP_ID;
const ONCHAINDB_APP_API_KEY = process.env.ONCHAINDB_APP_API_KEY;

if (!ONCHAINDB_APP_ID || !ONCHAINDB_APP_API_KEY) {
  console.error("Missing required environment variables:");
  console.error("  ONCHAINDB_APP_ID:", ONCHAINDB_APP_ID ? "✓" : "✗");
  console.error("  ONCHAINDB_APP_API_KEY:", ONCHAINDB_APP_API_KEY ? "✓" : "✗");
  process.exit(1);
}

// Initialize client
const client = createClient({
  endpoint: ONCHAINDB_ENDPOINT,
  appId: ONCHAINDB_APP_ID,
  appKey: ONCHAINDB_APP_API_KEY,
  timeout: 30000,
  retryCount: 3,
  retryDelay: 1000,
});

// Collection definitions
const COLLECTIONS = {
  users: "users",
  accounts: "accounts",
  addresses: "addresses",
  verificationTokens: "verification_tokens",
  namespaces: "namespaces",
  namespaceRepos: "namespace_repos",
} as const;

// Index definitions for each collection
const INDEXES = [
  // Users collection
  { collection: COLLECTIONS.users, field: "id", type: "hash" as const, unique: true },
  { collection: COLLECTIONS.users, field: "githubId", type: "hash" as const, unique: true },
  { collection: COLLECTIONS.users, field: "email", type: "hash" as const },

  // Accounts collection
  { collection: COLLECTIONS.accounts, field: "id", type: "hash" as const, unique: true },
  { collection: COLLECTIONS.accounts, field: "userId", type: "hash" as const },
  { collection: COLLECTIONS.accounts, field: "provider", type: "hash" as const },
  { collection: COLLECTIONS.accounts, field: "providerAccountId", type: "hash" as const },

  // Addresses collection
  { collection: COLLECTIONS.addresses, field: "id", type: "hash" as const, unique: true },
  { collection: COLLECTIONS.addresses, field: "userId", type: "hash" as const, unique: true },
  { collection: COLLECTIONS.addresses, field: "bech32", type: "hash" as const, unique: true },

  // Verification tokens collection
  { collection: COLLECTIONS.verificationTokens, field: "token", type: "hash" as const, unique: true },
  { collection: COLLECTIONS.verificationTokens, field: "identifier", type: "hash" as const },

  // Namespaces collection
  { collection: COLLECTIONS.namespaces, field: "id", type: "hash" as const, unique: true },
  { collection: COLLECTIONS.namespaces, field: "userId", type: "hash" as const },
  { collection: COLLECTIONS.namespaces, field: "namespaceId", type: "hash" as const },
  { collection: COLLECTIONS.namespaces, field: "name", type: "hash" as const },
  { collection: COLLECTIONS.namespaces, field: "createdAt", type: "btree" as const },

  // NamespaceRepos collection (junction table)
  { collection: COLLECTIONS.namespaceRepos, field: "id", type: "hash" as const, unique: true },
  { collection: COLLECTIONS.namespaceRepos, field: "namespaceId", type: "hash" as const },
  { collection: COLLECTIONS.namespaceRepos, field: "userId", type: "hash" as const },
  { collection: COLLECTIONS.namespaceRepos, field: "repoId", type: "hash" as const },
];

async function setup() {
  console.log("🚀 Starting OnChainDB schema setup...\n");
  console.log(`   Endpoint: ${ONCHAINDB_ENDPOINT}`);
  console.log(`   App ID: ${ONCHAINDB_APP_ID}\n`);

  const db = client.database(ONCHAINDB_APP_ID!);

  // Note: OnChainDB collections are created implicitly when you first store data.
  // The createCollection API may not be available or may require specific permissions.
  // Collections will be auto-created on first document insert.
  console.log("📦 Collections (auto-created on first write):\n");
  for (const collection of Object.values(COLLECTIONS)) {
    console.log(`   • ${collection}`);
  }

  // Create indexes
  console.log("\n📇 Creating indexes...\n");
  for (const index of INDEXES) {
    const indexName = `idx_${index.collection}_${index.field}`;
    try {
      await db.createIndex({
        name: indexName,
        collection: index.collection,
        field_name: index.field,
        index_type: index.type,
        options: index.unique ? { unique: true } : {},
      });
      console.log(`   ✓ Created index: ${indexName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("already exists")) {
        console.log(`   ○ Index already exists: ${indexName}`);
      } else {
        console.error(`   ✗ Failed to create index ${indexName}:`, message);
      }
    }
  }

  console.log("\n✅ Schema setup complete!\n");
}

// Run setup
setup().catch((error) => {
  console.error("\n❌ Setup failed:", error);
  process.exit(1);
});
