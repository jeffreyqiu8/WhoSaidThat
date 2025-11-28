/**
 * API client utilities with retry logic and error handling
 */

export interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  backoffMultiplier?: number;
  retryableStatuses?: number[];
}

export interface ApiError extends Error {
  status?: number;
  data?: any;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  backoffMultiplier: 2,
  retryableStatuses: [408, 429, 500, 502, 503, 504], // Timeout, rate limit, server errors
};

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if an error is retryable
 */
function isRetryable(error: ApiError, retryableStatuses: number[]): boolean {
  // Network errors (no status) are retryable
  if (!error.status) {
    return true;
  }
  
  // Check if status code is in retryable list
  return retryableStatuses.includes(error.status);
}

/**
 * Fetch with retry logic and exponential backoff
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryOptions: RetryOptions = {}
): Promise<Response> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...retryOptions };
  let lastError: ApiError | null = null;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      // If response is ok or not retryable, return it
      if (response.ok || !config.retryableStatuses.includes(response.status)) {
        return response;
      }
      
      // Create error for retryable status
      const error: ApiError = new Error(`HTTP ${response.status}: ${response.statusText}`);
      error.status = response.status;
      
      try {
        error.data = await response.json();
      } catch {
        // Ignore JSON parse errors
      }
      
      lastError = error;
      
      // Don't retry on last attempt
      if (attempt === config.maxRetries) {
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delay = config.retryDelay * Math.pow(config.backoffMultiplier, attempt);
      console.log(`Request failed with status ${response.status}. Retrying in ${delay}ms... (attempt ${attempt + 1}/${config.maxRetries})`);
      
      await sleep(delay);
      
    } catch (error) {
      const apiError = error as ApiError;
      lastError = apiError;
      
      // Don't retry on last attempt
      if (attempt === config.maxRetries) {
        throw apiError;
      }
      
      // Check if error is retryable
      if (!isRetryable(apiError, config.retryableStatuses)) {
        throw apiError;
      }
      
      // Calculate delay with exponential backoff
      const delay = config.retryDelay * Math.pow(config.backoffMultiplier, attempt);
      console.log(`Request failed: ${apiError.message}. Retrying in ${delay}ms... (attempt ${attempt + 1}/${config.maxRetries})`);
      
      await sleep(delay);
    }
  }
  
  // This should never be reached, but TypeScript needs it
  throw lastError || new Error('Request failed after retries');
}

/**
 * Parse error response and return user-friendly message
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const apiError = error as ApiError;
    
    // Use error data message if available
    if (apiError.data?.error) {
      return apiError.data.error;
    }
    
    // Map common status codes to user-friendly messages
    if (apiError.status) {
      switch (apiError.status) {
        case 400:
          return 'Invalid request. Please check your input.';
        case 401:
          return 'You are not authorized to perform this action.';
        case 403:
          return 'Access denied.';
        case 404:
          return 'Resource not found.';
        case 408:
          return 'Request timeout. Please try again.';
        case 409:
          return 'Conflict. The resource already exists or is in an invalid state.';
        case 429:
          return 'Too many requests. Please slow down and try again.';
        case 500:
          return 'Server error. Please try again later.';
        case 502:
        case 503:
        case 504:
          return 'Service temporarily unavailable. Please try again.';
        default:
          return apiError.message || 'An unexpected error occurred.';
      }
    }
    
    return apiError.message || 'An unexpected error occurred.';
  }
  
  return 'An unexpected error occurred.';
}

/**
 * API client wrapper with retry logic
 */
export const apiClient = {
  async post<T = any>(
    url: string,
    data: any,
    options: RequestInit = {},
    retryOptions?: RetryOptions
  ): Promise<T> {
    const response = await fetchWithRetry(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        body: JSON.stringify(data),
        ...options,
      },
      retryOptions
    );
    
    if (!response.ok) {
      const error: ApiError = new Error(`HTTP ${response.status}: ${response.statusText}`);
      error.status = response.status;
      
      try {
        error.data = await response.json();
      } catch (parseError) {
        console.error('Failed to parse error response as JSON:', parseError);
        // Try to get text instead
        try {
          const text = await response.text();
          console.error('Error response text:', text);
          error.data = { error: text };
        } catch {
          // Ignore
        }
      }
      
      throw error;
    }
    
    try {
      return await response.json();
    } catch (parseError) {
      console.error('Failed to parse success response as JSON:', parseError);
      const text = await response.text();
      console.error('Response text:', text);
      throw new Error(`Invalid JSON response: ${text}`);
    }
  },
  
  async get<T = any>(
    url: string,
    options: RequestInit = {},
    retryOptions?: RetryOptions
  ): Promise<T> {
    const response = await fetchWithRetry(
      url,
      {
        method: 'GET',
        ...options,
      },
      retryOptions
    );
    
    if (!response.ok) {
      const error: ApiError = new Error(`HTTP ${response.status}: ${response.statusText}`);
      error.status = response.status;
      
      try {
        error.data = await response.json();
      } catch (parseError) {
        console.error('Failed to parse error response as JSON:', parseError);
        // Try to get text instead
        try {
          const text = await response.text();
          console.error('Error response text:', text);
          error.data = { error: text };
        } catch {
          // Ignore
        }
      }
      
      throw error;
    }
    
    try {
      return await response.json();
    } catch (parseError) {
      console.error('Failed to parse success response as JSON:', parseError);
      const text = await response.text();
      console.error('Response text:', text);
      throw new Error(`Invalid JSON response: ${text}`);
    }
  },
};
