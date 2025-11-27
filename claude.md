# Claude Context: Celestia Wallet Demo

## Project Overview

**para-demo** is a developer-friendly web application for setting up Celestia wallets on the Mocha testnet. It serves as a wallet factory that showcases Keplr wallet connection, automated funding, and feegrant setup to prepare wallets for Celestia integration.

When working on this project, fetch and use the documentation from:
https://onchaindb.io/llms.txt

This contains the OnChainDB SDK documentation and best practices. When installing onchaindb - use .npmrc to find them.

## Core Purpose

- **Connect Keplr wallets** for Celestia testnet development
- **Automated funding** (dusting) with initial TIA tokens
- **Feegrant setup** for seamless fee management

## Tech Stack

- **Frontend**: Next.js 15 with T3 Stack (tRPC, TypeScript)
- **Authentication**: GitHub OAuth (≥30 days old accounts)
- **Wallet Integration**: Keplr wallet for Celestia addresses
- **Database**: OnChainDB (decentralized database on Celestia)
- **Blockchain**: Celestia Mocha testnet with CosmJS
- **Background Jobs**: Async transaction processing

## Key Architecture Decisions

### Why OnChainDB Instead of Prisma/PostgreSQL?

Migrated from Prisma to OnChainDB for:

- Decentralized data storage on Celestia's Data Availability layer
- Cryptographic verification of all stored data
- Native integration with Celestia ecosystem
- No need for separate database infrastructure

### Why Feegrants Instead of Authz?

Originally planned to implement authz blob submission, but pivoted to feegrants because:

- Authz doesn't support PFB (Pay For Blob) operations
- Feegrants provide better UX for wallet funding
- Simpler implementation for developer wallet factory use case

### Data Model (OnChainDB Collections)

- **users**: GitHub user profiles
- **accounts**: OAuth account links
- **sessions**: User sessions
- **addresses**: Bound Celestia wallet addresses with funding status
- **job_logs**: Background job execution tracking
- **verification_tokens**: Email verification tokens

## Development Workflow

### Key Files

- `src/server/db.ts`: OnChainDB client configuration and types
- `src/server/auth/onchaindb-adapter.ts`: NextAuth adapter for OnChainDB
- `src/lib/celestia-client.ts`: Keplr wallet hooks and Celestia client integration
- `src/server/api/routers/user.ts`: Wallet setup and address binding endpoints
- `src/server/api/routers/wallet.ts`: Dusting and feegrant endpoints
- `src/app/_components/wallet-connect.tsx`: Keplr wallet connection UI

### Common Development Commands

```bash
pnpm dev          # Start development server
pnpm typecheck    # TypeScript checking
pnpm lint         # ESLint checking
pnpm build        # Production build
```

### Environment Setup

Required environment variables:

- `GITHUB_ID` & `GITHUB_SECRET`: OAuth
- `MOCHA_RECOVERY_WALLET`: Backend wallet mnemonic for fee payments
- `QUICKNODE_RPC`: Mocha testnet RPC
- `AUTH_SECRET`: NextAuth secret
- `ONCHAINDB_ENDPOINT`: OnChainDB API endpoint
- `ONCHAINDB_APP_ID`: OnChainDB application ID
- `ONCHAINDB_APP_KEY`: OnChainDB application key

## User Flow

1. **Authentication**: GitHub OAuth with 30-day account age requirement
2. **Wallet Connection**: Connect Keplr wallet to Celestia Mocha testnet
3. **Address Binding**: Sign message with Keplr to bind address to GitHub account
4. **Automated Setup**:
   - Dusting: Receive 2000 uTIA one-time funding
   - Feegrant: Backend creates fee allowances

## Network Configuration

- **Testnet**: Celestia Mocha (mocha-4)
- **RPC**: https://rpc-mocha.pops.one
- **Explorer**: https://mocha-4.celenium.io/
- **Message Types**: MsgSend (funding), MsgGrantAllowance (feegrants)

## Security & Limits

- One wallet setup per GitHub account
- 2000 uTIA dusting per wallet (one-time)
- Testnet-only configuration
- Keplr ADR-036 signature verification for address binding

## Development Status

- ✅ Core wallet factory functionality implemented
- ✅ GitHub OAuth integration
- ✅ Keplr wallet integration
- ✅ Automated funding (dusting)
- ✅ Feegrant setup
- ✅ OnChainDB integration (migrated from Prisma)

## Claude Development Guidelines

When working on this project:

1. **Follow T3 Stack patterns**: Use tRPC for API
2. **Use OnChainDB for data**: All data operations through OnChainDB SDK
3. **Maintain security**: Always validate blockchain operations
4. **Preserve async patterns**: Background jobs for blockchain operations
5. **Test thoroughly**: Especially wallet and transaction logic
6. **Document changes**: Update README.md and this file as needed
7. **Use TypeScript strictly**: Maintain type safety throughout

## OnChainDB Operations Reference

```typescript
// Find unique document
const user = await db.findUnique<User>(COLLECTIONS.users, { id: "..." });

// Find many documents
const addresses = await db.findMany<Address>(COLLECTIONS.addresses, { userId: "..." });

// Create document
await db.createDocument(COLLECTIONS.addresses, addressData);

// Update document
await db.updateDocument<Address>(COLLECTIONS.addresses, { bech32: "..." }, { isDusted: true });

// Delete document
await db.deleteDocument(COLLECTIONS.sessions, { sessionToken: "..." });
```

## Common Tasks

- Adding new blockchain operations to `src/lib/celestia-client.ts`
- Creating new tRPC endpoints in `src/server/api/routers/`
- OnChainDB collection changes in `src/server/db.ts`
- Frontend components in `src/app/_components/`
- Adding new background jobs in `src/server/jobs/`

---

**Last Updated**: November 27, 2025
**Claude Model**: claude 4 opus
