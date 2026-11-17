/** Reglas de cruces de bloques en el servidor (igual que en la app, RF-03). */

export type BloqueValidable = {
  id?: string;
  dia: number;
  hora_inicio: string;
  hora_fin: string;
};

function minutos(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Tocarse en el borde (07:00–09:00 y 09:00–10:00) NO es cruce. */
export function seCruzan(a: BloqueValidable, b: BloqueValidable): boolean {
  if (a.dia !== b.dia) return false;
  return (
    minutos(a.hora_inicio) < minutos(b.hora_fin) &&
    minutos(b.hora_inicio) < minutos(a.hora_fin)
  );
}

export function encontrarCruces(
  candidato: BloqueValidable,
  existentes: BloqueValidable[],
): BloqueValidable[] {
  return existentes.filter(
    (otro) => otro.id !== candidato.id && seCruzan(candidato, otro),
  );
}
