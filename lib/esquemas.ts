/** Esquemas Zod: se validan y se guardan SOLO los campos declarados
 *  (Zod descarta los no declarados). Nombres snake_case como en SQLite. */
import { z } from 'zod';
import type { Detalle } from './errores';

const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const credencialEsquema = z.object({
  email: z.email().max(320),
  password: z.string().min(8, 'La contraseña debe tener 8 caracteres o más').max(128),
});

export const refreshTokenEsquema = z.object({
  refreshToken: z.string().min(20).max(2048),
});

export const materiaEsquema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(80),
  docente: z
    .string()
    .trim()
    .max(80)
    .nullish()
    .transform((v) => v ?? null),
  salon: z
    .string()
    .trim()
    .max(40)
    .nullish()
    .transform((v) => v ?? null),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'El color debe ser #RRGGBB'),
});

export const bloqueEsquema = z
  .object({
    materia_id: z.string().regex(UUID_RE, 'El id de materia debe ser un UUID'),
    dia: z.number().int().min(1, 'El día va de 1 (lunes) a 7 (domingo)').max(7),
    hora_inicio: z.string().regex(HORA_RE, 'La hora debe ser HH:MM de 24 h'),
    hora_fin: z.string().regex(HORA_RE, 'La hora debe ser HH:MM de 24 h'),
  })
  // "HH:MM" de 24 h se compara bien como texto: 09:00 > 08:59.
  .refine((b) => b.hora_fin > b.hora_inicio, {
    message: 'La hora de fin debe ser posterior a la de inicio',
    path: ['hora_fin'],
  });

export const ajustesEsquema = z.object({
  campus_lat: z.number().min(-90).max(90).nullable(),
  campus_lng: z.number().min(-180).max(180).nullable(),
  minutos_aviso: z.number().int().min(0).max(120),
});

/** Convierte los issues de Zod al formato { campo, mensaje }. */
export function detallesDeZod(error: z.ZodError): Detalle[] {
  return error.issues.map((issue) => ({
    campo: issue.path.map(String).join('.') || 'cuerpo',
    mensaje: issue.message,
  }));
}

export function esUuid(valor: string): boolean {
  return UUID_RE.test(valor);
}
