import { NextRequest } from 'next/server';

// Simple in-memory rate limiter (for development)
// In production, consider using Redis or Upstash
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Simple rate limiter implementation
 * @param key - Unique key for rate limiting (e.g., IP address)
 * @param limit - Maximum requests allowed
 * @param windowMs - Time window in milliseconds
 * @returns Object with allowed status and reset time
 */
export function rateLimit(
  key: string,
  limit: number = 60,
  windowMs: number = 10 * 60 * 1000 // 10 minutes
): { allowed: boolean; resetTime: number; remaining: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    // First request or window expired
    const resetTime = now + windowMs;
    rateLimitStore.set(key, {
      count: 1,
      resetTime,
    });
    
    return {
      allowed: true,
      resetTime,
      remaining: limit - 1,
    };
  }

  if (entry.count >= limit) {
    // Rate limit exceeded
    return {
      allowed: false,
      resetTime: entry.resetTime,
      remaining: 0,
    };
  }

  // Increment counter
  entry.count++;
  rateLimitStore.set(key, entry);

  return {
    allowed: true,
    resetTime: entry.resetTime,
    remaining: limit - entry.count,
  };
}

/**
 * Get client IP address from request
 */
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  
  if (realIP) {
    return realIP;
  }
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  return 'unknown';
}

/**
 * Rate limit for invite endpoints
 */
export function rateLimitInviteEndpoint(
  request: NextRequest,
  tokenHash: string,
  endpoint: 'meta' | 'sign' | 'commit'
): { allowed: boolean; resetTime: number; remaining: number } {
  const ip = getClientIP(request);
  const key = `invite:${endpoint}:${tokenHash}:${ip}`;
  
  return rateLimit(key, 60, 10 * 60 * 1000); // 60 requests per 10 minutes
}

/**
 * Clean up expired rate limit entries (call periodically)
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

// Clean up every 5 minutes
if (typeof window === 'undefined') {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
}
