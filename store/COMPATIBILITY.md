# Compatibility and quality verification — 1.0.2

This is a record of what was actually tested, not a claim that every website has been tested.

| Input / behavior | Verification |
| --- | --- |
| Ordinary image URLs on unrelated hosts | Original URL preserved, including paths that resemble a thumbnail suffix |
| Unrelated CDN query parameters | Width, quality and token parameters unchanged |
| srcset / Retina density | Larger declared sources take precedence over lazy data-src thumbnails |
| picture elements | Matching media sources preferred; non-matching sources ignored |
| CSS image backgrounds / image-file links | Source detection retained and original-CDN candidates added |
| Inline data images / blob images | Valid image URLs retained; no unnecessary CDN rewrite |
| Pinterest / X / Wikimedia | Existing original-source selection passes both URL and complete resolver tests |
| AliExpress legacy alicdn.com images | Size/quality/format suffix variants resolved to the original file path |
| AliExpress current aliexpress-media.com images | 220px WebP/AVIF, PNG, quality-only and format-only suffix cases covered |
| Signed AliExpress sources | Signature/credential/expiry parameters prevent rewriting |
| OSS processing | Size/quality/format operations removed; unrelated operations and parameters retained |
| Failed original / fast pointer changes | Working-source fallback and stale-request cancellation verified |
| Decoding / empty previews | Decode failures, slow decoding, loaded-node reuse, transparent placeholders and canvas restrictions covered; genuine black images are retained |
| Stationary pointer / dynamic pages | Unrelated scroll, storage, focus and resize preserved; lazy source and DOM replacement refreshed; actual exit closes |
| Actual browser UI | Real image loading, original dimensions, native popover, pin/focus, zoom, rotate, reset, Escape, light theme and preference updates verified with test API adapters |
| Website mobile layout | 390px frame has no horizontal overflow |

**103 dependency-free checks pass** in the controlled DOM model. The real Chrome fixture passes **21 browser checks**. Screenshots use the shipped viewer/popup source code and a small test-only extension API adapter, not a separate mock viewer.

The reported screenshot shows an original size of 220×220 in the existing viewer. The code had no AliExpress CDN resolver, so it accepted the small source before showing the enlarged preview. The new rule supplies an original candidate and keeps the existing source as fallback. Test responses explicitly model a 1600×1600 original and a 220×220 thumbnail, as well as original-loading failure.

**Not verified:** direct behavior on the user's specific AliExpress product page. The browser's site-safety policy rejected observing that page. No alternate browser, proxy, mirror or fetched copy was used to bypass the restriction. The specific page and a full Chrome extension installation still need a manual check on the user's own computer.

Site-specific Canvas galleries, closed shadow trees, signed URLs and protected image servers may remain unsupported. A small source cannot be made sharper if no larger accessible source exists.

## Version 1.0.2 empty / disappearing preview report

The supplied screenshot shows an empty checkerboard viewport reporting 300×300. It does not identify the actual image URL. The previous implementation loaded a probe but displayed a second image node without waiting for its decoding. It also accepted large transparent placeholders and dismissed previews on every captured scroll event, including unrelated auto-scrolling elements.

The update reuses the decoded node, checks fully transparent pixels locally where canvas access permits it, falls back on decode failure, and checks the pointer/source relationship before closing on page events. Browser regressions use project-owned SVG fixtures, including an empty 300×300 SVG and a broken source. The exact live page has not been verified, and no claim is made that all black-image causes on all sites are solved.
