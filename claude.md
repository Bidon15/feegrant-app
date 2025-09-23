# Claude Context: Celestia Blob Demo

## Project Overview
**para-demo** is a developer-friendly web application for setting up Celestia wallets on the Mocha testnet. It serves as a wallet factory that showcases Para wallet creation, automated funding, and feegrant setup to prepare wallets for Celestia integration.

## Core Purpose
- **Create Para wallets** for Celestia testnet development
- **Automated funding** (dusting) with initial TIA tokens
- **Feegrant setup** for seamless fee management
- **Private key export** for external Celestia integrations

## Tech Stack
- **Frontend**: Next.js 15 with T3 Stack (tRPC, Prisma, TypeScript)
- **Authentication**: GitHub OAuth (≥30 days old accounts)
- **Wallet Integration**: Para wallet for Celestia addresses
- **Database**: PostgreSQL with Prisma ORM
- **Blockchain**: Celestia Mocha testnet with CosmJS
- **Background Jobs**: Async transaction processing

## Key Architecture Decisions

### Why Feegrants Instead of Authz?
Originally planned to implement authz blob submission, but pivoted to feegrants because:
- Authz doesn't support PFB (Pay For Blob) operations
- Feegrants provide better UX for wallet funding
- Simpler implementation for developer wallet factory use case

### Database Schema
- **User**: GitHub user profiles
- **Address**: Bound Celestia wallet addresses with funding status
- **JobLog**: Background job execution tracking
- **Wallet metadata**: Dusting and feegrant status tracking

## Development Workflow

### Key Files
- `src/server/celestia/client.ts`: Celestia blockchain integration
- `src/server/api/routers/user.ts`: Wallet setup and key export endpoints
- `src/server/api/routers/`: tRPC API endpoints
- `prisma/schema.prisma`: Database schema

### Common Development Commands
```bash
pnpm dev          # Start development server
pnpm db:studio    # Open Prisma Studio
pnpm db:generate  # Generate Prisma client
pnpm typecheck    # TypeScript checking
pnpm lint         # ESLint checking
```

### Environment Setup
Required environment variables:
- `DATABASE_URL`: PostgreSQL connection
- `GITHUB_CLIENT_ID` & `GITHUB_CLIENT_SECRET`: OAuth
- `NEXT_PUBLIC_PARA_API_KEY`: Para wallet integration
- `CELESTIA_MNEMONIC`: Backend wallet for fee payments
- `CELESTIA_RPC_URL`: Mocha testnet RPC
- `NEXTAUTH_SECRET` & `NEXTAUTH_URL`: Authentication

## User Flow
1. **Authentication**: GitHub OAuth with 30-day account age requirement
2. **Wallet Connection**: Link Para wallet to Celestia testnet address
3. **Automated Setup**: 
   - Dusting: Receive 2000 uTIA one-time funding
   - Feegrant: Backend creates fee allowances
4. **Key Export**: Secure private key export for external use

## Network Configuration
- **Testnet**: Celestia Mocha (mocha-4)
- **RPC**: https://rpc-mocha.pops.one
- **Explorer**: https://mocha-4.celenium.io/
- **Message Types**: MsgSend (funding), MsgGrantAllowance (feegrants)

## Security & Limits
- One wallet setup per GitHub account
- 2000 uTIA dusting per wallet (one-time)
- Testnet-only configuration
- Para wallet signature verification for address binding

## Development Status
- ✅ Core wallet factory functionality implemented
- ✅ GitHub OAuth integration
- ✅ Para wallet integration
- ✅ Automated funding (dusting)
- ✅ Feegrant setup
- ✅ Private key export
- ✅ Comprehensive documentation

## Claude Development Guidelines
When working on this project:
1. **Follow T3 Stack patterns**: Use tRPC for API, Prisma for database
2. **Maintain security**: Always validate blockchain operations
3. **Preserve async patterns**: Background jobs for blockchain operations
4. **Test thoroughly**: Especially wallet and transaction logic
5. **Document changes**: Update README.md and this file as needed
6. **Use TypeScript strictly**: Maintain type safety throughout

## Common Tasks
- Adding new blockchain operations to `src/server/celestia/client.ts`
- Creating new tRPC endpoints in `src/server/api/routers/`
- Database schema changes via Prisma migrations
- Frontend components in `src/components/`
- Adding new background jobs in `src/server/jobs/`

---

**Last Updated**: September 23, 2025
**Claude Model**: claude 4 sonnet