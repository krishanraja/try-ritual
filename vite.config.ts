import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Optimize chunk splitting for better caching
    rollupOptions: {
      output: {
        // Manual chunk splitting strategy
        // IMPORTANT: React and all React-dependent libraries MUST be in the same chunk
        // to prevent "Cannot read properties of undefined (reading 'forwardRef')" errors
        // caused by chunk loading order issues
        manualChunks: (id) => {
          // React ecosystem: React, React-DOM, and ALL libraries that depend on React
          // must be bundled together to ensure React is initialized before consumers
          if (
            id.includes('node_modules/react') ||
            id.includes('node_modules/react-dom') ||
            id.includes('node_modules/react-router') ||
            id.includes('node_modules/@radix-ui') ||
            id.includes('node_modules/framer-motion') ||
            id.includes('node_modules/@tanstack') ||
            id.includes('node_modules/cmdk') ||
            id.includes('node_modules/vaul') ||
            id.includes('node_modules/react-day-picker') ||
            id.includes('node_modules/react-hook-form') ||
            id.includes('node_modules/react-resizable-panels') ||
            id.includes('node_modules/embla-carousel-react') ||
            id.includes('node_modules/recharts') ||
            id.includes('node_modules/input-otp')
          ) {
            return 'react-vendor';
          }
          // Supabase (doesn't depend on React at runtime)
          if (id.includes('node_modules/@supabase')) {
            return 'supabase-vendor';
          }
          // Other node_modules (utilities that don't depend on React)
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
        // Optimize chunk file names for better caching
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`;
          }
          if (/woff2?|eot|ttf|otf/i.test(ext)) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          return `assets/[ext]/[name]-[hash][extname]`;
        },
      },
    },
    // Enable minification (using esbuild - faster and included with Vite)
    minify: 'esbuild',
    // Note: esbuild doesn't support drop_console, but console.logs are typically
    // removed in production builds anyway. If you need advanced minification options,
    // install terser: npm install -D terser and change minify to 'terser'
    // Increase chunk size warning limit (we're splitting manually)
    chunkSizeWarningLimit: 1000,
    // Enable source maps only in development
    sourcemap: mode === 'development',
    // Optimize asset inlining threshold
    assetsInlineLimit: 4096, // 4kb
  },
  // Optimize dependencies pre-bundling
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      '@tanstack/react-query',
    ],
  },
}));
