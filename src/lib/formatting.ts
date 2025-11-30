/**
 * Shared formatting utilities
 */

/**
 * Format uTIA amount to human-readable TIA string
 */
export function formatTia(utia: number): string {
  const tia = utia / 1_000_000;
  return `${tia.toFixed(2)} TIA`;
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Truncate wallet address for display
 */
export function truncateAddress(address: string, startChars = 10, endChars = 6): string {
  if (address.length <= startChars + endChars + 3) return address;
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}
