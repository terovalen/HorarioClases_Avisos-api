/** GET/PUT /api/ajustes/horario — documento único de ajustes del usuario. */
import { colocarDocumento, obtenerDocumento } from '@/lib/datos';
import { ErrorApi, leerJson, responderError, respuestaJson } from '@/lib/errores';
import { ajustesEsquema, detallesDeZod } from '@/lib/esquemas';
import { sesionDe } from '@/lib/sesion';

export const runtime = 'nodejs';

const ID_DOCUMENTO = 'horario';
const POR_DEFECTO = { campus_lat: null, campus_lng: null, minutos_aviso: 15 };

export async function GET(peticion: Request): Promise<Response> {
  try {
    const sesion = await sesionDe(peticion);
    const documento = await obtenerDocumento(sesion.uid, 'ajustes', ID_DOCUMENTO);
    if (!documento) {
      return respuestaJson(200, { id: ID_DOCUMENTO, ...POR_DEFECTO });
    }
    return respuestaJson(200, {
      id: documento.id,
      campus_lat: documento['campus_lat'] ?? null,
      campus_lng: documento['campus_lng'] ?? null,
      minutos_aviso: documento['minutos_aviso'] ?? 15,
      updated_at: documento.updated_at,
    });
  } catch (error) {
    return responderError(error);
  }
}

export async function PUT(peticion: Request): Promise<Response> {
  try {
    const sesion = await sesionDe(peticion);
    const cuerpo = await leerJson(peticion);
    const valido = ajustesEsquema.safeParse(cuerpo);
    if (!valido.success) {
      throw new ErrorApi(400, 'Datos inválidos', detallesDeZod(valido.error));
    }
    const marcas = await colocarDocumento(
      sesion.uid,
      'ajustes',
      ID_DOCUMENTO,
      valido.data,
    );
    return respuestaJson(200, { id: ID_DOCUMENTO, ...valido.data, ...marcas });
  } catch (error) {
    return responderError(error);
  }
}
