# Feegrant App Migration to OnChainDB

## Executive Summary

This document outlines the migration plan for moving the **para-demo feegrant application** from PostgreSQL/Prisma to **OnChainDB**, leveraging the new creator economy premium features. This migration will demonstrate OnChainDB's capabilities while significantly reducing infrastructure costs and complexity.

---

## Current Architecture vs OnChainDB

### Current Stack
- **Database**: PostgreSQL (requires hosting, backups, management)
- **ORM**: Prisma (requires migrations, generates client code)
- **Infrastructure**: Separate database server
- **Cost**: $10-50+/month for database hosting
- **Complexity**: Schema migrations, connection pooling, backup management

### OnChainDB Stack
- **Database**: OnChainDB (serverless, blockchain-backed)
- **API**: RESTful HTTP endpoints (no ORM needed)
- **Infrastructure**: Zero - fully managed by OnChainDB
- **Cost**: Pay-per-use (base + indexing costs)
- **Complexity**: Zero infrastructure management

### Migration Benefits

✅ **Zero Infrastructure** - No database servers to manage
✅ **Blockchain-Backed** - Permanent, verifiable data storage on Celestia
✅ **Cost Efficiency** - Pay only for what you use
✅ **Creator Economy** - Optional premium pricing for future monetization
✅ **Simple API** - Replace Prisma queries with HTTP requests
✅ **No Migrations** - Schema-free JSON storage
✅ **Built-in Indexing** - Fast queries without manual index management

---

## Data Model Mapping

### Prisma Schema → OnChainDB Collections

| Prisma Model | OnChainDB Collection | Primary Index | Additional Indexes | Notes |
|--------------|---------------------|---------------|-------------------|-------|
| **User** | `users` | `githubId` | `email`, `id` | Core user profiles |
| **Address** | `addresses` | `bech32` | `userId` | Celestia wallet addresses |
| **Account** | `accounts` | `userId_provider` | `providerAccountId` | OAuth accounts |
| **Session** | `sessions` | `sessionToken` | `userId` | User sessions |
| **JobLog** | `job_logs` | `id` | `jobName`, `status`, `createdAt` | Background jobs |
| **VerificationToken** | `verification_tokens` | `token` | `identifier` | Auth tokens |

---

## Collection Schemas & Indexes

### 1. **Users Collection**

```json
{
  "id": "cuid_string",
  "githubId": "string",
  "githubCreated": "ISO8601_datetime",
  "name": "string | null",
  "email": "string | null",
  "emailVerified": "ISO8601_datetime | null",
  "image": "string | null",
  "createdAt": "ISO8601_datetime",
  "updatedAt": "ISO8601_datetime"
}
```

**Indexes:**
- **Primary**: `githubId` (unique, hash index)
- **Secondary**: `email` (unique, hash index)
- **Secondary**: `id` (unique, hash index)

**OnChainDB Index Configuration:**
```json
{
  "collection": "users",
  "indexes": [
    {
      "field_name": "githubId",
      "index_type": "hash",
      "unique": true,
      "name": "idx_users_githubId"
    },
    {
      "field_name": "email",
      "index_type": "hash",
      "unique": true,
      "name": "idx_users_email"
    },
    {
      "field_name": "id",
      "index_type": "hash",
      "unique": true,
      "name": "idx_users_id"
    }
  ]
}
```

---

### 2. **Addresses Collection**

```json
{
  "id": "cuid_string",
  "userId": "string",
  "bech32": "string",
  "isDusted": "boolean",
  "hasFeeGrant": "boolean",
  "feeAllowanceRemaining": "string | null",
  "createdAt": "ISO8601_datetime",
  "updatedAt": "ISO8601_datetime"
}
```

**Indexes:**
- **Primary**: `bech32` (unique, hash index) - for address lookups
- **Secondary**: `userId` (unique, hash index) - one address per user
- **Secondary**: `isDusted` (btree) - filter dusted addresses
- **Secondary**: `hasFeeGrant` (btree) - filter fee grant status

**OnChainDB Index Configuration:**
```json
{
  "collection": "addresses",
  "indexes": [
    {
      "field_name": "bech32",
      "index_type": "hash",
      "unique": true,
      "name": "idx_addresses_bech32"
    },
    {
      "field_name": "userId",
      "index_type": "hash",
      "unique": true,
      "name": "idx_addresses_userId"
    },
    {
      "field_name": "isDusted",
      "index_type": "btree",
      "unique": false,
      "name": "idx_addresses_isDusted"
    },
    {
      "field_name": "hasFeeGrant",
      "index_type": "btree",
      "unique": false,
      "name": "idx_addresses_hasFeeGrant"
    }
  ]
}
```

