/**
 * OnChainDB Client for feegrant-app
 *
 * Uses the local OnChainDB SDK from ../../../sdk
 * The SDK now includes native Prisma-like methods directly in the client.
 */

import { createClient, OnChainDBClient, DatabaseManager } from '@enidon-ai/sdk';
import { env } from "~/env";
import { createId } from "@paralleldrive/cuid2";

// SDK Client instance
let client: OnChainDBClient;
let dbManager: DatabaseManager;

/**
 * Initialize the OnChainDB client
 */
export function initializeClient() {
  if (!client) {
    // Create SDK client with native CRUD methods
    client = createClient({
      endpoint: env.ONCHAINDB_API_URL,
      apiKey: env.ONCHAINDB_APP_HASH,
      appId: env.ONCHAINDB_APP_ID,
    });

    // Get database manager for schema operations
    dbManager = client.database(env.ONCHAINDB_APP_ID);
  }

  return { client, dbManager };
}

// Auto-initialize on import
const {client: dbC } = initializeClient();

/**
 * Payment proof structure for write operations
 */
export interface PaymentProof {
  payment_tx_hash: string;
  user_address: string;
  broker_address: string;
  amount_utia: number;
}

// Export the SDK client directly - it now has all the Prisma-like methods built in!
export const db = dbC;

// Also export the database manager for schema operations
export { dbManager };

/**
 * Create a dummy payment proof for app-paid writes (pay_from_wallet mode)
 * TODO: Implement proper payment handling when integrating with wallet system
 */
export function createAppPaymentProof(): PaymentProof {
  return {
    payment_tx_hash: "APP_WALLET_PAYMENT",
    user_address: env.ONCHAINDB_BROKER_ADDRESS || "celestia1default",
    broker_address: env.ONCHAINDB_BROKER_ADDRESS || "celestia1default",
    amount_utia: 0, // App pays, not user
  };
}

/**
 * Helper to use SDK native methods with createId from cuid2
 * The SDK's native CRUD methods can accept a custom idGenerator
 */
export function createDocumentWithCuid<T extends Record<string, any>>(
  collection: string,
  data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>,
  paymentProof: PaymentProof
): Promise<T> {
  return db.createDocument<T>(collection, data, paymentProof, {
    idGenerator: createId
  });
}

/**
 * Helper to upsert with createId from cuid2
 */
export function upsertDocumentWithCuid<T extends Record<string, any>>(
  collection: string,
  where: Record<string, any>,
  create: Omit<T, 'id' | 'createdAt' | 'updatedAt'>,
  update: Partial<T>,
  paymentProof: PaymentProof
): Promise<T> {
  return db.upsertDocument<T>(collection, where, create, update, paymentProof, {
    idGenerator: createId
  });
}
