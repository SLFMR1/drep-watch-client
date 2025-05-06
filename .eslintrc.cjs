
/** @type {import("eslint").Linter.Config} */
const config = {
    parser: "@typescript-eslint/parser",
    parserOptions: {
        project: true,
    },
    plugins: ["@typescript-eslint", "simple-import-sort", "sort-keys-fix"],
    extends: [
        // "next/core-web-vitals",
        "plugin:@next/next/recommended",
        "plugin:@typescript-eslint/recommended-type-checked",
        "plugin:@typescript-eslint/stylistic-type-checked",
    ],
    rules: {
        // These opinionated rules are enabled in stylistic-type-checked above.
        // Feel free to reconfigure them to your own preference.
        "@typescript-eslint/array-type": "off",
        "@typescript-eslint/consistent-type-definitions": "off",

        "@typescript-eslint/consistent-type-imports": [
            "warn",
            {
                prefer: "type-imports",
                fixStyle: "inline-type-imports",
            },
        ],
        "@typescript-eslint/no-unused-vars": [
            "warn",
            { argsIgnorePattern: "^_" },
        ],
        "@typescript-eslint/require-await": "off",
        "@typescript-eslint/no-misused-promises": [
            "error",
            {
                checksVoidReturn: { attributes: false },
            },
        ],

        // simple sorting
        "simple-import-sort/imports": "error",
        "simple-import-sort/exports": "error",
    },
    overrides: [
        {
            files: ["*.ts", "*.tsx"],
            rules: {
                "simple-import-sort/imports": [
                    "error",
                    {
                        groups: [
                            // Packages `react` related packages come first.
                            ["^react", "^@?\\w"],
                            // Internal packages.
                            ["^(@|components)(/.*|$)"],
                            // Side effect imports.
                            ["^\\u0000"],
                            // Parent imports. Put `..` last.
                            ["^\\.\\.(?!/?$)", "^\\.\\./?$"],
                            // Other relative imports. Put same-folder imports and `.` last.
                            ["^\\./(?=.*/)(?!/?$)", "^\\.(?!/?$)", "^\\./?$"],
                            // Style imports.
                            ["^.+\\.?(css)$"],
                        ],
                    },
                ],
                "sort-keys-fix/sort-keys-fix": "warn",
                "sort-keys": ["error", "asc", { caseSensitive: true, natural: false, minKeys: 2 }],
            },
        },
        {
            files: ["next.config.js", "env.js"],
            rules: {
                "sort-keys": "off",
            },
        },
    ],
};

module.exports = config;

