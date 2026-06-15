module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  extends: [
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:astro/recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
    'plugin:prettier/recommended',
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': 'warn',
    'react/react-in-jsx-scope': 'off',
    // TypeScript already enforces prop shapes; the runtime prop-types check is redundant.
    'react/prop-types': 'off',
    // Apostrophes/quotes in copy don't need HTML entity escaping with React's text handling.
    'react/no-unescaped-entities': 'off',
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  overrides: [
    {
      files: ['*.astro'],
      parser: 'astro-eslint-parser',
      parserOptions: {
        // Resolve from this package so the monorepo-hoisted astro-eslint-parser
        // can find the TS parser regardless of where npm hoists it.
        parser: require.resolve('@typescript-eslint/parser'),
        extraFileExtensions: ['.astro'],
      },
      rules: {
        // Astro templates use HTML `class`, not React's `className`.
        'react/no-unknown-property': 'off',
      },
    },
  ],
};
