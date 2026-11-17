/** Pruebas de rutas de autenticación (401 / 400 / 401 mismo mensaje / 409 / 429). */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/firebase', async () => {
  const { tokensFalsos } = await import('./ayudantes/tokens-falsos');
  return {
    firebase: () => ({
      db: {} as never,
      auth: {
        verifyIdToken: async (token: string) => {
          const usuario = tokensFalsos[token];
          if (!usuario) throw new Error('token inválido');
          return { uid: usuario.uid, email: usuario.email, rol: usuario.rol };
        },
        listUsers: async () => ({ users: [] }),
      },
    }),
  };
});

vi.mock('../lib/datos', async () => await import('./ayudantes/datos-falsos'));

import { GET as YO } from '../app/api/auth/yo/route';
import { POST as LOGIN } from '../app/api/auth/login/route';
import { POST as REFRESH } from '../app/api/auth/refresh/route';
import { limpiar } from './ayudantes/datos-falsos';
import { tokensFalsos } from './ayudantes/tokens-falsos';

function peticionGet(token?: string): Request {
  return new Request('https://api.local/api/auth/yo', {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

function peticionLogin(cuerpo: unknown): Request {
  return new Request('https://api.local/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(cuerpo),
  });
}

beforeEach(() => {
  limpiar();
  tokensFalsos['token-a'] = { uid: 'usuario-a', email: 'a@prueba.co' };
  globalThis.fetch = vi.fn();
});

describe('GET /api/auth/yo', () => {
  it('401 sin token (prueba obligatoria de autenticación)', async () => {
    const respuesta = await YO(peticionGet());
    expect(respuesta.status).toBe(401);
    expect(await respuesta.json()).toEqual({ error: 'Falta el token de acceso' });
  });

  it('401 con token inválido, con el mismo mensaje exista o no el usuario', async () => {
    const respuesta = await YO(peticionGet('token-falso'));
    expect(respuesta.status).toBe(401);
    expect((await respuesta.json())['error']).toBe('Token inválido o expirado');
  });

  it('200 con token válido y uid del token verificado', async () => {
    const respuesta = await YO(peticionGet('token-a'));
    expect(respuesta.status).toBe(200);
    expect(await respuesta.json()).toEqual({
      usuario: { id: 'usuario-a', email: 'a@prueba.co' },
    });
  });
});

describe('POST /api/auth/login', () => {
  it('400 con contraseña débil (menos de 8 caracteres)', async () => {
    const respuesta = await LOGIN(
      peticionLogin({ email: 'a@b.co', password: 'corta12' }),
    );
    expect(respuesta.status).toBe(400);
    const cuerpo = (await respuesta.json()) as { detalles: { campo: string }[] };
    expect(cuerpo.detalles[0]?.['campo']).toBe('password');
  });

  it('401 con credenciales inválidas (mismo mensaje exista o no el correo)', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ error: { message: 'INVALID_LOGIN_CREDENTIALS' } }), {
        status: 400,
      }),
    );
    const respuesta = await LOGIN(
      peticionLogin({ email: 'no-existe@x.co', password: 'clave-larga' }),
    );
    expect(respuesta.status).toBe(401);
    expect((await respuesta.json())['error']).toBe('Correo o contraseña incorrectos');
  });

  it('429 tras demasiados intentos fallidos', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ error: { message: 'INVALID_LOGIN_CREDENTIALS' } }), {
        status: 400,
      }),
    );
    for (let i = 0; i < 5; i++) {
      await LOGIN(peticionLogin({ email: 'a@b.co', password: 'clave-larga' }));
    }
    const sexta = await LOGIN(
      peticionLogin({ email: 'a@b.co', password: 'clave-larga' }),
    );
    expect(sexta.status).toBe(429);
  });

  it('500 sin detalles si el proveedor de auth no responde', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('red caída'),
    );
    const respuesta = await LOGIN(
      peticionLogin({ email: 'sin-red@x.co', password: 'clave-larga' }),
    );
    expect(respuesta.status).toBe(500);
    expect(await respuesta.json()).toEqual({ error: 'Error interno' });
  });
});

describe('POST /api/auth/refresh', () => {
  it('400 con refreshToken demasiado corto', async () => {
    const respuesta = await REFRESH(
      new Request('https://api.local/api/auth/refresh', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ refreshToken: 'corto' }),
      }),
    );
    expect(respuesta.status).toBe(400);
  });

  it('401 cuando el refresh token ya no sirve', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response('{}', { status: 400 }),
    );
    const respuesta = await REFRESH(
      new Request('https://api.local/api/auth/refresh', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ refreshToken: 'refresh-token-largo-de-prueba' }),
      }),
    );
    expect(respuesta.status).toBe(401);
  });
});
