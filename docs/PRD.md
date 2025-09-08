# PRD: Celestia Mocha Demo — Authz Blob Submission (v2)

## Goal
Provide developers with a simple way to:
1. Create a Celestia wallet (via Para),
2. Authorize the backend (Authz, no expiry),
3. Submit a “Hello Blob” via API,
while the backend handles dusting, broadcasting, and queueing with **pg-boss**.

---

## Scope

**In scope**
- GitHub login (≥30 days old).
- Para wallet creation & address binding.
- One backend hot wallet (mnemonic in `.env`).
- Dusting new user wallets once.
- Authz grant (no expiry) from user → backend for `/celestia.blob.v1.MsgPayForBlobs`.
- Backend executes `MsgExec(PFB)` and pays fees.
- pg-boss for background jobs (Postgres-only).
- Server-side blob size & rate limits.

**Out of scope**
- Feegrant.
- Stripe/card verification.
- Redis/BullMQ.
- Multi-wallet separation.

---

## User Stories

**As a developer**
- I can log in with GitHub (≥30 days).
- I can generate a Celestia wallet (Para).
- I can authorize the backend and see a grant tx hash.
- I can submit a blob via API and get back a tx hash.

**As the demo operator**
- I can restore my backend wallet from a mnemonic.
- I can dust new wallets automatically.
- I can broadcast grants and blob execs via queue jobs.
- I can enforce usage limits.

---

## Functional Requirements

### Authentication
- GitHub OAuth (NextAuth).
- Reject accounts `<30 days old`.

### Wallet Management
- Generate Para wallet.
- Bind user to address with signed nonce.

### Dusting
- If address unseen, enqueue `dust.send` (2,000 uTIA).
- Respond with dust tx hash when completed.

### Authz (no expiry)
- User signs `MsgGrant`:
  - `granter = devAddr`
  - `grantee = backendAddr`
  - `authorization = GenericAuthorization{ "/celestia.blob.v1.MsgPayForBlobs" }`
  - **no expiration**
- Backend broadcasts via job queue.
- Store tx hash.

### Blob Submission
- `POST /api/pfb` accepts JWT + blob.
- Validates limits (size ≤64 KB, ≤3/day).
- Enqueues `pfb.exec` job with `{ userId, devAddr, blob, namespace }`.
- Worker builds inner `MsgPayForBlobs{ signer=devAddr }`, wraps in `MsgExec{ grantee=backendAddr }`, signs with backend wallet, pays fee.
- Responds with blob tx hash.

### Limits
- Dust once per address.
- 3 blobs/day/user.
- 64 KB blob size cap.
- Server-side revoke flag for abuse.

---

## Non-Functional
- Stack: T3 (Next.js, tRPC/REST, Prisma/Postgres).
- Background jobs: **pg-boss**.
- On-chain interactions: CosmJS with Celestia protos.
- Secrets in `.env`.
- Logs: userId, address, tx hash, job id.

---

## API Endpoints

### `POST /api/bind-address`
Bind Para wallet to user.
```json
Request: { "address": "celes1...", "signedNonce": "..." }
Response: { "ok": true }

### `POST /api/dust`
Dust new user address.
```json
Request: { "address": "celes1..." }
Response: { "enqueued": true, "jobId": "job_123" }
```

### `POST /api/grant-authz`
Grant backend authz.
```json
Request: { "signedGrantTxBase64": "..." }
Response: { "enqueued": true, "jobId": "job_456" }
```

### `POST /api/pfb`
Submit blob via API.
```json
Request: { "namespace": "abcd...", "blobBase64": "..." }
Response: { "enqueued": true, "jobId": "job_789" }
```

### `GET /api/jobs/:id`
Get job status.
```json
Response: { "status": "completed", "txHash": "ABC123..." }
```

---

## Database Schema (Prisma)

```prisma
model User {
  id            String   @id @default(cuid())
  githubId      String   @unique
  githubCreated DateTime
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  address       Address?
}

model Address {
  id              String   @id @default(cuid())
  userId          String   @unique
  bech32          String   @unique
  isDusted        Boolean  @default(false)
  hasAuthzGranted Boolean  @default(false)
  revoked         Boolean  @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  user            User     @relation(fields: [userId], references: [id])
}

model UsageCounter {
  userId   String
  date     DateTime
  pfbCount Int       @default(0)
  @@id([userId, date])
}

