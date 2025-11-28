/**
 * Tests for rate limiting utilities
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkRateLimit, cleanupRateLimitStore } from './rate-limit';

describe('checkRateLimit', () => {
  beforeEach(() => {
    // Clean up before each test
    cleanupRateLimitStore();
  });

  it('should allow requests within limit', () => {
    const result1 = checkRateLimit('test-client', {
      maxRequests: 5,
      windowMs: 60000,
    });
    
    expect(result1.allowed).toBe(true);
    expect(result1.remaining).toBe(4);
    
    const result2 = checkRateLimit('test-client', {
      maxRequests: 5,
      windowMs: 60000,
    });
    
    expect(result2.allowed).toBe(true);
    expect(result2.remaining).toBe(3);
  });

  it('should block requests exceeding limit', () => {
    const config = {
      maxRequests: 3,
      windowMs: 60000,
    };
    
    // Make 3 requests (should all succeed)
    checkRateLimit('test-client', config);
    checkRateLimit('test-client', config);
    checkRateLimit('test-client', config);
    
    // 4th request should be blocked
    const result = checkRateLimit('test-client', config);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('should track different clients separately', () => {
    const config = {
      maxRequests: 2,
      windowMs: 60000,
    };
    
    const result1 = checkRateLimit('client-1', config);
    const result2 = checkRateLimit('client-2', config);
    
    expect(result1.allowed).toBe(true);
    expect(result2.allowed).toBe(true);
    expect(result1.remaining).toBe(1);
    expect(result2.remaining).toBe(1);
  });

  it('should reset after time window expires', () => {
    const config = {
      maxRequests: 2,
      windowMs: 100, // 100ms window
    };
    
    // Use up the limit
    checkRateLimit('test-client', config);
    checkRateLimit('test-client', config);
    
    // Should be blocked
    const blocked = checkRateLimit('test-client', config);
    expect(blocked.allowed).toBe(false);
    
    // Wait for window to expire
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        // Should be allowed again
        const allowed = checkRateLimit('test-client', config);
        expect(allowed.allowed).toBe(true);
        expect(allowed.remaining).toBe(1);
        resolve();
      }, 150);
    });
  });

  it('should provide reset timestamp', () => {
    const now = Date.now();
    const result = checkRateLimit('test-client', {
      maxRequests: 5,
      windowMs: 60000,
    });
    
    expect(result.resetAt).toBeGreaterThan(now);
    expect(result.resetAt).toBeLessThanOrEqual(now + 60000);
  });

  it('should handle different rate limit configurations', () => {
    // First config
    checkRateLimit('test-client', {
      maxRequests: 2,
      windowMs: 60000,
    });
    
    // Different config should be tracked separately
    const result = checkRateLimit('test-client', {
      maxRequests: 5,
      windowMs: 30000,
    });
    
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });
});

describe('cleanupRateLimitStore', () => {
  it('should remove expired entries', () => {
    const config = {
      maxRequests: 2,
      windowMs: 50, // Very short window
    };
    
    // Create some entries
    checkRateLimit('client-1', config);
    checkRateLimit('client-2', config);
    
    // Wait for entries to expire
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        cleanupRateLimitStore();
        
        // After cleanup, should be able to make requests again
        const result1 = checkRateLimit('client-1', config);
        const result2 = checkRateLimit('client-2', config);
        
        expect(result1.allowed).toBe(true);
        expect(result2.allowed).toBe(true);
        expect(result1.remaining).toBe(1);
        expect(result2.remaining).toBe(1);
        
        resolve();
      }, 100);
    });
  });
});
