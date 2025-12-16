/**
 * Supabase Connection Test Utility
 * 
 * Tests the Supabase connection and configuration to help diagnose issues.
 * Useful after migrating Supabase projects.
 */

import { supabase } from '@/integrations/supabase/client';
import { getSupabaseConfig } from '@/lib/supabase-config';

export interface ConnectionTestResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  config: {
    url: string;
    urlValid: boolean;
    keyPresent: boolean;
    keyFormatValid: boolean;
    projectId: string;
  };
}

/**
 * Tests the Supabase connection and configuration
 */
export async function testSupabaseConnection(): Promise<ConnectionTestResult> {
  const result: ConnectionTestResult = {
    success: false,
    errors: [],
    warnings: [],
    config: {
      url: '',
      urlValid: false,
      keyPresent: false,
      keyFormatValid: false,
      projectId: '',
    },
  };

  try {
    // Test 1: Check configuration loading
    try {
      const config = getSupabaseConfig();
      result.config.url = config.url;
      result.config.projectId = config.projectId;
      result.config.urlValid = config.url.startsWith('https://') && config.url.includes('.supabase.co');
      result.config.keyPresent = config.anonKey.length > 0;
      result.config.keyFormatValid = config.anonKey.split('.').length === 3; // JWT has 3 parts
      
      if (!result.config.urlValid) {
        result.errors.push('Invalid Supabase URL format');
      }
      if (!result.config.keyPresent) {
        result.errors.push('Supabase anon key is missing');
      }
      if (!result.config.keyFormatValid) {
        result.errors.push('Supabase anon key format is invalid (should be a JWT token)');
      }
    } catch (error) {
      result.errors.push(`Configuration error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }

    // Test 2: Test basic connection (health check)
    try {
      const { data, error } = await Promise.race([
        supabase.from('profiles').select('count').limit(0),
        new Promise<{ data: null; error: Error }>((_, reject) =>
          setTimeout(() => reject(new Error('Connection timeout after 5 seconds')), 5000)
        ),
      ]) as any;

      if (error) {
        // Some errors are expected (like RLS blocking access), but connection worked
        if (error.code === 'PGRST301' || error.message.includes('JWT')) {
          result.errors.push(`Authentication error: ${error.message}. Check if your anon key is correct.`);
        } else if (error.code === 'PGRST116' || error.message.includes('relation') || error.message.includes('does not exist')) {
          // Table doesn't exist or RLS blocking - connection is working
          result.warnings.push('Connection successful, but table access test failed (this may be normal)');
        } else {
          result.warnings.push(`Connection test warning: ${error.message}`);
        }
      } else {
        result.success = true;
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('timeout')) {
        result.errors.push('Connection timeout - Supabase may be unreachable or URL is incorrect');
      } else {
        result.errors.push(`Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Test 3: Test auth endpoint
    try {
      const { data: sessionData, error: sessionError } = await Promise.race([
        supabase.auth.getSession(),
        new Promise<{ data: { session: null }; error: Error }>((_, reject) =>
          setTimeout(() => reject(new Error('Auth endpoint timeout')), 5000)
        ),
      ]) as any;

      if (sessionError) {
        result.warnings.push(`Auth endpoint test: ${sessionError.message}`);
      } else {
        // Auth endpoint is working
        if (result.success) {
          result.success = true; // Already true
        }
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('timeout')) {
        result.errors.push('Auth endpoint timeout - check if Supabase URL is correct');
      } else {
        result.warnings.push(`Auth endpoint test warning: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Determine overall success
    if (result.errors.length === 0 && result.config.urlValid && result.config.keyPresent && result.config.keyFormatValid) {
      result.success = true;
    }

  } catch (error) {
    result.errors.push(`Unexpected error during connection test: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return result;
}

/**
 * Logs connection test results to console with helpful diagnostics
 */
export function logConnectionTestResults(result: ConnectionTestResult): void {
  console.group('🔍 Supabase Connection Test');
  
  if (result.success) {
    console.log('✅ Connection test passed');
  } else {
    console.error('❌ Connection test failed');
  }

  console.log('📋 Configuration:');
  console.log('  URL:', result.config.url);
  console.log('  URL Valid:', result.config.urlValid ? '✅' : '❌');
  console.log('  Key Present:', result.config.keyPresent ? '✅' : '❌');
  console.log('  Key Format Valid:', result.config.keyFormatValid ? '✅' : '❌');
  console.log('  Project ID:', result.config.projectId);

  if (result.errors.length > 0) {
    console.error('❌ Errors:');
    result.errors.forEach((error) => console.error('  -', error));
  }

  if (result.warnings.length > 0) {
    console.warn('⚠️ Warnings:');
    result.warnings.forEach((warning) => console.warn('  -', warning));
  }

  if (!result.success) {
    console.group('💡 Troubleshooting Tips:');
    console.log('1. Verify VITE_SUPABASE_URL matches your new Supabase project URL');
    console.log('2. Verify VITE_SUPABASE_PUBLISHABLE_KEY is the anon/public key (not service_role)');
    console.log('3. Verify VITE_SUPABASE_PROJECT_ID matches your project ID');
    console.log('4. Check Supabase Dashboard → Settings → API for correct values');
    console.log('5. Ensure your new Supabase project is active and not paused');
    console.log('6. Check browser console for CORS or network errors');
    console.groupEnd();
  }

  console.groupEnd();
}
