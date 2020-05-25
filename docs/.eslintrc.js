module.exports = {
    extends: [
        'eslint-config-airbnb-base',
        'eslint-config-airbnb-base/rules/strict',
        '../.eslintrc.js',
    ],
    env: {
        node: true,
    },
    rules: {
        'import/no-unresolved': 'off',
        'guard-for-in': 'off',
    },
};

