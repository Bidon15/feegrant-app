# PRD: BlobCell — Celestia Developer Wallet Factory

## Overview

**BlobCell** is a developer-friendly web application that provides Celestia Mocha testnet wallets with automated funding and fee grants. It serves as a wallet factory that removes friction for developers getting started with Celestia blob submissions.

**Live**: https://blobcell.dev

---

## Core Value Proposition

1. **Zero-friction onboarding**: Developers connect their Keplr wallet and get instantly funded
2. **Fee-free development**: Feegrants allow developers to submit blobs without managing TIA
3. **Namespace management**: Create and organize namespaces for blob submissions
4. **Activity tracking**: Monitor blob activity across namespaces via Celenium integration

---

## Current Features (Implemented)

### Authentication
- GitHub OAuth login
- Account age verification (≥30 days) to prevent abuse
- Session management via JWT cookies

### Wallet Setup
- **Keplr Integration**: Connect existing Keplr wallet to Celestia Mocha testnet
- **Address Binding**: Sign ADR-036 message to cryptographically bind wallet to GitHub account
- **One wallet per account**: Prevents duplicate funding

### Automated Funding
- **Dusting**: One-time 2000 uTIA funding for new wallets
- **Feegrant**: 1 TIA (1,000,000 uTIA) allowance from backend wallet
- **Real-time status**: Track funding and feegrant status on profile

### Namespace Management
- **Create namespaces**: Format `prefix/name` (e.g., `username/myapp`)
- **Deterministic IDs**: SHA-256 based namespace ID generation
- **Availability check**: Verify namespace uniqueness in DB and on-chain via Celenium
- **Archive/restore**: Soft-delete namespaces without losing data

### Repository Linking
- **GitHub repos**: Link repositories to namespaces (many-to-many)
- **Activity attribution**: Track which repos submit blobs to which namespaces

### Network Monitoring (htop)
- **Leaderboard**: Top namespaces by blob count
- **Network stats**: Total users, wallets, namespaces, feegranted TIA
- **Blob stats**: Total blobs, data stored, fees spent
- **Real-time updates**: 30-second refresh interval

### Developer Quickstart
- **Go examples**: celestia-node API client setup
- **Rust examples**: Lumina light node client setup
- **Environment configuration**: .env templates for both languages

---

## Technical Architecture

### Tech Stack
- **Frontend**: Next.js 15, React, TailwindCSS, shadcn/ui
- **API**: tRPC (type-safe RPC)
- **Authentication**: NextAuth.js with GitHub provider
- **Database**: OnChainDB (decentralized on Celestia DA)
- **Blockchain**: CosmJS for Celestia Mocha testnet
- **External APIs**: Celenium for on-chain namespace/blob data

### Data Model (OnChainDB Collections)

```
users
├── id: string (primary)
├── githubId: string (unique)
├── githubLogin: string
├── githubCreated: string (ISO date)
├── name: string | null
├── email: string | null
├── image: string | null
├── createdAt: string
└── updatedAt: string

accounts
├── id: string (primary)
├── userId: string (FK → users)
├── type: string
├── provider: string
├── providerAccountId: string
├── access_token: string | null
└── refresh_token: string | null

addresses
├── id: string (primary)
├── userId: string (unique, FK → users)
├── bech32: string (unique)
├── isDusted: boolean
├── hasFeeGrant: boolean
├── feeAllowanceRemaining: string | null
├── createdAt: string
└── updatedAt: string

namespaces
├── id: string (primary)
├── userId: string (FK → users)
├── name: string (unique, e.g., "user/app")
├── namespaceId: string (unique, 16-char hex)
├── description: string | null
├── blobCount: number
├── totalBytes: number
├── lastActivityAt: string | null
├── isActive: boolean
├── createdAt: string
└── updatedAt: string

namespace_repos (junction table)
├── id: string (primary)
├── namespaceId: string (FK → namespaces.id)
├── userId: string (FK → users)
├── repoId: number (GitHub repo ID)
├── fullName: string (e.g., "owner/repo")
├── name: string
├── owner: string
├── description: string | null
├── isPrivate: boolean
├── htmlUrl: string
├── language: string | null
├── stargazersCount: number
├── forksCount: number
└── createdAt: string
```

### Key API Routes (tRPC)

```
user.bindAddress      - Bind Keplr wallet to account
wallet.dust           - Request initial TIA funding
wallet.feegrant       - Request fee allowance
namespace.create      - Create new namespace
namespace.list        - List user's namespaces
namespace.addRepo     - Link GitHub repo to namespace
namespace.removeRepo  - Unlink repo from namespace
namespace.listWithActivity - Get namespaces with Celenium stats
stats.network         - Network-wide statistics
stats.leaderboard     - Top namespaces by activity
stats.myStats         - Current user's wallet stats
github.listRepos      - Fetch user's GitHub repositories
```

### External Integrations

