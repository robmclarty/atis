import react from '@vitejs/plugin-react';
import { defaultClientConditions, defineConfig } from 'vite';

// Workspace packages resolve to their TypeScript source under the `source`
// export condition (D20), so the app builds from the libs' sources with no
// `tsc --build` before it, exactly as vitest reads them.
export default defineConfig({
  plugins: [react()],
  resolve: { conditions: ['source', ...defaultClientConditions] },
  // three's WebGPU build is most of the bundle, and the app is served from
  // loopback (C13), so its size is the first frame's to answer (C14), not a
  // chunk limit's.
  build: { outDir: 'dist', emptyOutDir: true, chunkSizeWarningLimit: 1500 },
});
