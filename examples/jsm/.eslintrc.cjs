module.exports = {
    extends: [
        'eslint-config-airbnb-base',
        'eslint-config-airbnb-base/rules/strict',
        '../.eslintrc.cjs',
    ],
    parserOptions: {
        ecmaVersion: 13,
        sourceType: 'module',
        ecmaFeatures: {
            impliedStrict: true,
        },
    },
    env: {
        browser: true,
        es6: true,
        amd: true,
        commonjs: true,
    },
    globals: {
        itowns: true,
    },
    rules: {
        'prefer-arrow-callback': 'off',
        'object-shorthand': 'off',
        'no-param-reassign': ['error', { props: false }],
        'no-mixed-operators': ['error', { allowSamePrecedence: true }],
        'prefer-template': 'off',
        'prefer-rest-params': 'off',
        'arrow-parens': ['error', 'as-needed', { requireForBlockBody: true }],

        // deactivated rules for `examples/`
        'no-console': 'off',
        // TODO reactivate all the following rules
        'no-underscore-dangle': 'off',

    },
};
