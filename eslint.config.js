// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    // Los *.generated.ts los escribe tools/, no se editan a mano y
    // son archivos enormes de datos (los .glb de los maniquies).
    ignores: ["dist/*", "**/*.generated.ts"],
  }
]);
