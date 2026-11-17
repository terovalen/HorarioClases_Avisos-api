/** Tokens falsos para `verifyIdToken`; las pruebas pueden mutarlos. */
export type TokenFalso = { uid: string; email: string | null; rol?: string };

export const tokensFalsos: Record<string, TokenFalso> = {
  'token-a': { uid: 'usuario-a', email: 'a@prueba.co' },
  'token-b': { uid: 'usuario-b', email: 'b@prueba.co' },
  'token-admin': { uid: 'admin-1', email: 'admin@prueba.co', rol: 'admin' },
};
