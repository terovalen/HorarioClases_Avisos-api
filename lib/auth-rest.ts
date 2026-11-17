/** API REST de Firebase Auth (Identity Toolkit): la clave web vive SOLO en
 *  Vercel. Errores mapeados con el MISMO mensaje para credenciales inválidas,
 *  exista o no el correo. */
import { ErrorApi } from './errores';

const BASE = 'https://identitytoolkit.googleapis.com/v1/accounts';
const REFRESH_URL = 'https://securetoken.googleapis.com/v1/token';

export type SesionFirebase = {
  token: string;
  refreshToken: string;
  expiraEnSeg: number;
  id: string;
  email: string;
};

const ERRORES: Record<string, [number, string]> = {
  EMAIL_EXISTS: [409, 'El correo ya está registrado'],
  EMAIL_NOT_FOUND: [401, 'Correo o contraseña incorrectos'],
  INVALID_LOGIN_CREDENTIALS: [401, 'Correo o contraseña incorrectos'],
  INVALID_PASSWORD: [401, 'Correo o contraseña incorrectos'],
  WEAK_PASSWORD: [400, 'La contraseña es muy débil (mínimo 8 caracteres)'],
  TOO_MANY_ATTEMPTS_TRY_LATER: [429, 'Demasiados intentos, prueba más tarde'],
};

export async function registrar(correo: string, clave: string): Promise<SesionFirebase> {
  return llamar('signUp', { email: correo, password: clave, returnSecureToken: true });
}

export async function iniciar(correo: string, clave: string): Promise<SesionFirebase> {
  return llamar('signInWithPassword', {
    email: correo,
    password: clave,
    returnSecureToken: true,
  });
}

/** Renueva el ID token con el refresh token (grant_type=refresh_token). */
export async function renovar(
  refreshToken: string,
): Promise<Omit<SesionFirebase, 'id' | 'email'>> {
  const respuesta = await fetch(REFRESH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      key: claveWeb(),
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });
  if (!respuesta.ok) throw new ErrorApi(401, 'Sesión expirada, inicia sesión de nuevo');
  const datos = (await respuesta.json()) as Record<string, string>;
  return {
    token: datos['id_token'] ?? '',
    refreshToken: datos['refresh_token'] ?? '',
    expiraEnSeg: Number(datos['expires_in'] ?? 3600),
  };
}

async function llamar(
  accion: string,
  cuerpo: Record<string, unknown>,
): Promise<SesionFirebase> {
  let respuesta: Response;
  try {
    respuesta = await fetch(`${BASE}:${accion}?key=${claveWeb()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
    });
  } catch {
    throw new ErrorApi(500, 'Error interno');
  }
  if (!respuesta.ok) throw await errorDeFirebase(respuesta);
  return leerSesion(respuesta);
}

async function errorDeFirebase(respuesta: Response): Promise<ErrorApi> {
  let codigo = '';
  try {
    const cuerpo = (await respuesta.json()) as { error?: { message?: string } };
    codigo = (cuerpo.error?.message ?? '').split(':')[0]?.trim() ?? '';
  } catch {
    codigo = '';
  }
  const mapeado = ERRORES[codigo];
  if (mapeado) return new ErrorApi(mapeado[0], mapeado[1]);
  return new ErrorApi(401, 'Correo o contraseña incorrectos');
}

async function leerSesion(respuesta: Response): Promise<SesionFirebase> {
  const datos = (await respuesta.json()) as Record<string, unknown>;
  return {
    token: String(datos['idToken'] ?? ''),
    refreshToken: String(datos['refreshToken'] ?? ''),
    expiraEnSeg: Number(datos['expiresIn'] ?? 3600),
    id: String(datos['localId'] ?? ''),
    email: String(datos['email'] ?? ''),
  };
}

function claveWeb(): string {
  const clave = process.env['FIREBASE_WEB_API_KEY'];
  if (!clave) throw new ErrorApi(500, 'Error interno');
  return clave;
}
