# BlobCell

A developer-friendly web application for setting up Celestia wallets on the Mocha testnet. BlobCell streamlines wallet onboarding with Keplr integration, automated funding, and feegrant setup.

## Overview

BlobCell allows developers to:
- **Connect Keplr wallets** for Celestia testnet development
- **Get automatic funding** (dusting) with initial TIA tokens
- **Set up feegrant allowances** for gasless transactions
- **Start submitting blobs** immediately with zero friction

Built for the **Celestia Mocha testnet** with GitHub authentication and Keplr wallet integration.

## Architecture

### Tech Stack
- **Frontend**: Next.js 15 with T3 Stack (tRPC, TypeScript)
- **Authentication**: GitHub OAuth (requires accounts ≥30 days old)
- **Wallet**: Keplr wallet integration for Celestia addresses
- **Database**: OnChainDB (decentralized database on Celestia)
- **Blockchain**: Celestia Mocha testnet with CosmJS

### Why OnChainDB?
- Decentralized data storage on Celestia's Data Availability layer
- Cryptographic verification of all stored data
- Native integration with Celestia ecosystem
- No separate database infrastructure required

## Quick Start

### Prerequisites
- Node.js 18+ and pnpm
- [Keplr wallet extension](https://www.keplr.app/)
- GitHub account (≥30 days old)

### Installation

1. **Clone and install dependencies**:
```bash
git clone <repository-url>
cd para-demo
pnpm install
```

2. **Set up environment variables**:
```bash
cp .env.example .env.local
```

Configure your `.env.local`:
```bash
# GitHub OAuth
GITHUB_ID="your_github_client_id"
GITHUB_SECRET="your_github_client_secret"

# Celestia Backend Wallet (for fee payments)
MOCHA_RECOVERY_WALLET="your backend wallet mnemonic"
QUICKNODE_RPC="https://your-quicknode-endpoint"

# NextAuth
AUTH_SECRET="your-secret-key"

# OnChainDB
ONCHAINDB_ENDPOINT="https://api.onchaindb.io"
ONCHAINDB_APP_ID="your_app_id"
ONCHAINDB_APP_KEY="your_app_key"
```

3. **Start development server**:
```bash
pnpm dev
```

Visit `http://localhost:3000` to see the application.

## User Flow

### 1. Authentication
- Sign in with GitHub (account must be ≥30 days old)
- Creates user profile in OnChainDB

### 2. Wallet Connection
- Connect Keplr wallet (auto-suggests Celestia Mocha chain)
- Sign message to verify wallet ownership (ADR-036)
- Address bound to your GitHub account

### 3. Wallet Setup
- **Dusting**: Receive 2000 uTIA for initial transactions (one-time)
- **Feegrant**: Backend creates fee allowance for gasless transactions
- **Ready**: Start submitting blobs immediately

## Technical Details

### Wallet Binding
- Uses Keplr's `signArbitrary` for ADR-036 compliant signatures
- Verifies signature server-side with `@cosmjs/crypto`
- One wallet per GitHub account

### Fee Management
- **Dusting**: 2000 uTIA initial funding per wallet
- **Feegrant**: `BasicAllowance` from backend wallet to user
- **Gasless**: Users can submit transactions without holding TIA for fees

### Data Model (OnChainDB Collections)
- **users**: GitHub user profiles
- **accounts**: OAuth account links
- **sessions**: User sessions
- **addresses**: Bound Celestia addresses with funding status

## Celestia Integration

### Network Configuration
- **Testnet**: Celestia Mocha (mocha-4)
- **RPC**: Configurable via QUICKNODE_RPC
- **Explorer**: https://mocha-4.celenium.io/

### Message Types
- `MsgSend`: Wallet funding (dusting)
- `MsgGrantAllowance`: Feegrant setup

## Development

### Project Structure
```
src/
├── app/                 # Next.js app router
│   ├── auth/           # Onboarding flow
│   ├── get-started/    # Documentation & community
│   ├── htop/           # Leaderboard view
│   └── profile/        # User dashboard
├── server/
│   ├── api/routers/    # tRPC endpoints
│   ├── auth/           # NextAuth + OnChainDB adapter
│   ├── celenium/       # Celenium API client
│   ├── jobs/           # Dust & feegrant jobs
│   └── db.ts           # OnChainDB client
├── components/         # React components
└── lib/               # Utilities
```

### Key Files
- `src/server/db.ts`: OnChainDB client and collections
- `src/server/auth/onchaindb-adapter.ts`: NextAuth adapter for OnChainDB
- `src/server/api/routers/user.ts`: Wallet binding endpoints
- `src/server/api/routers/wallet.ts`: Dust & feegrant endpoints
- `src/server/jobs/index.ts`: Background job execution

### Commands
```bash
pnpm dev          # Start development server
pnpm typecheck    # TypeScript checking
pnpm lint         # ESLint checking
pnpm build        # Production build
```

## Security

- GitHub OAuth with 30-day account age requirement
- Keplr ADR-036 signature verification for address binding
- One wallet setup per GitHub account
- Testnet-only configuration

## License

MIT License

---

**Note**: This is a testnet application for Celestia Mocha. Do not use with mainnet funds.
