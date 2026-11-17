/** Límite de tasa (pure) y mapeo de errores del proveedor de auth. */
import { describe, expect, it, vi } from 'vitest';
import { permitirIntento, restablecer } from '../lib/rate-limit';
import { iniciar, registrar, renovar } from '../lib/auth-rest';

describe('rate-limit', () => {
  it('permite 5 intentos y bloquea el sexto dentro de la ventana', () => {
    const registro = new Map<string, number[]>();
    for (let i = 0; i < 5; i++) {
      expect(permitirIntento(registro, 'login:a@b.co', i * 1000)).toBe(true);
    }
    expect(permitirIntento(registro, 'login:a@b.co', 6000)).toBe(false);
  });

  it('los intentos viejos salen de la ventana y vuelven a permitirse', () => {
    const registro = new Map<string, number[]>();
    for (let i = 0; i < 5; i++) permitirIntento(registro, 'k', i * 1000);
    expect(permitirIntento(registro, 'k', 20 * 60 * 1000)).toBe(true);
  });

  it('restablecer limpia el historial tras un éxito', () => {
    const registro = new Map<string, number[]>();
    for (let i = 0; i < 5; i++) permitirIntento(registro, 'k', i * 1000);
    restablecer(registro, 'k');
    expect(permitirIntento(registro, 'k', 6000)).toBe(true);
  });
});

describe('auth-rest: mapeo de errores del proveedor', () => {
  function responder(message: string, status = 400): Response {
    return new Response(JSON.stringify({ error: { message } }), { status });
  }

  it('EMAIL_EXISTS → 409', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(responder('EMAIL_EXISTS'));
    await expect(registrar('a@b.co', 'clave-larga')).rejects.toMatchObject({
      estado: 409,
    });
  });

  it('WEAK_PASSWORD (con detalle tras dos puntos) → 400', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(
        responder('WEAK_PASSWORD : Password should be at least 8 characters'),
      );
    await expect(registrar('a@b.co', 'clave-larga')).rejects.toMatchObject({
      estado: 400,
    });
  });

  it('TOO_MANY_ATTEMPTS_TRY_LATER → 429', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(responder('TOO_MANY_ATTEMPTS_TRY_LATER'));
    await expect(iniciar('a@b.co', 'clave-larga')).rejects.toMatchObject({ estado: 429 });
  });

  it('código desconocido → 401 con el mensaje acordado', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(responder('SOMETHING_ELSE'));
    await expect(iniciar('a@b.co', 'clave-larga')).rejects.toMatchObject({ estado: 401 });
  });

  it('renovar con respuesta exitosa devuelve token y expiraEnSeg', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id_token: 'nuevo',
          refresh_token: 'nuevo-r',
          expires_in: '3600',
        }),
        { status: 200 },
      ),
    );
    const sesion = await renovar('refresh-token-largo-de-prueba');
    expect(sesion.token).toBe('nuevo');
    expect(sesion.expiraEnSeg).toBe(3600);
  });

  it('renovar envía la clave en el query y el cuerpo url-encoded', async () => {
    const falsch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id_token: 't', refresh_token: 'r' }), {
        status: 200,
      }),
    );
    globalThis.fetch = falsch;
    await renovar('refresh-token-largo-de-prueba');
    const [url, init] = falsch.mock.calls[0] as [
      string,
      { headers: Record<string, string>; body: string },
    ];
    expect(url).toContain('?key=clave-web-de-prueba');
    expect(init.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
    expect(init.body).toContain('grant_type=refresh_token');
    expect(init.body).toContain('refresh_token=refresh-token-largo-de-prueba');
  });

  it('renovar: USER_DISABLED → 403', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(responder('USER_DISABLED', 400));
    await expect(renovar('refresh-token-largo-de-prueba')).rejects.toMatchObject({
      estado: 403,
    });
  });

  it('renovar: código desconocido → 401 con el mensaje de sesión', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(responder('INVALID_REFRESH_TOKEN'));
    await expect(renovar('refresh-token-largo-de-prueba')).rejects.toMatchObject({
      estado: 401,
      message: 'Sesión expirada, inicia sesión de nuevo',
    });
  });

  it('renovar: respuesta sin JSON del proveedor → 401 con el mensaje de sesión', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('<html>', { status: 502 }));
    await expect(renovar('refresh-token-largo-de-prueba')).rejects.toMatchObject({
      estado: 401,
      message: 'Sesión expirada, inicia sesión de nuevo',
    });
  });

  it('renovar: fallo de red → 500 sin detalles', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('sin red'));
    await expect(renovar('refresh-token-largo-de-prueba')).rejects.toMatchObject({
      estado: 500,
    });
  });

  it('fallo de red al llamar al proveedor → 500 sin detalles', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('sin red'));
    await expect(iniciar('a@b.co', 'clave-larga')).rejects.toMatchObject({ estado: 500 });
  });

  it('cuerpo no JSON del proveedor → 401 con el mensaje acordado', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('<html>', { status: 502 }));
    await expect(iniciar('a@b.co', 'clave-larga')).rejects.toMatchObject({ estado: 401 });
  });

  it('registro exitoso devuelve la sesión completa del proveedor', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          idToken: 'id-1',
          refreshToken: 'r-1',
          expiresIn: '3600',
          localId: 'uid-1',
          email: 'a@b.co',
        }),
        { status: 200 },
      ),
    );
    const sesion = await registrar('a@b.co', 'clave-larga');
    expect(sesion).toEqual({
      token: 'id-1',
      refreshToken: 'r-1',
      expiraEnSeg: 3600,
      id: 'uid-1',
      email: 'a@b.co',
    });
  });

  it('sesión con campos vacíos usa los valores por defecto', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    const sesion = await iniciar('a@b.co', 'clave-larga');
    expect(sesion.token).toBe('');
    expect(sesion.expiraEnSeg).toBe(3600);
  });

  it('renovar con cuerpo vacío usa los valores por defecto', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    const sesion = await renovar('refresh-token-largo-de-prueba');
    expect(sesion.token).toBe('');
    expect(sesion.refreshToken).toBe('');
    expect(sesion.expiraEnSeg).toBe(3600);
  });

  it('sin clave web configurada → 500 (la clave solo vive en Vercel)', async () => {
    const claveOriginal = process.env['FIREBASE_WEB_API_KEY'];
    delete process.env['FIREBASE_WEB_API_KEY'];
    try {
      await expect(iniciar('a@b.co', 'clave-larga')).rejects.toMatchObject({
        estado: 500,
      });
    } finally {
      process.env['FIREBASE_WEB_API_KEY'] = claveOriginal;
    }
  });
});
