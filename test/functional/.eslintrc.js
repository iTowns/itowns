module.exports = {
    extends: [
        'eslint-config-airbnb-base',
        'eslint-config-airbnb-base/rules/strict',
    ],
    parserOptions: {
        ecmaVersion: 2017,
        sourceType: 'script',
        ecmaFeatures: {
            impliedStrict: true,
        },
    },
    env: {
        browser: true,
        es6: false,
        amd: true,
        commonjs: true,
        mocha: true,
    },
    rules: {
        'no-plusplus': 'off',
        'no-undef': 'off',
        // this option sets a specific tab width for your code
        // http://eslint.org/docs/rules/indent
        indent: ['error', 4, {
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
        'one-var': ['error', 'never'],
        'valid-jsdoc': ['error', {
            requireReturn: false,
            requireParamDescription: false,
            requireReturnDescription: false,
        }],

        // deactivated rules for `examples/`
        'no-console': 'off',

        // TODO reactivate all the following rules
        'no-underscore-dangle': 'off',

        // turned off to use the this object in describe
        'prefer-arrow-callback': 'off',

        'prefer-destructuring': 'off',
        'max-len': 'off',
        'arrow-parens': ['error', 'as-needed', { requireForBlockBody: true }],
        'prefer-object-spread': 'off',
    },
};
