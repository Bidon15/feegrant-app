/**
 * OnChainDB Client for feegrant-app
 *
 * Uses the local OnChainDB SDK from ../../../sdk
 * Provides a simple interface to interact with OnChainDB,
 * replacing Prisma for blockchain-backed data storage.
 */

import { createClient, OnChainDBClient, DatabaseManager } from '../../../sdk';
import { env } from "~/env";
import { createId } from "@paralleldrive/cuid2";

// SDK Client instance
let client: OnChainDBClient;
let dbManager: DatabaseManager;

/**
 * Initialize the OnChainDB client (following TodoService pattern)
 */
export function initializeClient() {
  if (!client) {
    // Create SDK client following TodoService pattern
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
initializeClient();

/**
 * Payment proof structure for write operations
 */
export interface PaymentProof {
  payment_tx_hash: string;
  user_address: string;
  broker_address: string;
  amount_utia: number;
}

/**
 * Query options for finding documents
 */
export interface QueryOptions {
  limit?: number;
  offset?: number;
  sort?: {
    field: string;
    order: 'asc' | 'desc';
  };
}

/**
 * OnChainDB wrapper class with Prisma-like API
 */
export class OnChainDB {
  private client: OnChainDBClient;
  private dbManager: DatabaseManager;

  constructor() {
    const { client: c, dbManager: d } = initializeClient();
    this.client = c;
    this.dbManager = d;
  }

  /**
   * Find a single document by query (like Prisma's findUnique)
   * Following TodoService pattern
   */
  async findUnique<T>(
    collection: string,
    where: Record<string, any>
  ): Promise<T | null> {
    try {
      // Build query using TodoService pattern
      let queryBuilder = this.client.queryBuilder().collection(collection);

      // Add each where condition using whereField().equals() pattern
      for (const [field, value] of Object.entries(where)) {
        queryBuilder = queryBuilder.whereField(field).equals(value);
      }

      // Execute query with selectAll() and limit(1)
      const result = await queryBuilder.selectAll().limit(1).execute();

      if (!result.records || result.records.length === 0) {
        return null;
      }

      return result.records[0] as T;
    } catch (error) {
      console.error(`OnChainDB findUnique error for ${collection}:`, error);
      return null;
    }
  }

  /**
   * Find multiple documents by query (like Prisma's findMany)
   */
  async findMany<T>(
    collection: string,
    where: Record<string, any> = {},
    options: QueryOptions = {}
  ): Promise<T[]> {
    try {
      let queryBuilder = this.client.queryBuilder().collection(collection);

      // Add where conditions
      for (const [field, value] of Object.entries(where)) {
        queryBuilder = queryBuilder.whereField(field).equals(value);
      }

      // Add limit
      if (options.limit) {
        queryBuilder = queryBuilder.limit(options.limit);
      }

      const result = await queryBuilder.selectAll().execute();

      if (!result.records) {
        return [];
      }

      // Apply sorting if specified
      let records = result.records as T[];
      if (options.sort) {
        records = records.sort((a: any, b: any) => {
          const aVal = a[options.sort!.field];
          const bVal = b[options.sort!.field];

          if (options.sort!.order === 'asc') {
            return aVal > bVal ? 1 : -1;
          } else {
            return aVal < bVal ? 1 : -1;
          }
        });
      }

      return records;
    } catch (error) {
      console.error(`OnChainDB findMany error for ${collection}:`, error);
      return [];
    }
  }

  /**
   * Create a new document (like Prisma's create)
   * Following TodoService store() pattern
   */
  async create<T extends Record<string, any>>(
    collection: string,
    data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>,
    paymentProof: PaymentProof
  ): Promise<T> {
    const document: any = {
      id: createId(),
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Use client.store() following TodoService pattern
    await this.client.store({
      collection,
      data: [document],
      payment_tx_hash: paymentProof.payment_tx_hash,
      user_address: paymentProof.user_address,
      broker_address: paymentProof.broker_address,
      amount_utia: paymentProof.amount_utia,
    });

    return document as T;
  }

  /**
   * Update a document (creates new version in OnChainDB)
   */
  async update<T extends Record<string, any>>(
    collection: string,
    where: Record<string, any>,
    data: Partial<T>,
    paymentProof: PaymentProof
  ): Promise<T | null> {
    // Fetch current document
    const current = await this.findUnique<T>(collection, where);

    if (!current) {
      return null;
    }

    // Create updated document
    const updated: any = {
      ...current,
      ...data,
      updatedAt: new Date().toISOString(),
    };

    await this.client.store({
      collection,
      data: [updated],
      payment_tx_hash: paymentProof.payment_tx_hash,
      user_address: paymentProof.user_address,
      broker_address: paymentProof.broker_address,
      amount_utia: paymentProof.amount_utia,
    });

    return updated as T;
  }

  /**
   * Upsert a document (create if not exists, update if exists)
   */
  async upsert<T extends Record<string, any>>(
    collection: string,
    where: Record<string, any>,
    create: Omit<T, 'id' | 'createdAt' | 'updatedAt'>,
    update: Partial<T>,
    paymentProof: PaymentProof
  ): Promise<T> {
    const existing = await this.findUnique<T>(collection, where);

    if (existing) {
      return (await this.update<T>(collection, where, update, paymentProof))!;
    } else {
      return await this.create<T>(collection, create, paymentProof);
    }
  }

  /**
   * Delete a document (soft delete by marking as deleted)
   */
  async delete<T extends Record<string, any>>(
    collection: string,
    where: Record<string, any>,
    paymentProof: PaymentProof
  ): Promise<boolean> {
    const existing = await this.findUnique<T>(collection, where);

    if (!existing) {
      return false;
    }

    // Soft delete by marking
    const deleted: any = {
      ...existing,
      deleted: true,
      updatedAt: new Date().toISOString(),
    };

    await this.client.store({
      collection,
      data: [deleted],
      payment_tx_hash: paymentProof.payment_tx_hash,
      user_address: paymentProof.user_address,
      broker_address: paymentProof.broker_address,
      amount_utia: paymentProof.amount_utia,
    });

    return true;
  }

  /**
   * Count documents in a collection
   */
  async count(collection: string, where: Record<string, any> = {}): Promise<number> {
    const records = await this.findMany(collection, where);
    return records.length;
  }

  /**
   * Get pricing quote for a write operation
   */
  async getWriteQuote(collection: string, data: any[]): Promise<any> {
    // Estimate data size
    const dataString = JSON.stringify(data);
    const sizeKb = Math.ceil(dataString.length / 1024);

    try {
      const response = await fetch(
        `${env.ONCHAINDB_API_URL}/api/apps/pricing/quote`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            app_id: env.ONCHAINDB_APP_ID,
            operation_type: 'write',
            size_kb: sizeKb,
            monthly_volume_kb: sizeKb,
            collection,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get pricing quote: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error getting write quote:', error);
      throw error;
    }
  }

  /**
   * Generate a unique ID for documents
   */
  generateId(): string {
    return createId();
  }

  /**
   * Generate current ISO timestamp
   */
  now(): string {
    return new Date().toISOString();
  }

  /**
   * Get raw SDK client for advanced operations
   */
  getClient(): OnChainDBClient {
    return this.client;
  }

  /**
   * Get database manager for schema operations
   */
  getDbManager(): DatabaseManager {
    return this.dbManager;
  }
}

// Export singleton instance
export const db = new OnChainDB();

// Export types
export type { PaymentProof, QueryOptions };
