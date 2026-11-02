#!/usr/bin/env python3
"""Stage real extension modules for browser captures using test-only API adapters."""
from pathlib import Path
import shutil
import sys
root=Path(__file__).resolve().parents[1]
out=Path(sys.argv[1]).resolve()
if not out.is_dir(): out.mkdir(parents=True)
shutil.copytree(root/'extension',out/'extension',dirs_exist_ok=True)
shutil.copytree(root/'website',out/'website',dirs_exist_ok=True)
(out/'tests').mkdir(exist_ok=True)
for name in ['store-capture.html','store-capture.css','store-api-adapter.js','store-capture.js','browser.html','browser.js']:
    shutil.copyfile(root/'tests'/name,out/'tests'/name)
popup=out/'extension/popup.html'
popup.write_text(popup.read_text().replace('<script src="shared.js" defer>', '<script src="../tests/store-api-adapter.js"></script>\n  <script src="shared.js" defer>'))
print(str(out/'tests/store-capture.html'))
