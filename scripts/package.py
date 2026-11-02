#!/usr/bin/env python3
"""Build reproducible manual-install and Chrome Web Store ZIPs."""
import hashlib
import json
import re
import shutil
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXTENSION = ROOT / 'extension'
VERSION = json.loads((EXTENSION / 'manifest.json').read_text())['version']
if not re.fullmatch(r'\d+\.\d+\.\d+(?:\.\d+)?', VERSION):
    raise SystemExit('Invalid manifest version')
OUT = ROOT / 'artifacts'
OUT.mkdir(exist_ok=True)
def write_zip(target, files):
    with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as bundle:
      for name, item in files:
        info = zipfile.ZipInfo(name, (2026, 1, 1, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o100644 << 16
        bundle.writestr(info, item.read_bytes())
runtime = [item for item in sorted(EXTENSION.rglob('*')) if item.is_file() and 'tests' not in item.relative_to(EXTENSION).parts]
archive = OUT / f'hoverview-v{VERSION}.zip'
write_zip(archive, [('hoverview/' + item.relative_to(EXTENSION).as_posix(), item) for item in runtime])
webstore = OUT / f'hoverview-webstore-v{VERSION}.zip'
write_zip(webstore, [(item.relative_to(EXTENSION).as_posix(), item) for item in runtime if item.name not in {'README.md', 'VALIDATION.md'}])
for file, prefix in ((archive, 'hoverview/'), (webstore, '')):
    with zipfile.ZipFile(file) as bundle:
        assert bundle.testzip() is None
        manifest = json.loads(bundle.read(prefix + 'manifest.json'))
        assert manifest['version'] == VERSION
        for name in [*manifest['content_scripts'][0]['js'], manifest['background']['service_worker'], manifest['action']['default_popup'], *manifest['icons'].values()]:
            assert prefix + name in bundle.namelist(), name
stable = OUT / 'hoverview.zip'
shutil.copyfile(archive, stable)
store_stable = OUT / 'hoverview-webstore.zip'
shutil.copyfile(webstore, store_stable)
store_dir = ROOT / 'store'
required = ['UPLOAD-GUIDE.he.md', 'listing.he.txt', 'listing.en.txt', 'PRIVACY-AND-PERMISSIONS.md', 'REVIEWER-INSTRUCTIONS.txt', 'assets/icon-128.png', 'assets/screenshot-01-hover.png', 'assets/screenshot-02-pinned.png', 'assets/screenshot-03-settings.png', 'assets/promo-440x280.png', 'assets/marquee-1400x560.png']
for name in required:
    assert (store_dir / name).is_file(), f'Missing store submission material: {name}'
kit = OUT / f'hoverview-store-kit-v{VERSION}.zip'
kit_files = [('upload/' + webstore.name, webstore)] + [('materials/' + f.relative_to(store_dir).as_posix(), f) for f in sorted(store_dir.rglob('*')) if f.is_file()]
write_zip(kit, kit_files)
packages = (archive, stable, webstore, store_stable, kit)
checksums = ''.join(f'{hashlib.sha256(file.read_bytes()).hexdigest()}  {file.name}\n' for file in packages)
(OUT / 'SHA256SUMS.txt').write_text(checksums)
downloads = ROOT / 'website' / 'downloads'
downloads.mkdir(parents=True, exist_ok=True)
shutil.copyfile(stable, downloads / 'hoverview.zip')
print(json.dumps({'version': VERSION, 'packages': [{'path': str(file), 'size_bytes': file.stat().st_size} for file in packages], 'checksums': checksums.strip()}))
