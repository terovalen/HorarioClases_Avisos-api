/** GET /api/health — pública: la app la usa para comprobar la API. */
export const runtime = 'nodejs';

export async function GET(): Promise<Response> {
  return Response.json({ ok: true, servidor_ahora: new Date().toISOString() });
}
