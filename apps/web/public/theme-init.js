// Runs before React to avoid a flash of the wrong colors (FOUC). Reads the theme from the persisted Zustand store.
(function () {
  var pref = "system";
  try {
    var raw = localStorage.getItem("lumi:preferences");
    if (raw) pref = (JSON.parse(raw).state || {}).theme || "system";
  } catch {
    // ignore: localStorage is blocked
  }
  var dark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  // 'system' / 'glass-system': follow the OS light/dark setting (see src/themes/registry.ts)
  var id =
    pref === "system"
      ? dark
        ? "dark"
        : "light"
      : pref === "glass-system"
        ? dark
          ? "glass-dark"
          : "glass-light"
        : pref;
  var scheme = /light$/.test(id) ? "light" : "dark";
  var el = document.documentElement;
  el.setAttribute("data-theme", id);
  el.setAttribute("data-scheme", scheme);
})();
