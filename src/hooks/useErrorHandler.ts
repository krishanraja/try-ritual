/**
 * useErrorHandler Hook
 * 
 * Provides consistent error handling with user-friendly messages and retry capabilities
 */

import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { getUserFriendlyError, isRetryableError, retryWithBackoff, logError } from '@/utils/errorHandling';

interface UseErrorHandlerOptions {
  showToast?: boolean;
  context?: string;
  onError?: (error: unknown) => void;
}

export function useErrorHandler(options: UseErrorHandlerOptions = {}) {
  const { showToast = true, context, onError } = options;
  const { toast } = useToast();

  const handleError = useCallback(
    (error: unknown, customMessage?: string) => {
      // Log error for debugging
      logError(error, context);

      // Get user-friendly message
      const message = customMessage || getUserFriendlyError(error);

      // Show toast if enabled
      if (showToast) {
        toast({
          title: 'Error',
          description: message,
          variant: 'destructive',
        });
      }

      // Call custom error handler if provided
      onError?.(error);
    },
    [showToast, context, onError, toast]
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