---

### 3. **Accounts Collection** (OAuth)

```json
{
  "id": "cuid_string",
  "userId": "string",
  "type": "string",
  "provider": "string",
  "providerAccountId": "string",
  "refresh_token": "string | null",
  "access_token": "string | null",
  "expires_at": "number | null",
  "token_type": "string | null",
  "scope": "string | null",
  "id_token": "string | null",
  "session_state": "string | null",
  "refresh_token_expires_in": "number | null"
}
```

**Indexes:**
- **Primary**: Composite `userId_provider` (hash)
- **Secondary**: `providerAccountId` (hash)

**OnChainDB Index Configuration:**
```json
{
  "collection": "accounts",
  "indexes": [
    {
      "field_name": "userId",
      "index_type": "hash",
      "unique": false,
      "name": "idx_accounts_userId"
    },
    {
      "field_name": "provider",
      "index_type": "hash",
      "unique": false,
      "name": "idx_accounts_provider"
    },
    {
      "field_name": "providerAccountId",
      "index_type": "hash",
      "unique": false,
      "name": "idx_accounts_providerAccountId"
    }
  ]
}
```

---

### 4. **Sessions Collection**

```json
{
  "id": "cuid_string",
  "sessionToken": "string",
  "userId": "string",
  "expires": "ISO8601_datetime"
}
```

**Indexes:**
- **Primary**: `sessionToken` (unique, hash)
- **Secondary**: `userId` (hash)
- **Secondary**: `expires` (btree, for cleanup queries)

**OnChainDB Index Configuration:**
```json
{
  "collection": "sessions",
  "indexes": [
    {
      "field_name": "sessionToken",
      "index_type": "hash",
      "unique": true,
      "name": "idx_sessions_sessionToken"
    },
    {
      "field_name": "userId",
      "index_type": "hash",
      "unique": false,
      "name": "idx_sessions_userId"
    },
    {
      "field_name": "expires",
      "index_type": "btree",
      "unique": false,
      "name": "idx_sessions_expires"
    }
  ]
}
```

---

### 5. **JobLogs Collection**

```json
{
  "id": "cuid_string",
  "jobName": "string",
  "payload": "object",
  "status": "string",
  "txHash": "string | null",
  "error": "string | null",
  "createdAt": "ISO8601_datetime",
  "updatedAt": "ISO8601_datetime"
}
```

**Indexes:**
- **Primary**: `id` (unique, hash)
- **Secondary**: `jobName` (hash)
- **Secondary**: `status` (btree)
- **Secondary**: `createdAt` (btree, for time-range queries)
- **Secondary**: `txHash` (hash)

**OnChainDB Index Configuration:**
```json
{
  "collection": "job_logs",
  "indexes": [
    {
      "field_name": "id",
      "index_type": "hash",
      "unique": true,
      "name": "idx_job_logs_id"
    },
    {
      "field_name": "jobName",
      "index_type": "hash",
      "unique": false,
      "name": "idx_job_logs_jobName"
    },
    {
      "field_name": "status",
      "index_type": "btree",
      "unique": false,
      "name": "idx_job_logs_status"
    },
    {
      "field_name": "createdAt",
      "index_type": "btree",
      "unique": false,
      "name": "idx_job_logs_createdAt"
    },
    {
      "field_name": "txHash",
      "index_type": "hash",
      "unique": false,
      "name": "idx_job_logs_txHash"
    }
  ]
}
```

---

### 6. **VerificationTokens Collection**

```json
{
  "identifier": "string",
  "token": "string",
  "expires": "ISO8601_datetime"
}
```

**Indexes:**
- **Primary**: `token` (unique, hash)
- **Secondary**: `identifier` (hash)
- **Secondary**: `expires` (btree)

**OnChainDB Index Configuration:**
```json
{
  "collection": "verification_tokens",
  "indexes": [
    {
      "field_name": "token",
      "index_type": "hash",
      "unique": true,
      "name": "idx_verification_tokens_token"
    },
    {
      "field_name": "identifier",
      "index_type": "hash",
      "unique": false,
      "name": "idx_verification_tokens_identifier"
    },
    {
      "field_name": "expires",
      "index_type": "btree",
      "unique": false,
      "name": "idx_verification_tokens_expires"
    }
  ]
}
```

