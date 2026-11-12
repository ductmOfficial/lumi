import vite from "@repo/eslint-config/vite";
import { defineConfig } from "eslint/config";
import globals from "globals";

export default defineConfig(
  vite,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      // Counts, years and ratings are interpolated into UI strings all the time.
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
      // TMDB sends "" and 0 for missing text and numbers, so `||` is the intended fallback.
      "@typescript-eslint/prefer-nullish-coalescing": [
        "error",
        { ignorePrimitives: { string: true, number: true } },
      ],
      // Async event handlers are fine in React: it ignores what a handler returns.
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false } },
      ],
    },
  },
  {
    // Runs before the app to set the theme without a flash.
    files: ["public/**/*.js"],
    languageOptions: { globals: globals.browser },
  },
);
