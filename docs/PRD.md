# PRD: Celestia Mocha Demo — Authz Blob Submission (v3, tRPC-only)

## Background
This is an initial idea that I have had in my head, but due to authz not supporting PFBs, I decided to not implement it. As well as the queue for workers as this is not relevant for just feegrants.

## Goal
Provide developers with a simple way to:
1. Create a Celestia wallet (via Para),
2. Authorize the backend (Authz, no expiry),
3. Submit a “Hello Blob” via API,
while the backend handles dusting, broadcasting, and queueing with **pg-boss**.

**Important updates vs v2**
- Allow blobs up to **2 MB** (Celestia app per-blob limit).
- **Do not** store blobs in job payloads; store them **temporarily in Postgres** (`bytea`) with a **TTL** and enqueue **only `blobId`**.
- On success, **delete** the blob bytes and persist only **`txHash` + metadata**.
- No sha-256 uniqueness required (devs may submit identical blobs).

---

## Scope

**In scope**
- GitHub login (≥30 days old).
- Para wallet creation & address binding (nonce signature).
- One backend hot wallet (mnemonic in `.env`).
- Dusting new user wallets once.
- Authz grant (no expiry) from user → backend for `/celestia.blob.v1.MsgPayForBlobs`.
- Backend executes `MsgExec(PFB)` and pays fees.
- **pg-boss** for background jobs (Postgres-only).
- Server-side rate limits; **2 MB** blob cap.

**Out of scope**
- Feegrant.
- Stripe/card verification.
- Redis/BullMQ.
- Multi-wallet separation.

---

## User Stories

**As a developer**
- I can log in with GitHub (≥30 days).
- I can generate a Celestia wallet (Para) and bind it.
- I can authorize the backend and see the grant tx hash.
- I can submit a blob (≤2 MB) via API and get a tx hash.

**As the demo operator**
- I can restore my backend wallet from a mnemonic.
- I can dust new wallets automatically.
- I can broadcast grants and blob execs via queue jobs.
- I can enforce usage limits and purge expired temporary blobs.

---

## Functional Requirements

### Authentication
- GitHub OAuth (NextAuth).
- Reject accounts `< 30 days` old.

### Wallet Management
- Generate Para wallet on client.
- Bind user to address with a **server-issued nonce** and a **signed proof**.

### Dusting (one-time)
- If an address is unseen/undusted, enqueue `dust.send` job (2,000 uTIA).
- On completion, surface dust tx hash.

### Authz (no expiry)
- User signs `MsgGrant`:
  - `granter = devAddr`
  - `grantee = backendAddr`
  - `authorization = GenericAuthorization{ "/celestia.blob.v1.MsgPayForBlobs" }`
  - **no expiration**
- Backend broadcasts via queued `authz.broadcast`.
- Store grant tx hash and `hasAuthzGranted=true` (server flag).

### Blob Submission (≤ 2 MB)
- **tRPC** mutation accepts: `{ namespace, blobBase64 }`.
- Convert base64 → `Buffer`; **reject > 2 MB** for safety.
- Insert **temporary** row in `BlobPayload` (`bytea` + TTL `expireAt` = now+30m).
- Enqueue `pfb.exec` with `{ blobId }` (no blob bytes in job).
- Worker loads blob by `blobId`, builds `MsgPayForBlobs` (inner, signer=devAddr), wraps in `MsgExec` (outer, grantee=backendAddr), signs with backend wallet, broadcasts.
- On **success**: create `BlobTx{ txHash, userId, devAddr, namespace }`, **delete** `BlobPayload`.
- On **terminal failure**: delete `BlobPayload`.
- On **retryable failure**: keep `BlobPayload` until next attempt (backoff).

### Limits
- Dust once per address (ever).
- Optional daily cap (e.g., 3 blobs/day/user) — **keep configurable**.
- Blob size cap **2 MB**.
- Server-side revoke flag for abuse (`revoked=true` blocks submissions).

---

## Non-Functional
- Stack: T3 (Next.js, **tRPC only**, Prisma/Postgres).
- Background jobs: **pg-boss** (Postgres schema `boss`).
- On-chain: CosmJS + Celestia protos; one backend hot wallet from `.env`.
- Next.js body size limit: **3 MB** (2 MB blob + base64 overhead).
- Logs: userId, address, jobId, txHash, errors.
- Periodic cleanup: delete expired `BlobPayload` rows.

