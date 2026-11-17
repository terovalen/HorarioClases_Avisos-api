/** Formato de error y lectura del cuerpo: 415, 400 y 500 sin detalles. */
import { describe, expect, it } from 'vitest';
import { ErrorApi, leerJson, responderError, respuestaJson } from '../lib/errores';
import type { Detalle } from '../lib/errores';

describe('responderError', () => {
  it('ErrorApi sin detalles: solo { error }', async () => {
    const respuesta = responderError(new ErrorApi(404, 'La materia no existe'));
    expect(respuesta.status).toBe(404);
    expect(await respuesta.json()).toEqual({ error: 'La materia no existe' });
  });

  it('ErrorApi con detalles: los incluye en el cuerpo', async () => {
    const detalles: Detalle[] = [{ campo: 'hora_fin', mensaje: 'posterior' }];
    const respuesta = responderError(new ErrorApi(400, 'Datos inválidos', detalles));
    expect(await respuesta.json()).toEqual({
      error: 'Datos inválidos',
      detalles,
    });
  });

  it('error genérico: 500 { error: "Error interno" } sin detalles', async () => {
    const respuesta = responderError(new Error('fallo de red'));
    expect(respuesta.status).toBe(500);
    expect(await respuesta.json()).toEqual({ error: 'Error interno' });
  });

  it('valor que no es Error: 500 igualmente', async () => {
    const respuesta = responderError('cadena rara');
    expect(respuesta.status).toBe(500);
  });
});

describe('leerJson', () => {
  it('lee un cuerpo application/json válido', async () => {
    const peticion = new Request('https://api.local/x', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ a: 1 }),
    });
    expect(await leerJson(peticion)).toEqual({ a: 1 });
  });

  it('415 si el tipo de contenido no es JSON', async () => {
    const peticion = new Request('https://api.local/x', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: 'hola',
    });
    await expect(leerJson(peticion)).rejects.toMatchObject({ estado: 415 });
  });

  it('400 si el cuerpo no es JSON válido', async () => {
    const peticion = new Request('https://api.local/x', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{no-es-json',
    });
    await expect(leerJson(peticion)).rejects.toMatchObject({ estado: 400 });
  });
});

describe('respuestaJson', () => {
  it('serializa con el estado indicado', async () => {
    const respuesta = respuestaJson(201, { ok: true });
    expect(respuesta.status).toBe(201);
    expect(await respuesta.json()).toEqual({ ok: true });
  });
});
