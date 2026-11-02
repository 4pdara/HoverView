# Validation — version 1.0.1

Date: 2026-11-02

## Completed

- JavaScript syntax checks with `node --check` for the content script, image source resolver, popup, service worker and shared preferences module.
- `node tests/run.cjs`: **88 checks passed** against the actual JavaScript modules in a controlled DOM model.
- Tested URL validation, srcset ordering, picture media filtering, known CDN original selection, thumbnail fallback and preference normalization.
- Tested hover activation and delay cancellation, stale request cancellation, Escape suppression, pinning, wheel zoom, rotation, reset, safe new-tab options, global/site disabling, Alt mode, text-input shortcut isolation, light theme and hidden-tab cleanup.
- Manifest V3 parsed successfully; declared script, popup and icon resources checked for existence.

## Verification limits

These checks use a DOM model, not a running installed Chrome extension. They do not establish real browser layout, extension permission behavior, service-worker lifecycle or compatibility with third-party websites.

A managed Chrome preview was used to run `tests/browser.html` with the real content-script modules and a small `chrome.storage` API adapter. **13 browser checks passed**: real SVG loading and dimensions, native popover rendering, viewport containment, pin/focus, keyboard zoom, rotation, reset, Escape, dismissal suppression, live disabling, light theme, and a 390px mobile website viewport without horizontal overflow.

The marketing website was also visually inspected in Chrome. Image demo pinning, light-theme switching, closing and FAQ expansion were exercised. The early mobile overflow found by the browser fixture was repaired and the fixture passed afterward.

The browser fixture does not install an extension: actual Chrome extension permissions, popup/service-worker lifecycle and third-party-site compatibility remain manual checks. The test runner uses a Run button so initial browser navigation/focus events do not race the synthetic hover sequence.

## Manual Chrome acceptance check

1. Load the extension folder through `chrome://extensions` using Developer mode and Load unpacked.
2. Confirm that the extension card has no manifest or runtime errors.
3. Pin the extension action and open its settings popup. Change delay, size, theme and Alt mode; reopen the popup and verify persistence.
4. Open the bundled demo through the popup. Test all three images, Space to pin, wheel and button zoom, drag, R, 0 and Escape. Verify positioning near viewport edges and after resizing.
5. Reload a normal website tab, test hover, and disable the site in the popup. Verify that another site remains enabled.
6. Test global disabling with the popup and `Alt+Shift+H`. Confirm the OFF badge and verify that no image preview opens.
7. Test a broken original source with a working displayed thumbnail, an image with srcset, dynamic image insertion and an iframe.
8. Verify that Chrome internal pages and the Chrome Web Store remain unsupported and that the popup explains this restriction.

The extension is an independent initial implementation. It has not been submitted to the Chrome Web Store or certified against all sites supported by PhotoShow.

## Version 1.0.1 regression expansion

88 checks pass, including AliExpress original-size selection (modeled 1600×1600 original versus 220×220 thumbnail), failure fallback, srcset/lazy priority, CSS backgrounds and image links, unchanged unrelated/signed URLs, and the existing Pinterest/X/Wikimedia pipeline. The Chrome fixture was rerun after the fix. See ../store/COMPATIBILITY.md for the tested matrix and the blocked direct AliExpress-page check.
