import { useCallback } from "react";
import { usePreferences } from "@/stores/preferences";
import { dictionaries, type MessageKey } from "@lumi/i18n";

export type TFunction = (key: MessageKey, vars?: Record<string, string | number>) => string;

export function useT(): TFunction {
  const locale = usePreferences((s) => s.locale);
  return useCallback<TFunction>(
    (key, vars) => {
      const template: string = dictionaries[locale][key];
      if (!vars) return template;
      return template.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? `{${name}}`));
    },
    [locale],
  );
}
