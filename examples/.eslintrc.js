module.exports = {
    'extends': [
        'eslint-config-airbnb-base',
        'eslint-config-airbnb-base/rules/strict',
    ],
    parserOptions: {
        ecmaVersion: 5,
        sourceType: 'script',
        ecmaFeatures: {
            impliedStrict: true
        }
    },
    env: {
        browser: true,
        es6: false,
        amd: true,
        commonjs: true
    },
    rules: {
        'no-plusplus': 'off',
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
                body: 1
            },
            FunctionExpression: {
                parameters: 1,
                body: 1
            }
        }],
        'one-var': ['error', 'never'],
        'valid-jsdoc': ['error', {
            requireReturn: false,
            requireParamDescription: false,
            requireReturnDescription: false,
        }],

        // deactivated rules for es5
        'no-var': 'off',
        'prefer-arrow-callback': 'off',
        'object-shorthand': 'off',
        'no-param-reassign': ['error', { 'props': false }],
        'no-mixed-operators': ['error', { allowSamePrecedence: true }],
        'prefer-template': 'off',
        'prefer-rest-params': 'off',

        // deactivated rules for `examples/`
        'no-console': 'off',

        // TODO reactivate all the following rules
        'no-underscore-dangle': 'off',

    }
}
