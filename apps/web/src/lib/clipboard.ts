/**
 * Copies text. navigator.clipboard only exists in secure contexts (https/localhost) —
 * over a LAN IP (dev --host) fall back to a hidden textarea + execCommand('copy').
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (window.isSecureContext && "clipboard" in navigator) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the fallback
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  let ok: boolean;
  try {
    // The only way to copy outside a secure context (the dev server over a LAN IP).
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  ta.remove();
  return ok;
}
