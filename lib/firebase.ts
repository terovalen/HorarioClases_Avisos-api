/** Firebase Admin: la única puerta a Authentication y Firestore.
 *  Claves SOLO por variables de entorno en Vercel, nunca en Git ni en la app. */
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

export function firebase(): { db: Firestore; auth: Auth } {
  const existentes = getApps();
  const app: App = existentes[0] ?? inicializar();
  return { db: getFirestore(app), auth: getAuth(app) };
}

function inicializar(): App {
  return initializeApp({ credential: credencial() });
}

function credencial() {
  const projectId = process.env['FIREBASE_PROJECT_ID'];
  const clientEmail = process.env['FIREBASE_CLIENT_EMAIL'];
  const privateKey = process.env['FIREBASE_PRIVATE_KEY'];
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Faltan FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY',
    );
  }
  return cert({
    projectId,
    clientEmail,
    // En Vercel la clave se pega con \n literales: convertirlos a saltos reales.
    privateKey: privateKey.replaceAll('\\n', '\n'),
  });
}
