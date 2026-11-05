# Changelog

## 1.0.2 — 2026-11-05

- Decode candidate images before display and reuse the loaded image node to avoid a second request and empty previews.
- Skip fully transparent placeholders where local canvas access permits inspection; fall back after load or decode failures.
- Preserve stationary previews during unrelated scrolling, storage changes, visible-page focus changes and layout resizing. Close when the source actually leaves the pointer.
- Refresh lazy sources and replaced thumbnails without requiring pointer movement. Recognize additional lazy/original source attributes.
- Update website downloads, release documentation, store submission materials and screenshots.
- Verify 103 controlled DOM checks and 21 real Chrome fixture checks. Full extension installation and the specific AliExpress page remain manual checks.

## 1.0.1 — 2026-11-02

- Fix AliExpress original-image selection for alicdn.com and aliexpress-media.com thumbnail URLs, including WebP/AVIF size and quality suffixes.
- Prefer responsive full-size sources over lazy-loading thumbnails; apply CDN upgrades to CSS backgrounds and image links.
- Preserve signed URLs, unrelated transformations and thumbnail fallback when the original is unavailable.
- Add dedicated Chrome Web Store upload ZIPs, a submission kit, store screenshots, promotional artwork and copy-ready listing/privacy/reviewer text.
- Expand regression coverage to 88 checks.

## 1.0.0 — 2026-11-02

First HoverView release.

- Large image preview on hover, with configurable delay and viewport size.
- Higher-resolution source selection from direct image links, data attributes, srcset and picture elements, with fallback on load failure.
- Zoom, pinning, drag-to-pan, rotation, keyboard navigation and safe open-in-new-tab behavior.
- Hebrew RTL settings, dark/light preview themes, Alt-only mode and per-site controls.
- Manifest V3 with storage and activeTab permissions; no analytics or external processing service.
- Included demo, installation guide, privacy policy, dependency-free tests and reproducible ZIP packaging.
- Hebrew marketing site with an interactive product demonstration and installation instructions.

### Verification

Automated logic checks pass. Browser and website verification details are recorded in `extension/VALIDATION.md`.
