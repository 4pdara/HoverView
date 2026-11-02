/* No dependencies: exercise the real modules and content-event handlers in a
   controlled DOM model. This does not replace a Chrome installation test. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const base = path.join(__dirname, '..');
let passed = 0;
function check(label, run) { run(); passed++; console.log(`PASS ${label}`); }
const listeners = new Map(), storageListeners = [], images = [];
const values = { delay: 0 };
const probeResponses = new Map();
class Element {
  constructor(tag = 'div', attrs = {}) {
    this.tagName = tag.toUpperCase(); this.attrs = { ...attrs }; this.children = [];
    this.parentElement = null; this.style = {}; this.textContent = ''; this.hidden = false;
    this.isConnected = true; this.width = 160; this.height = 100; this.className = '';
    this.classList = {
      contains: x => this.className.split(' ').includes(x),
      add: x => { if (!this.classList.contains(x)) this.className += ` ${x}`; },
      remove: x => { this.className = this.className.split(' ').filter(v => v !== x).join(' '); },
      toggle: (x, force) => { if (force ?? !this.classList.contains(x)) this.classList.add(x); else this.classList.remove(x); }
    };
    this.events = new Map();
  }
  get src() { return this.attrs.src || ''; } set src(v) { this.attrs.src = v; }
  get srcset() { return this.attrs.srcset || ''; }
  get alt() { return this.attrs.alt || ''; } set alt(v) { this.attrs.alt = v; }
  get clientWidth() { return parseFloat(this.style.width) || this.width; }
  get clientHeight() { return parseFloat(this.style.height) || this.height; }
  getAttribute(k) { return this.attrs[k] ?? null; }
  setAttribute(k, v) { this.attrs[k] = String(v); if (k === 'class') this.className = v; if (k === 'hidden') this.hidden = true; }
  removeAttribute(k) { delete this.attrs[k]; }
  append(...children) { for (const child of children) { child.parentElement = this; this.children.push(child); } }
  matches(selector) { return selector.split(',').some(s => { s = s.trim(); return s.startsWith('.') ? this.classList.contains(s.slice(1)) : this.tagName.toLowerCase() === s.split('[')[0] && (!s.includes('[href]') || Boolean(this.attrs.href)) && (!s.includes('[srcset]') || Boolean(this.attrs.srcset)); }); }
  closest(selector) { return this.matches(selector) ? this : this.parentElement?.closest(selector) || null; }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  querySelectorAll(selector) { return this.children.flatMap(c => [...(c.matches(selector) ? [c] : []), ...c.querySelectorAll(selector)]); }
  getBoundingClientRect() { return { left: 50, top: 50, right: 50 + this.clientWidth, bottom: 50 + this.clientHeight, width: this.clientWidth, height: this.clientHeight }; }
  attachShadow() { this.testShadow = new Element('shadow-root'); return this.testShadow; }
  showPopover() { this.popoverShown = true; }
  addEventListener(type, fn) { this.events.set(type, [...(this.events.get(type) || []), fn]); }
  focus() { document.activeElement = this; }
  setPointerCapture() {}
}
class Probe extends Element {
  constructor() { super('img'); this.naturalWidth = 1600; this.naturalHeight = 1000; images.push(this); }
  set src(value) {
    this.attrs.src = value;
    if (value.includes('small')) { this.naturalWidth = 400; this.naturalHeight = 250; }
    const response = probeResponses.get(value);
    if (response?.width) { this.naturalWidth = response.width; this.naturalHeight = response.height; }
    setTimeout(() => (response?.error ?? value.includes('broken')) ? this.onerror?.() : this.onload?.(), 0);
  }
  get src() { return this.attrs.src; }
}
const body = new Element('body'), html = new Element('html'); html.append(body);
const document = {
  baseURI: 'https://example.test/gallery/', body, documentElement: html, activeElement: body,
  createElement: tag => new Element(tag), hidden: false,
  addEventListener(type, fn) { listeners.set(type, [...(listeners.get(type) || []), fn]); }
};
const windowEvents = new Map();
const context = vm.createContext({
  console, URL, Element, Image: Probe, document, location: { hostname: 'example.test' },
  setTimeout, clearTimeout, innerWidth: 1200, innerHeight: 900,
  requestAnimationFrame: fn => setTimeout(fn, 0),
  getComputedStyle: el => ({ backgroundImage: el.attrs.background || 'none' }),
  matchMedia: query => ({ matches: !query.includes('never') }),
  chrome: { runtime: { id: 'hoverview-test' }, storage: {
    local: { get: async defaults => ({ ...defaults, ...values }), set: async patch => {
      const changes = Object.fromEntries(Object.entries(patch).map(([k,v]) => [k, { oldValue: values[k], newValue: v }]));
      Object.assign(values, patch); for (const listener of storageListeners) listener(changes, 'local');
    } },
    onChanged: { addListener: fn => storageListeners.push(fn) }
  } }
});
context.window = { setTimeout, addEventListener: (type, fn) => windowEvents.set(type, fn), open: (...args) => { context.opened = args; } };
context.parent = { location: context.location };
for (const file of ['shared.js', 'sources.js']) vm.runInContext(fs.readFileSync(path.join(base, file), 'utf8'), context, { filename: file });
const S = context.HoverViewSources, H = context.HoverView;

check('safe relative image URL', () => assert.equal(S.safeURL('../large.png'), 'https://example.test/large.png'));
check('unsafe JavaScript URL rejected', () => assert.equal(S.safeURL('javascript:alert(1)'), null));
check('unsafe file URL rejected', () => assert.equal(S.safeURL('file:///private.png'), null));
check('HTML data URL rejected', () => assert.equal(S.safeURL('data:text/html,test'), null));
check('embedded image URL accepted', () => assert.equal(S.safeURL('data:image/png;base64,AA=='), 'data:image/png;base64,AA=='));
check('blob image URL accepted', () => assert.equal(S.safeURL('blob:https://example.test/abc'), 'blob:https://example.test/abc'));
check('bundled extension demo image allowed', () => assert.equal(S.safeURL('chrome-extension://hoverview-test/demo-assets/mountains.svg'), 'chrome-extension://hoverview-test/demo-assets/mountains.svg'));
check('foreign extension resources rejected', () => assert.equal(S.safeURL('chrome-extension://other-extension/private.png'), null));
check('srcset sorted by width', () => assert.equal(S.srcsetEntries('small.jpg 300w, full.jpg 1600w')[0].url, 'full.jpg'));
check('srcset sorted by density', () => assert.equal(S.srcsetEntries('one.jpg 1x, three.jpg 3x, two.jpg 2x')[0].url, 'three.jpg'));
check('srcset handles comma in embedded images', () => assert.equal(S.srcsetEntries('data:image/png;base64,AAAA 1x, large.png 2x')[1].url, 'data:image/png;base64,AAAA'));
check('srcset empty is safe', () => assert.equal(S.srcsetEntries('').length, 0));
check('settings clamp numeric ranges', () => assert.equal(H.normalize({ delay: -3, maxSize: 500 }).maxSize, 95));
check('settings reject invalid enums', () => assert.equal(H.normalize({ theme: '<script>', position: 'bad' }).theme, 'dark'));
check('settings reject invalid booleans', () => assert.equal(H.normalize({ enabled: 'false' }).enabled, true));
check('settings reject NaN', () => assert.equal(H.normalize({ delay: NaN }).delay, 350));
check('site keys normalized', () => assert.equal(H.siteKey('EXAMPLE.COM'), 'site:example.com'));
check('signed arbitrary CDN URLs unchanged', () => assert.equal(S.knownOriginal('https://cdn.example.test/img.jpg?w=100&sig=abc'), null));
check('X media original retained with format', () => assert.equal(S.knownOriginal('https://pbs.twimg.com/media/a?format=jpg&name=small'), 'https://pbs.twimg.com/media/a?format=jpg&name=orig'));
check('Pinterest original URL', () => assert.equal(S.knownOriginal('https://i.pinimg.com/236x/a/b.jpg'), 'https://i.pinimg.com/originals/a/b.jpg'));
check('Wikimedia bitmap original URL', () => assert.equal(S.knownOriginal('https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Photo.jpg/300px-Photo.jpg'), 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Photo.jpg'));
check('Wikimedia rendered documents not rewritten', () => assert.equal(S.knownOriginal('https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Map.svg/300px-Map.svg.png'), null));
check('AliExpress legacy CDN 220px original', () => assert.equal(S.knownOriginal('https://ae01.alicdn.com/kf/Example.jpg_220x220q75.jpg_.webp'), 'https://ae01.alicdn.com/kf/Example.jpg'));
check('AliExpress current CDN AVIF thumbnail original', () => assert.equal(S.knownOriginal('https://ae-pic-a1.aliexpress-media.com/kf/Example.jpg_220x220q75.jpg_.avif'), 'https://ae-pic-a1.aliexpress-media.com/kf/Example.jpg'));
check('AliExpress PNG size suffix original', () => assert.equal(S.knownOriginal('https://ae02.alicdn.com/kf/Example.png_80x80.png'), 'https://ae02.alicdn.com/kf/Example.png'));
check('AliExpress quality-only suffix original', () => assert.equal(S.knownOriginal('https://ae-pic-a1.aliexpress-media.com/kf/Example.jpg_Q90.jpg_.webp'), 'https://ae-pic-a1.aliexpress-media.com/kf/Example.jpg'));
check('AliExpress format-only suffix original', () => assert.equal(S.knownOriginal('https://ae-pic-a1.aliexpress-media.com/kf/Example.jpg_.webp'), 'https://ae-pic-a1.aliexpress-media.com/kf/Example.jpg'));
check('AliExpress unrelated query parameters retained', () => assert.equal(S.knownOriginal('https://ae01.alicdn.com/kf/Example.jpg_220x220.jpg?cache=123'), 'https://ae01.alicdn.com/kf/Example.jpg?cache=123'));
check('AliExpress OSS resizing query removed', () => assert.equal(S.knownOriginal('https://ae01.alicdn.com/kf/Example.jpg?x-oss-process=image%2Fresize%2Cw_220%2Fquality%2Cq_75&cache=123'), 'https://ae01.alicdn.com/kf/Example.jpg?cache=123'));
check('AliExpress OSS unrelated operations preserved', () => assert.equal(new URL(S.knownOriginal('https://ae01.alicdn.com/kf/Example.jpg?x-oss-process=image%2Fresize%2Cw_220%2Fwatermark%2Ctext_test')).searchParams.get('x-oss-process'), 'image/watermark,text_test'));
check('AliExpress signed URLs unchanged', () => assert.equal(S.knownOriginal('https://ae01.alicdn.com/kf/Example.jpg_220x220.jpg?Signature=secret&Expires=123'), null));
check('AliExpress untransformed source unchanged', () => assert.equal(S.knownOriginal('https://ae-pic-a1.aliexpress-media.com/kf/Example.jpg'), null));
check('Lookalike CDN host not rewritten', () => assert.equal(S.knownOriginal('https://alicdn.com.example.test/kf/Example.jpg_220x220.jpg'), null));
check('Unknown image suffix not stripped', () => assert.equal(S.knownOriginal('https://ae01.alicdn.com/kf/Example.jpg_backup.jpg'), null));
const aliThumb = 'https://ae-pic-a1.aliexpress-media.com/kf/Example.jpg_220x220q75.jpg_.avif';
const aliImage = new Element('img', { src: aliThumb, 'data-src': aliThumb, srcset: aliThumb + ' 1x, https://ae-pic-a1.aliexpress-media.com/kf/Example.jpg_960x960q75.jpg_.avif 2x' });
check('AliExpress original leads and stays deduplicated', () => {
  const urls = S.resolve(aliImage).candidates;
  assert.equal(urls[0], 'https://ae-pic-a1.aliexpress-media.com/kf/Example.jpg');
  assert.equal(urls.filter(url => url.endsWith('/Example.jpg')).length, 1);
  assert.ok(urls.includes(aliThumb));
});
check('Lazy thumbnail cannot outrank larger srcset', () => assert.equal(S.resolve(new Element('img', {src:'/small.jpg','data-src':'/small.jpg',srcset:'/full.jpg 1600w'})).candidates[0], 'https://example.test/full.jpg'));
check('AliExpress CSS background receives original candidate', () => assert.equal(S.resolve(new Element('div', { background: `url("${aliThumb}")` })).candidates[0], 'https://ae-pic-a1.aliexpress-media.com/kf/Example.jpg'));
check('AliExpress direct image link receives original candidate', () => assert.equal(S.resolve(new Element('a', {href:aliThumb})).candidates[0], 'https://ae-pic-a1.aliexpress-media.com/kf/Example.jpg'));
check('Ordinary CDN resize-looking path remains unchanged', () => assert.equal(S.resolve(new Element('img', {src:'https://images.example.test/item.jpg_220x220.jpg'})).candidates[0], 'https://images.example.test/item.jpg_220x220.jpg'));
check('Ordinary CDN quality and sizing queries remain unchanged', () => assert.equal(S.resolve(new Element('img', {src:'https://images.example.test/item.jpg?w=220&q=60&token=abc'})).candidates[0], 'https://images.example.test/item.jpg?w=220&q=60&token=abc'));
check('Pinterest image pipeline still prefers original', () => assert.equal(S.resolve(new Element('img', {src:'https://i.pinimg.com/236x/a/b.jpg'})).candidates[0], 'https://i.pinimg.com/originals/a/b.jpg'));
check('X image pipeline still prefers original', () => assert.equal(S.resolve(new Element('img', {src:'https://pbs.twimg.com/media/a?format=jpg&name=small'})).candidates[0], 'https://pbs.twimg.com/media/a?format=jpg&name=orig'));
check('Wikimedia image pipeline still prefers original', () => assert.equal(S.resolve(new Element('img', {src:'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Photo.jpg/300px-Photo.jpg'})).candidates[0], 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Photo.jpg'));
check('Embedded image pipeline keeps its original data URL', () => assert.equal(S.resolve(new Element('img', {src:'data:image/png;base64,AAAA'})).candidates[0], 'data:image/png;base64,AAAA'));
check('Blob image pipeline keeps its original URL', () => assert.equal(S.resolve(new Element('img', {src:'blob:https://example.test/abc'})).candidates[0], 'blob:https://example.test/abc'));
check('Responsive higher-density image keeps precedence', () => assert.equal(S.resolve(new Element('img', {src:'/small.jpg',srcset:'/small.jpg 1x, /retina.jpg 2x'})).candidates[0], 'https://example.test/retina.jpg'));
const matchingPicture = new Element('picture'), matchingSource = new Element('source', {srcset:'/picture-large.jpg 2400w'});
matchingSource.media = '(min-width: 1px)'; matchingPicture.append(matchingSource,new Element('img',{src:'/picture-small.jpg'}));
check('Matching picture source is still preferred', () => assert.equal(S.resolve(matchingPicture).candidates[0], 'https://example.test/picture-large.jpg'));
const thumbnail = new Element('img', { src: 'https://example.test/small.jpg', alt: 'Sample' });
body.append(thumbnail);
check('ordinary image resolved', () => assert.equal(S.resolve(thumbnail).candidates[0], thumbnail.src));
thumbnail.attrs.srcset = 'small.jpg 200w, full.jpg 1600w';
check('high resolution srcset preferred', () => assert.equal(S.resolve(thumbnail).candidates[0], 'https://example.test/gallery/full.jpg'));
thumbnail.attrs['data-original'] = '/original.jpg';
check('explicit original preferred', () => assert.equal(S.resolve(thumbnail).candidates[0], 'https://example.test/original.jpg'));
const tiny = new Element('img', { src: '/icon.png' }); tiny.width = tiny.height = 16;
check('small icons ignored', () => assert.equal(S.resolve(tiny), null));
const backdrop = new Element('div', { background: 'url("https://example.test/bg.jpg")' });
check('background image resolved', () => assert.equal(S.resolve(backdrop).candidates[0], 'https://example.test/bg.jpg'));
check('background option respected', () => assert.equal(S.resolve(backdrop, { includeBackgrounds: false }), null));
const link = new Element('a', { href: '/photo.png?size=full' });
check('direct image link resolved', () => assert.equal(S.resolve(link).candidates[0], 'https://example.test/photo.png?size=full'));
const picture = new Element('picture'), source = new Element('source', { srcset: 'huge.jpg 2400w' });
source.media = '(never)'; picture.append(source, new Element('img', { src: '/fallback.jpg' }));
check('nonmatching picture media ignored', () => assert.equal(S.resolve(picture).candidates[0], 'https://example.test/fallback.jpg'));

vm.runInContext(fs.readFileSync(path.join(base, 'content.js'), 'utf8'), context, { filename: 'content.js' });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
function emit(type, el, extra = {}) {
  const event = { pointerType: 'mouse', clientX: 200, clientY: 180, altKey: false, button: 0, relatedTarget: body,
    composedPath: () => [el, body, html], key: '', code: '', preventDefault() { this.prevented = true; }, stopPropagation() {}, ...extra };
  for (const fn of listeners.get(type) || []) fn(event);
  return event;
}
function viewer() { return html.children.find(el => el.attrs['data-hoverview'] !== undefined)?.testShadow; }
function panel() { return viewer()?.querySelector('.panel'); }
function key(k, code = k) { return emit('keydown', body, { key: k, code }); }
const patch = input => context.chrome.storage.local.set(input);
async function hover(el) { emit('pointerover', el); await pause(25); }
(async () => {
  await pause(5);
  await hover(thumbnail);
  check('hover creates visible viewer', () => assert.equal(panel().hidden, false));
  check('caption is text content', () => assert.equal(viewer().querySelector('.caption').textContent, 'Sample'));
  check('wheel zoom intercepts page scroll while viewing', () => assert.equal(emit('wheel', thumbnail, { deltaY: -100 }).prevented, true));
  check('wheel zoom updates zoom percentage', () => assert.match(viewer().querySelector('.dimensions').textContent, /112%/));
  key(' ', 'Space');
  check('space pins viewer as dialog', () => assert.equal(panel().attrs.role, 'dialog'));
  emit('pointerover', body);
  check('pinned image survives pointer leaving thumbnail', () => assert.equal(panel().hidden, false));
  key('r');
  check('rotation changes image transform', () => assert.match(viewer().querySelector('.image').style.transform, /rotate\(90deg\)/));
  key('0');
  check('reset restores zero rotation', () => assert.match(viewer().querySelector('.image').style.transform, /rotate\(0deg\)/));
  key('o');
  check('opening source uses noopener', () => assert.equal(context.opened[2], 'noopener,noreferrer'));
  key('Escape');
  check('Escape closes viewer', () => assert.equal(panel().hidden, true));
  emit('pointermove', thumbnail); await pause(20);
  check('Escape does not immediately reopen on same image', () => assert.equal(panel().hidden, true));
  emit('pointerover', body); await hover(thumbnail);
  check('leaving and returning restores hover', () => assert.equal(panel().hidden, false));
  emit('pointerdown', body);
  check('outside click closes viewer', () => assert.equal(panel().hidden, true));
  await patch({ enabled: false }); await hover(thumbnail);
  check('global disable suppresses preview', () => assert.equal(panel().hidden, true));
  await patch({ enabled: true, 'site:example.test': false }); await hover(thumbnail);
  check('site disable suppresses preview', () => assert.equal(panel().hidden, true));
  await patch({ 'site:example.test': true, requireAlt: true }); await hover(thumbnail);
  check('Alt mode waits for modifier', () => assert.equal(panel().hidden, true));
  key('Alt'); await pause(25);
  check('Alt press activates image already under cursor', () => assert.equal(panel().hidden, false));
  emit('keyup', body, { key: 'Alt' });
  check('Alt release closes unpinned viewer', () => assert.equal(panel().hidden, true));
  await patch({ requireAlt: false, zoomOnWheel: false }); await hover(thumbnail);
  check('wheel option preserves normal page scrolling', () => assert.equal(emit('wheel', thumbnail, { deltaY: 100 }).prevented, undefined));
  const input = new Element('input');
  check('typing in text input does not trigger image shortcuts', () => assert.equal(emit('keydown', input, { key: 'r' }).prevented, undefined));
  emit('scroll', body);
  check('page scroll closes unpinned viewer', () => assert.equal(panel().hidden, true));
  await patch({ delay: 35 }); await hover(thumbnail); emit('pointerover', body); await pause(40);
  check('leaving before delay cancels pending viewer', () => assert.equal(panel().hidden, true));
  await patch({ delay: 0 });
  const broken = new Element('img', { src: '/healthy.jpg', 'data-original': '/broken.jpg' }); body.append(broken);
  await hover(broken);
  check('failed original falls back to working thumbnail', () => assert.equal(viewer().querySelector('.image').src, 'https://example.test/healthy.jpg'));
  const previousLoads = images.length; emit('pointerover', body); await patch({ delay: 40 });
  await hover(thumbnail); await hover(broken); await pause(50);
  check('fast pointer change discards earlier request', () => assert.equal(viewer().querySelector('.image').src, 'https://example.test/healthy.jpg'));
  check('request count remains bounded', () => assert.ok(images.length - previousLoads <= 2));
  await patch({ theme: 'light', showInfo: false, delay: 0 }); await hover(thumbnail);
  check('light theme applied', () => assert.equal(panel().classList.contains('light'), true));
  check('information preference respected', () => assert.equal(viewer().querySelector('.info').hidden, true));
  document.hidden = true; emit('visibilitychange', body);
  check('hidden tabs release the viewer', () => assert.equal(panel().hidden, true));
  document.hidden = false;
  await patch({ delay: 0 });
  const aliOriginal = 'https://ae-pic-a1.aliexpress-media.com/kf/Example.jpg';
  probeResponses.set(aliOriginal, {width:1600,height:1600});
  probeResponses.set(aliThumb, {width:220,height:220});
  const aliHover = new Element('img', {src:aliThumb}); body.append(aliHover);
  await hover(aliHover);
  check('AliExpress hover loads original instead of 220px thumbnail', () => assert.equal(viewer().querySelector('.image').src, aliOriginal));
  check('AliExpress hover reports true original dimensions', () => assert.match(viewer().querySelector('.dimensions').textContent, /1600 × 1600/));
  emit('pointerover', body);
  probeResponses.set(aliOriginal, {error:true}); await hover(aliHover);
  check('AliExpress blocked original falls back to visible thumbnail', () => assert.equal(viewer().querySelector('.image').src, aliThumb));
  check('AliExpress fallback dimensions remain accurate', () => assert.match(viewer().querySelector('.dimensions').textContent, /220 × 220/));
  emit('pointerover', body);
  check('manifest is v3 with local scripts', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(base, 'manifest.json')));
    assert.equal(manifest.manifest_version, 3);
    assert.deepEqual(manifest.permissions, ['storage', 'activeTab']);
    for (const file of [...manifest.content_scripts[0].js, manifest.background.service_worker, manifest.action.default_popup, ...Object.values(manifest.icons)]) assert.ok(fs.existsSync(path.join(base, file)), file);
  });
  console.log(`\n${passed} checks passed. DOM model tests; real Chrome loading still requires manual verification.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
