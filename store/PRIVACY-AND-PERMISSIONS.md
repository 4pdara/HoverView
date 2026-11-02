# Chrome Web Store privacy fields — HoverView 1.0.1

These answers describe the current source code. They are intended for the publisher to copy into the dashboard and review before certifying. Account identity, trader status and legal certifications are the publisher's own declarations; no identity or contact details are invented here.

## Single purpose — copy into Single purpose description

Display larger versions of images on hover, with related viewing controls such as zoom, pin, pan and rotate, while the user remains on the current web page.

## storage — copy into the permission justification

Stores only the user's viewer preferences and per-host enable/disable choices in chrome.storage.local. This lets the same settings apply across tabs and browser restarts. No browsing log or image content is saved to extension storage and no settings are sent to an extension-operated server or synced by this extension.

## activeTab — copy into the permission justification

When the user opens the extension action popup, reads the active tab URL to display its hostname and provide the enable/disable switch for that specific host. It is not used to read browser history, capture tabs, access page credentials or transmit browsing activity to the developer.

## Website access / content-script matches — copy into host access justification

Content scripts run on HTTP and HTTPS pages so the extension can inspect image elements, responsive image sources, linked image URLs, captions and CSS image backgrounds under the user's pointer and render the enlarged viewer inside that page. Hover preview is intended to work across ordinary websites. Image loading uses the browser's normal image requests to the original image host, not a developer-operated proxy. Users can turn the feature off globally or for an exact hostname. Frames run within their own document and obey the same feature settings.

## Remote code

Select **No, I am not using remote code** for the current build. All executable JavaScript and CSS ship in the extension ZIP. Loading a remote image for preview is not executing remote JavaScript. The extension does not use eval, new Function, remote scripts, a remote configuration service or a remote code loader.

## Data handling disclosure

Do not use a blanket claim that the extension never handles user data. It reads website image content and the active hostname locally, and keeps per-host preferences. Google's User Data FAQ explicitly includes local processing/storage.

Recommended categories for the current dashboard, where these labels are offered:

| Category | Current behavior |
| --- | --- |
| Website content | Image addresses, image captions/alt text and image backgrounds are read locally to provide previews. Image pixels are loaded by the browser from the source server. |
| Web history / web browsing activity | The current tab hostname is read when opening settings; per-host enable/disable preferences retain those hostnames locally. No chronological visit history is maintained or transmitted to the developer. |

Disclose these two categories with the local-processing details above. Do not select categories such as payment information, health information, personal communications, authentication credentials or precise location merely because a page might contain them: the extension does not collect those fields. Image content itself can be user-provided content; it is not analyzed or retained by the extension.

Purpose: **App functionality / providing the user-facing hover preview and site settings**. If a separate question asks specifically about transmission to the developer or analytics, the answer for this build is no.

Limited-use certifications supported by the code:

- User data is not sold or transferred to third parties for unrelated purposes.
- The extension does not use user data for advertising, creditworthiness or lending decisions.
- Access is limited to the disclosed image-viewing purpose and its related settings.

The publisher must personally confirm the dashboard certifications after reviewing them. Do not select optional certifications that do not accurately describe how you later modify or operate the extension.

## Public URLs

Privacy policy: https://4pdara.github.io/HoverView/privacy.html

Website: https://4pdara.github.io/HoverView/

Support: https://github.com/4pdara/HoverView/issues

## Third-party requests

Image servers may receive normal image requests, including IP, referrer and cookies under the browser/site policy. HoverView does not read cookie values. A click on Open image creates a normal new-tab navigation with noopener/noreferrer. The GitHub Pages website and GitHub support pages are subject to their respective hosting policies.

## Official references checked 2026-11-02

- https://developer.chrome.com/docs/webstore/cws-dashboard-privacy
- https://developer.chrome.com/docs/webstore/program-policies/user-data-faq
- https://developer.chrome.com/docs/webstore/program-policies/policies
