import { defineConfig } from 'vite';
import { resolve } from 'path';
import legacy from '@vitejs/plugin-legacy';

export default defineConfig({
  // Build configuration
  build: {
    outDir: 'dist',
    emptyOutDir: true,

    // Multi-page application setup
    rollupOptions: {
      input: {
        login: resolve(__dirname, 'login.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        payment: resolve(__dirname, 'payment.html'),
        events: resolve(__dirname, 'events.html'),
        profile: resolve(__dirname, 'profile.html'),
        notifications: resolve(__dirname, 'notifications.html'),
        statements: resolve(__dirname, 'statements.html'),
        crisis: resolve(__dirname, 'crisis.html'),
        'family-tree': resolve(__dirname, 'family-tree.html'),
      },
    },

    // Minification and optimization
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // Keep console for development logging
        drop_debugger: true,
      },
    },

    // Source maps for debugging
    sourcemap: false,

    // Asset handling
    assetsInlineLimit: 4096, // 4kb
    cssCodeSplit: true,

    // Chunk size warnings
    chunkSizeWarningLimit: 1000,
  },

  // Legacy browser support
  plugins: [
    legacy({
      targets: ['defaults', 'not IE 11'],
      modernPolyfills: true,
      renderLegacyChunks: true,
    }),
  ],

  // Server configuration (for development)
  server: {
    port: 3000,
    strictPort: false,
    open: '/login.html',
    cors: true,
  },

  // Preview server configuration
  preview: {
    port: 3000,
    strictPort: false,
  },

  // Path resolution
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
      '@pages': resolve(__dirname, './src/pages'),
      '@utils': resolve(__dirname, './src/utils'),
      '@auth': resolve(__dirname, './src/auth'),
      '@state': resolve(__dirname, './src/state'),
      '@api': resolve(__dirname, './src/api'),
      '@security': resolve(__dirname, './src/security'),
      '@styles': resolve(__dirname, './src/styles'),
    },
  },

  // Optimizations
  optimizeDeps: {
    include: [],
    exclude: [],
  },

  // Asset copying
  publicDir: 'public',

  // Base path for deployment
  base: '/',
});
