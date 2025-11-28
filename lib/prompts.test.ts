/**
 * Tests for prompt selection logic
 */

import { describe, it, expect } from 'vitest';
import { PROMPTS, selectRandomPrompt } from './prompts';

describe('Prompts', () => {
  describe('PROMPTS array', () => {
    it('should have at least 50 prompts', () => {
      expect(PROMPTS.length).toBeGreaterThanOrEqual(50);
    });

    it('should have all unique prompts', () => {
      const uniquePrompts = new Set(PROMPTS);
      expect(uniquePrompts.size).toBe(PROMPTS.length);
    });

    it('should have all non-empty prompts', () => {
      PROMPTS.forEach(prompt => {
        expect(prompt.trim().length).toBeGreaterThan(0);
      });
    });
  });

  describe('selectRandomPrompt', () => {
    it('should return a prompt from the PROMPTS array', () => {
      const prompt = selectRandomPrompt();
      expect(PROMPTS).toContain(prompt);
    });

    it('should not return a used prompt when unused prompts are available', () => {
      const usedPrompts = [PROMPTS[0], PROMPTS[1], PROMPTS[2]];
      const prompt = selectRandomPrompt(usedPrompts);
      expect(usedPrompts).not.toContain(prompt);
    });

    it('should return a prompt even when all prompts have been used', () => {
      const allPrompts = [...PROMPTS];
      const prompt = selectRandomPrompt(allPrompts);
      expect(PROMPTS).toContain(prompt);
    });

    it('should work with empty used prompts array', () => {
      const prompt = selectRandomPrompt([]);
      expect(PROMPTS).toContain(prompt);
    });

    it('should work with undefined used prompts', () => {
      const prompt = selectRandomPrompt();
      expect(PROMPTS).toContain(prompt);
    });

    it('should select from remaining prompts when some are used', () => {
      // Use all but one prompt
      const usedPrompts = PROMPTS.slice(0, -1);
      const lastPrompt = PROMPTS[PROMPTS.length - 1];
      
      // Should always return the last unused prompt
      const prompt = selectRandomPrompt(usedPrompts);
      expect(prompt).toBe(lastPrompt);
    });
  });
});
