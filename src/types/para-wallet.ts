export interface ParaWallet {
  connect(): Promise<void>;
  getAddress(): Promise<string>;
  signMessage(message: string): Promise<{ signature: string; publicKey: string }>;
  signTransaction(tx: string): Promise<string>;
  isConnected(): boolean;
}

declare global {
  interface Window {
    para?: ParaWallet;
  }
}
