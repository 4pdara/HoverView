(() => {
  "use strict";
  const { defaults, normalize, siteKey } = HoverView;
  const { resolve, safeURL } = HoverViewSources;
  let settings = { ...defaults }, siteEnabled = false, ready = false;
  let hostName = location.hostname;
  // about:blank frames inherit a parent's site setting when that parent is readable.
  if (!hostName) { try { hostName = parent.location.hostname; } catch { /* Cross-origin frame. */ } }
  const hostSetting = siteKey(hostName);
  let source = null, dismissedElement = null, timer = 0, loadToken = 0, frame = 0;
  let host, root, panel, viewport, image, caption, dimensions, pinButton, status;
  let visible = false, pinned = false, scale = 1, rotation = 0, panX = 0, panY = 0;
  let naturalWidth = 0, naturalHeight = 0, baseWidth = 0, baseHeight = 0;
  let pointer = { x: 0, y: 0 }, lastPath = [], altDown = false, drag = null;
  let lastFocused = null, currentURL = "", loadingImage = null, cancelLoad = null;
  let sourceObserver = null, observedElement = null, hoverCheckFrame = 0;

  function active() { return ready && settings.enabled && siteEnabled; }
  function canTrigger() { return active() && (!settings.requireAlt || altDown); }
  function isOwn(event) { return host && event.composedPath().includes(host); }
  function isEditable(event) {
    return event.composedPath().some(node => node instanceof Element &&
      (node.matches("input, textarea, select") || node.isContentEditable));
  }
  function make(tag, attrs = {}, text) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    if (text) node.textContent = text;
    return node;
  }
  function ensureViewer() {
    if (host?.isConnected) return;
    host = make("div", { "data-hoverview": "", popover: "manual" });
    host.style.cssText = "all:initial!important;position:fixed!important;inset:0!important;width:0!important;height:0!important;margin:0!important;padding:0!important;border:0!important;overflow:visible!important;pointer-events:none!important;z-index:2147483647!important;";
    root = host.attachShadow({ mode: "closed" });
    const style = make("style");
    style.textContent = `
      :host { color-scheme:dark; }
      * { box-sizing:border-box; }
      [hidden] { display:none!important; }
      .panel { --bg:#111827;--fg:#f8fafc;--muted:#aab5c5;--line:#ffffff1c; position:fixed; margin:0; padding:7px; background:var(--bg); color:var(--fg); border:1px solid var(--line); border-radius:15px; box-shadow:0 18px 70px #0005,0 2px 8px #0003; overflow:hidden; font:12px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif; direction:rtl; pointer-events:none; transition:opacity .12s; }
      .panel.light { --bg:#fff;--fg:#152039;--muted:#596579;--line:#15203922; }
      .panel.pinned { pointer-events:auto; }
      .viewport { position:relative; overflow:hidden; display:flex; align-items:center; justify-content:center; border-radius:9px; background:repeating-conic-gradient(#8080800a 0% 25%,transparent 0% 50%) 50%/18px 18px; direction:ltr; }
      .image { display:block; flex:none; max-width:none; max-height:none; object-fit:contain; transform-origin:center; user-select:none; -webkit-user-drag:none; }
      .pinned .viewport { cursor:grab;touch-action:none; }
      .pinned .viewport.dragging { cursor:grabbing; }
      .info { display:flex; align-items:center; justify-content:space-between; gap:14px; padding:8px 5px 1px; min-height:29px; }
      .caption { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:65%; }
      .dimensions { direction:ltr; white-space:nowrap; color:var(--muted); font-variant-numeric:tabular-nums; }
      .hint { color:var(--muted); padding:3px 5px 2px; font-size:11px; white-space:nowrap; }
      .toolbar { display:flex; flex-wrap:wrap; gap:5px; padding:7px 0 1px; border-top:1px solid var(--line); margin-top:6px; }
      button { border:1px solid var(--line); background:transparent; color:inherit; border-radius:7px; padding:5px 9px; font:inherit; cursor:pointer; }
      button:hover,button:focus-visible { background:#7c86ff30; outline:2px solid #818cf8; outline-offset:1px; }
      .spacer { flex:1; }
      .status { position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%); }
      @media(prefers-reduced-motion:reduce) { .panel { transition:none; } }
    `;
    panel = make("section", { class: "panel", role: "region", "aria-label": "תצוגת תמונה מוגדלת", hidden: "" });
    viewport = make("div", { class: "viewport" });
    image = make("img", { class: "image", alt: "", draggable: "false" });
    viewport.append(image);
    const info = make("div", { class: "info" });
    caption = make("span", { class: "caption" }); dimensions = make("span", { class: "dimensions" });
    info.append(caption, dimensions);
    const hint = make("div", { class: "hint" }, "רווח להצמדה · גלגלת לזום · Esc לסגירה");
    const toolbar = make("div", { class: "toolbar", hidden: "", "aria-label": "פעולות תמונה" });
    const button = (label, title, action) => {
      const b = make("button", { type: "button", title, "aria-label": title }, label);
      b.addEventListener("click", action); toolbar.append(b); return b;
    };
    pinButton = button("ביטול הצמדה", "ביטול הצמדה (רווח)", () => setPinned(false));
    button("+", "הגדלה", () => zoom(1.2)); button("−", "הקטנה", () => zoom(1 / 1.2));
    button("↻", "סיבוב (R)", rotate); button("איפוס", "התאמה למסגרת (0)", resetTransform);
    button("פתיחה ↗", "פתיחת התמונה בלשונית חדשה (O)", openImage);
    toolbar.append(make("span", { class: "spacer" }));
    button("✕", "סגירה (Esc)", () => hide(true));
    status = make("span", { class: "status", role: "status", "aria-live": "polite" });
    panel.append(viewport, info, hint, toolbar, status); root.append(style, panel);
    document.documentElement.append(host);
    // Native popover puts the viewer above site dialogs. Fall back on older Chrome.
    try { host.showPopover(); } catch { /* z-index fallback. */ }
    viewport.addEventListener("pointerdown", event => {
      if (!pinned || event.button !== 0) return;
      event.preventDefault(); viewport.setPointerCapture(event.pointerId);
      drag = { x: event.clientX, y: event.clientY, panX, panY };
      viewport.classList.add("dragging");
    });
    viewport.addEventListener("pointermove", event => {
      if (!drag) return;
      panX = drag.panX + event.clientX - drag.x; panY = drag.panY + event.clientY - drag.y;
      clampPan(); transform();
    });
    const stopDrag = () => { drag = null; viewport.classList.remove("dragging"); };
    viewport.addEventListener("pointerup", stopDrag);
    viewport.addEventListener("pointercancel", stopDrag);
    viewport.addEventListener("lostpointercapture", stopDrag);
  }
  function findSource(path) {
    for (const node of path) {
      if (!(node instanceof Element) || node === document.body || node === document.documentElement) continue;
      const result = resolve(node, settings);
      if (result) return result;
      // Limit ancestor work, especially large wrappers with background art.
      if (node.matches("main,article,section")) break;
    }
    return null;
  }
  function underPointer(element) {
    if (!element?.isConnected) return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && pointer.x >= rect.left && pointer.x <= rect.right && pointer.y >= rect.top && pointer.y <= rect.bottom;
  }
  function queueHoverCheck() {
    if (hoverCheckFrame || pinned || !source) return;
    hoverCheckFrame = requestAnimationFrame(() => { hoverCheckFrame = 0; refreshHover(); });
  }
  function unwatchSource() {
    sourceObserver?.disconnect();
    sourceObserver = null;
    observedElement?.removeEventListener("load", queueHoverCheck);
    observedElement?.removeEventListener("error", queueHoverCheck);
    observedElement = null;
  }
  function watchSource() {
    unwatchSource();
    if (!source) return;
    observedElement = source.element;
    observedElement.addEventListener("load", queueHoverCheck);
    observedElement.addEventListener("error", queueHoverCheck);
    if (!source || typeof MutationObserver !== "function") return;
    sourceObserver = new MutationObserver(queueHoverCheck);
    sourceObserver.observe(source.element, { attributes: true, attributeFilter: ["src", "srcset", "style", "class", "data-src", "data-srcset", "data-lazy-src", "data-lazy-srcset", "data-original", "data-original-src", "data-full", "data-full-src", "data-zoom-image", "data-zoom-src", "data-large", "data-large-src"] });
    if (source.element.parentElement) sourceObserver.observe(source.element.parentElement, { childList: true });
    if (source.element.parentElement?.parentElement) sourceObserver.observe(source.element.parentElement.parentElement, { childList: true });
    for (const item of source.element.closest("picture")?.querySelectorAll("source") || []) sourceObserver.observe(item, { attributes: true, attributeFilter: ["srcset", "media"] });
  }
  function refreshHover() {
    if (pinned || !source) return;
    if (!canTrigger()) { hide(); return; }
    const hit = typeof document.elementFromPoint === "function" ? document.elementFromPoint(pointer.x, pointer.y) : null;
    const path = [];
    for (let node = hit; node; node = node.parentElement || node.getRootNode?.().host || null) path.push(node);
    const found = findSource(path);
    const next = found || (underPointer(source.element) ? resolve(source.element, settings) : null);
    if (!next) { hide(); return; }
    if (next.element !== source.element || next.candidates.join("\n") !== source.candidates.join("\n")) {
      // Lazy loading and carousels may replace a source while the mouse is still.
      // Keep the last rendered image until the replacement is actually decoded.
      clearTimeout(timer); timer = 0; ++loadToken; cancelPendingLoad();
      source = next; watchSource(); show(next);
    } else if (visible) layout();
  }
  function consider(path) {
    if (pinned) return;
    if (!canTrigger()) { hide(); return; }
    const next = findSource(path);
    if (!next && source && underPointer(source.element)) return;
    if (next?.element === dismissedElement) return;
    dismissedElement = null;
    if (next && source?.element === next.element && source.candidates.join("\n") === next.candidates.join("\n")) return;
    hide();
    if (!next) return;
    source = next;
    watchSource();
    timer = window.setTimeout(() => show(next), settings.delay);
  }
  function cancelPendingLoad() {
    if (cancelLoad) cancelLoad();
    cancelLoad = null; loadingImage = null;
  }
  function loadImage(url, referrerPolicy, token) {
    return new Promise(resolveLoad => {
      const probe = new Image(); loadingImage = probe;
      let finished = false;
      const timeout = setTimeout(() => finish(null), 5000);
      const finish = value => {
        if (finished) return;
        finished = true; clearTimeout(timeout); probe.onload = null; probe.onerror = null;
        if (loadingImage === probe) { cancelLoad = null; loadingImage = null; }
        if (!value) probe.removeAttribute("src");
        resolveLoad(value);
      };
      cancelLoad = () => finish(null);
      if (referrerPolicy) probe.referrerPolicy = referrerPolicy;
      probe.decoding = "sync";
      probe.onload = async () => {
        if (token !== loadToken || probe.naturalWidth <= 0) { finish(null); return; }
        try { if (typeof probe.decode === "function") await probe.decode(); }
        catch { finish(null); return; }
        if (finished || token !== loadToken) { finish(null); return; }
        finish(probe);
      };
      probe.onerror = () => finish(null);
      probe.src = url;
    });
  }
  function hasVisiblePixels(loaded) {
    // Transparent lazy-loading placeholders can be hundreds of pixels wide.
    // Inspect only when canvas access is permitted; a tainted canvas must not
    // prevent ordinary cross-origin images from being displayed.
    try {
      const canvas = document.createElement("canvas"); canvas.width = canvas.height = 32;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return true;
      ctx.drawImage(loaded, 0, 0, 32, 32);
      const pixels = ctx.getImageData(0, 0, 32, 32).data;
      for (let i = 3; i < pixels.length; i += 4) if (pixels[i] !== 0) return true;
      return false;
    } catch { return true; }
  }
  async function show(next) {
    timer = 0;
    const token = ++loadToken;
    if (!canTrigger() || source !== next) return;
    // Bound requests: prefer likely originals, always finish with the displayed source.
    const candidates = next.candidates.length > 8 ? [...next.candidates.slice(0, 6), ...next.candidates.slice(-2)] : next.candidates;
    for (const url of candidates) {
      if (token !== loadToken || !canTrigger()) return;
      const loaded = await loadImage(url, next.referrerPolicy, token);
      if (token !== loadToken || source !== next || !canTrigger()) return;
      if (!loaded) continue;
      // Ignore 1px trackers/placeholders if the page provides a real fallback.
      if (loaded.naturalWidth < 16 || loaded.naturalHeight < 16) continue;
      if (!hasVisiblePixels(loaded)) continue;
      ensureViewer();
      currentURL = url; naturalWidth = loaded.naturalWidth; naturalHeight = loaded.naturalHeight;
      // Reuse the tested, decoded node. Setting src on a second <img> can start
      // another request or paint an empty frame despite the first load passing.
      image = loaded; image.setAttribute("class", "image"); image.alt = next.caption;
      image.setAttribute("draggable", "false"); viewport.replaceChildren(image);
      caption.textContent = next.caption || "תמונה"; caption.title = next.caption;
      panel.classList.toggle("light", settings.theme === "light");
      root.querySelector(".info").hidden = !settings.showInfo;
      root.querySelector(".hint").textContent = settings.zoomOnWheel
        ? "רווח להצמדה · גלגלת לזום · Esc לסגירה" : "רווח להצמדה · Esc לסגירה";
      visible = true; scale = 1; rotation = 0; panX = panY = 0;
      panel.hidden = false; layout();
      return;
    }
    // Keep the source until the pointer leaves so broken images do not loop.
    if (token === loadToken && visible) hide();
  }
  function hide(restoreFocus = false) {
    if (restoreFocus && source) dismissedElement = source.element;
    clearTimeout(timer); timer = 0; ++loadToken; cancelPendingLoad();
    unwatchSource();
    const wasPinned = pinned;
    visible = false; pinned = false; drag = null; source = null; currentURL = "";
    if (panel) {
      panel.hidden = true; panel.classList.remove("pinned");
      panel.setAttribute("role", "region"); panel.removeAttribute("tabindex");
      viewport.classList.remove("dragging");
      root.querySelector(".toolbar").hidden = true;
      image.removeAttribute("src");
    }
    if (restoreFocus && wasPinned && lastFocused?.isConnected) lastFocused.focus({ preventScroll: true });
    lastFocused = null;
  }
  function viewSize() {
    return { width: Math.max(100, innerWidth), height: Math.max(100, innerHeight) };
  }
  function layout() {
    if (!visible) return;
    const { width, height } = viewSize();
    const margin = 12;
    const extra = 16 + (settings.showInfo ? 29 : 0) + 26 + (pinned ? 48 : 0);
    const maxWidth = Math.max(48, Math.min(width - margin * 2 - 16, width * settings.maxSize / 100 - 16));
    const maxHeight = Math.max(36, Math.min(height - margin * 2 - extra, height * settings.maxSize / 100 - extra));
    const rotated = rotation % 180 !== 0;
    const fit = Math.min(maxWidth / (rotated ? naturalHeight : naturalWidth), maxHeight / (rotated ? naturalWidth : naturalHeight), 4);
    baseWidth = Math.max(1, naturalWidth * fit); baseHeight = Math.max(1, naturalHeight * fit);
    image.style.width = `${baseWidth}px`; image.style.height = `${baseHeight}px`;
    viewport.style.width = `${rotated ? baseHeight : baseWidth}px`;
    viewport.style.height = `${rotated ? baseWidth : baseHeight}px`;
    // Width can grow to keep pinned controls on screen without enlarging the image.
    panel.style.width = `${Math.min(width - margin * 2, Math.max((rotated ? baseHeight : baseWidth) + 16, pinned ? 330 : 190))}px`;
    viewport.style.maxWidth = "100%"; viewport.style.marginInline = "auto";
    clampPan(); transform(); place();
  }
  function place() {
    if (!visible) return;
    const { width, height } = viewSize();
    const rect = panel.getBoundingClientRect();
    let x, y;
    if (pinned || settings.position === "center") { x = (width - rect.width) / 2; y = (height - rect.height) / 2; }
    else {
      const gap = 24;
      x = pointer.x + gap;
      if (x + rect.width > width - 12) x = pointer.x - rect.width - gap;
      // If neither side fits, position toward the larger side and below the pointer.
      y = pointer.y - rect.height / 2;
      if (x < 12) { x = width - rect.width - 12; y = pointer.y + gap; }
    }
    x = Math.max(12, Math.min(width - rect.width - 12, x));
    y = Math.max(12, Math.min(height - rect.height - 12, y));
    panel.style.left = `${Math.round(x)}px`; panel.style.top = `${Math.round(y)}px`;
  }
  function clampPan() {
    if (!viewport) return;
    const rotated = rotation % 180 !== 0;
    const xLimit = Math.max(0, ((rotated ? baseHeight : baseWidth) * scale - viewport.clientWidth) / 2);
    const yLimit = Math.max(0, ((rotated ? baseWidth : baseHeight) * scale - viewport.clientHeight) / 2);
    panX = Math.max(-xLimit, Math.min(xLimit, panX)); panY = Math.max(-yLimit, Math.min(yLimit, panY));
  }
  function transform() {
    image.style.transform = `translate(${panX}px, ${panY}px) rotate(${rotation}deg) scale(${scale})`;
    dimensions.textContent = `${naturalWidth} × ${naturalHeight} · ${Math.round(scale * 100)}%`;
    dimensions.title = "מידות מקור · זום ביחס לתצוגה המותאמת למסך";
  }
  function zoom(factor) { scale = Math.max(0.5, Math.min(8, scale * factor)); clampPan(); transform(); }
  function rotate() { rotation = (rotation + 90) % 360; panX = panY = 0; layout(); }
  function resetTransform() { scale = 1; rotation = 0; panX = panY = 0; layout(); }
  function setPinned(value) {
    if (!visible) return;
    if (!value) { hide(true); return; }
    pinned = true; lastFocused = document.activeElement;
    panel.classList.add("pinned"); panel.setAttribute("role", "dialog"); panel.setAttribute("tabindex", "-1");
    root.querySelector(".toolbar").hidden = false;
    status.textContent = "התמונה הוצמדה. אפשר לגרור, להגדיל ולסובב. Escape לסגירה.";
    layout(); panel.focus({ preventScroll: true });
  }
  function openImage() {
    const url = safeURL(currentURL);
    // Browser top-level data: navigation is blocked; keep data images in the viewer.
    if (!url || url.startsWith("data:")) { status.textContent = "תמונה משובצת — אפשר לצפות בה בחלונית זו."; return; }
    window.open(url, "_blank", "noopener,noreferrer");
  }
  document.addEventListener("pointerover", event => {
    if (event.pointerType === "touch" || isOwn(event)) return;
    pointer = { x: event.clientX, y: event.clientY }; altDown = event.altKey;
    lastPath = event.composedPath(); consider(lastPath);
  }, true);
  document.addEventListener("pointermove", event => {
    if (event.pointerType === "touch" || isOwn(event)) return;
    pointer = { x: event.clientX, y: event.clientY }; altDown = event.altKey;
    lastPath = event.composedPath();
    if (!pinned && !source) consider(lastPath);
    if (!frame && visible && !pinned) frame = requestAnimationFrame(() => { frame = 0; place(); });
  }, true);
  document.addEventListener("pointerout", event => {
    if (!event.relatedTarget && !pinned) {
      if (event.clientX <= 0 || event.clientY <= 0 || event.clientX >= innerWidth || event.clientY >= innerHeight) hide();
      else queueHoverCheck();
    }
  }, true);
  document.addEventListener("pointerdown", event => { if (!isOwn(event)) hide(); }, true);
  document.addEventListener("wheel", event => {
    if (!visible || !settings.zoomOnWheel || event.ctrlKey || event.metaKey) return;
    if (!isOwn(event) && (pinned || !event.composedPath().includes(source?.element))) return;
    event.preventDefault(); zoom(event.deltaY < 0 ? 1.12 : 1 / 1.12);
  }, { capture: true, passive: false });
  document.addEventListener("keydown", event => {
    if (isEditable(event)) return;
    if (event.key === "Alt") {
      altDown = true;
      if (!event.repeat && settings.requireAlt && !visible) consider(lastPath);
      return;
    }
    if (!visible || event.ctrlKey || event.metaKey || event.altKey) return;
    let handled = true;
    if (event.key === "Escape") hide(true);
    else if (event.code === "Space") { if (!event.repeat) setPinned(!pinned); }
    else if (["+", "="].includes(event.key)) zoom(1.2);
    else if (event.key === "-") zoom(1 / 1.2);
    else if (event.key === "0") resetTransform();
    else if (event.key.toLowerCase() === "r") rotate();
    else if (event.key.toLowerCase() === "o") { if (!event.repeat) openImage(); }
    else if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
      panX += event.key === "ArrowLeft" ? 35 : event.key === "ArrowRight" ? -35 : 0;
      panY += event.key === "ArrowUp" ? 35 : event.key === "ArrowDown" ? -35 : 0;
      clampPan(); transform();
    } else handled = false;
    if (handled) { event.preventDefault(); event.stopPropagation(); }
  }, true);
  document.addEventListener("keyup", event => {
    if (event.key === "Alt") { altDown = false; if (settings.requireAlt && !pinned) hide(); }
  }, true);
  document.addEventListener("scroll", queueHoverCheck, { capture: true, passive: true });
  window.addEventListener("blur", () => { altDown = false; if (!pinned && (document.hidden || settings.requireAlt)) hide(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) hide(); });
  window.addEventListener("resize", () => { if (pinned) layout(); else queueHoverCheck(); });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (![...Object.keys(defaults), hostSetting].some(key => key in changes && changes[key].newValue !== changes[key].oldValue)) return;
    for (const key of Object.keys(defaults))
      if (key in changes) settings[key] = changes[key].newValue ?? defaults[key];
    settings = normalize(settings);
    if (hostSetting in changes) siteEnabled = changes[hostSetting].newValue !== false;
    hide();
  });
  chrome.storage.local.get({ ...defaults, [hostSetting]: true }).then(values => {
    settings = normalize(values); siteEnabled = values[hostSetting] !== false; ready = true;
  }).catch(() => { /* An unavailable extension context must fail closed. */ });
})();
