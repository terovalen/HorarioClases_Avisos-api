/** PUT /api/materia/:id — crea o reemplaza (idempotente) · DELETE — lápida. */
import { borrarSuavemente, colocarDocumento, existeNombreMateria } from '@/lib/datos';
import { ErrorApi, leerJson, responderError, respuestaJson } from '@/lib/errores';
import { detallesDeZod, esUuid, materiaEsquema } from '@/lib/esquemas';
import { sesionDe } from '@/lib/sesion';

export const runtime = 'nodejs';

type Contexto = { params: Promise<{ id: string }> };

export async function PUT(peticion: Request, contexto: Contexto): Promise<Response> {
  try {
    const sesion = await sesionDe(peticion);
    const { id } = await contexto.params;
    if (!esUuid(id)) throw new ErrorApi(400, 'El id debe ser un UUID');
    const cuerpo = await leerJson(peticion);
    const valido = materiaEsquema.safeParse(cuerpo);
    if (!valido.success) {
      throw new ErrorApi(400, 'Datos inválidos', detallesDeZod(valido.error));
    }
    if (await existeNombreMateria(sesion.uid, valido.data.nombre, id)) {
      throw new ErrorApi(409, 'Ya existe una materia con ese nombre');
    }
    const marcas = await colocarDocumento(sesion.uid, 'materia', id, valido.data);
    return respuestaJson(200, {
      id,
      ...valido.data,
      ...marcas,
      deleted_at: null,
    });
  } catch (error) {
    return responderError(error);
  }
}

export async function DELETE(peticion: Request, contexto: Contexto): Promise<Response> {
  try {
    const sesion = await sesionDe(peticion);
    const { id } = await contexto.params;
    if (!esUuid(id)) throw new ErrorApi(400, 'El id debe ser un UUID');
    const borrada = await borrarSuavemente(sesion.uid, 'materia', id);
    if (!borrada) throw new ErrorApi(404, 'La materia no existe');
    return respuestaJson(200, { ok: true });
  } catch (error) {
    return responderError(error);
  }
}
