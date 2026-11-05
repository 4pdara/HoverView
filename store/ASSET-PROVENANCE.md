# Store asset provenance

- `screenshot-01-hover.png`, `screenshot-02-pinned.png` and `screenshot-03-settings.png` are 1280×800 crops of browser screenshots, without generative edits or replacement of product controls.
- The viewer is the actual `extension/content.js`; the settings frame uses the actual `extension/popup.html`, CSS and JavaScript. Test-only adapters provide storage and current-tab metadata without installing software into the user's browser.
- The three gallery illustrations were authored as SVG files for this project and ship with its demo. No screenshots or product photographs supplied by the user are included in the public assets.
- The capture harness lives in `tests/store-capture.*` and is staged with `python3 scripts/prepare-store-preview.py <temporary-directory>`. It is excluded from all extension ZIPs.
- The promotional PNGs are original, simple brand artwork at 440×280 and 1400×560. They make no rankings, approval or endorsement claims.
- The icon is the project's original brand mark, centered within a 128×128 transparent PNG with at least 16px clear padding on each side.
- These assets represent version 1.0.2. Re-capture the viewer/settings if a later version materially changes them.
