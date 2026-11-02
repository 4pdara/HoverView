#!/usr/bin/env python3
"""Build reproducible, installable extension ZIPs without third-party packages."""
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
archive = OUT / f'hoverview-v{VERSION}.zip'
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as bundle:
    for item in sorted(EXTENSION.rglob('*')):
        if not item.is_file() or 'tests' in item.relative_to(EXTENSION).parts:
            continue
        name = 'hoverview/' + item.relative_to(EXTENSION).as_posix()
        info = zipfile.ZipInfo(name, (2026, 1, 1, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o100644 << 16
        bundle.writestr(info, item.read_bytes())
with zipfile.ZipFile(archive) as bundle:
    assert bundle.testzip() is None
    manifest = json.loads(bundle.read('hoverview/manifest.json'))
    assert manifest['version'] == VERSION
    for file in [*manifest['content_scripts'][0]['js'], manifest['background']['service_worker'], manifest['action']['default_popup'], *manifest['icons'].values()]:
        assert 'hoverview/' + file in bundle.namelist(), file
stable = OUT / 'hoverview.zip'
shutil.copyfile(archive, stable)
checksums = ''.join(f'{hashlib.sha256(file.read_bytes()).hexdigest()}  {file.name}\n' for file in (archive, stable))
(OUT / 'SHA256SUMS.txt').write_text(checksums)
downloads = ROOT / 'website' / 'downloads'
downloads.mkdir(parents=True, exist_ok=True)
shutil.copyfile(stable, downloads / 'hoverview.zip')
print(json.dumps({'version': VERSION, 'archive': str(archive), 'size_bytes': archive.stat().st_size, 'checksums': checksums.strip()}))
