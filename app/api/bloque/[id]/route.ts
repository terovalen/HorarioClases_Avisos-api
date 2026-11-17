/** PUT /api/bloque/:id — crea o reemplaza y comprueba cruces (409 si hay).
 *  DELETE — borrado lógico (lápida). */
import {
  borrarSuavemente,
  colocarDocumento,
  listarBloquesDelDia,
  obtenerDocumento,
} from '@/lib/datos';
import { ErrorApi, leerJson, responderError, respuestaJson } from '@/lib/errores';
import { bloqueEsquema, detallesDeZod, esUuid } from '@/lib/esquemas';
import { encontrarCruces, type BloqueValidable } from '@/lib/logica/cruces';
import { sesionDe } from '@/lib/sesion';

export const runtime = 'nodejs';

type Contexto = { params: Promise<{ id: string }> };

export async function PUT(peticion: Request, contexto: Contexto): Promise<Response> {
  try {
    const sesion = await sesionDe(peticion);
    const { id } = await contexto.params;
    if (!esUuid(id)) throw new ErrorApi(400, 'El id debe ser un UUID');
    const cuerpo = await leerJson(peticion);
    const valido = bloqueEsquema.safeParse(cuerpo);
    if (!valido.success) {
      throw new ErrorApi(400, 'Datos inválidos', detallesDeZod(valido.error));
    }
    const materia = await obtenerDocumento(sesion.uid, 'materia', valido.data.materia_id);
    if (!materia || (materia['deleted_at'] ?? null) !== null) {
      throw new ErrorApi(400, 'Datos inválidos', [
        { campo: 'materia_id', mensaje: 'La materia no existe' },
      ]);
    }
    const existentes = await listarBloquesDelDia(sesion.uid, valido.data.dia);
    const candidato: BloqueValidable = { id, ...valido.data };
    if (encontrarCruces(candidato, aValidables(existentes)).length > 0) {
      throw new ErrorApi(409, 'El bloque se cruza con otro del mismo día');
    }
    const marcas = await colocarDocumento(sesion.uid, 'bloque', id, valido.data);
    return respuestaJson(200, { id, ...valido.data, ...marcas, deleted_at: null });
  } catch (error) {
    return responderError(error);
  }
}

export async function DELETE(peticion: Request, contexto: Contexto): Promise<Response> {
  try {
    const sesion = await sesionDe(peticion);
    const { id } = await contexto.params;
    if (!esUuid(id)) throw new ErrorApi(400, 'El id debe ser un UUID');
    const borrado = await borrarSuavemente(sesion.uid, 'bloque', id);
    if (!borrado) throw new ErrorApi(404, 'El bloque no existe');
    return respuestaJson(200, { ok: true });
  } catch (error) {
    return responderError(error);
  }
}

function aValidables(documentos: Record<string, unknown>[]): BloqueValidable[] {
  return documentos.map((d) => ({
    id: String(d['id'] ?? ''),
    dia: Number(d['dia'] ?? 0),
    hora_inicio: String(d['hora_inicio'] ?? ''),
    hora_fin: String(d['hora_fin'] ?? ''),
  }));
}
