/**
 * Input validation and sanitization utilities
 * Provides XSS prevention and input validation for user-generated content
 */

/**
 * Sanitizes text input to prevent XSS attacks
 * Removes or escapes potentially dangerous characters and HTML tags
 * 
 * @param input - The raw input string
 * @param maxLength - Maximum allowed length (optional)
 * @returns Sanitized string safe for storage and display
 */
export function sanitizeText(input: string, maxLength?: number): string {
  if (typeof input !== 'string') {
    return '';
  }

  // Remove any HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '');
  
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  // Enforce max length if specified
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized;
}

/**
 * Sanitizes and validates a nickname
 * 
 * @param nickname - The raw nickname input
 * @returns Object with sanitized nickname and validation result
 */
export function sanitizeNickname(nickname: string): { 
  sanitized: string; 
  isValid: boolean; 
  error?: string;
} {
  // First sanitize
  const sanitized = sanitizeText(nickname, 20);
  
  // Check if empty after sanitization
  if (sanitized.length === 0) {
    return {
      sanitized: '',
      isValid: false,
      error: 'Nickname cannot be empty',
    };
  }
  
  // Check minimum length
  if (sanitized.length < 3) {
    return {
      sanitized,
      isValid: false,
      error: 'Nickname must be at least 3 characters',
    };
  }
  
  // Check if contains only alphanumeric characters and spaces
  const validPattern = /^[a-zA-Z0-9 ]+$/;
  if (!validPattern.test(sanitized)) {
    return {
      sanitized,
      isValid: false,
      error: 'Nickname can only contain letters, numbers, and spaces',
    };
  }
  
  return {
    sanitized,
    isValid: true,
  };
}

/**
 * Sanitizes and validates a response text
 * 
 * @param response - The raw response input
 * @returns Object with sanitized response and validation result
 */
export function sanitizeResponse(response: string): {
  sanitized: string;
  isValid: boolean;
  error?: string;
} {
  // Sanitize with max length of 500 characters
  const sanitized = sanitizeText(response, 500);
  
  // Check if empty after sanitization
  if (sanitized.length === 0) {
    return {
      sanitized: '',
      isValid: false,
      error: 'Response cannot be empty',
    };
  }
  
  // Check minimum length (at least 1 character)
  if (sanitized.length < 1) {
    return {
      sanitized,
      isValid: false,
      error: 'Response must contain at least 1 character',
    };
  }
  
  return {
    sanitized,
    isValid: true,
  };
}

/**
 * Validates game code format
 * 
 * @param code - The game code to validate
 * @returns true if valid format, false otherwise
 */
export function validateGameCode(code: string): boolean {
  if (typeof code !== 'string') {
    return false;
  }
  
  // Game codes should be exactly 6 characters, alphanumeric
  const codePattern = /^[A-Z0-9]{6}$/;
  return codePattern.test(code);
}

/**
 * Validates UUID format
 * 
 * @param id - The UUID to validate
 * @returns true if valid UUID format, false otherwise
 */
export function validateUUID(id: string): boolean {
  if (typeof id !== 'string') {
    return false;
  }
  
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidPattern.test(id);
}
