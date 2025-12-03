/**
 * OnChainDB Status Script
 *
 * Check the current state of collections and document counts.
 *
 * Usage:
 *   pnpm db:status
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

const client = createClient({
  endpoint: ONCHAINDB_ENDPOINT,
  appId: ONCHAINDB_APP_ID,
  appKey: ONCHAINDB_APP_API_KEY,
  timeout: 30000,
});

const COLLECTIONS = [
  "users",
  "accounts",
  "addresses",
  "verification_tokens",
  "namespaces",
  "namespace_repos",
];

async function status() {
  console.log("📊 OnChainDB Status\n");
  console.log(`   Endpoint: ${ONCHAINDB_ENDPOINT}`);
  console.log(`   App ID: ${ONCHAINDB_APP_ID}\n`);
  console.log("─".repeat(50));
  console.log("Collection".padEnd(25) + "Documents".padStart(15));
  console.log("─".repeat(50));

  let totalDocs = 0;

  for (const collection of COLLECTIONS) {
    try {
      const docs = await client.findMany<{ deleted?: boolean }>(collection, {}, { limit: 1000 });
      const activeCount = docs.filter(d => !d.deleted).length;
      totalDocs += activeCount;
      console.log(collection.padEnd(25) + String(activeCount).padStart(15));
    } catch (error) {
      console.log(collection.padEnd(25) + "error".padStart(15));
    }
  }

  console.log("─".repeat(50));
  console.log("Total".padEnd(25) + String(totalDocs).padStart(15));
  console.log("─".repeat(50));
}

status().catch((error) => {
  console.error("Failed to get status:", error);
  process.exit(1);
});
