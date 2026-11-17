/** Puente CommonJS del Admin SDK.
 *
 *  firebase-admin v14 es dual: con la condición «import» apunta a la variante
 *  ESM (lib/esm/**) y con «require» a la CJS (lib/**). Turbopack resuelve los
 *  imports de este proyecto (ESM) con la condición «import» y luego Vercel
 *  carga ese archivo con require(): en Node 26 eso es ERR_REQUIRE_ESM y toda
 *  ruta que use Firebase responde 500.
 *
 *  Este archivo es CommonJS de verdad (.cjs), así que Turbopack resuelve sus
 *  require() con la condición «require» y se usa la variante CJS, compatible
 *  con cualquier versión de Node. */
const app = require('firebase-admin/app');
const auth = require('firebase-admin/auth');
const firestore = require('firebase-admin/firestore');

module.exports = {
  cert: app.cert,
  getApps: app.getApps,
  initializeApp: app.initializeApp,
  getAuth: auth.getAuth,
  getFirestore: firestore.getFirestore,
};
