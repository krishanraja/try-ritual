/**
 * Error Handling Utilities
 * 
 * Provides user-friendly error messages and retry mechanisms
 */

/**
 * Converts technical error messages to user-friendly messages
 */
export function getUserFriendlyError(error: unknown): string {
  if (!error) {
    return 'An unexpected error occurred. Please try again.';
  }

  const message = error instanceof Error ? error.message : String(error);
  const lowerMessage = message.toLowerCase();

  // Network errors
  if (lowerMessage.includes('network') || lowerMessage.includes('fetch') || lowerMessage.includes('timeout')) {
    return 'Connection error. Please check your internet connection and try again.';
  }

  // Authentication errors
  if (lowerMessage.includes('invalid login credentials') || lowerMessage.includes('invalid email or password')) {
    return 'Invalid email or password. Please check your credentials and try again.';
  }
  if (lowerMessage.includes('user already registered') || lowerMessage.includes('already registered')) {
    return 'An account with this email already exists. Please sign in instead.';
  }
  if (lowerMessage.includes('email rate limit') || lowerMessage.includes('rate limit')) {
    return 'Too many requests. Please wait a moment and try again.';
  }
  if (lowerMessage.includes('password should be at least')) {
    return 'Password must be at least 8 characters long.';
  }
  if (lowerMessage.includes('email not confirmed')) {
    return 'Please check your email and confirm your account.';
  }

  // Supabase errors
  if (lowerMessage.includes('jwt') || lowerMessage.includes('token')) {
    return 'Session expired. Please sign in again.';
  }
  if (lowerMessage.includes('row-level security') || lowerMessage.includes('rls')) {
    return 'Permission denied. Please ensure you have access to this resource.';
  }
  if (lowerMessage.includes('foreign key') || lowerMessage.includes('constraint')) {
    return 'Invalid data. Please check your input and try again.';
  }

  // Storage errors
  if (lowerMessage.includes('storage') || lowerMessage.includes('upload')) {
    if (lowerMessage.includes('file size')) {
      return 'File is too large. Please choose a smaller image (max 5MB).';
    }
    if (lowerMessage.includes('file type') || lowerMessage.includes('mime type')) {
      return 'Invalid file type. Please upload a JPEG, PNG, or WebP image.';
    }
    return 'Upload failed. Please check your connection and try again.';
  }

  // API errors
  if (lowerMessage.includes('api') || lowerMessage.includes('function')) {
    if (lowerMessage.includes('not configured') || lowerMessage.includes('missing')) {
      return 'Service temporarily unavailable. Please try again later.';
    }
    if (lowerMessage.includes('rate limit') || lowerMessage.includes('429')) {
      return 'Too many requests. Please wait a moment and try again.';
    }
    return 'Service error. Please try again in a moment.';
  }

  // Generic fallback
  return message.length > 100 ? 'An error occurred. Please try again.' : message;
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    shouldRetry?: (error: unknown) => boolean;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    shouldRetry = () => true,
  } = options;

  let lastError: unknown;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if we've exhausted attempts or if shouldRetry returns false
      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error;
      }

      // Wait before retrying (exponential backoff)
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * 2, maxDelay);

      console.log(`[Retry] Attempt ${attempt + 1}/${maxRetries} failed, retrying in ${delay}ms...`);
    }
  }

  throw lastError;
}

/**
 * Check if an error is retryable (network errors, timeouts, etc.)
 */
export function isRetryableError(error: unknown): boolean {
  if (!error) return false;

  const message = error instanceof Error ? error.message : String(error);
  const lowerMessage = message.toLowerCase();

  // Retry on network errors
  if (lowerMessage.includes('network') || lowerMessage.includes('fetch')) {
    return true;
  }

  // Retry on timeouts
  if (lowerMessage.includes('timeout') || lowerMessage.includes('aborted')) {
    return true;
  }

  // Retry on 5xx server errors
  if (lowerMessage.includes('500') || lowerMessage.includes('502') || lowerMessage.includes('503') || lowerMessage.includes('504')) {
    return true;
  }

  // Don't retry on client errors (4xx) except 429 (rate limit)
  if (lowerMessage.includes('400') || lowerMessage.includes('401') || lowerMessage.includes('403') || lowerMessage.includes('404')) {
    return false;
  }

  // Retry on rate limits (429)
  if (lowerMessage.includes('429') || lowerMessage.includes('rate limit')) {
    return true;
  }

  return false;
}

/**
 * Log error with context for debugging
 */
export function logError(error: unknown, context?: string) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  console.error(`[Error${context ? `: ${context}` : ''}]`, {
    message: errorMessage,
    stack: errorStack,
    timestamp: new Date().toISOString(),
  });

  // In production, send to error tracking service
  if (import.meta.env.PROD) {
    // TODO: Integrate with error tracking (Sentry, etc.)
    // Sentry.captureException(error, { tags: { context } });
  }
}

