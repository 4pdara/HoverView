/* Shared by the popup, service worker and isolated content script. */
(() => {
  "use strict";
  const defaults = Object.freeze({
    enabled: true, delay: 350, maxSize: 80, requireAlt: false,
    zoomOnWheel: true, showInfo: true, includeBackgrounds: true,
    position: "cursor", theme: "dark"
  });
  function normalize(raw = {}) {
    const out = { ...defaults };
    for (const key of ["enabled", "requireAlt", "zoomOnWheel", "showInfo", "includeBackgrounds"])
      if (typeof raw[key] === "boolean") out[key] = raw[key];
    for (const [key, min, max] of [["delay", 0, 1500], ["maxSize", 40, 95]])
      if (Number.isFinite(raw[key])) out[key] = Math.min(max, Math.max(min, raw[key]));
    if (["cursor", "center"].includes(raw.position)) out.position = raw.position;
    if (["dark", "light"].includes(raw.theme)) out.theme = raw.theme;
    return out;
  }
  function siteKey(hostname) { return `site:${hostname.toLowerCase()}`; }
  globalThis.HoverView = Object.freeze({ defaults, normalize, siteKey });
})();