---

## Next.js Config (body size)
```ts
// next.config.js
module.exports = {
  api: {
    bodyParser: { sizeLimit: '3mb' },
  },
};
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

model BlobPayload {
  id         String   @id @default(cuid())
  userId     String
  devAddr    String
  namespace  String
  blob       Bytes    // Postgres bytea
  createdAt  DateTime @default(now())
  expireAt   DateTime // now() + 30 minutes
  @@index([expireAt])
}

model BlobTx {
  id         String   @id @default(cuid())
  userId     String
  devAddr    String
  namespace  String
  txHash     String   @unique
  createdAt  DateTime @default(now())
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

### Worker policy
- Concurrency: 3–5 per topic.
- Retries: exponential backoff (5s → 15s → 60s → 5m → 15m).
- Record attempts in JobLog.

### Worker logic

#### dust.send
- If Address.isDusted → complete (idempotent).
- Backend wallet sendTokens(… 2000 uTIA …).
- Mark isDusted=true, log tx hash.

#### authz.broadcast
- Broadcast user-signed MsgGrant (base64).
- Mark hasAuthzGranted=true, log tx hash.

#### pfb.exec
- Load BlobPayload by blobId; if missing → complete (already processed/expired).
- Check server flags: hasAuthzGranted && !revoked.
- Build inner MsgPayForBlobs{ signer=devAddr, namespace, blob }.
- Wrap in MsgExec{ grantee=backendAddr }; sign outer with backend wallet; pay fee.
- Broadcast; on success: create BlobTx, delete BlobPayload.

#### blob.cleanup (cron every 10 min)
- DELETE FROM BlobPayload WHERE expireAt < now();

---

## tRPC Routers

### user router (one-time)
- `me`: returns user + address.
- `bindAddress`: `{ address, signedNonce }` → bind after verifying signature.

### authz router (one-time)
- `dust`: `{ address }` → enqueue `dust.send` (idempotent).
- `grantAuthz`: `{ address, signedGrantTxBase64 }` → enqueue `authz.broadcast`.

### blob router (repeatable)
- `submit`: `{ namespace, blobBase64 }`
  - Convert base64→Buffer; **reject > 2 MB**.
  - Insert `BlobPayload{ userId, devAddr, namespace, blob, expireAt = now + 30m }`.
  - Enqueue `pfb.exec` with `{ blobId }`.
  - Return `{ enqueued, jobId }`.
- `jobStatus`: `{ jobId }` → `{ status, txHash? }`.
- `txs`: list recent `BlobTx` for the authenticated user.

### namespace router
- `random`: no input → returns a valid random namespace ID (29 bytes).
  - Format: [0x00][18 zeros][10 random bytes].
- `fromName`: { name: string } → deterministic namespace ID.
  - Format: [0x00][18 zeros][first 10 bytes of sha256(name)].
---

## Celestia Client (backend wallet)
- Use CosmJS DirectSecp256k1HdWallet from .env mnemonic.
- Connect SigningStargateClient to Mocha RPC; gas price e.g. 0.025utia.
- Build MsgExec with Any(MsgPayForBlobs) and broadcast.

---

### Config Defaults
- Dust: 2,000 uTIA
- Blob max size: 2 MB
- Daily PFB cap: 3 per user (optional; keep configurable)
- Authz expiration: none
- BlobPayload TTL: 30 minutes
- pg-boss retention: 7 days

---

### Success Criteria
- Dev with GitHub ≥30 days can:
1. Bind wallet,
2. Get dust tx,
3. Grant authz (no expiry),
4. Submit a ≤2 MB blob,
5. See tx hashes in explorer.
- All on-chain ops run via pg-boss jobs; blobs are deleted post-broadcast; only txHash + metadata remain.

---

### Namespace API (ADR-015 Compliant)

Structure
- Total size: 29 bytes (58 hex chars)
- Version (1 byte) — for user namespaces, always 0x00.
- ID (28 bytes) — made up of:
- 18 zero-bytes prefix (to keep reserved ranges clear),
- 10-byte suffix derived from randomness or user input.

Reserved ranges
- 0x00... (all zeros) → reserved/system.
- 0xFF... (all 0xFF) → parity shares.
- By fixing version = 0x00 and using zero-prefix for first 18 bytes, we avoid conflicts with reserved namespaces.

---

## Appendix: Bootstrap snippets

### pg-boss singleton

```ts
// src/server/jobs/boss.ts
import PgBoss from "pg-boss";
export const boss = new PgBoss({ connectionString: process.env.DATABASE_URL!, schema: "boss" });
```

### Start workers on server boot

```ts
// src/server/jobs/index.ts
import { boss } from "./boss";
import { sendDust, broadcastAuthz, execPfb, cleanupExpiredBlobs } from "./workers";