---

## Query Migration Examples

### Example 1: Find User by GitHub ID

**Prisma:**
```typescript
const user = await ctx.db.user.findUnique({
  where: { githubId: "12345" },
  include: { address: true },
});
```

**OnChainDB:**
```typescript
// Step 1: Query user
const userResponse = await fetch(
  `${ONCHAINDB_API}/api/apps/${APP_ID}/query`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      collection: 'users',
      query: { githubId: '12345' },
      limit: 1
    })
  }
);
const users = await userResponse.json();
const user = users.data[0];

// Step 2: Query address (if needed)
if (user) {
  const addressResponse = await fetch(
    `${ONCHAINDB_API}/api/apps/${APP_ID}/query`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        collection: 'addresses',
        query: { userId: user.id },
        limit: 1
      })
    }
  );
  const addresses = await addressResponse.json();
  user.address = addresses.data[0];
}
```

---

### Example 2: Create User with Address Binding

**Prisma:**
```typescript
const address = await ctx.db.address.create({
  data: {
    bech32: celestiaAddress,
    userId: ctx.session.user.id,
    isDusted: false,
    hasFeeGrant: false,
  },
});
```

**OnChainDB:**
```typescript
const response = await fetch(
  `${ONCHAINDB_API}/api/apps/${APP_ID}/store`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      root: `${APP_ID}::addresses`,
      data: [{
        id: generateCuid(),
        bech32: celestiaAddress,
        userId: ctx.session.user.id,
        isDusted: false,
        hasFeeGrant: false,
        feeAllowanceRemaining: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }],
      payment_tx_hash: txHash, // Keplr payment
      user_address: userWallet,
      broker_address: BROKER_ADDRESS,
      amount_utia: calculatedCost,
    })
  }
);
```

---

### Example 3: Update Address Status

**Prisma:**
```typescript
await ctx.db.address.update({
  where: { bech32: address },
  data: {
    isDusted: true,
    hasFeeGrant: true,
    updatedAt: new Date(),
  },
});
```

**OnChainDB:**
```typescript
// Step 1: Fetch current address
const current = await fetch(
  `${ONCHAINDB_API}/api/apps/${APP_ID}/query`,
  {
    method: 'POST',
    body: JSON.stringify({
      collection: 'addresses',
      query: { bech32: address },
      limit: 1
    })
  }
).then(r => r.json());

// Step 2: Update with modified data
await fetch(
  `${ONCHAINDB_API}/api/apps/${APP_ID}/store`,
  {
    method: 'POST',
    body: JSON.stringify({
      root: `${APP_ID}::addresses`,
      data: [{
        ...current.data[0],
        isDusted: true,
        hasFeeGrant: true,
        updatedAt: new Date().toISOString(),
      }],
      payment_tx_hash: txHash,
      user_address: userWallet,
      broker_address: BROKER_ADDRESS,
      amount_utia: calculatedCost,
    })
  }
);
```

---

## Migration Implementation Plan

### Phase 1: Setup OnChainDB App (1-2 hours)

**Steps:**
1. Register feegrant-app on OnChainDB dashboard
2. Choose payment mode: **pay_on_write** (users pay per operation)
3. **Optional**: Enable creator premium (0.0001 TIA per write) for monetization
4. Save app hash and credentials

**Environment Variables:**
```bash
ONCHAINDB_APP_ID=app_xxxxx
ONCHAINDB_APP_HASH=xxxxx
ONCHAINDB_API_URL=https://your-onchaindb-instance.com
ONCHAINDB_BROKER_ADDRESS=celestia1xxxxx
```

---

### Phase 2: Create Collections & Indexes (2-3 hours)

**API Calls to Create Collections:**

```bash
# Create users collection
curl -X POST ${ONCHAINDB_API_URL}/api/apps/${APP_ID}/collections \
  -H "Content-Type: application/json" \
  -d '{
    "name": "users",
    "namespace": "users_ns",
    "primary_column": "githubId",
    "sort_column": "createdAt"
  }'

# Create indexes for users
curl -X POST ${ONCHAINDB_API_URL}/api/apps/${APP_ID}/collections/users/indexes \
  -d '{
    "field_name": "githubId",
    "index_type": "hash",
    "unique": true,
    "name": "idx_users_githubId"
  }'

curl -X POST ${ONCHAINDB_API_URL}/api/apps/${APP_ID}/collections/users/indexes \
  -d '{
    "field_name": "email",
    "index_type": "hash",
    "unique": true,
    "name": "idx_users_email"
  }'

# Repeat for all collections...
```

