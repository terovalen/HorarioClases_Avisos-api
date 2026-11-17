/** Formato de error acordado: { error, detalles? } con códigos controlados. */
export type Detalle = { campo: string; mensaje: string };

export class ErrorApi extends Error {
  readonly estado: number;
  readonly detalles: Detalle[];

  constructor(estado: number, mensaje: string, detalles: Detalle[] = []) {
    super(mensaje);
    this.estado = estado;
    this.detalles = detalles;
  }
}

export function respuestaJson(estado: number, cuerpo: unknown): Response {
  return Response.json(cuerpo, { status: estado });
}

/** Envuelve cada manejador: errores internos no revelan detalles al cliente. */
export function responderError(error: unknown): Response {
  if (error instanceof ErrorApi) {
    const cuerpo: Record<string, unknown> = { error: error.message };
    if (error.detalles.length > 0) cuerpo['detalles'] = error.detalles;
    return respuestaJson(error.estado, cuerpo);
  }
  procesarInterno(error);
  return respuestaJson(500, { error: 'Error interno' });
}

function procesarInterno(error: unknown): void {
  // Log sin datos personales ni tokens: solo el tipo de fallo.
  const nombre = error instanceof Error ? error.name : 'desconocido';
  process.stderr.write(`error interno: ${nombre}\n`);
}

/** Lee el cuerpo JSON; exige application/json (415) y JSON válido (400). */
export async function leerJson(peticion: Request): Promise<unknown> {
  const tipo = peticion.headers.get('content-type') ?? '';
  if (tipo !== '' && !tipo.includes('application/json')) {
    throw new ErrorApi(415, 'Se espera application/json');
  }
  try {
    return await peticion.json();
  } catch {
    throw new ErrorApi(400, 'El cuerpo debe ser JSON válido');
  }
}