export async function startWorkers() {
  boss.on("error", (e) => console.error("pg-boss error", e));
  await boss.start();

  await boss.work("dust.send", { teamSize: 3 }, async (job) => sendDust(job.data.address, job.id));
  await boss.work("authz.broadcast", { teamSize: 3 }, async (job) => broadcastAuthz(job.data.signedTxBase64, job.data.address, job.id));
  await boss.work("pfb.exec", { teamSize: 5 }, async (job) => execPfb({ blobId: job.data.blobId, jobId: job.id }));

  // periodic cleanup
  await boss.schedule("blob.cleanup", "*/10 * * * *", {});
  await boss.work("blob.cleanup", async () => cleanupExpiredBlobs());

  console.log("pg-boss workers started ✅");
}
```

### Worker stubs

```ts
// src/server/jobs/workers.ts
import { prisma } from "@/server/db";
import { getCelestiaClient } from "@/server/celestia/client";

export async function sendDust(address: string) {
  const addr = await prisma.address.findUnique({ where: { bech32: address } });
  if (!addr || addr.isDusted) return { txHash: "already-dusted" };
  const { client, address: backendAddr } = await getCelestiaClient();
  const res = await client.sendTokens(backendAddr, address, [{ denom: "utia", amount: "2000" }], "auto");
  await prisma.address.update({ where: { bech32: address }, data: { isDusted: true } });
  return { txHash: res.transactionHash };
}

export async function broadcastAuthz(signedTxBase64: string, address: string) {
  const { client } = await getCelestiaClient();
  const rawTx = Buffer.from(signedTxBase64, "base64");
  const res = await client.broadcastTx(rawTx);
  await prisma.address.update({ where: { bech32: address }, data: { hasAuthzGranted: true } });
  return { txHash: res.transactionHash };
}

export async function execPfb({ blobId }: { blobId: string }) {
  const payload = await prisma.blobPayload.findUnique({ where: { id: blobId } });
  if (!payload) return { txHash: "blob-missing" };

  const { client, address: backendAddr } = await getCelestiaClient();

  // TODO: Build inner MsgPayForBlobs(signer=payload.devAddr, ns=payload.namespace, blob=payload.blob)
  // Wrap in MsgExec(grantee=backendAddr), sign with backend wallet, broadcast...
  const res = { transactionHash: "TODO_TX_HASH" }; // replace with real

  await prisma.$transaction([
    prisma.blobTx.create({
      data: { userId: payload.userId, devAddr: payload.devAddr, namespace: payload.namespace, txHash: res.transactionHash },
    }),
    prisma.blobPayload.delete({ where: { id: payload.id } }),
  ]);

  return { txHash: res.transactionHash };
}

