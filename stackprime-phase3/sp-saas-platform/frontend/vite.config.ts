import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// In development the API runs on port 4000. Proxying /v1 through Vite keeps everything on one origin,
// exactly like production behind nginx, so the login cookie works unchanged.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/v1': 'http://localhost:4000' } },
  build: { outDir: 'dist', sourcemap: false },
});
