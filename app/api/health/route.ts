/** GET /api/health — pública: la app la usa para comprobar la API.
 *  Informa del estado del Admin SDK sin revelar ningún secreto. */
export const runtime = 'nodejs';

export async function GET(): Promise<Response> {
  const firebase = await estadoFirebase();
  return Response.json({
    ok: true,
    firebase: firebase.estado,
    error: firebase.error,
    node: process.version,
    commit: process.env['VERCEL_GIT_COMMIT_SHA'] ?? null,
    servidor_ahora: new Date().toISOString(),
  });
}

type Estado = {
  estado: 'ok' | 'config' | 'no-carga';
  error: { nombre: string; codigo: string | null; mensaje: string } | null;
};

/** Estado del Admin SDK: 'ok' si carga y valida tokens, 'config' si faltan
 *  variables de entorno, 'no-carga' si el módulo no se puede usar. */
async function estadoFirebase(): Promise<Estado> {
  try {
    const { firebase } = await import('@/lib/firebase');
    await firebase().auth.verifyIdToken('diagnostico');
    return { estado: 'ok', error: null };
  } catch (error) {
    if (esErrorDeAuth(error)) return { estado: 'ok', error: null };
    if (esErrorDeConfiguracion(error)) {
      return { estado: 'config', error: describir(error) };
    }
    return { estado: 'no-carga', error: describir(error) };
  }
}

/** Describe el fallo sin filtrar secretos: nombre, código y un mensaje
 *  recortado en el que se tapan posibles claves. */
function describir(error: unknown): {
  nombre: string;
  codigo: string | null;
  mensaje: string;
} {
  if (!(error instanceof Error)) {
    return { nombre: 'desconocido', codigo: null, mensaje: 'error no recognized' };
  }
  const codigo = (error as { code?: unknown }).code;
  return {
    nombre: error.name,
    codigo: typeof codigo === 'string' ? codigo : null,
    mensaje: sinClaves(error.message).slice(0, 160),
  };
}

/** Tapa cualquier fragmento largo tipo clave o token. */
function sinClaves(texto: string): string {
  return texto.replace(/[A-Za-z0-9+/=_-]{40,}/g, '[oculto]');
}

/** Un token inválido produce un FirebaseAuthError: el SDK sí funciona. */
function esErrorDeAuth(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const codigo = (error as { code?: unknown }).code;
  return typeof codigo === 'string' && codigo.startsWith('auth/');
}

/** Faltan FIREBASE_* o la credencial no es válida. */
function esErrorDeConfiguracion(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.message.includes('FIREBASE_') || error.message.includes('credential');
}
