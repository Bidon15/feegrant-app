import { createHash, randomBytes } from "crypto";

/**
 * Generate a random namespace following ADR-015
 * Format: [0x00][18 zeros][10 random bytes] = 29 bytes total
 */
export function generateRandomNamespace(): string {
  const version = Buffer.from([0x00]);
  const padding = Buffer.alloc(18, 0);
  const randomSuffix = randomBytes(10);
  
  const namespace = Buffer.concat([version, padding, randomSuffix]);
  return namespace.toString("hex");
}

/**
 * Generate a deterministic namespace from a name
 * Format: [0x00][18 zeros][first 10 bytes of sha256(name)] = 29 bytes total
 */
export function generateNamespaceFromName(name: string): string {
  const version = Buffer.from([0x00]);
  const padding = Buffer.alloc(18, 0);
  
  const hash = createHash("sha256").update(name).digest();
  const suffix = hash.subarray(0, 10);
  
  const namespace = Buffer.concat([version, padding, suffix]);
  return namespace.toString("hex");
}

/**
 * Validate that a namespace hex string is properly formatted
 */
export function validateNamespace(namespaceHex: string): boolean {
  if (namespaceHex.length !== 58) return false; // 29 bytes * 2 hex chars
  
  try {
    const buffer = Buffer.from(namespaceHex, "hex");
    if (buffer.length !== 29) return false;
    
    // Check version byte is 0x00
    if (buffer[0] !== 0x00) return false;
    
    // Check 18 padding bytes are zero
    for (let i = 1; i <= 18; i++) {
      if (buffer[i] !== 0x00) return false;
    }
    
    return true;
  } catch {
    return false;
  }
}
