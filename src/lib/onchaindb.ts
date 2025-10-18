import { env } from "~/env";
import { cuid } from "cuid2";

const API_URL = env.ONCHAINDB_API_URL;
const APP_ID = env.ONCHAINDB_APP_ID;
const BROKER_ADDRESS = env.ONCHAINDB_BROKER_ADDRESS;

export interface WriteOptions {
  paymentTxHash: string;
  userAddress: string;
  amountUtia: number;
}

export interface QueryOptions {
  limit?: number;
  offset?: number;
  sort?: {
    field: string;
    order: 'asc' | 'desc';
  };
}

export interface WriteQuote {
  base_celestia_cost: number;
  broker_fee: number;
  indexing_costs: Record<string, number>;
  creator_premium?: {
    premium_total: number;
    premium_type: string;
    premium_amount: number;
    creator_revenue: number;
    platform_revenue: number;
  };
  total_cost: number;
}

export interface TaskStatus {
  ticket_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  message?: string;
  tx_hash?: string;
  block_height?: number;
  error?: string;
}

/**
 * OnChainDB Client for feegrant-app
 *
 * Provides a simple interface to interact with OnChainDB,
 * replacing Prisma for blockchain-backed data storage.
 */
export class OnChainDB {
  /**
   * Query documents from a collection
   */
  async query<T>(
    collection: string,
    query: Record<string, any> = {},
    options: QueryOptions = {}
  ): Promise<T[]> {
    const response = await fetch(`${API_URL}/api/apps/${APP_ID}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        collection,
        query,
        limit: options.limit ?? 100,
        offset: options.offset,
        sort: options.sort,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OnChainDB query failed: ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    return (result.data || []) as T[];
  }

  /**
   * Find a single document by query
   */
  async findUnique<T>(
    collection: string,
    query: Record<string, any>
  ): Promise<T | null> {
    const results = await this.query<T>(collection, query, { limit: 1 });
    return results[0] ?? null;
  }

  /**
   * Find multiple documents by query
   */
  async findMany<T>(
    collection: string,
    query: Record<string, any> = {},
    options: QueryOptions = {}
  ): Promise<T[]> {
    return this.query<T>(collection, query, options);
  }

  /**
   * Write documents to a collection
   * Requires payment transaction from user
   */
  async write<T extends Record<string, any>>(
    collection: string,
    data: T[],
    payment: WriteOptions
  ): Promise<{ ticket_id: string; status: string }> {
    const response = await fetch(`${API_URL}/api/apps/${APP_ID}/store`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        root: `${APP_ID}::${collection}`,
        data,
        payment_tx_hash: payment.paymentTxHash,
        user_address: payment.userAddress,
        broker_address: BROKER_ADDRESS,
        amount_utia: payment.amountUtia,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OnChainDB write failed: ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Create a single document
   */
  async create<T extends Record<string, any>>(
    collection: string,
    data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>,
    payment: WriteOptions
  ): Promise<T> {
    const document: any = {
      id: this.generateId(),
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.write(collection, [document], payment);
    return document as T;
  }

  /**
   * Update a document
   * Note: OnChainDB is append-only, so this actually creates a new version
   */
  async update<T extends Record<string, any>>(
    collection: string,
    query: Record<string, any>,
    data: Partial<T>,
    payment: WriteOptions
  ): Promise<T | null> {
    // Fetch current document
    const current = await this.findUnique<T>(collection, query);

    if (!current) {
      return null;
    }

    // Create updated document
    const updated: any = {
      ...current,
      ...data,
      updatedAt: new Date().toISOString(),
    };

    await this.write(collection, [updated], payment);
    return updated as T;
  }

  /**
   * Upsert a document (create if not exists, update if exists)
   */
  async upsert<T extends Record<string, any>>(
    collection: string,
    query: Record<string, any>,
    create: Omit<T, 'id' | 'createdAt' | 'updatedAt'>,
    update: Partial<T>,
    payment: WriteOptions
  ): Promise<T> {
    const existing = await this.findUnique<T>(collection, query);

    if (existing) {
      return (await this.update<T>(collection, query, update, payment))!;
    } else {
      return await this.create<T>(collection, create, payment);
    }
  }

  /**
   * Get a pricing quote for a write operation
   */
  async getWriteQuote(
    collection: string,
    data: any[]
  ): Promise<WriteQuote> {
    // Estimate data size
    const dataString = JSON.stringify(data);
    const sizeKb = Math.ceil(dataString.length / 1024);

    const response = await fetch(`${API_URL}/api/apps/pricing/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: APP_ID,
        operation_type: 'write',
        size_kb: sizeKb,
        monthly_volume_kb: sizeKb,
        collection,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get pricing quote: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Check the status of a write operation
   */
  async checkTaskStatus(ticketId: string): Promise<TaskStatus> {
    const response = await fetch(`${API_URL}/api/task/${ticketId}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to check task status: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Wait for a write operation to complete
   */
  async waitForCompletion(
    ticketId: string,
    maxAttempts = 30,
    delayMs = 1000
  ): Promise<TaskStatus> {
    for (let i = 0; i < maxAttempts; i++) {
      const status = await this.checkTaskStatus(ticketId);

      if (status.status === 'completed') {
        return status;
      }

      if (status.status === 'failed') {
        throw new Error(`Write operation failed: ${status.error}`);
      }

      // Wait before next check
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    throw new Error('Write operation timed out');
  }

  /**
   * Generate a unique ID for documents
   */
  generateId(): string {
    return cuid();
  }

  /**
   * Generate current ISO timestamp
   */
  now(): string {
    return new Date().toISOString();
  }
}

// Export singleton instance
export const onchaindb = new OnChainDB();

// Export helper types
export type { WriteOptions, QueryOptions, WriteQuote, TaskStatus };
