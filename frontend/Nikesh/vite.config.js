import { defineConfig } from 'vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
  ],

  // ── Dev server ─────────────────────────────────────────────────────────────
  server: {
    port: 5173,
    open: false,
    // Proxy API calls to backend during dev (avoids CORS issues)
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },

  // ── Production build ───────────────────────────────────────────────────────
  build: {
    outDir: 'dist',
    sourcemap: false,          // disable in prod for smaller output
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Manual chunking — split vendor libs into separate cacheable chunks
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react';
            }
            if (id.includes('chart.js') || id.includes('react-chartjs-2')) {
              return 'vendor-charts';
            }
            if (id.includes('jspdf') || id.includes('html2canvas')) {
              return 'vendor-pdf';
            }
            if (id.includes('axios')) {
              return 'vendor-axios';
            }
            return 'vendor-misc';
          }
        },
      },
    },
  },

  // ── Preview (for `vite preview`) ───────────────────────────────────────────
  preview: {
    port: 4173,
    strictPort: true,
  },
});
