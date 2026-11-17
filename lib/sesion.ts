/** Verificación del ID token. El uid SIEMPRE sale del token, nunca del
 *  cuerpo ni de la URL. */
import { firebase } from './firebase';
import { ErrorApi } from './errores';

export type Sesion = {
  uid: string;
  correo: string | null;
  admin: boolean;
};

export async function sesionDe(peticion: Request): Promise<Sesion> {
  const cabecera = peticion.headers.get('authorization');
  const token = cabecera?.replace(/^Bearer\s+/i, '').trim();
  if (!token) throw new ErrorApi(401, 'Falta el token de acceso');
  try {
    const decodificado = await firebase().auth.verifyIdToken(token);
    return {
      uid: decodificado.uid,
      correo: decodificado.email ?? null,
      admin: decodificado['rol'] === 'admin',
    };
  } catch {
    throw new ErrorApi(401, 'Token inválido o expirado');
  }
}

/** Las rutas de administración exigen el claim rol = "admin" (403 sin él). */
export function exigirAdmin(sesion: Sesion): void {
  if (!sesion.admin) throw new ErrorApi(403, 'Se requiere rol admin');
}
