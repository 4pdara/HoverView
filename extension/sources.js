/* Resolve only image URLs already exposed by the page or known image CDNs. */
(() => {
  "use strict";
  const imageExtension = /\.(?:avif|bmp|gif|ico|jpe?g|png|svg|webp)(?:[?#]|$)/i;
  function safeURL(value, base = document.baseURI) {
    if (!value || typeof value !== "string") return null;
    try {
      const url = new URL(value.trim(), base);
      if (["http:", "https:", "blob:"].includes(url.protocol)) return url.href;
      if (url.protocol === "data:" && /^data:image\//i.test(url.href)) return url.href;
      if (url.protocol === "chrome-extension:" && typeof chrome !== "undefined" && chrome.runtime?.id && url.hostname === chrome.runtime.id) return url.href;
    } catch { /* Bad page-provided URL. */ }
    return null;
  }
  // Parse srcset URLs without splitting commas inside data: image URLs.
  function srcsetEntries(input = "") {
    const entries = [];
    let rest = input.trim();
    while (rest) {
      rest = rest.replace(/^[\s,]+/, "");
      const match = /^\S+/.exec(rest);
      if (!match) break;
      let url = match[0];
      rest = rest.slice(url.length);
      let descriptor = "";
      if (url.endsWith(",")) url = url.replace(/,+$/, "");
      else {
        const end = rest.indexOf(",");
        descriptor = (end < 0 ? rest : rest.slice(0, end)).trim();
        rest = end < 0 ? "" : rest.slice(end + 1);
      }
      const size = /^(\d+(?:\.\d+)?)(w|x)$/.exec(descriptor);
      entries.push({ url, score: size ? Number(size[1]) * (size[2] === "x" ? 1000 : 1) : 0 });
    }
    return entries.sort((a, b) => b.score - a.score);
  }
  function knownOriginal(value) {
    try {
      const u = new URL(value);
      // Do not rewrite arbitrary query strings: these often contain signed URLs.
      if (u.hostname === "pbs.twimg.com" && u.pathname.startsWith("/media/")) {
        u.searchParams.set("name", "orig"); return u.href;
      }
      if (/(^|\.)pinimg\.com$/.test(u.hostname) && /\/(?:\d+x|\d+x\d+)\//.test(u.pathname)) {
        u.pathname = u.pathname.replace(/\/(?:\d+x|\d+x\d+)\//, "/originals/"); return u.href;
      }
      if (/(^|\.)wikimedia\.org$/.test(u.hostname) && u.pathname.includes("/thumb/") && !/\.(?:svg|pdf|tiff?|djvu)\//i.test(u.pathname)) {
        u.pathname = u.pathname.replace("/thumb/", "/").replace(/\/[^/]+$/, ""); return u.href;
      }
    } catch { /* Leave unfamiliar sources unchanged. */ }
    return null;
  }
  function resolve(element, { includeBackgrounds = true } = {}) {
    if (!(element instanceof Element)) return null;
    let img = element.matches("img") ? element : null;
    const anchor = element.closest("a[href]");
    if (!img && element.matches("picture, a, figure")) img = element.querySelector("img");
    const candidates = [];
    const add = value => {
      const url = safeURL(value);
      if (url && !candidates.includes(url)) candidates.push(url);
    };
    const link = anchor?.getAttribute("href");
    if (link && imageExtension.test(link)) add(link);
    if (img) {
      for (const name of ["data-original", "data-full", "data-full-src", "data-zoom-image", "data-large", "data-large-src", "data-src"])
        add(img.getAttribute(name));
      const entries = srcsetEntries(img.getAttribute("srcset") || img.getAttribute("data-srcset") || "");
      // Only use <picture> sources whose media query matches the current page.
      for (const source of img.closest("picture")?.querySelectorAll("source[srcset]") || [])
        if (!source.media || matchMedia(source.media).matches) entries.push(...srcsetEntries(source.srcset));
      entries.sort((a, b) => b.score - a.score);
      for (const entry of entries) add(entry.url);
      for (const url of [img.currentSrc, img.src]) { add(knownOriginal(url)); add(url); }
      // Try known CDN originals before falling back to page-provided thumbnails.
      for (const url of [...candidates].reverse()) {
        const original = knownOriginal(url);
        if (original && !candidates.includes(original)) candidates.unshift(original);
      }
      // Always retain the currently displayed image as a final fallback.
      add(img.currentSrc); add(img.src);
    } else if (includeBackgrounds) {
      const background = getComputedStyle(element).backgroundImage;
      if (background && background !== "none") {
        for (const match of background.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/g))
          add(match[1] ?? match[2] ?? match[3]);
      }
    }
    if (!candidates.length) return null;
    const target = img || element;
    const rect = target.getBoundingClientRect();
    if (rect.width < 24 || rect.height < 24) return null;
    return {
      element: target, candidates,
      caption: (img?.alt || target.getAttribute("aria-label") || target.getAttribute("title") || "").trim().slice(0, 240),
      referrerPolicy: img?.referrerPolicy || ""
    };
  }
  globalThis.HoverViewSources = Object.freeze({ safeURL, srcsetEntries, knownOriginal, resolve });
})();
