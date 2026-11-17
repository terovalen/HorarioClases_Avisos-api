/** GET /api/auth/yo — requiere Bearer ID token; 401 sin token (prueba clave). */
import { responderError, respuestaJson } from '@/lib/errores';
import { sesionDe } from '@/lib/sesion';

export const runtime = 'nodejs';

export async function GET(peticion: Request): Promise<Response> {
  try {
    const sesion = await sesionDe(peticion);
    return respuestaJson(200, {
      usuario: { id: sesion.uid, email: sesion.correo },
    });
  } catch (error) {
    return responderError(error);
  }
}
