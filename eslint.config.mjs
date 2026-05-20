import { defineConfig, globalIgnores } from 'eslint/config';
import eslint from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import { importX } from 'eslint-plugin-import-x';
import jsdocPlugin from 'eslint-plugin-jsdoc';
import globals from 'globals';
import * as tseslint from 'typescript-eslint';

const ignores = [
    '**/node_modules/',
    '**/lib/',
    '**/dist/',
    '**/coverage/',
    'docs/out/',
    'docs/static/',
    'docs/tutorials/',
    'docs/tmpl/',
    '**/test/data/**',
    '**/examples/libs/**',
    '**/examples/layers/**',
];

const sourceConfig = {
    name: 'itowns/source',
    files: ['packages/**/src/**/*.{js,ts}'],
    languageOptions: {
        ecmaVersion: 'latest',
        globals: {
            ...globals.browser,
            __DEBUG__: 'readonly',
        },
    },
};

const unitTestConfig = {
    name: 'itowns/test/unit',
    files: ['packages/**/test/**/*.js'],
    languageOptions: {
        globals: {
            ...globals.node,
            ...globals.mocha,
            ...globals.browser,
        },
    },
    rules: {
        '@typescript-eslint/no-unused-expressions': 'off',
    },
};

const functionalTestConfig = {
    name: 'itowns/test/functional',
    files: ['test/**/*.js'],
    languageOptions: {
        globals: {
            ...globals.node,
            ...globals.mocha,
        },
    },
    rules: {
        // We have a lot of variables which are defined in the global scope
        // or within a browser context (e.g. in Page#evaluate). We may be able
        // to remove this rule once we have reworked our functional tests to
        // use proper imports.
        'no-undef': 'off',
    },
};

const examplesConfig = {
    name: 'itowns/examples',
    files: ['examples/**/*.js'],
    languageOptions: {
        globals: {
            ...globals.browser,
        },
    },
};

const scriptsConfig = {
    name: 'itowns/scripts',
    files: ['**/*.mjs'],
    languageOptions: {
        globals: globals.node,
    },
    rules: {
        'no-console': 'off',
    },
};

const docsConfig = {
    name: 'itowns/docs',
    files: ['docs/**/*.{js,cjs}'],
    languageOptions: {
        globals: {
            ...globals.node,
            ...globals.commonjs,
        },
    },
    rules: {
        // Those rules will be enabled once we migrate to TypeDoc.
        '@typescript-eslint/no-require-imports': 'off',
        'import-x/extensions': 'off',
        'no-var': 'off',
    },
};

const styleConfigs = [
    stylistic.configs.customize({
        braceStyle: '1tbs',
        indent: [4, {
            SwitchCase: 1,
            VariableDeclarator: 1,
            outerIIFEBody: 1,
            // MemberExpression: null,
            // CallExpression: {
            // parameters: null,
            // },
            FunctionDeclaration: {
                parameters: 1,
                body: 1,
            },
            FunctionExpression: {
                parameters: 1,
                body: 1,
            },
        }],
        quoteProps: 'as-needed',
        semi: true,
        severity: 'warn',
    }),
    {
        name: 'itowns/codestyle',
        files: ['**/*.{js,cjs,mjs,ts}'],
        rules: {
            // Those rules are disabled since some our files do not respect
            // the coding style. We may want to enforce some of them later on.
            '@stylistic/lines-between-class-members': 'off',
            '@stylistic/max-statements-per-line': ['off', { max: 1 }],
            '@stylistic/multiline-ternary': 'off',
            // This rule enforces the use of parentheses around the condition of
            // an if statement but not on other expressions.
            '@stylistic/no-extra-parens': ['off', 'all', {
                conditionalAssign: true,
                nestedBinaryExpressions: false,
                returnAssign: false,
                enforceForArrowConditionals: false,
            }],
            // Those rules are disabled since some our files do not respect
            // the coding style. We may want to enforce some of them later on.
            '@stylistic/no-multiple-empty-lines': 'off',
            '@stylistic/no-multi-spaces': 'off',
            '@stylistic/operator-linebreak': 'off',
            // Enforce single quotes unless we need to escape a character.
            '@stylistic/quotes': ['warn', 'single', { avoidEscape: true }],
        },
    },
];

