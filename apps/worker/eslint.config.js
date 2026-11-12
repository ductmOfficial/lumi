import base from "@repo/eslint-config/base";
import { defineConfig } from "eslint/config";

export default defineConfig(base, {
  files: ["**/*.ts"],
  rules: {
    // Ids and counts are interpolated into keys, URLs and markup all the time.
    "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
    // TMDB sends "" for missing text, so `||` is the intended fallback.
    "@typescript-eslint/prefer-nullish-coalescing": [
      "error",
      { ignorePrimitives: { string: true } },
    ],
  },
});
