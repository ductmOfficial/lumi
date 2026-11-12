# @lumi/i18n

Vietnamese and English messages for Lumi, shared by the web app (`useT`) and the Worker, which writes page titles and link-preview descriptions in the visitor's language.

- `dictionaries.vi` defines the keys; `dictionaries.en` must have the same keys (`MessageKey`), which TypeScript checks.
- Placeholders use `{name}`; a test checks that both languages use the same placeholders for every key.
