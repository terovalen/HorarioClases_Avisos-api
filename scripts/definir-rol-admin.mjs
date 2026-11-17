// Asigna el rol admin (custom claim) a un usuario: `node scripts/definir-rol-admin.mjs correo@ejemplo.com`
// Requiere las variables de entorno de Firebase Admin (desarrollo, NO producción en disco).
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const [email] = process.argv.slice(2);
if (!email) {
  console.error('Uso: node scripts/definir-rol-admin.mjs <correo>');
  process.exit(1);
}

const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;
if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
  console.error(
    'Faltan FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY',
  );
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey: FIREBASE_PRIVATE_KEY.replaceAll('\\n', '\n'),
    }),
  });
}

const usuario = await getAuth().getUserByEmail(email);
await getAuth().setCustomUserClaims(usuario.uid, { rol: 'admin' });
console.log(`rol=admin asignado a ${email} (${usuario.uid})`);
