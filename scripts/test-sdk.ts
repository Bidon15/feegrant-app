#!/usr/bin/env tsx
/**
 * Test SDK connection following TodoService pattern
 */

import "dotenv/config";
import { createClient } from "@enidon-ai/sdk";

const API_URL = process.env.ONCHAINDB_API_URL || "http://localhost:9092";
const APP_ID = process.env.ONCHAINDB_APP_ID || "app_011ef0edbacd4391";

async function main() {
  console.log("🔧 Testing OnChainDB SDK connection (TodoService pattern)...\n");
  console.log(`📍 API URL: ${API_URL}`);
  console.log(`📱 App ID: ${APP_ID}\n`);

  try {
    // Create SDK client following TodoService pattern
    const client = createClient({
      endpoint: API_URL,
      apiKey: "dev_key_12345678901234567890123456789012",
      appId: APP_ID,
    });

    console.log("✅ SDK client created successfully\n");

    // Test a simple query on 'main' collection (like TodoService uses)
    console.log("🔍 Testing query functionality on 'main' collection...");
    const result = await client.queryBuilder()
      .collection("main")
      .selectAll()
      .limit(5)
      .execute();

    console.log("✅ Query executed successfully");
    console.log(`📊 Records found: ${result.records?.length || 0}`);

    if (result.records && result.records.length > 0) {
      console.log("📄 Sample record:", JSON.stringify(result.records[0], null, 2));
    }

    console.log("\n🎉 SDK connection test passed!");
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    if (error.response) {
      console.error("Response data:", error.response.data);
      console.error("Response status:", error.response.status);
    }
    console.error("Stack:", error.stack);
    process.exit(1);
  }
}

main();
