/** Límite de intentos para login/registro (memoria de la instancia).
 *  En producción se complementa con el Firewall de Vercel antes de datos reales. */
export type Registro = Map<string, number[]>;

const MAXIMO = 5;
const VENTANA_MS = 15 * 60 * 1000;

/** ¿Se permite un intento nuevo para esta clave? Registra el intento. */
export function permitirIntento(
  registro: Registro,
  clave: string,
  ahora: number,
  maximo = MAXIMO,
  ventanaMs = VENTANA_MS,
): boolean {
  const vigentes = (registro.get(clave) ?? []).filter((t) => ahora - t < ventanaMs);
  if (vigentes.length >= maximo) {
    registro.set(clave, vigentes);
    return false;
  }
  vigentes.push(ahora);
  registro.set(clave, vigentes);
  return true;
}

/** Al autenticar con éxito se limpia el historial de esa clave. */
export function restablecer(registro: Registro, clave: string): void {
  registro.delete(clave);
}

export const MAXIMO_INTENTOS = MAXIMO;
