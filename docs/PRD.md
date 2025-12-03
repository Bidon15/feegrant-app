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

## Feature: Admin Panel (Next Priority)

### Problem Statement

Currently, the backend wallet automatically issues feegrants to all users with no differentiation. There's no way to:
1. Reward active developers with larger feegrants
2. Use admin's own funds instead of backend wallet
3. Have multiple admins with their own feegrant budgets

### Solution: Admin Panel with Keplr-Signed Feegrants

#### User Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     ADMIN PANEL FLOW                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Navigate to /admin                                      │
│     └─→ Connect Keplr wallet                               │
│                                                             │
│  2. Verify Admin Status                                     │
│     └─→ Check if connected address is in admins collection │
│                                                             │
│  3. One-time Authz Setup                                    │
│     └─→ Sign MsgGrant to allow backend to execute          │
│         MsgGrantAllowance on admin's behalf                │
│                                                             │
│  4. Manage Feegrants                                        │
│     ├─→ View htop leaderboard with admin actions           │
│     ├─→ Select user(s) to reward                           │
│     ├─→ Set feegrant amount (e.g., 5 TIA, 10 TIA)          │
│     └─→ Backend executes MsgExec(MsgGrantAllowance)        │
│         using admin's authz grant                          │
│                                                             │
│  5. Track Admin Activity                                    │
│     └─→ View history of feegrants issued by this admin     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Data Model Changes

```
admins (new collection)
├── id: string (primary)
├── celestiaAddress: string (unique) - Admin's Celestia bech32 address
├── userId: string | null (FK → users) - Optional link to GitHub account
├── name: string - Display name for admin
├── hasAuthzGrant: boolean - Whether authz is set up
├── authzGrantTxHash: string | null - Tx hash of authz grant
├── totalFeegrantsIssued: number - Count of feegrants issued
├── totalTiaGranted: string - Total uTIA granted by this admin
├── isActive: boolean - Can be deactivated without deletion
├── createdAt: string
└── updatedAt: string

admin_feegrants (new collection)
├── id: string (primary)
├── adminId: string (FK → admins)
├── adminAddress: string - Admin's address (denormalized)
├── recipientAddress: string - User receiving the feegrant
├── recipientUserId: string | null - Optional link to user
├── amount: string - Amount in uTIA (e.g., "5000000" for 5 TIA)
├── txHash: string - Transaction hash
├── status: string - "pending" | "success" | "failed"
├── createdAt: string
└── updatedAt: string
```

#### Authz Message Structure

Admin grants backend permission to execute `MsgGrantAllowance` on their behalf:

```typescript
// Admin signs this message once
const authzGrant = {
  typeUrl: "/cosmos.authz.v1beta1.MsgGrant",
  value: {
    granter: adminAddress,      // Admin's Celestia address
    grantee: backendAddress,    // Backend wallet address
    grant: {
      authorization: {
        typeUrl: "/cosmos.authz.v1beta1.GenericAuthorization",
        value: {
          msg: "/cosmos.feegrant.v1beta1.MsgGrantAllowance"
        }
      },
      expiration: null  // No expiration (or set a long duration)
    }
  }
};
```

#### Backend Execution

When admin wants to issue a feegrant:

```typescript
// Backend builds and broadcasts this
const execMsg = {
  typeUrl: "/cosmos.authz.v1beta1.MsgExec",
  value: {
    grantee: backendAddress,
    msgs: [{
      typeUrl: "/cosmos.feegrant.v1beta1.MsgGrantAllowance",
      value: {
        granter: adminAddress,      // Admin pays for the feegrant
        grantee: recipientAddress,  // User receiving feegrant
        allowance: {
          typeUrl: "/cosmos.feegrant.v1beta1.BasicAllowance",
          value: {
            spendLimit: [{ denom: "utia", amount: "5000000" }]  // 5 TIA
          }
        }
      }
    }]
  }
};
```

#### API Routes (tRPC)

```
admin.verifyAdmin       - Check if connected wallet is admin
admin.getAuthzStatus    - Check if authz grant exists on-chain
admin.setupAuthz        - Record authz grant tx hash after signing
admin.listUsers         - Get users with funding status (for admin view)
admin.issueFeegrant     - Issue feegrant to specific address
admin.getHistory        - Get admin's feegrant history
admin.getStats          - Get admin's total grants issued
```

#### UI Components

**1. Admin Gate (`/admin`)**
- Connect Keplr button
- Verify admin status against `admins` collection
- Show "Not authorized" if address not in admins

**2. Authz Setup Card**
- Check on-chain if authz exists (query feegrant module)
- If not: Show "Setup Authz" button → Keplr signing flow
- If yes: Show green checkmark with grant details

**3. Leaderboard with Admin Actions**
- Same as htop but with action buttons
- "Grant 1 TIA", "Grant 5 TIA", "Grant 10 TIA" buttons per user
- Custom amount input field
- Bulk select for multiple users

**4. Admin Activity Log**
- Table of feegrants issued by this admin
- Columns: Recipient, Amount, Date, Tx Hash, Status
- Filter by date range

**5. Admin Stats Dashboard**
- Total TIA granted
- Number of users funded
- Admin's wallet balance
- Feegrant allowance remaining (if admin set a budget)

#### Security Considerations

1. **Admin verification**: Only addresses in `admins` collection can access
2. **On-chain authz**: Backend cannot issue grants without valid authz
3. **Admin funds**: Feegrants come from admin's wallet, not backend
4. **Audit trail**: All grants logged in `admin_feegrants` collection
5. **Revocation**: Admins can revoke authz at any time via Keplr

#### Initial Admin Setup (Script)

```typescript
// One-time script to add initial admin(s)
await db.createDocument(COLLECTIONS.admins, {
  id: generateId(),
  celestiaAddress: "celestia1...",  // Your address
  name: "Primary Admin",
  hasAuthzGrant: false,
  authzGrantTxHash: null,
  totalFeegrantsIssued: 0,
  totalTiaGranted: "0",
  isActive: true,
  createdAt: nowISO(),
  updatedAt: nowISO(),
});
```

#### Implementation Order

1. **Phase 1: Data & Auth**
   - [ ] Add `admins` collection to OnChainDB schema
   - [ ] Add `admin_feegrants` collection
   - [ ] Create admin verification tRPC endpoint
   - [ ] Create `/admin` page with Keplr connection

2. **Phase 2: Authz Flow**
   - [ ] Implement authz grant message building
   - [ ] Create Keplr signing flow for authz
   - [ ] Store authz grant status in OnChainDB
   - [ ] Query on-chain authz status

3. **Phase 3: Feegrant Execution**
   - [ ] Build MsgExec(MsgGrantAllowance) message
   - [ ] Implement backend execution via authz
   - [ ] Record feegrant transactions
   - [ ] Handle success/failure states

4. **Phase 4: UI Polish**
   - [ ] Enhanced leaderboard with admin actions
   - [ ] Bulk grant functionality
   - [ ] Admin activity history
   - [ ] Stats dashboard

---

## Future Features (Planned)

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
