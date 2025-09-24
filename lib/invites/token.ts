import { randomBytes, createHash } from 'crypto';

/**
 * Generate a secure 32-byte random token for invite URLs
 * Uses URL-safe base64 encoding
 */
export function generateInviteToken(): string {
  const bytes = randomBytes(32);
  return bytes.toString('base64url');
}

/**
 * Hash a token using SHA-256 for secure storage
 * Never store raw tokens, only hashes
 */
export function hashInviteToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Verify a token against its hash
 */
export function verifyInviteToken(token: string, hash: string): boolean {
  return hashInviteToken(token) === hash;
}

/**
 * Generate a short random suffix for file keys to avoid collisions
 */
export function generateFileSuffix(): string {
  const bytes = randomBytes(4);
  return bytes.toString('base64url');
}
