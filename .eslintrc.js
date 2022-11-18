module.exports = {
  env: {
    node: true,
    es2021: true,
  },
  globals: {
    emit: "readonly",
  },
  extends: "eslint:recommended",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  rules: {
    "no-unused-vars": ["error", { varsIgnorePattern: "consume" }],
  },
};
