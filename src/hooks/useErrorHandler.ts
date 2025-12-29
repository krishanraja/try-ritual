/**
 * useErrorHandler Hook
 * 
 * Provides consistent error handling with user-friendly messages and retry capabilities.
 * Note: Toast notifications have been removed from this app. Errors are logged to console
 * and can be handled via the onError callback for inline UI feedback.
 */

import { useCallback } from 'react';
import { getUserFriendlyError, isRetryableError, retryWithBackoff, logError } from '@/utils/errorHandling';

interface UseErrorHandlerOptions {
  context?: string;
  onError?: (error: unknown, message: string) => void;
}

export function useErrorHandler(options: UseErrorHandlerOptions = {}) {
  const { context, onError } = options;

  const handleError = useCallback(
    (error: unknown, customMessage?: string) => {
      // Log error for debugging
      logError(error, context);

      // Get user-friendly message
      const message = customMessage || getUserFriendlyError(error);

      // Call custom error handler if provided (for inline UI feedback)
      onError?.(error, message);
    },
    [context, onError]
  );

  const handleAsyncError = useCallback(
    async <T>(
      asyncFn: () => Promise<T>,
      options?: {
        retry?: boolean;
        maxRetries?: number;
        customMessage?: string;
      }
    ): Promise<T | null> => {
      try {
        if (options?.retry && isRetryableError(null)) {
          return await retryWithBackoff(asyncFn, {
            maxRetries: options.maxRetries,
            shouldRetry: isRetryableError,
          });
        }
        return await asyncFn();
      } catch (error) {
        handleError(error, options?.customMessage);
        return null;
      }
    },
    [handleError]
  );

  return {
    handleError,
    handleAsyncError,
  };
}


