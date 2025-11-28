import { describe, it, expect } from 'vitest';
import { generateGameCode, validateNickname } from './game';

describe('generateGameCode', () => {
  it('should generate a 6-character code', () => {
    const code = generateGameCode();
    expect(code).toHaveLength(6);
  });

  it('should generate alphanumeric codes only', () => {
    const code = generateGameCode();
    expect(code).toMatch(/^[A-Z0-9]+$/);
  });

  it('should generate different codes on multiple calls', () => {
    const codes = new Set();
    for (let i = 0; i < 100; i++) {
      codes.add(generateGameCode());
    }
    // With 36^6 possible codes, we should get mostly unique codes
    expect(codes.size).toBeGreaterThan(90);
  });
});

describe('validateNickname', () => {
  it('should accept valid nicknames', () => {
    expect(validateNickname('John')).toBe(true);
    expect(validateNickname('Player 1')).toBe(true);
    expect(validateNickname('ABC')).toBe(true);
    expect(validateNickname('Test User 123')).toBe(true);
    expect(validateNickname('a'.repeat(20))).toBe(true);
  });

  it('should reject nicknames that are too short', () => {
    expect(validateNickname('AB')).toBe(false);
    expect(validateNickname('a')).toBe(false);
    expect(validateNickname('')).toBe(false);
  });

  it('should reject nicknames that are too long', () => {
    expect(validateNickname('a'.repeat(21))).toBe(false);
    expect(validateNickname('a'.repeat(25))).toBe(false);
  });

  it('should reject nicknames with special characters', () => {
    expect(validateNickname('John@123')).toBe(false);
    expect(validateNickname('Player#1')).toBe(false);
    expect(validateNickname('Test_User')).toBe(false);
    expect(validateNickname('User-Name')).toBe(false);
  });

  it('should reject empty or whitespace-only nicknames', () => {
    expect(validateNickname('')).toBe(false);
    expect(validateNickname('   ')).toBe(false);
    expect(validateNickname('\t\n')).toBe(false);
  });

  it('should accept nicknames with spaces between words', () => {
    expect(validateNickname('John Doe')).toBe(true);
    expect(validateNickname('Player One')).toBe(true);
  });
});