export async function cleanupExpiredBlobs() {
  const deleted = await prisma.blobPayload.deleteMany({ where: { expireAt: { lt: new Date() } } });
  return { deleted: deleted.count };
}
```

---

## Appendix: Implementation Notes — MsgExec + MsgPayForBlobs

### Proto Type URLs (must match exactly)
- `MsgPayForBlobs`: `/celestia.blob.v1.MsgPayForBlobs`
- `MsgExec`: `/cosmos.authz.v1beta1.MsgExec`

### MsgPayForBlobs (inner) fields
```ts
type MsgPayForBlobs = {
  signer: string;                 // dev bech32 address (celestia1…)
  namespaces: Uint8Array[];       // each **29 bytes** ADR-015 (v=0x00 + 18 zero bytes + 10-byte suffix)
  blobSizes: number[];            // bytes length of each blob
  shareCommitments: Uint8Array[]; // per-blob namespaced share commitment
  shareVersions: number[];        // per-blob share version (usually 0)
};
```

### Outer wrapper — MsgExec
```ts
type MsgExec = {
  grantee: string;    // backend bech32 address
  msgs: Any[];        // [ Any( MsgPayForBlobs ) ]
};
```
- The outer tx signer = backendAddr (fee payer = backend).
- The inner “logical signer” = devAddr (in MsgPayForBlobs.signer), validated by Authz.

### Dependencies (TS/Node)
- @cosmjs/proto-signing, @cosmjs/stargate, cosmjs-types
- Celestia protobufs generated into TS (include x/blob package)

### Builder outline (worker side)
```ts
import { Any } from "cosmjs-types/google/protobuf/any";
import { MsgExec } from "cosmjs-types/cosmos/authz/v1beta1/tx";
import { MsgPayForBlobs } from "celestia-proto/ celestia/blob/v1/tx"; // adjust path
import { SigningStargateClient, GasPrice, coins } from "@cosmjs/stargate";
import { getCelestiaClient } from "@/server/celestia/client";

// 1) Validate and hydrate inputs
function assert29Bytes(ns: Uint8Array) {
  if (ns.length !== 29) throw new Error("namespace must be 29 bytes");
}

