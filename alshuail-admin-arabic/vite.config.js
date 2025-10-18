import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3002,
    open: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'build',
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': [
            'react',
            'react-dom',
            'react-router-dom',
            'axios',
          ],
          'ui-components': [
            '@heroicons/react',
            'tailwindcss',
          ],
          'charts': [
            'chart.js',
            'react-chartjs-2',
          ],
          'utils': [
            'dayjs',
            'lodash',
            'classnames',
          ],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  define: {
    'process.env': {},
  },
});