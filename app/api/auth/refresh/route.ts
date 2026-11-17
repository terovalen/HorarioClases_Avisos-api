/** POST /api/auth/refresh — renueva el ID token con el refresh token. */
import { renovar } from '@/lib/auth-rest';
import { ErrorApi, leerJson, responderError, respuestaJson } from '@/lib/errores';
import { detallesDeZod, refreshTokenEsquema } from '@/lib/esquemas';

export const runtime = 'nodejs';

export async function POST(peticion: Request): Promise<Response> {
  try {
    const cuerpo = await leerJson(peticion);
    const valido = refreshTokenEsquema.safeParse(cuerpo);
    if (!valido.success) {
      throw new ErrorApi(400, 'Datos inválidos', detallesDeZod(valido.error));
    }
    const sesion = await renovar(valido.data.refreshToken);
    return respuestaJson(200, {
      token: sesion.token,
      refreshToken: sesion.refreshToken,
      expiraEnSeg: sesion.expiraEnSeg,
    });
  } catch (error) {
    return responderError(error);
  }
}
