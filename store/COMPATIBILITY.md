# Compatibility and quality verification — 1.0.1

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
| Actual browser UI | Real image loading, original dimensions, native popover, pin/focus, zoom, rotate, reset, Escape, light theme and preference updates verified with test API adapters |
| Website mobile layout | 390px frame has no horizontal overflow |

**88 dependency-free checks pass** in the controlled DOM model. The real Chrome fixture passes **13 browser checks**. Screenshots use the shipped viewer/popup source code and a small test-only extension API adapter, not a separate mock viewer.

The reported screenshot shows an original size of 220×220 in the existing viewer. The code had no AliExpress CDN resolver, so it accepted the small source before showing the enlarged preview. The new rule supplies an original candidate and keeps the existing source as fallback. Test responses explicitly model a 1600×1600 original and a 220×220 thumbnail, as well as original-loading failure.

**Not verified:** direct behavior on the user's specific AliExpress product page. The browser's site-safety policy rejected observing that page. No alternate browser, proxy, mirror or fetched copy was used to bypass the restriction. The specific page and a full Chrome extension installation still need a manual check on the user's own computer.

Site-specific Canvas galleries, closed shadow trees, signed URLs and protected image servers may remain unsupported. A small source cannot be made sharper if no larger accessible source exists.
