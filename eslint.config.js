import tsEslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import js from '@eslint/js';
import security from 'eslint-plugin-security';

export default [
  js.configs.recommended,
  security.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: ['./tsconfig.json', './tsconfig.test.json']
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        module: 'readonly',
        require: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly'
      }
    },
    plugins: {
      '@typescript-eslint': tsEslint,
      'security': security
    },
    rules: {
      // TypeScript rules
      '@typescript-eslint/no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-inferrable-types': 'warn',
      
      // General rules
      'prefer-const': 'error',
      'no-var': 'error',
      'no-console': 'off',
      'no-unused-vars': 'off' // Let TypeScript handle this
    }
  },
  {
    files: ['src/**/__tests__/**/*.ts', 'src/**/*.test.ts', 'src/**/*.spec.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: ['./tsconfig.json', './tsconfig.test.json']
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        module: 'readonly',
        require: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        // Jest globals
        jest: 'readonly',
        describe: 'readonly',
        test: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly'
      }
    },
    plugins: {
      '@typescript-eslint': tsEslint,
      'security': security
    },
    rules: {
      // TypeScript rules for tests
      '@typescript-eslint/no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'off', // More lenient for tests
      '@typescript-eslint/no-inferrable-types': 'warn',
      
      // General rules
      'prefer-const': 'error',
      'no-var': 'error',
      'no-console': 'off',
      'no-unused-vars': 'off',
      'no-undef': 'off', // Jest globals are handled by languageOptions.globals
      
      // Security rules (disabled for test files where appropriate)
      'security/detect-object-injection': 'off', // Tests may use dynamic object access
      'security/detect-non-literal-require': 'off' // Tests may dynamically require modules
    }
  },
  {
    files: ['src/interfaces/**/*.ts', 'src/types/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off'
    }
  },
  {
    ignores: ['dist/**', 'node_modules/**', '*.js', '*.mjs', '*.cjs']
  }
];
