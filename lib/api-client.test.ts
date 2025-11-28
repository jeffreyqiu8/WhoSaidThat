/**
 * Tests for API client with retry logic
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchWithRetry, getErrorMessage, apiClient } from './api-client';

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getErrorMessage', () => {
    it('should return error message from API error data', () => {
      const error = new Error('Test error');
      (error as any).data = { error: 'Custom error message' };
      
      expect(getErrorMessage(error)).toBe('Custom error message');
    });

    it('should return user-friendly message for 404 status', () => {
      const error = new Error('Not found');
      (error as any).status = 404;
      
      expect(getErrorMessage(error)).toBe('Resource not found.');
    });

    it('should return user-friendly message for 429 status', () => {
      const error = new Error('Too many requests');
      (error as any).status = 429;
      
      expect(getErrorMessage(error)).toBe('Too many requests. Please slow down and try again.');
    });

    it('should return user-friendly message for 500 status', () => {
      const error = new Error('Server error');
      (error as any).status = 500;
      
      expect(getErrorMessage(error)).toBe('Server error. Please try again later.');
    });

    it('should return generic message for unknown errors', () => {
      expect(getErrorMessage('unknown')).toBe('An unexpected error occurred.');
    });

    it('should return error message if no status code', () => {
      const error = new Error('Network error');
      
      expect(getErrorMessage(error)).toBe('Network error');
    });
  });

  describe('fetchWithRetry', () => {
    it('should return response on successful request', async () => {
      const mockResponse = new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
      
      global.fetch = vi.fn().mockResolvedValue(mockResponse);
      
      const response = await fetchWithRetry('/api/test');
      
      expect(response.ok).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should retry on 500 error', async () => {
      const mockErrorResponse = new Response(JSON.stringify({ error: 'Server error' }), {
        status: 500,
      });
      const mockSuccessResponse = new Response(JSON.stringify({ success: true }), {
        status: 200,
      });
      
      global.fetch = vi.fn()
        .mockResolvedValueOnce(mockErrorResponse)
        .mockResolvedValueOnce(mockSuccessResponse);
      
      const response = await fetchWithRetry('/api/test', {}, {
        maxRetries: 2,
        retryDelay: 10,
      });
      
      expect(response.ok).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should not retry on 404 error', async () => {
      const mockResponse = new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
      });
      
      global.fetch = vi.fn().mockResolvedValue(mockResponse);
      
      const response = await fetchWithRetry('/api/test', {}, {
        maxRetries: 2,
        retryDelay: 10,
      });
      
      expect(response.status).toBe(404);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should throw error after max retries', async () => {
      const mockResponse = new Response(JSON.stringify({ error: 'Server error' }), {
        status: 500,
      });
      
      global.fetch = vi.fn().mockResolvedValue(mockResponse);
      
      await expect(
        fetchWithRetry('/api/test', {}, {
          maxRetries: 2,
          retryDelay: 10,
        })
      ).rejects.toThrow();
      
      expect(global.fetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });

  describe('apiClient.post', () => {
    it('should make POST request with correct data', async () => {
      const mockResponse = new Response(JSON.stringify({ id: '123' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
      
      global.fetch = vi.fn().mockResolvedValue(mockResponse);
      
      const result = await apiClient.post('/api/test', { name: 'test' });
      
      expect(result).toEqual({ id: '123' });
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({ name: 'test' }),
        })
      );
    });

    it('should throw error on failed request', async () => {
      const mockResponse = new Response(JSON.stringify({ error: 'Bad request' }), {
        status: 400,
      });
      
      global.fetch = vi.fn().mockResolvedValue(mockResponse);
      
      await expect(
        apiClient.post('/api/test', { name: 'test' })
      ).rejects.toThrow();
    });
  });

  describe('apiClient.get', () => {
    it('should make GET request', async () => {
      const mockResponse = new Response(JSON.stringify({ data: 'test' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
      
      global.fetch = vi.fn().mockResolvedValue(mockResponse);
      
      const result = await apiClient.get('/api/test');
      
      expect(result).toEqual({ data: 'test' });
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });
  });
});