**Celenium API** (https://api-mocha.celenium.io)
- `GET /v1/namespace/{id}` - Namespace details
- `GET /v1/namespace/{id}/blobs` - Namespace blobs
- `GET /v1/namespace_by_hash/{hash}/active` - Namespace stats

**Celestia Mocha Testnet**
- RPC: QuickNode endpoint (configurable)
- Chain ID: mocha-4
- Denom: utia

---

## User Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     ONBOARDING FLOW                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. GitHub Login                                            │
│     └─→ Verify account age ≥30 days                        │
│                                                             │
│  2. Connect Keplr Wallet                                    │
│     └─→ Add Mocha testnet to Keplr if needed               │
│                                                             │
│  3. Sign Binding Message                                    │
│     └─→ ADR-036 signature proves wallet ownership          │
│                                                             │
│  4. Automatic Funding                                       │
│     ├─→ Dust: 2000 uTIA sent to wallet                     │
│     └─→ Feegrant: 1 TIA allowance created                  │
│                                                             │
│  5. Ready to Build!                                         │
│     └─→ Submit blobs using Go/Rust client                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Configuration

### Environment Variables

```bash
# Authentication
GITHUB_ID=                    # GitHub OAuth App ID
GITHUB_SECRET=                # GitHub OAuth App Secret
AUTH_SECRET=                  # NextAuth secret (random string)

# Celestia
MOCHA_RECOVERY_WALLET=        # Backend wallet mnemonic (24 words)
QUICKNODE_RPC=                # QuickNode Mocha RPC endpoint

# OnChainDB
ONCHAINDB_ENDPOINT=           # OnChainDB API endpoint
ONCHAINDB_APP_ID=             # Application ID
ONCHAINDB_APP_API_KEY=        # API key
ONCHAINDB_APP_WALLET=         # Payment wallet address

# Admin
SCHEMA_INIT_SECRET=           # Secret for schema management API
```

### Funding Defaults

| Parameter | Value | Description |
|-----------|-------|-------------|
| Dust amount | 2,000 uTIA | One-time funding per wallet |
| Feegrant amount | 1,000,000 uTIA (1 TIA) | Fee allowance per wallet |
| Account age | 30 days | Minimum GitHub account age |

---

## Architecture Decisions

### Why Keplr Instead of Para?
- Users already have Keplr for Cosmos ecosystem
- No additional wallet creation friction
- Direct signing with existing keys

### Why Feegrants Instead of Authz?
- Authz doesn't support PFB (Pay For Blob) messages
- Feegrants provide simpler UX for fee sponsorship
- Users maintain full control of their wallets

### Why OnChainDB Instead of PostgreSQL?
- Decentralized storage on Celestia DA
- No separate database infrastructure needed
- Native integration with Celestia ecosystem
- Cryptographic verification of stored data

### Why Celenium for Stats?
- Authoritative source for on-chain data
- No need to run indexer infrastructure
- Real-time blob and namespace statistics

---

## Security Considerations

1. **One wallet per GitHub account**: Prevents sybil attacks on funding
2. **Account age verification**: 30-day minimum prevents fresh account abuse
3. **ADR-036 signatures**: Cryptographic proof of wallet ownership
4. **Backend wallet protection**: Mnemonic stored as environment variable
5. **Rate limiting**: tRPC middleware prevents API abuse
6. **Testnet only**: No mainnet funds at risk

---

## Future Features (Planned)

> This section will be updated as we plan new features

### Phase 2: Enhanced Developer Experience
- [ ] API key generation for programmatic access
- [ ] Webhook notifications for blob submissions
- [ ] CLI tool for namespace management

### Phase 3: Team Features
- [ ] Team namespaces with shared access
- [ ] Role-based permissions (admin, contributor)
- [ ] Team billing/usage dashboards

### Phase 4: Analytics
- [ ] Detailed blob submission analytics
- [ ] Cost estimation tools
- [ ] Historical data visualization

---

## Success Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Registered users | - | Track in htop |
| Funded wallets | - | Track in htop |
| Active namespaces | - | Track via Celenium |
| Total blobs submitted | - | Track via Celenium |

---

## Appendix: API Examples

### Create Namespace
```typescript
// Client-side
const result = await trpc.namespace.create.mutate({
  fullName: "myuser/production",
  description: "Production namespace for my app"
});
// Returns: { id, name, namespaceId, ... }
```

### Link Repository
```typescript
// Client-side
await trpc.namespace.addRepo.mutate({
  namespaceId: "abc123",
  repoId: 12345,
  fullName: "owner/repo",
  name: "repo",
  owner: "owner",
  description: "My repository",
  isPrivate: false,
  htmlUrl: "https://github.com/owner/repo",
  language: "Go",
  stargazersCount: 10,
  forksCount: 2
});
```

### Get Wallet Stats
```typescript
// Client-side
const stats = await trpc.stats.myStats.useQuery();
// Returns: { user, wallet: { address, balance, hasFeeGrant, ... } }
```

---

**Last Updated**: December 3, 2025
**Version**: 2.0