const jsdocConfigs = [
    ...jsdocPlugin.configs['flat/recommended-mixed'],
    {
        name: 'itowns/jsdoc',
        files: ['**/*.{js,cjs,mjs,ts}'],
        settings: {
            jsdoc: {
                tagNamePreference: {
                    // We use the `extends` keyword in the codebase to express
                    // class inheritance.
                    augments: 'extends',
                },
            },
        },
        rules: {
            // Do not enforce the use of the @default tag
            'jsdoc/no-defaults': 'off',
            // Those rules are disabled since our js files are not typed yet.
            // Those are not relevant for the typescript files anyway.
            'jsdoc/reject-any-type': 'off',
            'jsdoc/reject-function-type': 'off',
            // Do not require jsdoc for all functions. We may want to restrict
            // it later to our public API.
            'jsdoc/require-jsdoc': 'off',
            // Do not enforce mandatory description for parameters, properties
            // and returns.
            'jsdoc/require-param-description': 'off',
            'jsdoc/require-property-description': 'off',
            'jsdoc/require-returns-description': 'off',
            // Some functions in the codebase have a non-return code path,
            // which is in total contradiction with the documentation.
            'jsdoc/require-returns-check': 'off',
            // Do not enforce mandatory line spacing between tags
            'jsdoc/tag-lines': 'off',
        },
    },
];

const importConfigs = [
    importX.flatConfigs.recommended,
    importX.flatConfigs.typescript,
    {
        name: 'itowns/import',
        files: ['**/*.{js,ts}'],
        settings: {
            'import-x/resolver-next': [
                createTypeScriptImportResolver({
                    alwaysTryTypes: true,
                    project: [
                        'packages/*/tsconfig.json',
                        'examples/demo/tsconfig.json',
                    ],
                }),
                // itowns and @itowns/geographic imports resolver
                createTypeScriptImportResolver({
                    alwaysTryTypes: true,
                    project: 'tsconfig.eslint.json',
                }),
            ],
        },
    },
];

export default defineConfig([
    globalIgnores(ignores, 'itowns/ignores'),
    // ESLint presets, see https://eslint.org/docs/latest/rules/
    eslint.configs.recommended,
    // TypeScript ESLint presets, see https://typescript-eslint.io/rules/
    tseslint.configs.strict,
    tseslint.configs.stylistic,
    // Import ESLint rules, see https://github.com/import-js/eslint-plugin-import
    importConfigs,
    // Stylistic ESLint rules, see https://eslint.style/
    styleConfigs,
    // JSOC ESLint rules, see https://github.com/gajus/eslint-plugin-jsdoc
    jsdocConfigs,
    // Overridden rules
    {
        name: 'itowns/javascript-overrides',
        files: ['**/*.{js,cjs,mjs}'],
        rules: {
            '@typescript-eslint/no-unused-vars': 'off',
            'no-unused-vars': ['error', {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_',
            }],
        },
    },
    {
        rules: {
            '@typescript-eslint/prefer-for-of': 'off',
            '@typescript-eslint/no-dynamic-delete': 'off',
            '@typescript-eslint/no-this-alias': 'off',
            '@typescript-eslint/no-empty-function': ['error', {
                allow: [
                    'arrowFunctions',
                    'functions',
                    'methods',
                ],
            }],
            'no-console': ['warn', { allow: ['warn', 'error'] }],
            'no-loop-func': ['error'],
            'no-multi-str': ['error'],
            'no-template-curly-in-string': ['error'],
        },
    },
    // File-specific rules
    sourceConfig,
    unitTestConfig,
    functionalTestConfig,
    examplesConfig,
    scriptsConfig,
    docsConfig,
]);
