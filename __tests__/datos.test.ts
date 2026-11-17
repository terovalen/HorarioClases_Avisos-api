/** Rutas de datos: validación (400), cruces (409), aislamiento entre usuarios
 *  y borrado lógico. Firestore se simula con `datos-falsos`. */
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

import { GET as LISTAR_MATERIA } from '../app/api/materia/route';
import {
  PUT as PONER_MATERIA,
  DELETE as BORRAR_MATERIA,
} from '../app/api/materia/[id]/route';
import { PUT as PONER_BLOQUE } from '../app/api/bloque/[id]/route';
import {
  GET as LEER_AJUSTES,
  PUT as PONER_AJUSTES,
} from '../app/api/ajustes/horario/route';
import { GET as LISTAR_ADMIN } from '../app/api/admin/usuarios/route';
import { limpiar } from './ayudantes/datos-falsos';

const UUID = '11111111-1111-4111-8111-111111111111';
const UUID2 = '22222222-2222-4222-8222-222222222222';

function peticion(
  metodo: string,
  url: string,
  cuerpo?: unknown,
  token = 'token-a',
): Request {
  return new Request(url, {
    method: metodo,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
}

beforeEach(() => {
  limpiar();
});

describe('PUT /api/materia/:id', () => {
  it('crea la materia y devuelve el documento con marcas del servidor', async () => {
    const respuesta = await PONER_MATERIA(
      peticion('PUT', `https://api.local/api/materia/${UUID}`, {
        nombre: 'Cálculo',
        color: '#2563eb',
        extra: 'campo no declarado que debe descartarse',
      }),
      { params: Promise.resolve({ id: UUID }) },
    );
    expect(respuesta.status).toBe(200);
    const cuerpo = (await respuesta.json()) as Record<string, unknown>;
    expect(cuerpo['nombre']).toBe('Cálculo');
    expect(cuerpo['created_at']).toBeTruthy();
    expect(cuerpo['deleted_at']).toBeNull();
    expect(cuerpo['extra']).toBeUndefined(); // Zod descarta no declarados
  });

  it('409 cuando el nombre ya existe (unicidad por usuario)', async () => {
    await PONER_MATERIA(
      peticion('PUT', `https://api.local/api/materia/${UUID}`, {
        nombre: 'Física',
        color: '#2563eb',
      }),
      { params: Promise.resolve({ id: UUID }) },
    );
    const repetida = await PONER_MATERIA(
      peticion('PUT', `https://api.local/api/materia/${UUID2}`, {
        nombre: 'Física',
        color: '#2563eb',
      }),
      { params: Promise.resolve({ id: UUID2 }) },
    );
    expect(repetida.status).toBe(409);
  });

  it('400 si el id no es un UUID o el color es inválido', async () => {
    const idMalo = await PONER_MATERIA(
      peticion('PUT', 'https://api.local/api/materia/no-uuid', {
        nombre: 'X',
        color: '#2563eb',
      }),
      { params: Promise.resolve({ id: 'no-uuid' }) },
    );
    expect(idMalo.status).toBe(400);
    const colorMalo = await PONER_MATERIA(
      peticion('PUT', `https://api.local/api/materia/${UUID}`, {
        nombre: 'X',
        color: 'azul',
      }),
      { params: Promise.resolve({ id: UUID }) },
    );
    expect(colorMalo.status).toBe(400);
  });

  it('DELETE: 200 la primera vez y 404 si ya no existe', async () => {
    await PONER_MATERIA(
      peticion('PUT', `https://api.local/api/materia/${UUID}`, {
        nombre: 'X',
        color: '#2563eb',
      }),
      { params: Promise.resolve({ id: UUID }) },
    );
    const primera = await BORRAR_MATERIA(
      peticion('DELETE', `https://api.local/api/materia/${UUID}`),
      {
        params: Promise.resolve({ id: UUID }),
      },
    );
    expect(primera.status).toBe(200);
    const segunda = await BORRAR_MATERIA(
      peticion('DELETE', `https://api.local/api/materia/${UUID}`),
      {
        params: Promise.resolve({ id: UUID }),
      },
    );
    expect(segunda.status).toBe(404);
  });
});

describe('PUT /api/bloque/:id (cruces en el servidor)', () => {
  const materiaBase = { nombre: 'M', color: '#2563eb' };
  const cuerpo = (inicio: string, fin: string) => ({
    materia_id: UUID2,
    dia: 1,
    hora_inicio: inicio,
    hora_fin: fin,
  });

  beforeEach(async () => {
    await PONER_MATERIA(
      peticion('PUT', `https://api.local/api/materia/${UUID2}`, materiaBase),
      {
        params: Promise.resolve({ id: UUID2 }),
      },
    );
    await PONER_BLOQUE(
      peticion('PUT', `https://api.local/api/bloque/${UUID}`, cuerpo('07:00', '09:00')),
      {
        params: Promise.resolve({ id: UUID }),
      },
    );
  });

  it('prueba obligatoria de validación: 400 con hora_fin anterior a hora_inicio', async () => {
    const respuesta = await PONER_BLOQUE(
      peticion('PUT', `https://api.local/api/bloque/${UUID2}`, cuerpo('09:00', '08:00')),
      { params: Promise.resolve({ id: UUID2 }) },
    );
    expect(respuesta.status).toBe(400);
  });

  it('409 al cruzar con otro bloque del mismo día', async () => {
    const respuesta = await PONER_BLOQUE(
      peticion('PUT', `https://api.local/api/bloque/${UUID2}`, cuerpo('08:00', '10:00')),
      { params: Promise.resolve({ id: UUID2 }) },
    );
    expect(respuesta.status).toBe(409);
  });

  it('tocarse en el borde no es cruce (09:00–10:00 pasa)', async () => {
    const respuesta = await PONER_BLOQUE(
      peticion('PUT', `https://api.local/api/bloque/${UUID2}`, cuerpo('09:00', '10:00')),
      { params: Promise.resolve({ id: UUID2 }) },
    );
    expect(respuesta.status).toBe(200);
  });

  it('400 cuando la materia no existe o está borrada', async () => {
    const respuesta = await PONER_BLOQUE(
      peticion('PUT', `https://api.local/api/bloque/${UUID2}`, {
        ...cuerpo('11:00', '12:00'),
        materia_id: '99999999-9999-4999-8999-999999999999',
      }),
      { params: Promise.resolve({ id: UUID2 }) },
    );
    expect(respuesta.status).toBe(400);
  });
});

describe('aislamiento entre usuarios (prueba obligatoria de autorización)', () => {
  it('cada usuario solo ve sus propios datos: el uid sale del token', async () => {
    await PONER_MATERIA(
      peticion(
        'PUT',
        `https://api.local/api/materia/${UUID}`,
        { nombre: 'De A', color: '#2563eb' },
        'token-a',
      ),
      { params: Promise.resolve({ id: UUID }) },
    );
    const deB = await LISTAR_MATERIA(
      peticion('GET', 'https://api.local/api/materia', undefined, 'token-b'),
    );
    expect((await deB.json())['items']).toEqual([]);
    const deA = await LISTAR_MATERIA(
      peticion('GET', 'https://api.local/api/materia', undefined, 'token-a'),
    );
    const items = (await deA.json())['items'] as { nombre: string }[];
    expect(items).toHaveLength(1);
    expect(items[0]?.['nombre']).toBe('De A');
  });

  it('sin token, la lista responde 401', async () => {
    const respuesta = await LISTAR_MATERIA(
      peticion('GET', 'https://api.local/api/materia', undefined, ''),
    );
    expect(respuesta.status).toBe(401);
  });
});

describe('GET/PUT /api/ajustes/horario', () => {
  it('devuelve valores por defecto y luego guarda con marcas del servidor', async () => {
    const inicial = await LEER_AJUSTES(
      peticion('GET', 'https://api.local/api/ajustes/horario'),
    );
    expect(inicial.status).toBe(200);
    expect((await inicial.json())['minutos_aviso']).toBe(15);
    const puesta = await PONER_AJUSTES(
      peticion('PUT', 'https://api.local/api/ajustes/horario', {
        campus_lat: 4.71,
        campus_lng: -74.07,
        minutos_aviso: 20,
      }),
    );
    expect(puesta.status).toBe(200);
    const leida = await LEER_AJUSTES(
      peticion('GET', 'https://api.local/api/ajustes/horario'),
    );
    expect((await leida.json())['minutos_aviso']).toBe(20);
  });

  it('400 con minutos_aviso fuera de rango', async () => {
    const respuesta = await PONER_AJUSTES(
      peticion('PUT', 'https://api.local/api/ajustes/horario', {
        campus_lat: 4.71,
        campus_lng: -74.07,
        minutos_aviso: 500,
      }),
    );
    expect(respuesta.status).toBe(400);
  });
});

describe('GET /api/admin/usuarios (rol admin)', () => {
  it('403 sin el claim rol = "admin"', async () => {
    const respuesta = await LISTAR_ADMIN(
      peticion('GET', 'https://api.local/api/admin/usuarios', undefined, 'token-a'),
    );
    expect(respuesta.status).toBe(403);
  });

  it('200 con el claim rol = "admin"', async () => {
    const respuesta = await LISTAR_ADMIN(
      peticion('GET', 'https://api.local/api/admin/usuarios', undefined, 'token-admin'),
    );
    expect(respuesta.status).toBe(200);
  });
});
