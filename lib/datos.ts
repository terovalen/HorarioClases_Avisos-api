/** Adaptador de Firestore: datos privados en usuarios/{uid}/<recurso>/{id}.
 *  Campos base puestos por el servidor; borrado lógico con deleted_at;
 *  paginación de máx. 500 por llamada con cursor en updated_at. */
import { firebase } from './firebase';
import type { DocumentData, Query } from 'firebase-admin/firestore';

export type Recurso = 'materia' | 'bloque' | 'ajustes';
export type Documento = Record<string, unknown> & {
  id: string;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
};

const LIMITE = 500;

function ruta(uid: string, recurso: Recurso): string {
  return `usuarios/${uid}/${recurso}`;
}

function coleccion(uid: string, recurso: Recurso) {
  return firebase().db.collection(ruta(uid, recurso));
}

/** Cambios desde `since` (ISO), incluidas las lápidas; máx. 500 por llamada. */
export async function listarCambios(
  uid: string,
  recurso: Recurso,
  desde: string | null,
): Promise<Documento[]> {
  let consulta: Query = coleccion(uid, recurso).orderBy('updated_at').limit(LIMITE);
  if (desde) consulta = consulta.startAfter(desde);
  const instantanea = await consulta.get();
  return instantanea.docs.map(
    (d) => ({ id: d.id, ...(d.data() as DocumentData) }) as Documento,
  );
}

export async function obtenerDocumento(
  uid: string,
  recurso: Recurso,
  id: string,
): Promise<Documento | null> {
  const instantanea = await coleccion(uid, recurso).doc(id).get();
  if (!instantanea.exists) return null;
  return { id: instantanea.id, ...(instantanea.data() as DocumentData) } as Documento;
}

/** Crea o reemplaza (idempotente). created_at se conserva si ya existía;
 *  updated_at y deleted_at los pone SIEMPRE el servidor. */
export async function colocarDocumento(
  uid: string,
  recurso: Recurso,
  id: string,
  campos: Record<string, unknown>,
): Promise<{ created_at: string; updated_at: string }> {
  const ahora = new Date().toISOString();
  const referencia = coleccion(uid, recurso).doc(id);
  const existente = await referencia.get();
  const previa = (existente.get('created_at') as string | undefined) ?? null;
  const created_at = previa ?? ahora;
  await referencia.set({ ...campos, created_at, updated_at: ahora, deleted_at: null });
  return { created_at, updated_at: ahora };
}

/** Borrado lógico. Devuelve false si no existía o ya estaba borrada (404). */
export async function borrarSuavemente(
  uid: string,
  recurso: Recurso,
  id: string,
): Promise<boolean> {
  const referencia = coleccion(uid, recurso).doc(id);
  const existente = await referencia.get();
  if (!existente.exists || existente.get('deleted_at') !== null) return false;
  const ahora = new Date().toISOString();
  await referencia.set({ deleted_at: ahora, updated_at: ahora }, { merge: true });
  return true;
}

/** ¿Ya existe otra materia con ese nombre (no borrada)? Regla de unicidad. */
export async function existeNombreMateria(
  uid: string,
  nombre: string,
  exceptoId: string,
): Promise<boolean> {
  const repetidas = await coleccion(uid, 'materia').where('nombre', '==', nombre).get();
  return repetidas.docs.some(
    (d) => d.id !== exceptoId && (d.get('deleted_at') ?? null) === null,
  );
}

/** Bloques del día (no borrados) para comprobar cruces en el servidor. */
export async function listarBloquesDelDia(
  uid: string,
  dia: number,
): Promise<Documento[]> {
  const instantanea = await coleccion(uid, 'bloque').where('dia', '==', dia).get();
  return instantanea.docs
    .map((d) => ({ id: d.id, ...(d.data() as DocumentData) }) as Documento)
    .filter((d) => (d['deleted_at'] ?? null) === null);
}
