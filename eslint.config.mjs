import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@next/next/no-img-element": "off"
    },
    ignores: [
      ".next/**",
      "coverage/**",
      "node_modules/**",
      "out/**",
      "dist/**",
      "build/**",
      "scripts/**",
      "tailwind.config.js",
      "next.config.ts",
      "postcss.config.mjs"
    ]
  }
];

export default eslintConfig;
