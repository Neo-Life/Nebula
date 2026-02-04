import js from "@eslint/js";
import globals from "globals";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import vue from "eslint-plugin-vue";
import vueParser from "vue-eslint-parser";

export default [
	{
		ignores: ["dist/**", "node_modules/**"],
	},

	js.configs.recommended,

	{
		files: ["**/*.{js,jsx,cjs,mjs,ts,tsx,cts,mts}"],
		languageOptions: {
			ecmaVersion: "latest",
			sourceType: "module",
			globals: {
				...globals.browser,
				...globals.node,
			},
		},
	},

	{
		files: ["**/*.{ts,tsx,cts,mts}"],
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				ecmaVersion: "latest",
				sourceType: "module",
			},
			globals: {
				...globals.browser,
				...globals.node,
			},
		},
		plugins: {
			"@typescript-eslint": tseslint,
		},
		rules: {
			...tseslint.configs.recommended.rules,
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-empty-object-type": "off",
			"@typescript-eslint/no-unused-vars": [
				"warn",
				{
					argsIgnorePattern: "^_",
					varsIgnorePattern: "^_",
					caughtErrorsIgnorePattern: "^_",
				},
			],
			"no-undef": "off",
			"no-prototype-builtins": "off",
		},
	},

	...vue.configs["flat/essential"],

	{
		files: ["**/*.vue"],
		languageOptions: {
			parser: vueParser,
			parserOptions: {
				parser: tsParser,
				ecmaVersion: "latest",
				sourceType: "module",
				extraFileExtensions: [".vue"],
			},
			globals: {
				...globals.browser,
				...globals.node,
			},
		},
		plugins: {
			vue,
			"@typescript-eslint": tseslint,
		},
		rules: {
			...tseslint.configs.recommended.rules,
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-empty-object-type": "off",
			"@typescript-eslint/no-unused-vars": [
				"warn",
				{
					argsIgnorePattern: "^_",
					varsIgnorePattern: "^_",
					caughtErrorsIgnorePattern: "^_",
				},
			],
			"no-undef": "off",
			"no-prototype-builtins": "off",
			"vue/multi-word-component-names": "off",
			"vue/no-mutating-props": "warn",
			"vue/no-unused-components": "warn",
			"vue/no-unused-vars": "warn",
			"vue/valid-v-slot": ["error", { allowModifiers: true }],
		},
	},
];
