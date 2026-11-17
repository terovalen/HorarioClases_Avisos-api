import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  /** firebase-admin no se puede empaquetar: se carga desde node_modules en
   *  tiempo de ejecución. Sin esto, toda ruta que importe el Admin SDK
   *  (lib/firebase) falla al arrancar la función en Vercel con un 500 vacío
   *  (las rutas que no lo importan, como /api/health, sí funcionan). */
  serverExternalPackages: ['firebase-admin'],
};

export default config;
