import { getCelestiaClient } from "~/server/celestia/client";
import { env } from "~/env";

// Payment quote structure from OnChainDB x402 response
export interface PaymentQuote {
  quote_id: string;
  total_cost_tia: string;
  total_cost_utia: number;
  broker_address: string;
  matched_records?: number;
  cost_breakdown?: {
    celestia_fee: number;
    broker_fee: number;
    indexing_cost?: number;
  };
}

// Payment callback response expected by OnChainDB SDK
export interface PaymentResponse {
  txHash: string;
  network?: string;
}

// Payment proof structure required by OnChainDB SDK for delete/update operations
export interface PaymentProof {
  payment_tx_hash: string;
  user_address: string;
  broker_address: string;
  amount_utia: number;
}

/**
 * Execute payment for OnChainDB x402 flow
 *
 * This function is called by the OnChainDB SDK when a store operation
 * returns HTTP 402 Payment Required. It sends tokens from the backend
 * wallet to the broker address specified in the quote.
 */
export async function executeOnChainDBPayment(
  quote: PaymentQuote
): Promise<PaymentResponse> {
  console.log(`[OnChainDB Payment] Processing payment for quote: ${quote.quote_id}`);
  console.log(`[OnChainDB Payment] Amount: ${quote.total_cost_tia} TIA (${quote.total_cost_utia} utia)`);
  console.log(`[OnChainDB Payment] Broker: ${quote.broker_address}`);

  const { client, address: backendAddr } = await getCelestiaClient();

  // Validate we have tokens to send
  const balance = await client.getBalance(backendAddr, "utia");
  const requiredAmount = quote.total_cost_utia;

  if (parseInt(balance.amount) < requiredAmount) {
    throw new Error(
      `Insufficient balance for OnChainDB payment. ` +
      `Required: ${requiredAmount} utia, Available: ${balance.amount} utia`
    );
  }

  // Send payment to broker address
  const fee = {
    amount: [{ denom: "utia", amount: "5000" }],
    gas: "100000",
  };

  console.log(`[OnChainDB Payment] Sending ${requiredAmount} utia from ${backendAddr} to ${quote.broker_address}`);

  const result = await client.sendTokens(
    backendAddr,
    quote.broker_address,
    [{ denom: "utia", amount: String(requiredAmount) }],
    fee,
    `OnChainDB payment for quote ${quote.quote_id}`
  );

  if (result.code !== 0) {
    console.error(`[OnChainDB Payment] Transaction failed: code=${result.code}, log=${result.rawLog}`);
    throw new Error(`OnChainDB payment failed: code=${result.code} log=${result.rawLog}`);
  }

  console.log(`[OnChainDB Payment] Payment successful: ${result.transactionHash}`);

  return {
    txHash: result.transactionHash,
    network: env.CELESTIA_CHAIN_ID,
  };
}

/**
 * Create a payment callback for OnChainDB store operations
 *
 * Returns a function that can be passed to the OnChainDB SDK's store() method.
 * The SDK will automatically call this when HTTP 402 is returned.
 */
export function createPaymentCallback() {
  return async (quote: PaymentQuote): Promise<PaymentResponse> => {
    return executeOnChainDBPayment(quote);
  };
}

/**
 * Execute a direct payment for OnChainDB operations that require upfront payment
 * (like deleteDocument which doesn't support callback pattern)
 *
 * Returns a payment proof that can be passed to SDK methods
 */
export async function executeDirectPayment(amountUtia: number): Promise<PaymentProof> {
  const { client, address: backendAddr } = await getCelestiaClient();
  const brokerAddress = env.ONCHAINDB_APP_WALLET;

  console.log(`[OnChainDB Payment] Direct payment: ${amountUtia} utia to ${brokerAddress}`);

  // Validate we have tokens to send
  const balance = await client.getBalance(backendAddr, "utia");
  if (parseInt(balance.amount) < amountUtia) {
    throw new Error(
      `Insufficient balance for OnChainDB payment. ` +
      `Required: ${amountUtia} utia, Available: ${balance.amount} utia`
    );
  }

  // Send payment to broker address
  const fee = {
    amount: [{ denom: "utia", amount: "5000" }],
    gas: "100000",
  };

  const result = await client.sendTokens(
    backendAddr,
    brokerAddress,
    [{ denom: "utia", amount: String(amountUtia) }],
    fee,
    `OnChainDB direct payment`
  );

  if (result.code !== 0) {
    console.error(`[OnChainDB Payment] Transaction failed: code=${result.code}, log=${result.rawLog}`);
    throw new Error(`OnChainDB payment failed: code=${result.code} log=${result.rawLog}`);
  }

  console.log(`[OnChainDB Payment] Direct payment successful: ${result.transactionHash}`);

  return {
    payment_tx_hash: result.transactionHash,
    user_address: backendAddr,
    broker_address: brokerAddress,
    amount_utia: amountUtia,
  };
}
