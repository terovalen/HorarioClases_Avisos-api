/** Firestore falso en memoria: reemplaza a `lib/datos` en las pruebas
 *  manteniendo la misma semántica (lápidas, created/updated, paginación). */

export type Doc = Record<string, unknown> & { id: string };

export const memoria = { tablas: new Map<string, Map<string, Doc>>() };

export function limpiar(): void {
  memoria.tablas.clear();
}

function tabla(uid: string, recurso: string): Map<string, Doc> {
  const clave = `${uid}/${recurso}`;
  let tablaActual = memoria.tablas.get(clave);
  if (!tablaActual) {
    tablaActual = new Map();
    memoria.tablas.set(clave, tablaActual);
  }
  return tablaActual;
}

export function listarCambios(uid: string, recurso: string, desde: string | null): Doc[] {
  const todos = [...tabla(uid, recurso).values()].sort(ordenPorUpdatedAt);
  const filtrados = desde
    ? todos.filter((d) => String(d['updated_at'] ?? '') > desde)
    : todos;
  return filtrados.slice(0, 500);
}

function ordenPorUpdatedAt(a: Doc, b: Doc): number {
  return String(a['updated_at'] ?? '').localeCompare(String(b['updated_at'] ?? ''));
}

export function obtenerDocumento(uid: string, recurso: string, id: string): Doc | null {
  return tabla(uid, recurso).get(id) ?? null;
}

export function colocarDocumento(
  uid: string,
  recurso: string,
  id: string,
  campos: Record<string, unknown>,
): { created_at: string; updated_at: string } {
  const ahora = new Date().toISOString();
  const previa = tabla(uid, recurso).get(id);
  const created_at = (previa?.['created_at'] as string | undefined) ?? ahora;
  tabla(uid, recurso).set(id, {
    ...campos,
    id,
    created_at,
    updated_at: ahora,
    deleted_at: null,
  });
  return { created_at, updated_at: ahora };
}

export function borrarSuavemente(uid: string, recurso: string, id: string): boolean {
  const documento = tabla(uid, recurso).get(id);
  if (!documento || documento['deleted_at'] !== null) return false;
  const ahora = new Date().toISOString();
  documento['deleted_at'] = ahora;
  documento['updated_at'] = ahora;
  return true;
}

export function existeNombreMateria(
  uid: string,
  nombre: string,
  exceptoId: string,
): boolean {
  return [...tabla(uid, 'materia').values()].some(
    (d) => d.id !== exceptoId && d['nombre'] === nombre && d['deleted_at'] === null,
  );
}

export function listarBloquesDelDia(uid: string, dia: number): Doc[] {
  return [...tabla(uid, 'bloque').values()].filter(
    (d) => d['dia'] === dia && d['deleted_at'] === null,
  );
}
