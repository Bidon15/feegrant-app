/**
 * Shared formatting utilities
 */

/**
 * Format uTIA amount to human-readable string.
 * - Shows uTIA for amounts < 10,000 uTIA (0.01 TIA) for better precision
 * - Uses floor to avoid rounding up (e.g., 0.999 TIA shows as 0.99, not 1.00)
 */
export function formatTia(utia: number): string {
  // For small amounts (< 0.01 TIA), show in uTIA for clarity
  if (utia > 0 && utia < 10_000) {
    return `${Math.floor(utia).toLocaleString()} uTIA`;
  }

  const tia = utia / 1_000_000;

  // Use floor to truncate instead of round (multiply, floor, divide)
  // This ensures 0.999 shows as 0.99, not 1.00
  const truncated = Math.floor(tia * 100) / 100;
  return `${truncated.toFixed(2)} TIA`;
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
