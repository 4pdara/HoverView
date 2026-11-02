const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const ext = path.join(root, 'extension');
const manifest = JSON.parse(fs.readFileSync(path.join(ext, 'manifest.json')));
assert.equal(manifest.manifest_version, 3);
assert.equal(manifest.name, 'HoverView — הגדלת תמונות');
assert.equal(manifest.version, JSON.parse(fs.readFileSync(path.join(root, 'package.json'))).version);
for (const file of ['shared.js', 'sources.js', 'content.js', 'popup.js', 'background.js']) {
  const source = fs.readFileSync(path.join(ext, file), 'utf8');
  new vm.Script(source, { filename: file });
  assert.ok(!/\beval\s*\(|new Function\s*\(/.test(source), 'No dynamic code execution');
}
function checkHTML(folder, name) {
  const source = fs.readFileSync(path.join(folder, name), 'utf8');
  const ids = [...source.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length, `Duplicate IDs in ${name}`);
  for (const match of source.matchAll(/(?:src|href)="([^"#]+)"/g)) {
    const resource = match[1];
    if (/^(?:https?:|mailto:|data:)/.test(resource)) continue;
    assert.ok(fs.existsSync(path.join(folder, resource.split('#')[0])), `Missing ${resource} in ${name}`);
  }
  assert.ok(!/<script[^>]*>\s*[^<\s]/.test(source), 'Keep inline scripts out of HTML');
}
checkHTML(ext, 'popup.html'); checkHTML(ext, 'demo.html');
const site = path.join(root, 'website');
for (const page of ['index.html', 'privacy.html', '404.html']) checkHTML(site, page);
new vm.Script(fs.readFileSync(path.join(site, 'site.js'), 'utf8'));
new vm.Script(fs.readFileSync(path.join(root, 'tests/browser.js'), 'utf8'));
checkHTML(path.join(root, 'tests'), 'browser.html');
assert.ok(fs.existsSync(path.join(site, 'assets/social.png')));
assert.ok(fs.existsSync(path.join(root, 'README.md')));
assert.ok(fs.existsSync(path.join(root, 'CHANGELOG.md')));
assert.ok(fs.existsSync(path.join(root, 'LICENSE')));
assert.ok(manifest.description.length <= 132);
assert.equal(manifest.homepage_url, 'https://4pdara.github.io/HoverView/');
for (const file of ['browser.js','store-capture.js','store-api-adapter.js']) new vm.Script(fs.readFileSync(path.join(root,'tests',file),'utf8'));
checkHTML(path.join(root,'tests'),'store-capture.html');
for (const [name,width,height] of [
  ['icon-128.png',128,128],['screenshot-01-hover.png',1280,800],
  ['screenshot-02-pinned.png',1280,800],['screenshot-03-settings.png',1280,800],
  ['promo-440x280.png',440,280],['marquee-1400x560.png',1400,560]
]) {
  const data=fs.readFileSync(path.join(root,'store/assets',name));
  assert.equal(data.subarray(0,8).toString('hex'),'89504e470d0a1a0a',name);
  assert.equal(data.readUInt32BE(16),width,name); assert.equal(data.readUInt32BE(20),height,name);
}
for(const name of ['UPLOAD-GUIDE.he.md','listing.he.txt','listing.en.txt','PRIVACY-AND-PERMISSIONS.md','REVIEWER-INSTRUCTIONS.txt','COMPATIBILITY.md']) assert.ok(fs.existsSync(path.join(root,'store',name)),name);
console.log('PASS syntax, Manifest V3, versions, website/HTML resources, documentation, store assets and image dimensions');
