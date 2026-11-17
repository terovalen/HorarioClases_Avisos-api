/** GET /api/admin/usuarios — solo con el claim rol = "admin" (403 sin él). */
import { responderError, respuestaJson } from '@/lib/errores';
import { firebase } from '@/lib/firebase';
import { exigirAdmin, sesionDe } from '@/lib/sesion';

export const runtime = 'nodejs';

export async function GET(peticion: Request): Promise<Response> {
  try {
    const sesion = await sesionDe(peticion);
    exigirAdmin(sesion);
    const listado = await firebase().auth.listUsers(10);
    return respuestaJson(200, {
      items: listado.users.map((u) => ({ id: u.uid, email: u.email ?? null })),
    });
  } catch (error) {
    return responderError(error);
  }
}
