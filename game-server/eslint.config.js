const tseslint = require("typescript-eslint");
const prettierConfig = require("eslint-config-prettier");

module.exports = tseslint.config(
    {
        ignores: ["dist", "node_modules", "eslint.config.js"],
    },
    ...tseslint.configs.recommendedTypeChecked,
    {
        languageOptions: {
            parserOptions: {
                project: true,
                tsconfigRootDir: __dirname,
            },
        },
    },
    {
        rules: {
            "@typescript-eslint/no-misused-promises": "off",
            "@typescript-eslint/no-unused-vars": "off",
            "@typescript-eslint/restrict-template-expressions": "off",
            "@typescript-eslint/no-floating-promises": "off",
        },
    },
    prettierConfig,
);
