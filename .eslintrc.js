module.exports = {
  extends: "eslint:recommended",
  parserOptions: {
    ecmaVersion: 6,
    sourceType: "module",
    ecmaFeatures: {
      impliedStrict: true
    }
  },
  env: {
    browser: true,
    amd: true,
    commonjs: true
  },
  rules: {
    // Stylistic rules
    "eol-last": "error",
    "no-trailing-spaces": "error",
    // FIXME: temporarily turn those rules down to warnings
    "no-cond-assign": 1,
    "no-console": 1,
    "no-redeclare": 1,
    "no-undef": 1,
    "no-unused-vars": 1
  }
}
