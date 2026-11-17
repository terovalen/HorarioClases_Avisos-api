# 38 · Horario de clases con avisos · API

API en **Next.js (App Router, Route Handlers, runtime Node)** desplegada en
**Vercel**. Autentica con **Firebase Auth mediado** (la app nunca contiene
claves), guarda datos en **Firestore solo con Admin SDK** (las reglas del
cliente niegan todo) y soporta la **sincronización idempotente** de la app.

## Endpoints

| Método  | Ruta                   | Auth    | Descripción                                                    |
| ------- | ---------------------- | ------- | -------------------------------------------------------------- |
| GET     | `/api/health`          | pública | Comprobación desde la app; devuelve `servidor_ahora`.          |
| POST    | `/api/auth/registro`   | pública | Registro con Firebase Auth (201). Rate limit 429.              |
| POST    | `/api/auth/login`      | pública | Inicio de sesión. Mismo mensaje si falla el correo o la clave. |
| POST    | `/api/auth/refresh`    | pública | Renueva el ID token con el refresh token.                      |
| GET     | `/api/auth/yo`         | Bearer  | Quién es el usuario según el token verificado (401 sin token). |
| GET     | `/api/materia?since=`  | Bearer  | Cambios desde `since` (ISO UTC), máx. 500 por llamada.         |
| PUT     | `/api/materia/:id`     | Bearer  | Crea o reemplaza (idempotente). 409 si repite nombre.          |
| DELETE  | `/api/materia/:id`     | Bearer  | Borrado lógico (lápida `deleted_at`). 404 si ya no está.       |
| GET     | `/api/bloque?since=`   | Bearer  | Cambios de bloques desde `since`.                              |
| PUT     | `/api/bloque/:id`      | Bearer  | Crea o reemplaza; **409 si se cruza** con otro del mismo día.  |
| DELETE  | `/api/bloque/:id`      | Bearer  | Borrado lógico.                                                |
| GET/PUT | `/api/ajustes/horario` | Bearer  | Documento único de ajustes (campus, `minutos_aviso`).          |
| GET     | `/api/admin/usuarios`  | Bearer  | Solo con el claim `rol = "admin"`; **403** sin él.             |

Errores siempre `{ "error": "mensaje", "detalles"?: [{ "campo", "mensaje" }] }`
con códigos 400/401/403/404/409/413/415/429/500. Campos en `snake_case`,
fechas ISO 8601 UTC, UUID generado por el cliente.

## Puesta en marcha

```bash
npm install
cp env.example .env.local   # SOLO desarrollo: valores falsos de ejemplo
npm run dev                 # http://localhost:3000/api/health
npm run check               # typecheck + lint + formato + pruebas con cobertura
```

**Producción**: las variables viven SOLO en Vercel (Project → Settings →
Environment Variables): `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`,
`FIREBASE_PRIVATE_KEY` (pegada con `\n` literales), `FIREBASE_WEB_API_KEY`.
`vercel env pull` está prohibido por la política del repo.

## Reglas de Firestore (seguridad de datos)

`firestore.rules` niega todo acceso directo desde clientes:

```
match /{document=**} { allow read, write: if false; }
```

El aislamiento por usuario lo da la **ruta** `usuarios/{uid}/<recurso>/{id}`
y el `uid` sale **siempre** del ID token verificado con el Admin SDK
(`lib/sesion.ts`), nunca del cuerpo ni de la URL.

## Estructura

```text
app/api/**/route.ts   10 manejadores: solo leen la petición y llaman a lib/
lib/firebase.ts       Admin SDK (credenciales SOLO por entorno)
lib/sesion.ts         verifyIdToken + rol admin (403)
lib/esquemas.ts       Zod: valida y descarta campos no declarados
lib/datos.ts          adaptador Firestore: lápidas, marcas, paginación 500
lib/logica/           reglas puras (cruces) con pruebas
lib/auth-rest.ts      Identity Toolkit REST (signUp / signIn / securetoken)
lib/rate-limit.ts     límite de intentos de login/registro
__tests__/            Vitest: rutas, cruces, rate-limit, auth-rest
```

## Pruebas y cobertura

`npm run test` (Vitest + v8) exige **≥ 80 % en `lib/`**, excluyendo los
adaptadores de infraestructura `lib/firebase.ts` y `lib/datos.ts`
(justificación: exigen credenciales reales o el emulador de Firebase; su
comportamiento se verifica en despliegue y a través de las rutas).

Incluye las pruebas obligatorias del documento: 401 sin token, mismo mensaje
de error con correo existente o no, 409 de cruces con bordes, aislamiento
entre usuarios, 403 de admin y 429 de rate limit.

## Lista de verificación de seguridad (sección 14 del documento)

- [x] Ningún `firebaseConfig` ni clave en el código ni en Git (`env.example` con valores falsos).
- [x] Secretos solo en Vercel; `vercel env pull` prohibido (AGENTS.md + permisos).
- [x] Reglas de Firestore `deny all` para clientes.
- [x] `uid` solo del token verificado; sin ids de usuario en URLs.
- [x] Validación Zod en todos los cuerpos; Zod descarta campos no declarados.
- [x] Mensaje único «Correo o contraseña incorrectos» (no se revela si existe).
- [x] Rate limit de intentos + Firewall de Vercel recomendado en producción.
- [x] Errores internos → 500 sin detalles; sin logs de datos personales.
- [x] HTTPS en todo; sin `console.log`; `.gitignore` excluye `.env*` y claves.
- [x] Gitleaks en CI (reto de excelencia #1).

## Dependencias y por qué

- `next` — framework requerido por el curso (Route Handlers en Vercel).
- `firebase-admin` — única vía a Authentication y Firestore (reglas niegan todo).
- `zod` — validación y descarte de campos no declarados.
- `react` / `react-dom` — par de Next (no se usan pantallas: la API no tiene UI).
- Dev: `typescript`, `eslint-config-next`, `prettier`, `vitest`,
  `@vitest/coverage-v8`, `husky`, `lint-staged` — calidad y pruebas.
  Ninguna dependencia fue inventada por la IA: cada paquete existe en
  npmjs.com con mantenimiento activo.

## IA

Configuración propia versionada desde el **primer commit**: `AGENTS.md`,
`CLAUDE.md`, `.claude/settings.json`, `opencode.json`, `env.example`,
scripts de calidad, `firestore.rules` y carpeta `ia/` (ver `IA.md`).
