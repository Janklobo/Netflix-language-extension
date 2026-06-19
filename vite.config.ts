import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import webExtension from 'vite-plugin-web-extension';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  define: {
    // kuromoji references process.env in some paths — stub it for the browser bundle
    'process.env': '{}',
  },

  build: {
    // Source maps in dev mode only — never ship source maps in production extension
    sourcemap: process.env.NODE_ENV !== 'production' ? 'inline' : false,
    emptyOutDir: true,
  },

  plugins: [
    // React plugin must come before webExtension so JSX transform is applied
    // to popup and options HTML entry points during sub-builds.
    react(),

    webExtension({
      manifest: path.resolve(__dirname, './manifest.json'),

      // The injected page script is not referenced in manifest content_scripts
      // (it's injected at runtime via document.createElement('script')), so we
      // register it as an additionalInput so Vite compiles and hashes it.
      additionalInputs: ['src/injected/netflix-player-hook.ts'],
    }),
  ],
});
