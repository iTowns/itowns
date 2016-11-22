module.exports = {
 'extends': [
   'eslint-config-airbnb-base',
   'eslint-config-airbnb-base/rules/strict',
 ],
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
    ecmaFeatures: {
      impliedStrict: true
    }
  },
 settings: {
     'import/resolver': {
         'webpack': {}
     }
 },
  env: {
    browser: true,
    es6: true,
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

    // TODO reactivate all the following rules

    'func-names': 'off',
    'no-mixed-operators': 'off',
    'no-use-before-define': 'off',
    'no-underscore-dangle': 'off',
    'eqeqeq': 'off',
    // what len ? Airbnb does 100. github wraps line above 80
    'max-len': 'off',
    'no-param-reassign': 'off',
    'no-else-return': 'off',
    // the following should be reactivated with 'one-var': 'never'
    'one-var': 'off',
    'no-var': 'off',
    'vars-on-top': 'off',
    'no-shadow': 'off',
    'no-unneeded-ternary': 'off',
    'no-restricted-properties': 'off',
    'prefer-spread': 'off',
    'default-case': 'off',
    'camelcase': 'off',
    'block-scoped-var': 'off',
    'no-bitwise': 'off',
    'no-restricted-syntax': 'off',
    'guard-for-in': 'off',
    'no-tabs': 'off',
    'consistent-return': 'off',
    'brace-style': 'off',
    'new-cap': 'off',
    'no-cond-assign': 'off',
    'no-unused-expressions': 'off',
    'no-continue': 'off',
    'no-lonely-if': 'off',
    'no-prototype-builtins': 'off',
    'no-throw-literal': 'off',
    'operator-assignment': 'off',
    'no-return-assign': 'off',
    'no-useless-concat': 'off',
    'no-loop-func': 'off',
	'linebreak-style': 'off',

    /* import problems */
    'import/no-mutable-exports': 'off',
    'import/prefer-default-export': 'off',
    'import/no-named-as-default-member': 'off',
    'import/no-named-as-default': 'off',
    'import/newline-after-import': 'off',
    // the following 3 rules are actually real problems in the code but in
    // module that are never used. Eg in Octree.js, we should import
    // 'Scene/SpatialHash' and not 'SpatialHash'.
    'import/no-extraneous-dependencies': 'off',
    'import/no-unresolved': 'off',
    'import/extensions': 'off',


  }
}
