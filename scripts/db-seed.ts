/**
 * OnChainDB Seed Script
 *
 * Seed the database with initial/test data.
 * This is optional and typically used for development.
 *
 * Usage:
 *   pnpm db:seed
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

function generateId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `${timestamp}${randomPart}`;
}

function nowISO(): string {
  return new Date().toISOString();
}

async function seed() {
  console.log("🌱 Seeding OnChainDB...\n");

  // Add your seed data here
  // Example:
  // const testUser = {
  //   id: generateId(),
  //   githubId: "test-123",
  //   githubLogin: "testuser",
  //   githubCreated: "2020-01-01T00:00:00.000Z",
  //   name: "Test User",
  //   email: "test@example.com",
  //   emailVerified: null,
  //   image: null,
  //   createdAt: nowISO(),
  //   updatedAt: nowISO(),
  // };
  //
  // await client.store({
  //   collection: "users",
  //   data: [testUser],
  // });
  // console.log("   ✓ Created test user");

  console.log("\n⚠️  No seed data configured. Edit scripts/db-seed.ts to add data.\n");
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
