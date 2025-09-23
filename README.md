# Celestia Blob Demo

A developer-friendly web application for setting up Celestia wallets on the Mocha testnet. This demo showcases Para wallet creation, automated funding, and feegrant setup to prepare wallets for Celestia integration.

## 🌟 Overview

This application allows developers to:
- **Create Para wallets** for Celestia testnet development
- **Get automatic funding** (dusting) with initial TIA tokens
- **Set up feegrant allowances** for seamless fee management
- **Export private keys** for use in external Celestia integrations

Built for the **Celestia Mocha testnet** with GitHub authentication and Para wallet integration. Perfect for developers who need funded wallets for their Celestia projects.

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 15 with T3 Stack (tRPC, Prisma, TypeScript)
- **Authentication**: GitHub OAuth (requires ≥30 days old accounts)
- **Wallet**: Para wallet integration for Celestia addresses
- **Database**: PostgreSQL with Prisma ORM
- **Background Jobs**: Async transaction processing
- **Blockchain**: Celestia Mocha testnet integration with CosmJS

### Core Components
- **User Management**: GitHub OAuth + Para wallet binding
- **Wallet Setup**: Automated wallet funding and feegrant configuration
- **Transaction Processing**: Async blockchain operations
- **Key Export**: Secure private key export for external integrations

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and pnpm
- PostgreSQL database
- [Para wallet extension](https://getpara.com)
- GitHub account (≥30 days old)
- Para API key from [developer portal](https://developer.getpara.com)

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
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/celestia_demo"

# GitHub OAuth
GITHUB_CLIENT_ID="your_github_client_id"
GITHUB_CLIENT_SECRET="your_github_client_secret"

# Para Wallet
NEXT_PUBLIC_PARA_API_KEY="your_para_api_key"

# Celestia Backend Wallet (for fee payments)
CELESTIA_MNEMONIC="your backend wallet mnemonic"
CELESTIA_RPC_URL="https://rpc-mocha.pops.one"

# NextAuth
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

3. **Set up database**:
```bash
pnpm db:generate
pnpm db:migrate
```

4. **Start development server**:
```bash
pnpm dev
```

Visit `http://localhost:3000` to see the application.

## 📱 User Flow

### 1. Authentication
- Sign in with GitHub (account must be ≥30 days old)
- Creates user profile in the system

### 2. Wallet Setup
- **Connect Para Wallet**: Link your Celestia testnet address
- **Get Dusted**: Receive 2000 uTIA for initial transactions (one-time)
- **Setup Feegrant**: Backend creates fee allowance for seamless transactions

### 3. Key Export
- Export your wallet's private key securely
- Use the funded wallet in your own Celestia integrations
- Wallet comes pre-configured with feegrant allowances
- Ready for immediate use in external applications

## 🔧 Technical Details

### Wallet Setup Flow
1. **User authenticates** with GitHub and connects Para wallet
2. **Dusting job** funds new wallet with 2000 uTIA
3. **Feegrant job** creates fee allowance from user to backend
4. **Wallet ready** for export and external use
5. **Key export** allows developers to use wallet in their own projects

### Fee Management
- **Dusting**: New wallets receive 2000 uTIA one-time
- **Feegrant**: Backend creates fee allowances for seamless transaction fees
- **Pre-configured**: Exported wallets come ready with fee management setup
- **External ready**: Wallets work immediately in external Celestia integrations

### Database Schema
- **User**: GitHub user profiles
- **Address**: Bound Celestia wallet addresses with funding status
- **JobLog**: Background job execution tracking
- **Wallet metadata**: Dusting and feegrant status tracking

### Async Operations
- **Dusting**: Initial wallet funding (2000 uTIA)
- **Feegrant**: Fee allowance setup for seamless transactions
- **Processing**: Ensures wallets are properly funded and configured

## 🔒 Security & Limits

### Rate Limiting
- **One wallet setup** per GitHub account
- **2000 uTIA dusting** per wallet (one-time)
- **Feegrant allowances** configured automatically

### Authentication
- GitHub OAuth with 30-day account age requirement
- Para wallet signature verification for address binding
- Secure backend wallet for fee payments

### Network Security
- Testnet-only configuration (Celestia Mocha)
- Proper message type validation
- CosmJS integration with custom registry for Celestia-specific messages

## 🌐 Celestia Integration

### Network Configuration
- **Testnet**: Celestia Mocha (mocha-4)
- **RPC**: https://rpc-mocha.pops.one
- **Explorer**: https://mocha-4.celenium.io/
- **Namespace Format**: ADR-015 compliant (0x00 + 18 zeros + 10 random bytes)

### Message Types
- `MsgSend`: Wallet funding (dusting)
- `MsgGrantAllowance`: Feegrant setup
- Custom CosmJS registry for Celestia compatibility

## 📚 Development

### Project Structure
```
src/
├── app/                 # Next.js app router
├── server/
│   ├── api/            # tRPC routers
│   ├── celestia/       # Blockchain client
│   ├── jobs/           # Background workers
│   └── db.ts           # Database connection
├── components/         # React components
└── types/             # TypeScript definitions
```

### Key Files
- `src/server/celestia/client.ts`: Celestia blockchain integration
- `src/server/api/routers/user.ts`: Wallet setup and key export endpoints
- `src/server/api/routers/`: tRPC API endpoints
- `prisma/schema.prisma`: Database schema

### Development Commands
```bash
pnpm dev          # Start development server
pnpm db:studio    # Open Prisma Studio
pnpm db:generate  # Generate Prisma client
pnpm typecheck    # TypeScript checking
pnpm lint         # ESLint checking
```

## 🤝 Contributing

This is a demo project showcasing Celestia wallet setup patterns. Feel free to:
- Report issues or bugs
- Suggest improvements
- Submit pull requests
- Use as a wallet factory for your own Celestia applications

## 📄 License

This project is open source and available under the MIT License.

---

**Note**: This is a testnet demo application. Do not use with mainnet funds or in production without proper security audits.
