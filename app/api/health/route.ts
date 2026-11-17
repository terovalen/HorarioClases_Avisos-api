/** GET /api/health — pública: la app la usa para comprobar la API.
 *  Informa del estado del Admin SDK sin revelar ningún secreto. */
export const runtime = 'nodejs';

export async function GET(): Promise<Response> {
  return Response.json({
    ok: true,
    firebase: await estadoFirebase(),
    node: process.version,
    commit: process.env['VERCEL_GIT_COMMIT_SHA'] ?? null,
    servidor_ahora: new Date().toISOString(),
  });
}

/** Estado del Admin SDK: 'ok' si carga y valida tokens, 'config' si faltan
 *  variables de entorno, 'no-carga' si el módulo no se puede usar. */
async function estadoFirebase(): Promise<'ok' | 'config' | 'no-carga'> {
  try {
    const { firebase } = await import('@/lib/firebase');
    await firebase().auth.verifyIdToken('diagnostico');
    return 'ok';
  } catch (error) {
    if (esErrorDeAuth(error)) return 'ok';
    if (esErrorDeConfiguracion(error)) return 'config';
    return 'no-carga';
  }
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
