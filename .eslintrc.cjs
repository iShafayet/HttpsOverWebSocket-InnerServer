// eslint-disable-next-line no-undef
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "jest"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  rules: {
    "prefer-const": "off",
    "no-prototype-builtins": "off",
    "no-async-promise-executor": "off",
    "@typescript-eslint/no-non-null-assertion": "off",
  },
  globals: {
    dispatch: true,
    logger: true,
  },
  env: {
    node: true,
    "jest/globals": true,
  },
  ignorePatterns: ["dist/"],
};
