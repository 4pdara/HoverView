"use strict";
document.getElementById('run').addEventListener('click', async () => {
  const listeners = [], values = { delay: 0 };
  // API adapter only: image loads, layout, focus, pointer and keyboard handling
  // use the real browser and unmodified extension source modules.
  window.chrome = { storage: {
    local: { get: async defaults => ({ ...defaults, ...values }), set: async patch => {
      const changes = Object.fromEntries(Object.entries(patch).map(([key, value]) => [key, { newValue: value }]));
      Object.assign(values, patch); for (const fn of listeners) fn(changes, 'local');
    } }, onChanged: { addListener: fn => listeners.push(fn) }
  } };
  const shadows = new WeakMap(), original = Element.prototype.attachShadow;
  Element.prototype.attachShadow = function (options) { const root = original.call(this, options); shadows.set(this, root); return root; };
  function load(name) { return new Promise((resolve, reject) => { const s = document.createElement('script'); s.src = '../extension/' + name; s.onload = resolve; s.onerror = reject; document.head.append(s); }); }
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  async function waitFor(predicate) { for (let i=0;i<100;i++) { if (predicate()) return; await pause(30); } }
  const checks = document.getElementById('checks');
  let passed = 0;
  function check(label, condition) { const li = document.createElement('li'); li.textContent = `${condition ? 'PASS' : 'FAIL'} ${label}`; li.style.color = condition ? '#17653a' : '#b42318'; checks.append(li); if (!condition) throw new Error(label); passed++; }
  try {
    for (const file of ['shared.js', 'sources.js', 'content.js']) await load(file);
    await pause(20);
    const sample = document.getElementById('sample');
    sample.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, composed: true, pointerType: 'mouse', clientX: 100, clientY: 250 }));
    await waitFor(() => { const host = document.querySelector('[data-hoverview]'); return host && !shadows.get(host)?.querySelector('.panel')?.hidden; });
    const host = document.querySelector('[data-hoverview]'), shadow = shadows.get(host), panel = shadow?.querySelector('.panel');
    check('Real image loaded and hover viewer is visible', panel && !panel.hidden);
    const img = shadow.querySelector('.image');
    check('SVG image natural dimensions detected', img.naturalWidth === 1600 && img.naturalHeight === 1100);
    check('Popover rendered above page content', host.matches(':popover-open'));
    const r = panel.getBoundingClientRect();
    check('Viewer fits inside viewport', r.x >= 0 && r.y >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1);
    const key = (value, code = value) => document.body.dispatchEvent(new KeyboardEvent('keydown', { key: value, code, bubbles: true, cancelable: true }));
    key(' ', 'Space');
    check('Space pins viewer and focuses dialog', panel.getAttribute('role') === 'dialog' && shadow.activeElement === panel);
    key('+'); check('Keyboard zoom changes transform', img.style.transform.includes('scale(1.2)'));
    key('r'); check('Rotation works in real DOM', img.style.transform.includes('rotate(90deg)'));
    key('0'); check('Reset restores fit transform', img.style.transform.includes('scale(1)') && img.style.transform.includes('rotate(0deg)'));
    key('Escape'); check('Escape closes pinned viewer', panel.hidden);
    sample.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerType: 'mouse' })); await pause(40);
    check('Closed image stays dismissed until pointer leaves', panel.hidden);
    document.body.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' }));
    await chrome.storage.local.set({ enabled: false });
    sample.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' })); await pause(30);
    check('Live preference change disables viewer', panel.hidden);
    await chrome.storage.local.set({ enabled: true, theme: 'light' });
    document.body.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' }));
    sample.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse', clientX: 100, clientY: 250 })); await waitFor(() => !panel.hidden);
    check('Viewer reopens with light theme', !panel.hidden && panel.classList.contains('light'));
    key('Escape');
    const frame = document.querySelector('iframe'); await pause(150);
    const mobile = frame.contentDocument;
    check('390px mobile page has no horizontal overflow', mobile.documentElement.scrollWidth <= 390);
    document.getElementById('result').textContent = `${passed} browser checks passed`;
    document.title = `PASS ${passed} — HoverView browser acceptance`;
  } catch (error) { document.getElementById('result').textContent = `FAILED: ${error.message}`; document.title = 'FAIL — HoverView browser acceptance'; }
});
