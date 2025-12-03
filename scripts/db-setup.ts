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
  // Admin panel collections
  admins: "admins",
  adminFeegrants: "admin_feegrants",
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

  // Admins collection - users who can issue feegrants via authz
  { collection: COLLECTIONS.admins, field: "id", type: "hash" as const, unique: true },
  { collection: COLLECTIONS.admins, field: "celestiaAddress", type: "hash" as const, unique: true },
  { collection: COLLECTIONS.admins, field: "userId", type: "hash" as const },
  { collection: COLLECTIONS.admins, field: "isActive", type: "hash" as const },
  { collection: COLLECTIONS.admins, field: "createdAt", type: "btree" as const },

  // AdminFeegrants collection - feegrant history by admins
  { collection: COLLECTIONS.adminFeegrants, field: "id", type: "hash" as const, unique: true },
  { collection: COLLECTIONS.adminFeegrants, field: "adminId", type: "hash" as const },
  { collection: COLLECTIONS.adminFeegrants, field: "adminAddress", type: "hash" as const },
  { collection: COLLECTIONS.adminFeegrants, field: "recipientAddress", type: "hash" as const },
  { collection: COLLECTIONS.adminFeegrants, field: "status", type: "hash" as const },
  { collection: COLLECTIONS.adminFeegrants, field: "createdAt", type: "btree" as const },
];

// View definitions for pre-computed queries (SDK v0.0.7+)
// Views are materialized and auto-update when source data changes
const VIEWS = {
  // View 1: Admin feegrants with admin details (for dashboard)
  adminFeegrantsWithAdmin: {
    name: "admin_feegrants_with_admin",
    sourceCollections: [COLLECTIONS.adminFeegrants, COLLECTIONS.admins],
    description: "Feegrants enriched with admin info for dashboard display",
  },

  // View 2: Admin feegrants with recipient user info
  adminFeegrantsWithRecipient: {
    name: "admin_feegrants_with_recipient",
    sourceCollections: [COLLECTIONS.adminFeegrants, COLLECTIONS.users],
    description: "Feegrants enriched with recipient user info (when registered)",
  },

  // View 3: Aggregated admin stats for leaderboard
  adminStats: {
    name: "admin_stats",
    sourceCollections: [COLLECTIONS.adminFeegrants],
    description: "Aggregated feegrant stats per admin (total grants, amount, unique recipients)",
  },

  // View 4: Pending feegrants queue for backend processing
  adminFeegrantsQueue: {
    name: "admin_feegrants_queue",
    sourceCollections: [COLLECTIONS.adminFeegrants],
    description: "Pending/executing feegrants for backend job queue",
  },
} as const;

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

  // Create views (SDK v0.0.7+)
  console.log("\n👁️  Creating views...\n");

  // View 1: Admin feegrants with admin details
  // Joins admin_feegrants with admins on adminId = id
  try {
    const feegrantsWithAdminQuery = client
      .queryBuilder()
      .collection(COLLECTIONS.adminFeegrants)
      .joinOne("admin", COLLECTIONS.admins)
      .onField("id")
      .equals("$data.adminId")
      .selectFields(["name", "celestiaAddress", "isActive"])
      .build()
      .orderBy("createdAt")
      .selectAll()
      .limit(10000)
      .getQueryRequest();

    await db.createView(
      VIEWS.adminFeegrantsWithAdmin.name,
      VIEWS.adminFeegrantsWithAdmin.sourceCollections as unknown as string[],
      feegrantsWithAdminQuery
    );
    console.log(`   ✓ Created view: ${VIEWS.adminFeegrantsWithAdmin.name}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("already exists")) {
      console.log(`   ○ View already exists: ${VIEWS.adminFeegrantsWithAdmin.name}`);
    } else {
      console.error(`   ✗ Failed to create view ${VIEWS.adminFeegrantsWithAdmin.name}:`, message);
    }
  }

  // View 2: Admin feegrants with recipient user info
  // Joins admin_feegrants with users on recipientUserId = id
  try {
    const feegrantsWithRecipientQuery = client
      .queryBuilder()
      .collection(COLLECTIONS.adminFeegrants)
      .joinOne("recipient", COLLECTIONS.users)
      .onField("id")
      .equals("$data.recipientUserId")
      .selectFields(["name", "githubLogin", "image"])
      .build()
      .orderBy("createdAt")
      .selectAll()
      .limit(10000)
      .getQueryRequest();

    await db.createView(
      VIEWS.adminFeegrantsWithRecipient.name,
      VIEWS.adminFeegrantsWithRecipient.sourceCollections as unknown as string[],
      feegrantsWithRecipientQuery
    );
    console.log(`   ✓ Created view: ${VIEWS.adminFeegrantsWithRecipient.name}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("already exists")) {
      console.log(`   ○ View already exists: ${VIEWS.adminFeegrantsWithRecipient.name}`);
    } else {
      console.error(`   ✗ Failed to create view ${VIEWS.adminFeegrantsWithRecipient.name}:`, message);
    }
  }

  // View 3: Aggregated admin stats
  // Groups by adminId with sum/count aggregations
  try {
    await db.createView(
      VIEWS.adminStats.name,
      VIEWS.adminStats.sourceCollections as unknown as string[],
      {
        find: { status: "success" }, // Only count successful feegrants
        select: {},
        group_by: ["adminId", "adminAddress"],
        aggregate: {
          totalFeegrants: { $count: "*" },
          totalUtiaGranted: { $sum: "amountUtia" },
          uniqueRecipients: { $countDistinct: "recipientAddress" },
        },
        sort_by: ["totalFeegrants"],
        limit: 1000,
      }
    );
    console.log(`   ✓ Created view: ${VIEWS.adminStats.name}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("already exists")) {
      console.log(`   ○ View already exists: ${VIEWS.adminStats.name}`);
    } else {
      console.error(`   ✗ Failed to create view ${VIEWS.adminStats.name}:`, message);
    }
  }

  // View 4: Pending feegrants queue
  // Filters for pending/executing status for backend processing
  try {
    const queueQuery = client
      .queryBuilder()
      .collection(COLLECTIONS.adminFeegrants)
      .whereField("status")
      .in(["pending", "executing"])
      .orderBy("createdAt")
      .selectAll()
      .limit(1000)
      .getQueryRequest();

    await db.createView(
      VIEWS.adminFeegrantsQueue.name,
      VIEWS.adminFeegrantsQueue.sourceCollections as unknown as string[],
      queueQuery
    );
    console.log(`   ✓ Created view: ${VIEWS.adminFeegrantsQueue.name}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("already exists")) {
      console.log(`   ○ View already exists: ${VIEWS.adminFeegrantsQueue.name}`);
    } else {
      console.error(`   ✗ Failed to create view ${VIEWS.adminFeegrantsQueue.name}:`, message);
    }
  }

  console.log("\n✅ Schema setup complete!\n");
}

// Run setup
setup().catch((error) => {
  console.error("\n❌ Setup failed:", error);
  process.exit(1);
});
