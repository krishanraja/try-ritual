/**
 * Centralized Supabase Configuration
 * 
 * This module provides validated, type-safe access to Supabase configuration.
 * All Supabase client initialization should use values from this module.
 * 
 * Environment Variables Required:
 * - VITE_SUPABASE_URL: Full Supabase project URL (e.g., https://xxx.supabase.co)
 * - VITE_SUPABASE_PUBLISHABLE_KEY: Anon/public JWT key (safe to expose in client)
 * - VITE_SUPABASE_PROJECT_ID: Project ID (for localStorage keys and identification)
 */

interface SupabaseConfig {
  url: string;
  anonKey: string;
  projectId: string;
}

let cachedConfig: SupabaseConfig | null = null;

/**
 * Validates that a value is a non-empty string
 * Returns validation result instead of throwing to allow graceful handling
 */
function validateString(value: unknown, name: string): { valid: boolean; value?: string; error?: string } {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return {
      valid: false,
      error: `Missing or invalid ${name} environment variable. ` +
        `Please check your .env file and ensure ${name} is set correctly. ` +
        `This is required for the application to function.`
    };
  }
  return { valid: true, value: value.trim() };
}

/**
 * Validates string and throws if invalid (for backward compatibility)
 */
function validateStringOrThrow(value: unknown, name: string): string {
  const result = validateString(value, name);
  if (!result.valid) {
    throw new Error(result.error || `Invalid ${name}`);
  }
  return result.value!;
}

/**
 * Validates that a URL is a valid Supabase project URL
 * Returns validation result instead of throwing
 */
function validateSupabaseUrl(url: string): { valid: boolean; value?: string; error?: string } {
  // #region agent log
  console.error('[DEBUG] validateSupabaseUrl called with:', { url, urlType: typeof url, urlLength: url?.length, urlCharCodes: url?.split('').slice(0, 10).map(c => c.charCodeAt(0)) });
  fetch('http://127.0.0.1:7243/ingest/265854d9-dd9a-485b-b5e4-fb8ae00c17c3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase-config.ts:validateSupabaseUrl',message:'URL validation start',data:{url,urlType:typeof url,urlLength:url?.length,urlFirstChars:url?.substring(0,20)},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  try {
    const urlObj = new URL(url);
    // #region agent log
    console.error('[DEBUG] URL parsed:', { protocol: urlObj.protocol, hostname: urlObj.hostname, fullUrl: urlObj.href });
    fetch('http://127.0.0.1:7243/ingest/265854d9-dd9a-485b-b5e4-fb8ae00c17c3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase-config.ts:validateSupabaseUrl',message:'URL parsed',data:{hostname:urlObj.hostname,protocol:urlObj.protocol,protocolLength:urlObj.protocol.length,protocolEqualsHttps:urlObj.protocol==='https:',hostnameEndsWith:urlObj.hostname.endsWith('.supabase.co'),fullHref:urlObj.href},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    if (!urlObj.hostname.endsWith('.supabase.co')) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/265854d9-dd9a-485b-b5e4-fb8ae00c17c3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase-config.ts:validateSupabaseUrl',message:'URL validation failed - hostname check',data:{hostname:urlObj.hostname,expectedEnd:'.supabase.co'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      return {
        valid: false,
        error: 'URL must be a Supabase project URL (ending with .supabase.co)'
      };
    }
    if (urlObj.protocol !== 'https:') {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/265854d9-dd9a-485b-b5e4-fb8ae00c17c3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase-config.ts:validateSupabaseUrl',message:'URL validation failed - protocol check',data:{protocol:urlObj.protocol},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      return {
        valid: false,
        error: 'URL must use HTTPS protocol'
      };
    }
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/265854d9-dd9a-485b-b5e4-fb8ae00c17c3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase-config.ts:validateSupabaseUrl',message:'URL validation success',data:{url},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    return { valid: true, value: url };
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/265854d9-dd9a-485b-b5e4-fb8ae00c17c3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase-config.ts:validateSupabaseUrl',message:'URL validation error',data:{url,errorType:error instanceof TypeError ? 'TypeError' : 'Other',errorMessage:error instanceof Error ? error.message : String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    if (error instanceof TypeError) {
      return {
        valid: false,
        error: `Invalid Supabase URL format: ${url}`
      };
    }
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown URL validation error'
    };
  }
}

/**
 * Validates URL and throws if invalid (for backward compatibility)
 */
function validateSupabaseUrlOrThrow(url: string): string {
  const result = validateSupabaseUrl(url);
  if (!result.valid) {
    throw new Error(result.error || 'Invalid URL');
  }
  return result.value!;
}

/**
 * Validates that a key is a JWT token (basic format check)
 * Returns validation result instead of throwing
 */
function validateJWT(key: string, name: string): { valid: boolean; value?: string; error?: string } {
  // JWT tokens have 3 parts separated by dots
  const parts = key.split('.');
  if (parts.length !== 3) {
    return {
      valid: false,
      error: `Invalid ${name} format. Expected JWT token with 3 parts separated by dots. ` +
        `Please verify you're using the anon/public key from Supabase dashboard, not the service role key.`
    };
  }
  return { valid: true, value: key };
}

/**
 * Validates JWT and throws if invalid (for backward compatibility)
 */
function validateJWTOrThrow(key: string, name: string): string {
  const result = validateJWT(key, name);
  if (!result.valid) {
    throw new Error(result.error || 'Invalid JWT');
  }
  return result.value!;
}

