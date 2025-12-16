/**
 * Supabase Client
 * 
 * Centralized Supabase client instance for the application.
 * Uses validated configuration from @/lib/supabase-config
 * 
 * Import the supabase client like this:
 * import { supabase } from "@/integrations/supabase/client";
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { getSupabaseUrl, getSupabaseAnonKey } from '@/lib/supabase-config';

// Get validated configuration with error handling
let SUPABASE_URL: string;
let SUPABASE_ANON_KEY: string;

try {
  SUPABASE_URL = getSupabaseUrl();
  SUPABASE_ANON_KEY = getSupabaseAnonKey();
  console.log('[Supabase Client] ✅ Configuration loaded successfully');
  console.log('[Supabase Client] URL:', SUPABASE_URL.substring(0, 30) + '...');
} catch (error) {
  console.error('[Supabase Client] ❌ Configuration error:', error);
  // Re-throw to prevent silent failures
  throw new Error(
    `Failed to initialize Supabase client: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
    `Please check your .env file and ensure VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, and VITE_SUPABASE_PROJECT_ID are set correctly.`
  );
}

// Create timeout helper for fetch requests
const createTimeoutController = (timeoutMs: number): { controller: AbortController; signal: AbortSignal } => {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return { controller, signal: controller.signal };
};

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
  // Add timeout to prevent hanging requests
  global: {
    fetch: (url, options = {}) => {
      const { controller: timeoutController, signal: timeoutSignal } = createTimeoutController(10000); // 10 second timeout
      const existingSignal = options.signal;
      
      // Combine signals if one already exists
      if (existingSignal) {
        existingSignal.addEventListener('abort', () => timeoutController.abort());
      }
      
      return fetch(url, {
        ...options,
        signal: timeoutSignal,
      }).catch((error) => {
        if (error.name === 'AbortError' && timeoutSignal.aborted) {
          throw new Error(`Request timeout after 10 seconds: ${url}`);
        }
        throw error;
      });
    },
  },
});