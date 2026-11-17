/** Alias de rutas '@' para Vitest (los Route Handlers importan '@/lib/...'). */
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    env: {
      // La clave web solo existe en Vercel; en pruebas se usa una falsa.
      FIREBASE_WEB_API_KEY: 'clave-web-de-prueba',
    },
    include: ['__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['lib/**/*.ts'],
      // Excluidos por ser adaptadores de infraestructura que exigen credenciales
      // reales o el emulador de Firebase (se verifican en despliegue):
      exclude: ['lib/firebase.ts', 'lib/datos.ts'],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