**Script**: Create `scripts/setup-onchaindb.ts` to automate this

---

### Phase 3: Create Data Access Layer (4-6 hours)

**Create `src/lib/onchaindb.ts`:**

```typescript
import { cuid } from 'cuid';

const API_URL = process.env.ONCHAINDB_API_URL!;
const APP_ID = process.env.ONCHAINDB_APP_ID!;
const BROKER_ADDRESS = process.env.ONCHAINDB_BROKER_ADDRESS!;

export interface WriteOptions {
  paymentTxHash: string;
  userAddress: string;
  amountUtia: number;
}

export class OnChainDB {
  async query<T>(collection: string, query: Record<string, any>, limit = 100): Promise<T[]> {
    const response = await fetch(`${API_URL}/api/apps/${APP_ID}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collection, query, limit }),
    });

    if (!response.ok) {
      throw new Error(`Query failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data || [];
  }

  async write<T>(
    collection: string,
    data: T[],
    payment: WriteOptions
  ): Promise<{ ticket_id: string }> {
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
      throw new Error(`Write failed: ${response.statusText}`);
    }

    return response.json();
  }

  async getWriteQuote(collection: string, sizeKb: number): Promise<any> {
    const response = await fetch(`${API_URL}/api/apps/pricing/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: APP_ID,
        operation_type: 'write',
        size_kb: sizeKb,
        collection,
      }),
    });

    return response.json();
  }

  generateId(): string {
    return cuid();
  }
}

export const db = new OnChainDB();
```

---

### Phase 4: Replace Prisma Queries (8-12 hours)

**Refactor each router file:**

1. **src/server/api/routers/user.ts** - Replace user queries
2. **src/server/api/routers/wallet.ts** - Replace address queries
3. **src/server/api/routers/account.ts** - Replace account queries
4. **src/server/auth/config.ts** - Replace NextAuth adapter queries

**Example Refactor (user.ts):**

```typescript
// Before
const user = await ctx.db.user.findUnique({
  where: { id: ctx.session.user.id },
  include: { address: true },
});

// After
const [user] = await db.query('users', { id: ctx.session.user.id }, 1);
if (user) {
  const [address] = await db.query('addresses', { userId: user.id }, 1);
  user.address = address;
}
```

---

### Phase 5: Payment Integration (4-6 hours)

**Add Keplr wallet integration for write operations:**

```typescript
// In frontend components
import { SigningStargateClient } from '@cosmjs/stargate';

async function writeToOnChainDB(data: any, collection: string) {
  // 1. Get pricing quote
  const quote = await db.getWriteQuote(collection, estimateSize(data));

  // 2. User signs payment tx with Keplr
  const client = await SigningStargateClient.connectWithSigner(
    CELESTIA_RPC,
    window.keplr.getOfflineSigner('mocha-4')
  );

  const tx = await client.sendTokens(
    userAddress,
    BROKER_ADDRESS,
    [{ denom: 'utia', amount: quote.total_cost_utia.toString() }],
    'auto'
  );

  // 3. Write with payment proof
  await db.write(collection, [data], {
    paymentTxHash: tx.transactionHash,
    userAddress: userAddress,
    amountUtia: quote.total_cost_utia,
  });
}
```

---

### Phase 6: Data Migration (2-4 hours)

**Create migration script `scripts/migrate-data.ts`:**

```typescript
import { PrismaClient } from '@prisma/client';
import { db } from '../src/lib/onchaindb';

const prisma = new PrismaClient();

async function migrateUsers() {
  const users = await prisma.user.findMany();

  console.log(`Migrating ${users.length} users...`);

  for (const user of users) {
    await db.write('users', [{
      id: user.id,
      githubId: user.githubId,
      githubCreated: user.githubCreated.toISOString(),
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified?.toISOString() || null,
      image: user.image,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    }], migrationPayment);
  }

  console.log('✅ Users migrated');
}

async function migrateAddresses() {
  const addresses = await prisma.address.findMany();

  console.log(`Migrating ${addresses.length} addresses...`);

  for (const address of addresses) {
    await db.write('addresses', [{
      id: address.id,
      userId: address.userId,
      bech32: address.bech32,
      isDusted: address.isDusted,
      hasFeeGrant: address.hasFeeGrant,
      feeAllowanceRemaining: address.feeAllowanceRemaining,
      createdAt: address.createdAt.toISOString(),
      updatedAt: address.updatedAt.toISOString(),
    }], migrationPayment);
  }

  console.log('✅ Addresses migrated');
}

