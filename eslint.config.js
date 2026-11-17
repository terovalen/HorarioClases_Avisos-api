/** Configuración de ESLint del proyecto (flat config). */
// @ts-check
const { defineConfig } = require('eslint/config');
const nextConfig = require('eslint-config-next');

module.exports = defineConfig([
  nextConfig,
  {
    files: ['**/*.ts'],
    rules: {
      'no-console': 'error',
      eqeqeq: ['error', 'always'],
      complexity: ['error', 10],
      'max-depth': ['error', 3],
      'max-lines-per-function': [
        'error',
        { max: 50, skipBlankLines: true, skipComments: true },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': 'error',
    },
  },
  {
    // En pruebas, cada `describe` agrupa muchos `it` con datos repetidos:
    // se desactiva solo el límite de líneas, el resto de reglas sigue.
    files: ['__tests__/**/*.ts'],
    rules: {
      'max-lines-per-function': 'off',
    },
  },
  {
    ignores: ['node_modules/**', '.next/**', 'out/**', 'coverage/**', '.husky/**'],
  },
]);
