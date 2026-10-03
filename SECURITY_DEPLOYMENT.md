# Security / protection setup

## What is protected now

- Content Security Policy restricts scripts, media, fonts, frames, objects, and network connections.
- Framing is denied to reduce clickjacking.
- Referrer leakage is reduced to same-origin.
- Browser capabilities such as camera, microphone, geolocation, payment, and USB are disabled by policy.
- MIME sniffing is disabled on hosts that honor the included headers.
- Cross-origin isolation headers reduce unwanted cross-origin use of page resources.
- `robots.txt` asks major AI/data crawlers not to crawl the site.
- No source maps are shipped.
- No sensitive or proprietary data should be placed in client-side JavaScript.

## Important limitation

A public website cannot make its visible text, images, CSS, or browser-delivered JavaScript impossible to copy. Anyone who can render a public page can inspect or capture what their browser receives. Right-click blocking, disabling selection, and JavaScript copy blockers are not real security and are intentionally not included because they harm usability and accessibility.

If logic or data becomes proprietary, keep it server-side behind authenticated API endpoints and send only the minimum result to the browser.

## When moving hosts

### Vercel
`vercel.json` already contains the hardening headers. Keep it in the project root.

### Netlify / Cloudflare Pages
`_headers` already contains equivalent response headers. Keep it in the publish root.

### Cloudflare in front of any host
Enable:
- Bot Fight Mode / Super Bot Fight Mode if available.
- Hotlink Protection for images/media.
- Rate limiting on any future API endpoints.
- Managed WAF rules.
- Always Use HTTPS.

Do not enable aggressive anti-bot challenges on the static homepage unless necessary; they can hurt legitimate visitors and search indexing.

## Font hosting
Inter Tight and IBM Plex Mono are served from this site itself. The included GitHub Action vendors them once from the official `google/fonts` repository at pinned commit `92345ac0dbb28d27dbd32f3a782e84c55eaac214`, converts them to WOFF2, and commits the generated assets. Runtime CSP therefore allows fonts only from `self`.

