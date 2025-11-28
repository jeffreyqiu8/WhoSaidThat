/**
 * Tests for input validation and sanitization utilities
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeText,
  sanitizeNickname,
  sanitizeResponse,
  validateGameCode,
  validateUUID,
} from './validation';

describe('sanitizeText', () => {
  it('should remove HTML tags', () => {
    const input = '<script>alert("xss")</script>Hello';
    const result = sanitizeText(input);
    expect(result).toBe('alert("xss")Hello');
  });

  it('should remove null bytes', () => {
    const input = 'Hello\0World';
    const result = sanitizeText(input);
    expect(result).toBe('HelloWorld');
  });

  it('should trim whitespace', () => {
    const input = '  Hello World  ';
    const result = sanitizeText(input);
    expect(result).toBe('Hello World');
  });

  it('should enforce max length', () => {
    const input = 'a'.repeat(100);
    const result = sanitizeText(input, 50);
    expect(result.length).toBe(50);
  });

  it('should handle empty strings', () => {
    const result = sanitizeText('');
    expect(result).toBe('');
  });

  it('should handle non-string input', () => {
    const result = sanitizeText(123 as any);
    expect(result).toBe('');
  });
});

describe('sanitizeNickname', () => {
  it('should accept valid nicknames', () => {
    const result = sanitizeNickname('Player123');
    expect(result.isValid).toBe(true);
    expect(result.sanitized).toBe('Player123');
  });

  it('should accept nicknames with spaces', () => {
    const result = sanitizeNickname('Cool Player');
    expect(result.isValid).toBe(true);
    expect(result.sanitized).toBe('Cool Player');
  });

  it('should reject empty nicknames', () => {
    const result = sanitizeNickname('');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Nickname cannot be empty');
  });

  it('should reject nicknames that are only whitespace', () => {
    const result = sanitizeNickname('   ');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Nickname cannot be empty');
  });

  it('should reject nicknames shorter than 3 characters', () => {
    const result = sanitizeNickname('AB');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Nickname must be at least 3 characters');
  });

  it('should reject nicknames with special characters', () => {
    const result = sanitizeNickname('Player@123');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('letters, numbers, and spaces');
  });

  it('should remove HTML tags from nicknames', () => {
    const result = sanitizeNickname('<b>Player</b>');
    expect(result.sanitized).toBe('Player');
    expect(result.isValid).toBe(true);
  });

  it('should enforce max length of 20 characters', () => {
    const longName = 'a'.repeat(30);
    const result = sanitizeNickname(longName);
    expect(result.sanitized.length).toBe(20);
  });

  it('should trim whitespace before validation', () => {
    const result = sanitizeNickname('  Player  ');
    expect(result.isValid).toBe(true);
    expect(result.sanitized).toBe('Player');
  });
});

describe('sanitizeResponse', () => {
  it('should accept valid responses', () => {
    const result = sanitizeResponse('This is my response!');
    expect(result.isValid).toBe(true);
    expect(result.sanitized).toBe('This is my response!');
  });

  it('should reject empty responses', () => {
    const result = sanitizeResponse('');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Response cannot be empty');
  });

  it('should reject responses that are only whitespace', () => {
    const result = sanitizeResponse('   ');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Response cannot be empty');
  });

  it('should remove HTML tags', () => {
    const result = sanitizeResponse('<script>alert("xss")</script>My answer');
    expect(result.sanitized).toBe('alert("xss")My answer');
    expect(result.isValid).toBe(true);
  });

  it('should enforce max length of 500 characters', () => {
    const longResponse = 'a'.repeat(600);
    const result = sanitizeResponse(longResponse);
    expect(result.sanitized.length).toBe(500);
  });

  it('should trim whitespace', () => {
    const result = sanitizeResponse('  My response  ');
    expect(result.sanitized).toBe('My response');
  });
});

describe('validateGameCode', () => {
  it('should accept valid 6-character alphanumeric codes', () => {
    expect(validateGameCode('ABC123')).toBe(true);
    expect(validateGameCode('XYZ789')).toBe(true);
    expect(validateGameCode('000000')).toBe(true);
    expect(validateGameCode('AAAAAA')).toBe(true);
  });

  it('should reject codes with wrong length', () => {
    expect(validateGameCode('ABC12')).toBe(false);
    expect(validateGameCode('ABC1234')).toBe(false);
  });

  it('should reject codes with lowercase letters', () => {
    expect(validateGameCode('abc123')).toBe(false);
  });

  it('should reject codes with special characters', () => {
    expect(validateGameCode('ABC-12')).toBe(false);
    expect(validateGameCode('ABC@12')).toBe(false);
  });

  it('should reject non-string input', () => {
    expect(validateGameCode(123456 as any)).toBe(false);
  });

  it('should reject empty strings', () => {
    expect(validateGameCode('')).toBe(false);
  });
});

describe('validateUUID', () => {
  it('should accept valid UUIDs', () => {
    expect(validateUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(validateUUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true);
  });

  it('should accept UUIDs with uppercase letters', () => {
    expect(validateUUID('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
  });

  it('should reject invalid UUID formats', () => {
    expect(validateUUID('not-a-uuid')).toBe(false);
    expect(validateUUID('550e8400-e29b-41d4-a716')).toBe(false);
    expect(validateUUID('550e8400e29b41d4a716446655440000')).toBe(false);
  });

  it('should reject non-string input', () => {
    expect(validateUUID(123 as any)).toBe(false);
  });

  it('should reject empty strings', () => {
    expect(validateUUID('')).toBe(false);
  });
});
