# Para Wallet Integration Setup

This guide explains how to set up and use the Para wallet integration in the Celestia Blob Demo.

## Prerequisites

1. **Para Wallet Extension**: Install the Para wallet browser extension
2. **Para Developer Account**: Sign up at [Para Developer Portal](https://developer.getpara.com)
3. **GitHub Account**: Must be ≥30 days old for authentication

## Installation

The Para React SDK has been integrated into this project. To install dependencies:

```bash
npm install @getpara/react-sdk@alpha @tanstack/react-query --save-exact
```

## Configuration

### 1. Environment Variables

Add your Para API key to your environment variables:

```bash
# .env.local
NEXT_PUBLIC_PARA_API_KEY=your_para_api_key_here
```

### 2. Para Provider Setup

The Para provider is configured in `src/app/_components/providers.tsx`:

```tsx
<ParaProvider
  paraClientConfig={{
    env: "TESTNET" as any, // Para SDK environment
    apiKey: process.env.NEXT_PUBLIC_PARA_API_KEY || "YOUR_API_KEY",
  }}
>
  {children}
</ParaProvider>
```

## Usage Flow

### 1. Connect GitHub Account
- Sign in with your GitHub account (must be ≥30 days old)
- This creates your user profile in the system

### 2. Connect Para Wallet
- Click "Connect Para Wallet" button
- Para wallet modal will open
- Connect your Celestia testnet wallet
- Sign the binding message to associate your wallet with your GitHub account

### 3. Wallet Setup
- **Get Dusted**: Receive initial TIA tokens (2000 uTIA) for transaction fees
- **Grant Authorization**: Allow the backend to submit blobs on your behalf using Authz

### 4. Submit Blobs
- Enter your blob data (up to 2MB)
- System automatically generates namespace following ADR-015 format
- Backend wraps your blob in MsgPayForBlobs and broadcasts to Celestia
- View transaction status and history

## Technical Details

### Para SDK Integration
- Uses official Para React SDK hooks: `useModal`, `useAccount`, `useWallet`
- Handles wallet connection and address retrieval
- Integrates with existing tRPC API for address binding

### Components Structure
- `ParaConnect`: Main wallet connection component
- `WalletSetup`: Handles dusting and authorization flow
- `BlobSubmit`: Blob submission interface
- `BlobHistory`: Transaction history display

### API Integration
The Para wallet address is bound to the user account via:
```typescript
const bindAddressMutation = api.user.bindAddress.useMutation({
  // Binds Para wallet address to GitHub user account
});
```

## Rate Limits
- **3 blobs per day** per user (configurable)
- **2MB maximum** blob size
- **30-minute TTL** for temporary blob storage

## Testnet Configuration
- **Network**: Celestia Mocha testnet
- **Chain ID**: mocha-4
- **Explorer**: https://mocha-4.celenium.io/
- **Namespace Format**: ADR-015 (29 bytes: 0x00 + 18 zeros + 10 random bytes)

## Troubleshooting

### Para Wallet Not Found
- Ensure Para wallet extension is installed and enabled
- Refresh the page and try connecting again

### Connection Issues
- Check that you're on the correct network (Celestia testnet)
- Verify your Para API key is correctly set in environment variables

### Transaction Failures
- Ensure your wallet has sufficient TIA balance
- Check that authorization has been granted to the backend
- Verify the blob size is under 2MB limit

## Development Notes

### Message Signing (TODO)
Currently uses placeholder values for signature verification. In production, implement:
```typescript
// Use Para SDK's message signing functionality
const signature = await para.signMessage(nonce);
const publicKey = await para.getPublicKey();
```

### Authorization Grant (TODO)
The authorization grant currently uses mock data. Implement proper MsgGrant transaction:
```typescript
// Create and sign MsgGrant transaction with Para wallet
const grantTx = await para.signTransaction(msgGrantTx);
```

## Next Steps

1. Obtain Para API key from developer portal
2. Set up environment variables
3. Test wallet connection flow
4. Implement proper message signing and authorization
5. Deploy to production with mainnet configuration