// Run all migrations
async function main() {
  await migrateUsers();
  await migrateAddresses();
  await migrateAccounts();
  await migrateSessions();
  await migrateJobLogs();
  console.log('✅ All data migrated to OnChainDB!');
}

main();
```

---

### Phase 7: Testing & Deployment (4-6 hours)

**Testing Checklist:**
- [ ] User authentication flow
- [ ] Address binding with signature verification
- [ ] Wallet dusting operations
- [ ] Fee grant operations
- [ ] Job logging
- [ ] Session management
- [ ] Load testing with 100+ operations

**Deployment:**
1. Deploy updated application
2. Monitor OnChainDB dashboard for costs
3. Decommission PostgreSQL instance
4. Update documentation

---

## Cost Analysis

### Current PostgreSQL Costs
- **Hosting**: $10-50/month (Vercel Postgres, Railway, etc.)
- **Backups**: $5-10/month
- **Monitoring**: $5-10/month
- **Total**: ~$20-70/month fixed cost

### OnChainDB Costs (Estimated)

**Assumptions:**
- 1000 users
- Average 10 writes per user per month = 10,000 writes/month
- Average write size: 1 KB
- Index cost: 0.05 TIA/KB one-time per field
- Base write cost: 0.02 TIA/KB
- Creator premium: 0 (optional, could add 0.0001 TIA for monetization)

**Breakdown:**
- Base writes: 10,000 writes × 1 KB × 0.02 TIA = **200 TIA/month**
- Indexing (one-time setup): 6 collections × 3 avg indexes × 0.05 TIA = **~1 TIA**
- Total: **~200 TIA/month** (~$20-40 depending on TIA price)

**With Creator Premium (Optional):**
- Premium: 0.0001 TIA/write × 10,000 writes = 1 TIA
- Your revenue (70%): **0.7 TIA/month**
- Platform fee (30%): 0.3 TIA/month
- Net cost: 200 - 0.7 = **199.3 TIA/month**

**Savings:**
- Fixed costs eliminated: **$20-70/month**
- Zero infrastructure management time
- Pay-per-use scales with actual usage

---

## Risk Mitigation

### Potential Issues & Solutions

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **OnChainDB downtime** | High | Implement retry logic, local caching |
| **Query performance** | Medium | Proper indexing, query optimization |
| **Cost overruns** | Medium | Monitoring alerts, rate limiting |
| **Data consistency** | Low | Optimistic locking, retry logic |
| **Migration data loss** | High | Backup PostgreSQL, gradual rollout |

### Rollback Plan

1. Keep PostgreSQL running for 1 month post-migration
2. Dual-write to both databases during transition
3. Compare data consistency daily
4. Easy rollback by reverting code changes

---

## Timeline Summary

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Setup | 1-2 hours | OnChainDB account |
| Phase 2: Collections | 2-3 hours | Phase 1 |
| Phase 3: Data Layer | 4-6 hours | Phase 2 |
| Phase 4: Query Refactor | 8-12 hours | Phase 3 |
| Phase 5: Payment Integration | 4-6 hours | Keplr wallet |
| Phase 6: Data Migration | 2-4 hours | Phase 4, 5 |
| Phase 7: Testing & Deploy | 4-6 hours | Phase 6 |
| **Total** | **25-39 hours** | ~1 week |

---

## Next Steps

1. **Register app on OnChainDB dashboard**
2. **Review and approve this migration plan**
3. **Set up development environment with OnChainDB**
4. **Create collections and indexes**
5. **Build data access layer**
6. **Incremental refactoring of routers**
7. **Parallel testing with PostgreSQL**
8. **Gradual production migration**

---

## Success Metrics

After migration, measure:
- ✅ Zero database infrastructure costs
- ✅ Query performance < 500ms (vs PostgreSQL baseline)
- ✅ 99.9% uptime
- ✅ Zero maintenance hours/month
- ✅ Cost savings: $20-70/month
- ✅ Optional revenue: 0.7 TIA/month from creator premium

---

## Appendix: Complete Setup Script

See `scripts/setup-onchaindb.ts` for the complete automated setup:

```typescript
// Run: npm run setup-onchaindb
// Creates all collections and indexes automatically
```

---

**Document Version**: 1.0
**Last Updated**: October 18, 2025
**Author**: Claude (Anthropic AI)
**Review Status**: Pending approval
