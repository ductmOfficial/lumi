import { APP_NAME } from "@/config/env";

/** React 19 hoists <title>/<meta> into <head> automatically. */
export function PageMeta({ title, description }: { title?: string; description?: string }) {
  return (
    <>
      <title>{title ? `${title} · ${APP_NAME}` : APP_NAME}</title>
      {description && <meta name="description" content={description.slice(0, 160)} />}
    </>
  );
}
