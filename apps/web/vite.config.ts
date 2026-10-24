import react from '@vitejs/plugin-react';
import { defaultClientConditions, defineConfig } from 'vite';

// Workspace packages resolve to their TypeScript source under the `source`
// export condition (D20), so the app builds from the libs' sources with no
// `tsc --build` before it, exactly as vitest reads them.
export default defineConfig({
  plugins: [react()],
  resolve: {
    conditions: ['source', ...defaultClientConditions],
    // three's addons import its core build by its bare name; the world draws
    // with the WebGPU build, which exports everything the core does, so the
    // bare name resolves there too and one copy of three loads (D91): a second
    // would warn on the console, which the smoke test counts as a fault (D132).
    alias: [{ find: /^three$/, replacement: 'three/webgpu' }],
  },
  // three's WebGPU build is most of the bundle, and the app is served from
  // loopback (C13), so its size is the first frame's to answer (C14), not a
  // chunk limit's.
  build: { outDir: 'dist', emptyOutDir: true, chunkSizeWarningLimit: 1500 },
});