export async function buildAndBroadcastExecPfb(opts: {
  backendAddr: string;
  devAddr: string;
  namespaces: Uint8Array[];         // usually 1 element for demo
  blobs: Uint8Array[];               // 1 blob (≤ 2 MB)
  shareCommitments: Uint8Array[];    // computed per blob
  shareVersions?: number[];          // default [0]
  fee?: { amount: string; denom: string; gas: string };
}) {
  const {
    backendAddr, devAddr, namespaces, blobs,
    shareCommitments, shareVersions = blobs.map(() => 0),
    fee = { amount: "3000", denom: "utia", gas: "400000" },
  } = opts;

  if (namespaces.length !== blobs.length ||
      blobs.length !== shareCommitments.length ||
      shareCommitments.length !== shareVersions.length) {
    throw new Error("pfb arrays must have equal length");
  }
  namespaces.forEach(assert29Bytes);

  const blobSizes = blobs.map((b) => b.length);

  // 2) Encode inner MsgPayForBlobs
  const inner = MsgPayForBlobs.fromPartial({
    signer: devAddr,
    namespaces,
    blobSizes,
    shareCommitments,
    shareVersions,
  });

  const innerAny: Any = {
    typeUrl: "/celestia.blob.v1.MsgPayForBlobs",
    value: MsgPayForBlobs.encode(inner).finish(),
  };

  // 3) Wrap in MsgExec (outer)
  const exec = MsgExec.fromPartial({
    grantee: backendAddr,
    msgs: [innerAny],
  });

  const execAny: Any = {
    typeUrl: "/cosmos.authz.v1beta1.MsgExec",
    value: MsgExec.encode(exec).finish(),
  };

  // 4) Sign & broadcast with backend wallet
  const { client } = await getCelestiaClient(); // returns SigningStargateClient + loaded backend signer
  const res = await client.signAndBroadcast(
    backendAddr,
    [execAny],
    { amount: coins(fee.amount, fee.denom), gas: fee.gas },
    "" // memo
  );

  if (res.code && res.code !== 0) {
    // res.rawLog is helpful to log for debugging ante/auhz errors
    throw new Error(`broadcast failed: code=${res.code} log=${res.rawLog}`);
  }

  return res.transactionHash!;
}
```
---

## Commitment Sidecar Integration

### Rationale
- Computing share_commitments for MsgPayForBlobs requires Celestia’s NMT logic (go-square), which is complex to re-implement in TypeScript.
- Instead, we use a Go sidecar service deployed at:

```bash
https://commitmentsforlangsng7xratc-container-jovial-wing.functions.fnc.fr-par.scw.cloud/compute-commitment
```
This service exposes a single endpoint that computes commitments correctly using Celestia’s Go libraries.

### Endpoint Contract

`POST /compute-commitment`

#### Request
```json
{
  "namespace": "hex-encoded-29-bytes",
  "blobBase64": "base64-encoded-blob",
  "shareVersion": 0,
  "namespaceIsHex": true
}
```

#### Response
```json
{
  "commitmentBase64": "base64-encoded-commitment"
}
```

- namespace: 29-byte ADR-015 namespace (hex string).
- blobBase64: raw blob payload (≤2 MB).
- shareVersion: currently fixed at 0.
- namespaceIsHex: boolean, true when namespace is hex.

### Worker Integration (execPfb)

1. Load blob from BlobPayload in Postgres.
2. Convert blob → base64, namespace → hex string.
3. Call sidecar endpoint, retrieve commitmentBase64.
4. Decode commitment and build MsgPayForBlobs{ signer=devAddr, namespaces, blobSizes, shareCommitments, shareVersions }.
5. Wrap in MsgExec{ grantee=backendAddr, msgs:[Any(PFB)] }.
6. Sign & broadcast with backend wallet.
7. On success: persist BlobTx{ txHash } and delete BlobPayload.

### Example Fetch Helper

```ts
async function fetchCommitment(namespaceHex: string, blobBase64: string): Promise<Uint8Array> {
  const res = await fetch(COMMIT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      namespace: namespaceHex,
      blobBase64,
      shareVersion: 0,
      namespaceIsHex: true,
    }),
  });
  if (!res.ok) throw new Error(`commitment API failed: ${res.status}`);
  const data = await res.json();
  return Buffer.from(data.commitmentBase64, "base64");
}
```

#### Implication
- Node backend does not implement NMT logic.
- All heavy lifting (splitting, tree construction, root calculation) is offloaded to the sidecar.
- Node backend only glues: fetch commitment → build MsgExec(PFB) → broadcast.

---

### Proto Compilation Notes (MVP)

For this demo, we only need the Celestia blob module protos.
Do not compile the entire tree to avoid bloat.

#### Required protos
- proto/celestia/blob/v1/tx.proto → defines MsgPayForBlobs
- proto/celestia/blob/v1/blob.proto → defines supporting types (Blob, commitments)

Already included via cosmjs-types
- cosmos/authz/v1beta1/tx.proto → defines MsgExec
- google/protobuf/any.proto

#### Build instructions
- Use ts-proto (or equivalent) to generate TS bindings.
- Package them under "celestia-proto" namespace for imports:


---

## Using Generated Protos in Code (MVP)

### Imports

#### Generated files live under src/generated/celestia/blob/v1/:

```ts
import { MsgPayForBlobs } from "@/generated/celestia/blob/v1/tx";
import { Any } from "cosmjs-types/google/protobuf/any";
import { MsgExec } from "cosmjs-types/cosmos/authz/v1beta1/tx";
import { coins } from "@cosmjs/stargate";
```

### Build & Broadcast MsgExec(Any(PFB))

We pre-encode the Celestia PFB with our generated TS binding, wrap it in Any, then put that inside MsgExec. CosmJS already knows MsgExec, so no custom registry is required.

```ts
// src/server/celestia/buildAndBroadcastExecPfb.ts
import { Any } from "cosmjs-types/google/protobuf/any";
import { MsgExec } from "cosmjs-types/cosmos/authz/v1beta1/tx";
import { coins } from "@cosmjs/stargate";
import { MsgPayForBlobs } from "@/generated/celestia/blob/v1/tx";
import { getCelestiaClient } from "./client";

function assert29(ns: Uint8Array) {
  if (ns.length !== 29) throw new Error("namespace must be 29 bytes (ADR-015)");
}