/**
 * Validates Supabase configuration and returns detailed validation result
 */
export function validateSupabaseConfig(): {
  valid: boolean;
  config?: SupabaseConfig;
  errors: string[];
} {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/265854d9-dd9a-485b-b5e4-fb8ae00c17c3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase-config.ts:validateSupabaseConfig',message:'Starting config validation',data:{rawUrl:import.meta.env.VITE_SUPABASE_URL,rawKey:import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.substring(0,20)+'...',rawProjectId:import.meta.env.VITE_SUPABASE_PROJECT_ID,urlType:typeof import.meta.env.VITE_SUPABASE_URL,keyType:typeof import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,projectIdType:typeof import.meta.env.VITE_SUPABASE_PROJECT_ID},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  const errors: string[] = [];
  
  // Validate URL
  const urlResult = validateString(import.meta.env.VITE_SUPABASE_URL, 'VITE_SUPABASE_URL');
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/265854d9-dd9a-485b-b5e4-fb8ae00c17c3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase-config.ts:validateSupabaseConfig',message:'URL string validation result',data:{valid:urlResult.valid,value:urlResult.value,error:urlResult.error},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  if (!urlResult.valid) {
    errors.push(urlResult.error!);
  }
  
  // Validate anon key
  const keyResult = validateString(
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    'VITE_SUPABASE_PUBLISHABLE_KEY'
  );
  if (!keyResult.valid) {
    errors.push(keyResult.error!);
  }
  
  // Validate project ID
  const projectIdResult = validateString(
    import.meta.env.VITE_SUPABASE_PROJECT_ID,
    'VITE_SUPABASE_PROJECT_ID'
  );
  if (!projectIdResult.valid) {
    errors.push(projectIdResult.error!);
  }
  
  // If basic validation failed, return early
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  // Additional validation - normalize URL if protocol is missing or wrong
  let urlToValidate = urlResult.value!.trim();
  // Auto-fix common issues: add https:// if protocol is missing, or convert http:// to https://
  if (!urlToValidate.match(/^https?:\/\//)) {
    console.warn('[Supabase Config] URL missing protocol, adding https://');
    urlToValidate = 'https://' + urlToValidate;
  } else if (urlToValidate.startsWith('http://')) {
    console.warn('[Supabase Config] URL uses http://, converting to https://');
    urlToValidate = urlToValidate.replace(/^http:\/\//, 'https://');
  }
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/265854d9-dd9a-485b-b5e4-fb8ae00c17c3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase-config.ts:validateSupabaseConfig',message:'URL before validation',data:{original:urlResult.value,normalized:urlToValidate},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  const urlValidation = validateSupabaseUrl(urlToValidate);
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/265854d9-dd9a-485b-b5e4-fb8ae00c17c3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase-config.ts:validateSupabaseConfig',message:'URL format validation result',data:{valid:urlValidation.valid,value:urlValidation.value,error:urlValidation.error},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  if (!urlValidation.valid) {
    errors.push(urlValidation.error!);
  }
  
  const keyValidation = validateJWT(keyResult.value!, 'VITE_SUPABASE_PUBLISHABLE_KEY');
  if (!keyValidation.valid) {
    errors.push(keyValidation.error!);
  }
  
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  // Extract project ID from URL if provided, but prefer explicit env var
  const urlProjectId = urlValidation.value!.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  if (urlProjectId && urlProjectId !== projectIdResult.value) {
    console.warn(
      `[Supabase Config] Project ID mismatch: URL contains "${urlProjectId}" but ` +
      `VITE_SUPABASE_PROJECT_ID is "${projectIdResult.value}". Using VITE_SUPABASE_PROJECT_ID.`
    );
  }
  
  const config: SupabaseConfig = {
    url: urlValidation.value!, // Use normalized URL
    anonKey: keyValidation.value!,
    projectId: projectIdResult.value!,
  };
  
  return { valid: true, config, errors: [] };
}

/**
 * Gets and validates Supabase configuration from environment variables.
 * Results are cached after first call.
 * 
 * @throws Error if any required environment variable is missing or invalid
 */
export function getSupabaseConfig(): SupabaseConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  // Use new validation function
  const validation = validateSupabaseConfig();
  
  if (!validation.valid) {
    // Log detailed errors
    console.error('[Supabase Config] ❌ Configuration validation failed:');
    validation.errors.forEach((error, index) => {
      console.error(`  ${index + 1}. ${error}`);
    });
    
    // Throw with all errors
    throw new Error(
      `Supabase configuration is invalid:\n${validation.errors.map((e, i) => `${i + 1}. ${e}`).join('\n')}\n\n` +
      `Please check your .env file and ensure all required environment variables are set correctly.`
    );
  }

  cachedConfig = validation.config!;
  return cachedConfig;
}

/**
 * Gets the Supabase project URL
 */
export function getSupabaseUrl(): string {
  return getSupabaseConfig().url;
}

/**
 * Gets the Supabase anon/public key
 */
export function getSupabaseAnonKey(): string {
  return getSupabaseConfig().anonKey;
}

/**
 * Gets the Supabase project ID
 */
export function getSupabaseProjectId(): string {
  return getSupabaseConfig().projectId;
}

/**
 * Resets the cached configuration (useful for testing)
 */
export function resetConfigCache(): void {
  cachedConfig = null;
}
