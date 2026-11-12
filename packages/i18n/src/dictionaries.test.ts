import { describe, expect, it } from "vitest";

import { dictionaries, LOCALES } from "./index.js";

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("dictionaries", () => {
  it("every locale has every key, with text", () => {
    const keys = Object.keys(dictionaries.vi).sort();
    for (const locale of LOCALES) {
      expect(Object.keys(dictionaries[locale]).sort()).toEqual(keys);
      for (const text of Object.values(dictionaries[locale])) expect(text.trim()).not.toBe("");
    }
  });

  it("translations use the same placeholders", () => {
    for (const [key, text] of Object.entries(dictionaries.vi)) {
      const en = dictionaries.en[key as keyof typeof dictionaries.vi];
      expect(placeholders(en), key).toEqual(placeholders(text));
    }
  });
});
