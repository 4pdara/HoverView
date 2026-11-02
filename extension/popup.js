"use strict";
const { defaults, normalize, siteKey } = HoverView;
const controls = Object.fromEntries(Object.keys(defaults).map(key => [key, document.getElementById(key)]));
const siteToggle = document.getElementById("siteEnabled");
const saveStatus = document.getElementById("saveStatus");
let currentSiteKey = null;
let queue = Promise.resolve(), statusTimer;
for (const node of [...Object.values(controls), siteToggle]) node.disabled = true;

function status(text, isError = false) {
  clearTimeout(statusTimer); saveStatus.textContent = text; saveStatus.classList.toggle("error", isError);
  if (!isError) statusTimer = setTimeout(() => { saveStatus.textContent = "ההגדרות נשמרות אוטומטית"; }, 1600);
}
function labels() {
  document.getElementById("delayValue").textContent = `${controls.delay.value} מילישניות`;
  document.getElementById("maxSizeValue").textContent = `${controls.maxSize.value}%`;
  document.getElementById("globalDescription").textContent = controls.enabled.checked ? "מוכנים למעבר העכבר הבא" : "מושהה בכל האתרים";
}
function render(values) {
  const prefs = normalize(values);
  for (const [key, node] of Object.entries(controls)) {
    if (node.type === "checkbox") node.checked = prefs[key]; else node.value = prefs[key];
  }
  if (currentSiteKey) siteToggle.checked = values[currentSiteKey] !== false;
  labels();
}
function save(patch) {
  // Serialize writes from rapid slider and switch changes without overwriting other keys.
  queue = queue.then(async () => {
    try { await chrome.storage.local.set(patch); status("נשמר ✓"); }
    catch { status("השמירה נכשלה — יש לפתוח שוב את חלון התוסף", true); }
  });
}
for (const [key, node] of Object.entries(controls)) {
  node.addEventListener("input", labels);
  node.addEventListener("change", () => {
    const value = node.type === "checkbox" ? node.checked : node.type === "range" ? Number(node.value) : node.value;
    labels(); save({ [key]: value });
  });
}
siteToggle.addEventListener("change", () => { if (currentSiteKey) save({ [currentSiteKey]: siteToggle.checked }); });
document.getElementById("reset").addEventListener("click", () => { render({ ...defaults, [currentSiteKey]: siteToggle.checked }); save({ ...defaults }); });

async function init() {
  let tab;
  try { [tab] = await chrome.tabs.query({ active: true, currentWindow: true }); } catch { /* Settings still work without a tab. */ }
  let supported = false;
  try {
    const url = new URL(tab?.url || "");
    supported = ["http:", "https:"].includes(url.protocol) && url.hostname !== "chromewebstore.google.com" && !(url.hostname === "chrome.google.com" && url.pathname.startsWith("/webstore"));
    if (supported) { currentSiteKey = siteKey(url.hostname); document.getElementById("siteHost").textContent = url.hostname; }
  } catch { /* Internal browser page or missing active tab. */ }
  if (!supported) {
    document.getElementById("siteHost").textContent = "עמוד פנימי של הדפדפן";
    const notice = document.getElementById("siteNotice"); notice.hidden = false;
    notice.textContent = "כדי לנסות את ההגדלה, עברו לאתר רגיל. Chrome חוסם תוספים בעמודים פנימיים ובחנות התוספים.";
  }
  try {
    const values = await chrome.storage.local.get({ ...defaults, ...(currentSiteKey ? { [currentSiteKey]: true } : {}) });
    render(values);
    for (const node of Object.values(controls)) node.disabled = false;
    siteToggle.disabled = !supported;
    chrome.storage.onChanged.addListener(async (_, area) => {
      if (area !== "local") return;
      try {
        const latest = await chrome.storage.local.get({ ...defaults, ...(currentSiteKey ? { [currentSiteKey]: true } : {}) });
        render(latest);
      } catch { status("לא ניתן לקרוא את ההגדרות", true); }
    });
  } catch { status("לא ניתן לקרוא את ההגדרות. נסו לטעון מחדש את התוסף.", true); }
}
init();
