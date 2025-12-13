import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react({
      // Ensure React is properly included in the build
      jsxRuntime: 'automatic',
      // Ensure React is always available
      jsxImportSource: 'react',
    }),
  ],
  build: {
    // Ensure proper chunking and React inclusion
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        // Ensure React is not externalized - bundle it with the app
        manualChunks: (id) => {
          // Don't split React - keep it in the main bundle
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
          // Other vendor code can be split
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
    // Ensure proper minification that doesn't break React
    minify: 'esbuild',
    target: 'esnext',
  },
  resolve: {
    // Ensure React is resolved correctly
    dedupe: ['react', 'react-dom'],
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
});