export async function buildAndBroadcastExecPfb(opts: {
  backendAddr: string;            // fee payer & outer signer
  devAddr: string;                // logical inner signer in PFB
  namespaceHex: string;           // 58 hex chars → 29 bytes
  blob: Uint8Array;               // ≤ 2 MB
  commitment: Uint8Array;         // from sidecar for (namespace, blob)
  shareVersion?: number;          // default 0
  fee?: { amount: string; denom: string; gas: string };
}) {
  const {
    backendAddr,
    devAddr,
    namespaceHex,
    blob,
    commitment,
    shareVersion = 0,
    fee = { amount: "3000", denom: "utia", gas: "400000" },
  } = opts;

  const ns = Buffer.from(namespaceHex, "hex");
  assert29(ns);

  // Inner: MsgPayForBlobs
  const pfb = MsgPayForBlobs.fromPartial({
    signer: devAddr,
    namespaces: [ns],
    blobSizes: [blob.length],
    shareCommitments: [commitment],
    shareVersions: [shareVersion],
  });

  const pfbAny: Any = {
    typeUrl: "/celestia.blob.v1.MsgPayForBlobs",
    value: MsgPayForBlobs.encode(pfb).finish(),
  };

  // Outer: MsgExec (signed & fee-paid by backend)
  const exec = MsgExec.fromPartial({
    grantee: backendAddr,
    msgs: [pfbAny],
  });

  const execAny: Any = {
    typeUrl: "/cosmos.authz.v1beta1.MsgExec",
    value: MsgExec.encode(exec).finish(),
  };

  const { client } = await getCelestiaClient();
  const res = await client.signAndBroadcast(
    backendAddr,
    [execAny],
    { amount: coins(fee.amount, fee.denom), gas: fee.gas },
    ""
  );

  if (res.code && res.code !== 0) {
    throw new Error(`PFB broadcast failed: code=${res.code} log=${res.rawLog}`);
  }
  return res.transactionHash!;
}
```

### Commitment Sidecar (call before building PFB)

```ts
// src/server/celestia/commitments.ts
const COMMIT_URL = "https://commitmentsforlangsng7xratc-container-jovial-wing.functions.fnc.fr-par.scw.cloud/compute-commitment";

export async function getCommitmentFromSidecar(namespaceHex: string, blob: Uint8Array) {
  const r = await fetch(COMMIT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      namespace: namespaceHex,
      blobBase64: Buffer.from(blob).toString("base64"),
      shareVersion: 0,
      namespaceIsHex: true,
    }),
  });
  if (!r.ok) throw new Error(`commitment API failed: ${r.status} ${await r.text()}`);
  const { commitmentBase64 } = await r.json();
  return Buffer.from(commitmentBase64, "base64");
}
```

### Worker Integration (pfb.exec)

```ts
// src/server/jobs/workers.ts (excerpt)
import { prisma } from "@/server/db";
import { getCelestiaClient } from "@/server/celestia/client";
import { getCommitmentFromSidecar } from "@/server/celestia/commitments";
import { buildAndBroadcastExecPfb } from "@/server/celestia/buildAndBroadcastExecPfb";

export async function execPfb({ blobId }: { blobId: string }) {
  const row = await prisma.blobPayload.findUnique({ where: { id: blobId } });
  if (!row) return { txHash: "blob-missing" };

  const nsHex = row.namespace;                 // 58-hex string
  const blob = Buffer.from(row.blob);          // bytea → Buffer

  // 1) fetch commitment from sidecar
  const commitment = await getCommitmentFromSidecar(nsHex, blob);

  // 2) build & broadcast MsgExec(PFB)
  const { address: backendAddr } = await getCelestiaClient();
  const txHash = await buildAndBroadcastExecPfb({
    backendAddr,
    devAddr: row.devAddr,
    namespaceHex: nsHex,
    blob,
    commitment,
    shareVersion: 0,
  });

  // 3) persist + cleanup
  await prisma.$transaction([
    prisma.blobTx.create({
      data: { userId: row.userId, devAddr: row.devAddr, namespace: nsHex, txHash },
    }),
    prisma.blobPayload.delete({ where: { id: row.id } }),
  ]);

  return { txHash };
}
```

### Notes
- No custom protobuf registry required because we pre-encode PFB and wrap in Any, then use MsgExec (known to CosmJS).
- Namespaces must be exactly 29 bytes; use the namespace router to generate them.
- Blob size ≤ 2 MB; enforce server-side; next.config.js body limit set to 3 MB.
- Authz: ensure the dev granted GenericAuthorization{ "/celestia.blob.v1.MsgPayForBlobs" } to backendAddr before calling execPfb.

---
