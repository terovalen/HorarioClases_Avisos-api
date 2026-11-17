/** GET /api/bloque?since=<ISO> — cambios del usuario, máx. 500 por llamada. */
import { listarCambios } from '@/lib/datos';
import { responderError, respuestaJson } from '@/lib/errores';
import { sesionDe } from '@/lib/sesion';

export const runtime = 'nodejs';

export async function GET(peticion: Request): Promise<Response> {
  try {
    const sesion = await sesionDe(peticion);
    const desde = new URL(peticion.url).searchParams.get('since');
    const items = await listarCambios(sesion.uid, 'bloque', desde);
    return respuestaJson(200, { items, servidor_ahora: new Date().toISOString() });
  } catch (error) {
    return responderError(error);
  }
}
