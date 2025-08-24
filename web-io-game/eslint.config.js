const tseslint = require("typescript-eslint");
const globals = require("globals");
const prettierConfig = require("eslint-config-prettier");

module.exports = tseslint.config(
    {
        ignores: ["dist", "node_modules", "vite.config.ts", "eslint.config.js"],
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
        files: ["src/client/**/*.ts"],
        languageOptions: {
            globals: {
                ...globals.browser,
            },
        },
    },
    {
        rules: {
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-unsafe-member-access": "off",
            "@typescript-eslint/no-unsafe-assignment": "off",
            "@typescript-eslint/no-unsafe-call": "off",
            "@typescript-eslint/no-unsafe-argument": "off",
            "@typescript-eslint/no-unsafe-return": "off",
            "@typescript-eslint/no-unused-vars": "off",
            "@typescript-eslint/no-extra-non-null-assertion": "off",
            "@typescript-eslint/no-redundant-type-constituents": "off",
            "@typescript-eslint/unbound-method": "off",
            "@typescript-eslint/no-floating-promises": "off",
            "@typescript-eslint/restrict-template-expressions": "off",
            "@typescript-eslint/no-base-to-string": "off",
        },
    },
    prettierConfig,
);
