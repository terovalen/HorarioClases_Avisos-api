/** POST /api/auth/login — Firebase Auth mediado; 429 con demasiados intentos. */
import { iniciar } from '@/lib/auth-rest';
import { ErrorApi, leerJson, responderError, respuestaJson } from '@/lib/errores';
import { credencialEsquema, detallesDeZod } from '@/lib/esquemas';
import { permitirIntento, restablecer, type Registro } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const intentos: Registro = new Map();

export async function POST(peticion: Request): Promise<Response> {
  try {
    const cuerpo = await leerJson(peticion);
    const valido = credencialEsquema.safeParse(cuerpo);
    if (!valido.success) {
      throw new ErrorApi(400, 'Datos inválidos', detallesDeZod(valido.error));
    }
    const clave = `login:${valido.data.email}`;
    if (!permitirIntento(intentos, clave, Date.now())) {
      throw new ErrorApi(429, 'Demasiados intentos, prueba más tarde');
    }
    const sesion = await iniciar(valido.data.email, valido.data.password);
    restablecer(intentos, clave);
    return respuestaJson(200, {
      token: sesion.token,
      refreshToken: sesion.refreshToken,
      expiraEnSeg: sesion.expiraEnSeg,
      usuario: { id: sesion.id, email: sesion.email },
    });
  } catch (error) {
    return responderError(error);
  }
}
