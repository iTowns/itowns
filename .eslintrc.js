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
  }
}
