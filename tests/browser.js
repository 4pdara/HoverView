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
  const probeNodes = [], NativeImage = window.Image;
  window.Image = function(...args) { const node=new NativeImage(...args);probeNodes.push(node);return node; };
  window.Image.prototype = NativeImage.prototype;
  function load(name) { return new Promise((resolve, reject) => { const s = document.createElement('script'); s.src = '../extension/' + name; s.onload = resolve; s.onerror = reject; document.head.append(s); }); }
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  async function waitFor(predicate) { for (let i=0;i<100;i++) { if (predicate()) return; await pause(30); } }
  const checks = document.getElementById('checks');
  let passed = 0;
  function check(label, condition) { const li = document.createElement('li'); li.textContent = `${condition ? 'PASS' : 'FAIL'} ${label}`; li.style.color = condition ? '#17653a' : '#b42318'; checks.append(li); if (!condition) throw new Error(label); passed++; }
  try {
    for (const file of ['shared.js', 'sources.js', 'content.js']) await load(file);
    await pause(20);
    let sample = document.getElementById('sample');
    const hoverSample=()=>{const r=sample.getBoundingClientRect();sample.dispatchEvent(new PointerEvent('pointerover',{bubbles:true,composed:true,pointerType:'mouse',clientX:r.left+r.width/2,clientY:r.top+r.height/2}));};
    hoverSample();
    await waitFor(() => { const host = document.querySelector('[data-hoverview]'); return host && !shadows.get(host)?.querySelector('.panel')?.hidden; });
    const host = document.querySelector('[data-hoverview]'), shadow = shadows.get(host), panel = shadow?.querySelector('.panel');
    check('Real image loaded and hover viewer is visible', panel && !panel.hidden);
    const img = shadow.querySelector('.image');
    check('The displayed image is the successfully loaded node', probeNodes.includes(img) && img.complete);
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
    hoverSample(); await waitFor(() => !panel.hidden);
    check('Viewer reopens with light theme', !panel.hidden && panel.classList.contains('light'));
    const scroller=document.createElement('div');scroller.style.cssText='position:fixed;left:20px;top:450px;width:80px;height:30px;overflow:auto';
    const inner=document.createElement('div');inner.style.height='500px';scroller.append(inner);document.body.append(scroller);
    const stableNode=shadow.querySelector('.image');
    for(let i=0;i<4;i++){scroller.scrollTop+=25;await pause(450);}
    check('Image stays visible beyond 1.5 seconds during unrelated scrolling',!panel.hidden&&shadow.querySelector('.image')===stableNode&&stableNode.complete&&stableNode.naturalWidth>0);
    await chrome.storage.local.set({'site:unrelated.example':false,backgroundCache:1});await pause(30);
    check('Unrelated storage changes preserve the current preview',!panel.hidden);
    sample.setAttribute('data-original',new URL('fixtures/transparent.svg',location.href).href);
    await pause(100);
    await waitFor(()=>!panel.hidden&&shadow.querySelector('.image').src.endsWith('mountains.svg'));
    check('A transparent 300px placeholder falls back to visible pixels',!panel.hidden&&shadow.querySelector('.image').naturalWidth===1600&&shadow.querySelector('.image').src.endsWith('mountains.svg'));
    sample.setAttribute('data-original',new URL('fixtures/broken.svg',location.href).href);await pause(100);
    check('A broken original does not leave an empty dark viewer',!panel.hidden&&shadow.querySelector('.image').complete&&shadow.querySelector('.image').naturalWidth===1600);
    sample.removeAttribute('data-original');sample.src=new URL('../extension/demo-assets/city.svg',location.href).href;
    await waitFor(()=>!panel.hidden&&shadow.querySelector('.image').src.endsWith('city.svg'));
    check('Lazy source changes refresh without moving the pointer',!panel.hidden&&shadow.querySelector('.image').src.endsWith('city.svg'));
    const replacement=sample.cloneNode(true);replacement.alt='Replacement sample';sample.replaceWith(replacement);sample=replacement;
    await waitFor(()=>!panel.hidden&&shadow.querySelector('.image').alt==='Replacement sample');
    check('Replacing a thumbnail node preserves the stationary hover',!panel.hidden&&shadow.querySelector('.image').alt==='Replacement sample');
    sample.style.top='580px';await waitFor(()=>panel.hidden);
    check('Moving the source away from the pointer closes the preview',panel.hidden);
    key('Escape');
    const frame = document.querySelector('iframe'); await pause(150);
    const mobile = frame.contentDocument;
    check('390px mobile page has no horizontal overflow', mobile.documentElement.scrollWidth <= 390);
    document.getElementById('result').textContent = `${passed} browser checks passed`;
    document.title = `PASS ${passed} — HoverView browser acceptance`;
  } catch (error) { document.getElementById('result').textContent = `FAILED: ${error.message}`; document.title = 'FAIL — HoverView browser acceptance'; }
});
