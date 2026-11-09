import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // Node-RED function-node bodies: not modules (top-level return, msg/node/flow
  // globals, shared preludes) — they are syntax-checked by build-flow.mjs.
  globalIgnores(['dist', 'server/node-red/functions', 'server/node-red/*.json']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    files: ['vite.config.js', 'server/**/*.mjs'],
    languageOptions: { globals: globals.node },
  },
])
