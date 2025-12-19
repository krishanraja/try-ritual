// #region agent log - module load verification
fetch('http://127.0.0.1:7243/ingest/265854d9-dd9a-485b-b5e4-fb8ae00c17c3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.tsx:1',message:'Module loading started - before React import',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
// #endregion

import { createRoot } from "react-dom/client";

// #region agent log - React import verification
fetch('http://127.0.0.1:7243/ingest/265854d9-dd9a-485b-b5e4-fb8ae00c17c3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.tsx:8',message:'React imported successfully',data:{createRootExists:typeof createRoot==='function'},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
// #endregion

import App from "./App.tsx";

// #region agent log - App import verification
fetch('http://127.0.0.1:7243/ingest/265854d9-dd9a-485b-b5e4-fb8ae00c17c3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.tsx:15',message:'App component imported - all Radix/React deps loaded',data:{AppExists:typeof App==='function'},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
// #endregion

import "./index.css";

// Comprehensive initialization diagnostics
const initStartTime = performance.now();
console.group('🚀 App Initialization');
console.log('[INIT] Starting app initialization at', new Date().toISOString());

// Log environment variables (masked for security)
const logEnvVars = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  
  console.log('[INIT] Environment Variables Check:');
  console.log('  VITE_SUPABASE_URL:', url ? `${url.substring(0, 30)}... (${url.length} chars)` : '❌ MISSING');
  console.log('  VITE_SUPABASE_PUBLISHABLE_KEY:', key ? `${key.substring(0, 20)}... (${key.length} chars, JWT: ${key.split('.').length === 3 ? '✅' : '❌'})` : '❌ MISSING');
  console.log('  VITE_SUPABASE_PROJECT_ID:', projectId ? `${projectId} (${projectId.length} chars)` : '❌ MISSING');
  console.log('  NODE_ENV:', import.meta.env.MODE);
  console.log('  DEV:', import.meta.env.DEV);
  console.log('  PROD:', import.meta.env.PROD);
};

logEnvVars();

// Render App with comprehensive error handling
try {
  console.log('[INIT] Creating React root...');
  const renderStartTime = performance.now();
  
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error('Root element not found in DOM');
  }
  
  const root = createRoot(rootElement);
  console.log('[INIT] ✅ React root created');
  
  console.log('[INIT] Rendering App component...');
  root.render(<App />);
  
  const renderDuration = performance.now() - renderStartTime;
  const totalDuration = performance.now() - initStartTime;
  console.log(`[INIT] ✅ App rendered in ${renderDuration.toFixed(2)}ms`);
  console.log(`[INIT] ✅ Total initialization time: ${totalDuration.toFixed(2)}ms`);
  console.groupEnd();
} catch (error) {
  const errorDuration = performance.now() - initStartTime;
  console.error(`[INIT] ❌ Initialization failed after ${errorDuration.toFixed(2)}ms:`, error);
  console.groupEnd();
  
  // Show error in DOM
  const rootElement = document.getElementById("root");
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 2rem; font-family: system-ui; max-width: 600px; margin: 2rem auto;">
        <h1 style="color: #dc2626;">Initialization Error</h1>
        <p><strong>Error:</strong> ${error instanceof Error ? error.message : 'Unknown error'}</p>
        <details style="margin-top: 1rem;">
          <summary style="cursor: pointer; color: #2563eb;">Show details</summary>
          <pre style="margin-top: 0.5rem; padding: 1rem; background: #f3f4f6; border-radius: 0.25rem; overflow: auto; font-size: 0.875rem;">${error instanceof Error ? error.stack : JSON.stringify(error, null, 2)}</pre>
        </details>
        <p style="margin-top: 1rem;">This usually indicates:</p>
        <ul style="margin-left: 1.5rem;">
          <li>Missing or invalid environment variables</li>
          <li>Supabase configuration error</li>
          <li>Module dependency issue</li>
        </ul>
        <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #2563eb; color: white; border: none; border-radius: 0.25rem; cursor: pointer;">
          Reload Page
        </button>
      </div>
    `;
  }
}

// Note: Splash screen is now managed by SplashScreen.tsx component
// which coordinates with CoupleContext loading state for stable reveal
