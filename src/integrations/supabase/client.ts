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

// Get validated configuration with comprehensive error handling and diagnostics
let SUPABASE_URL: string | null = null;
let SUPABASE_ANON_KEY: string | null = null;
let initializationError: Error | null = null;
let isInitialized = false;

const initializeSupabaseConfig = (): { success: boolean; error?: Error } => {
  if (isInitialized && SUPABASE_URL && SUPABASE_ANON_KEY) {
    return { success: true };
  }
  
  if (initializationError) {
    return { success: false, error: initializationError };
  }
  
  try {
    console.log('[Supabase Client] Initializing configuration...');
    const configStartTime = performance.now();
    
    SUPABASE_URL = getSupabaseUrl();
    SUPABASE_ANON_KEY = getSupabaseAnonKey();
    
    const configDuration = performance.now() - configStartTime;
    console.log(`[Supabase Client] ✅ Configuration loaded successfully in ${configDuration.toFixed(2)}ms`);
    console.log('[Supabase Client] URL:', SUPABASE_URL.substring(0, 30) + '...');
    console.log('[Supabase Client] Key length:', SUPABASE_ANON_KEY.length, 'chars');
    console.log('[Supabase Client] Key format:', SUPABASE_ANON_KEY.split('.').length === 3 ? '✅ Valid JWT' : '❌ Invalid JWT');
    
    isInitialized = true;
    return { success: true };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    initializationError = err;
    console.error('[Supabase Client] ❌ Configuration error:', err);
    console.error('[Supabase Client] Error details:', {
      message: err.message,
      stack: err.stack,
    });
    
    // Don't throw - allow app to load and show error in UI
    return { success: false, error: err };
  }
};

// Create timeout helper for fetch requests
const createTimeoutController = (timeoutMs: number): { controller: AbortController; signal: AbortSignal } => {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return { controller, signal: controller.signal };
};

// Create Supabase client with proper initialization and error handling
let supabaseInstance: ReturnType<typeof createClient<Database>> | null = null;

const createSupabaseClient = (): ReturnType<typeof createClient<Database>> => {
  if (supabaseInstance) {
    return supabaseInstance;
  }
  
  // Initialize config first
  const initResult = initializeSupabaseConfig();
  if (!initResult.success || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    const errorMsg = initResult.error?.message || 'Configuration not initialized';
    console.error('[Supabase Client] ❌ Cannot create client:', errorMsg);
    throw new Error(
      `Failed to initialize Supabase client: ${errorMsg}. ` +
      `Please check your .env file and ensure VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, and VITE_SUPABASE_PROJECT_ID are set correctly.`
    );
  }
  
  console.log('[Supabase Client] Creating Supabase client instance...');
  const clientStartTime = performance.now();
  
  try {
    supabaseInstance = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
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
    
    const clientDuration = performance.now() - clientStartTime;
    console.log(`[Supabase Client] ✅ Client created successfully in ${clientDuration.toFixed(2)}ms`);
    
    // Test the client immediately to ensure it works
    console.log('[Supabase Client] Testing client connection...');
    const testStartTime = performance.now();
    supabaseInstance.auth.getSession().then(({ error }) => {
      const testDuration = performance.now() - testStartTime;
      if (error) {
        console.warn(`[Supabase Client] ⚠️ Initial session check returned error (${testDuration.toFixed(2)}ms):`, error.message);
        console.warn('[Supabase Client] This may be normal if no session exists');
      } else {
        console.log(`[Supabase Client] ✅ Client connection test passed (${testDuration.toFixed(2)}ms)`);
      }
    }).catch((testError) => {
      const testDuration = performance.now() - testStartTime;
      console.error(`[Supabase Client] ❌ Client connection test failed (${testDuration.toFixed(2)}ms):`, testError);
    });
    
    return supabaseInstance;
  } catch (error) {
    console.error('[Supabase Client] ❌ Failed to create client:', error);
    throw error;
  }
};

// Initialize client on module load if config is valid
let initResult = initializeSupabaseConfig();
if (initResult.success) {
  try {
    // Create client immediately if config is valid
    createSupabaseClient();
    console.log('[Supabase Client] ✅ Client initialized on module load');
  } catch (clientError) {
    console.error('[Supabase Client] ❌ Failed to create client on module load:', clientError);
    // Don't throw - allow app to load, client will be created on first use
  }
} else {
  console.error('[Supabase Client] ⚠️ Configuration invalid, client will not be created');
  console.error('[Supabase Client] Error:', initResult.error?.message);
}

// Export getter function that ensures initialization
export const getSupabase = (): ReturnType<typeof createClient<Database>> => {
  if (!supabaseInstance) {
    return createSupabaseClient();
  }
  return supabaseInstance;
};

// Export direct access - initialize on first use if not already initialized
export const supabase = new Proxy({} as ReturnType<typeof createClient<Database>>, {
  get(target, prop) {
    try {
      const client = getSupabase();
      const value = (client as any)[prop];
      if (typeof value === 'function') {
        return value.bind(client);
      }
      return value;
    } catch (error) {
      console.error('[Supabase Client] Error accessing supabase:', error);
      throw error;
    }
  },
});