model JobLog {
  id        String   @id @default(cuid())
  jobName   String
  payload   Json
  status    String
  txHash    String?
  error     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

---

## pg-boss Queues & Handlers

### Topics
```
	•	dust.send → { address }
	•	authz.broadcast → { signedTxBase64, address }
	•	pfb.exec → { userId, devAddr, namespace, blobBase64 }
```

### Worker policy
```
	•	Concurrency: 3–5 per topic.
	•	Retries: exponential backoff (5s → 15s → 60s → 5m → 15m).
	•	Record in JobLog.
```

### dust.send
```
	•	Check isDusted; skip if true.
	•	Send 2,000 uTIA.
	•	Mark isDusted=true, log tx hash.
```

### authz.broadcast
```
	•	Broadcast signed MsgGrant.
	•	Mark hasAuthzGranted=true, log tx hash.
```

### pfb.exec
```
	•	Validate hasAuthzGranted && !revoked.
	•	Build MsgPayForBlobs (signer=devAddr).
	•	Wrap in MsgExec(grantee=backendAddr), sign with backend wallet.
	•	Broadcast, increment usage counter, log tx hash.
```

---

## Config Defaults
	•	Dust: 2,000 uTIA
	•	Blob max size: 64 KB
	•	Daily PFB: 3 per user
	•	Authz expiration: none
	•	pg-boss retention: 7 days

---

## Success Criteria
	•	Dev with GitHub ≥30 days can:
	1.	Bind wallet,
	2.	Get dust tx,
	3.	Grant authz (no expiry),
	4.	Submit blob,
	5.	See tx hashes in explorer.
	•	All steps go through pg-boss jobs with observable statuses.

---

## Implementation Notes 

### Starter Code for pg-boss

```ts
// /src/jobs/index.ts
import PgBoss from "pg-boss";
import { prisma } from "@/server/db"; // adjust import
import { sendDust, broadcastAuthz, execPfb } from "./workers"; // you implement

export async function startJobQueue() {
  const boss = new PgBoss({
    connectionString: process.env.DATABASE_URL,
    schema: "boss",
  });

  boss.on("error", (err) => console.error("pg-boss error", err));

  await boss.start();

  // Dust worker
  await boss.work("dust.send", { teamSize: 3 }, async (job) => {
    const { address } = job.data;
    return await sendDust(address, job.id);
  });

  // Authz worker
  await boss.work("authz.broadcast", { teamSize: 3 }, async (job) => {
    const { signedTxBase64, address } = job.data;
    return await broadcastAuthz(signedTxBase64, address, job.id);
  });

  // PFB worker
  await boss.work("pfb.exec", { teamSize: 5 }, async (job) => {
    const { userId, devAddr, namespace, blobBase64 } = job.data;
    return await execPfb({ userId, devAddr, namespace, blobBase64, jobId: job.id });
  });

  console.log("pg-boss workers started ✅");
}
```

### Worker function stubs

```ts
// /src/jobs/workers.ts
import { prisma } from "@/server/db";
import { client, mainWallet } from "@/server/celestia"; // your CosmJS setup

export async function sendDust(address: string, jobId: string) {
  // check in DB
  const existing = await prisma.address.findUnique({ where: { bech32: address } });
  if (existing?.isDusted) return { txHash: "already-dusted" };

  // broadcast dust tx
  const res = await client.sendTokens(
    mainWallet.address,
    address,
    [{ denom: "utia", amount: "2000" }],
    "auto"
  );

  await prisma.address.update({
    where: { bech32: address },
    data: { isDusted: true },
  });

  return { txHash: res.transactionHash };
}

export async function broadcastAuthz(signedTxBase64: string, address: string, jobId: string) {
  // raw broadcast user-signed grant tx
  const rawTx = Buffer.from(signedTxBase64, "base64");
  const res = await client.broadcastTx(rawTx);

  await prisma.address.update({
    where: { bech32: address },
    data: { hasAuthzGranted: true },
  });

  return { txHash: res.transactionHash };
}

export async function execPfb({ userId, devAddr, namespace, blobBase64, jobId }) {
  // validate usage counters etc. here
  // construct MsgPayForBlobs(inner) and wrap in MsgExec(grantee=backendAddr)
  // sign with backend wallet and broadcast

  // TODO: implement CosmJS blob assembly
  return { txHash: "todo-txhash" };
}
```

