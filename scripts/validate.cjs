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
console.log('PASS syntax, Manifest V3, version alignment, website links, HTML resources and documentation');
