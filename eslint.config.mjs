import babelParser from "@babel/eslint-parser";
import litPlugin from "eslint-plugin-lit";
import reactHooks from "eslint-plugin-react-hooks";
import wcPlugin from "eslint-plugin-wc";

export default [
    {
        files: ["src/**/*.{ts,tsx}"],
        languageOptions: {
            parser: babelParser,
            parserOptions: {
                requireConfigFile: false,
                babelOptions: {
                    presets: ["@babel/preset-typescript"],
                    parserOpts: {
                        plugins: [
                            "jsx",
                            "typescript",
                            ["decorators", { version: "2023-11" }],
                            "decoratorAutoAccessors",
                        ],
                    },
                },
            },
        },
        plugins: {
            "react-hooks": reactHooks,
            ...litPlugin.configs["flat/recommended"].plugins,
            ...wcPlugin.configs["flat/recommended"].plugins,
        },
        settings: {
            wc: {
                elementBaseClasses: ["LitElement"],
            },
        },
        rules: {
            "react-hooks/rules-of-hooks": "error",
            "react-hooks/exhaustive-deps": "warn",
            ...litPlugin.configs["flat/recommended"].rules,
            ...wcPlugin.configs["flat/recommended"].rules,
        },
    },
    {
        ignores: [
            "dist/**",
            ".parcel-cache/**",
            "coverage/**",
            "node_modules/**",
            "src/version.ts",
        ],
    },
];
