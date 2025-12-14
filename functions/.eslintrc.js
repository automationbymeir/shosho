module.exports = {
  "parserOptions": {
    "ecmaVersion": 2020,
  },
  "env": {
    "node": true,
    "es6": true,
  },
  "extends": [
    "eslint:recommended",
    "google",
  ],
  "rules": {
    "no-restricted-globals": ["error", "name", "length"],
    "prefer-arrow-callback": "error",
    "quotes": ["error", "double", {"allowTemplateLiterals": true}],
    "max-len": ["error", {"code": 120}],
  },
  "overrides": [
    {
      "files": ["**/*.spec.*"],
      "env": {
        "mocha": true,
      },
      "rules": {},
    },
  ],
  "globals": {},
};
