# Bitácora de IA

Formato por entrada: **propósito · evidencia · validación · decisión**.
Regla: si el código generado con IA se usa, primero se entiende línea por línea;
si no se entiende, no se entrega.

## Entrada 1 · 2026-11-16 · Diseño inicial del proyecto

- **Propósito:** configurar la IA (restricciones, sandbox, reglas de calidad) y
  generar el esqueleto del proyecto 38 (app y API) según `38-horario-de-clases.md`.
- **Evidencia:** primer commit (config de IA + calidad), commits posteriores de
  código y pruebas en este repositorio y en `38-horario-de-clases-api`.
- **Validación:** `npm run check` en verde; pruebas de contención de
  `ia/PRUEBAS-CONTENCION.md` (se completan al ejecutarlas en vivo).
- **Decisión:** aceptar la configuración y el esqueleto tras revisión manual
  del diff completo por ambos integrantes.

## Entrada 2 · 2026-11-17 · 500 de Firebase en Vercel (ERR_REQUIRE_ESM)

- **Propósito:** corregir el `500` de todas las rutas que usan Firebase
  (`/api/materia`, `/api/bloque`, `/api/auth/yo`) mientras `/api/health` y
  `/api/auth/login` respondían bien.
- **Evidencia:** `/api/health` devolvió `firebase: "no-carga"` con el mensaje
  `Failed to load external module firebase-admin-…/auth: Error
[ERR_REQUIRE_ESM]`. El build local empaqueta `firebase-admin` como paquete
  externo en `.next/node_modules/firebase-admin-<hash>/`, cuyo `package.json`
  conserva el mapa `exports` con las condiciones `require` (CJS) e `import`
  (ESM). Vercel corre Node v26.13.1, donde `require()` de un módulo ESM ya no
  está permitido.
- **Validación:** reproducción local exacta con Node 24 y
  `NODE_OPTIONS=--no-experimental-require-module` (mismo hash y mismo error que
  Vercel). Con el puente CommonJS el error avanza a la siguiente fronteira:
  `jwks-rsa` (CJS) exige `jose` v6, que es ESM-only; por eso no basta con
  forzar CJS y hay que hacer compatible toda la cadena. Con `firebase-admin`
  13.10.0 la cadena queda 100 % CJS (`google-auth-library` 10 → `jwks-rsa` 3 →
  `jose` 4 con condición `require`) y el flujo completo funciona **incluso sin
  `require(esm)`**: registro → `PUT /api/materia` → `PUT /api/bloque`
  (`07:15`/`08:45`) → `GET /api/bloque` → `GET /api/auth/yo` → 200.
  `npm run check` en verde (cobertura 100 % de sentencias).
- **Decisión:** (1) `lib/firebase-admin.cjs` como puerta única al Admin SDK para
  que Turbopack resuelva siempre la variante CJS; (2) `firebase-admin` fijado en
  `^13.10.0`, cuya cadena de dependencias es CJS y no depende de `require(esm)`
  (así funciona en Node 22, 24 y 26); (3) `engines.node = "24.x"` en
  `package.json` para que Vercel use una versión estable y CI actualizado a
  `node-version: 24`.

## Casos en que se rechazó o corrigió lo propuesto por la IA (mínimo 3)

1. **Tokens de sesión.** La IA propuso guardar `token` y `refreshToken` en
   `AsyncStorage` por comodidad. Se rechazó: la lista de verificación de
   seguridad exige `expo-secure-store` (cifrado del sistema), y `AsyncStorage`
   no está cifrado. → `src/api/tokens.ts` usa `expo-secure-store`.
2. **Identificadores únicos.** La IA propuso `Math.random()` para generar los
   UUID de materias y bloques. Se corrigió: `randomUUID` de `expo-crypto`
   (criptográficamente aleatorio; el mismo UUID viaja a SQLite y Firestore para
   que reintentar no duplique).
3. **Lint en Next 16.** La IA propuso `next lint` para la API. Se corrigió:
   desde Next 16 el comando no existe; se usa `eslint .` con
   `eslint-config-next`.
4. **Pantalla de login.** El modelo inicial de pantallas del documento no
   incluía dónde inicia sesión el usuario. Se agregó `app/login.tsx` con
   validación y estados de carga/error, sin alterar los requisitos del
   documento.
5. **Versión de Node en producción.** La IA propuso resolver el `ERR_REQUIRE_ESM`
   solo con `serverExternalPackages` y con un puente CommonJS. Se corrigió: el
   error no venía solo de `firebase-admin`, sino de toda su cadena
   (`jwks-rsa` → `jose` v6, ESM-only). La solución definitiva es una cadena de
   dependencias 100 % CJS (`firebase-admin` 13) más el puente; con eso la API
   funciona en Node 22, 24 y 26 sin depender de `require(esm)`.

> Los integrantes deben agregar aquí sus propios casos con fecha y evidencia
> (captura o enlace al diff) a medida que trabajan.

## Uso por sesión (plantilla)

| Fecha | Tarea | Propósito | Evidencia | Validación | Decisión |
| ----- | ----- | --------- | --------- | ---------- | -------- |
|       |       |           |           |            |          |
