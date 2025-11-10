module.exports = {
  root: true,
  env: {
    node: true,
    es2021: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:vue/vue3-recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: '@typescript-eslint/parser',
    extraFileExtensions: ['.vue'],
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  rules: {
    // keep rules permissive for now; tighten incrementally
    'no-console': 'off',
    // prefer TypeScript-aware rule
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]
    ,
    // disable this rule to avoid version-mismatch issues with the installed ESLint/runtime
    '@typescript-eslint/no-unused-expressions': 'off'
    ,
    // allow single-word component names in this repo for now
    'vue/multi-word-component-names': 'off'
  }
  ,
  overrides: [
    {
      files: ['**/*.vue'],
      rules: {
        // the codebase has many intentional `any` casts inside SFCs; allow them for now
        '@typescript-eslint/no-explicit-any': 'off'
      }
    }
  ]
};

