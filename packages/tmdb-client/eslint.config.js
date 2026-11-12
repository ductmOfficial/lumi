import base from "@repo/eslint-config/base";
import { defineConfig } from "eslint/config";

export default defineConfig(base, {
  files: ["**/*.ts"],
  rules: {
    // Ids and counts are interpolated into keys and URLs all the time.
    "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
  },
});
