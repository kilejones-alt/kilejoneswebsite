# Kile Jones — production homepage

Production site: https://kilejones.com/

Hosting: GitHub Pages from `main`.

Primary domain:
- `kilejones.com`
- `www.kilejones.com` resolves to the primary domain.

Former domain:
- `kilebardenjones.com`
- `www.kilebardenjones.com`
- Redirects are handled by the separate repository `kilejones-alt/kilebardenjones-redirect`, preserving path, query string, and hash.

## Current homepage renderer

The production homepage uses Run 9 (`nothin-final-refinement`) by default. Older `?try=1..8` modes remain available only for regression comparison.

The hero keeps the KILE / JONES typography fixed and front-facing while animated 3D material worlds move inside the glyph masks. The rabbit and rhino also have full-viewport figure scenes below the hero, where their forms are readable at desktop and phone sizes.

The two full-viewport figure assets are original generated raster artwork, self-hosted in `assets/`. Their gentle float uses CSS transforms; they are not animated 3D models. Each image loads lazily when its section approaches the viewport, and the hidden WebGL hero stops drawing while the gallery is on screen.

The renderer uses:
- `script.js` — production state, pointer/inertia, adaptive quality governor, fallbacks.
- `hero-object-worlds.js` — original WebGL2 3D object worlds.
- `hero-gpu.js` — GPU compositing/fluid layer and strict glyph containment.
- `hero-webgl.js`, `hero-stage.js`, `hero-scenes.js` — retained progressive/fallback infrastructure.

Run 9 is optimized for desktop and mobile, including iOS/Safari-specific GPU limits, lazy mesh construction, adaptive resolution, context-loss recovery, orientation/history recovery, and strict glyph-edge containment.

## Production pages

- `/` — homepage.
- `/media.html` — interviews, conversations, and appearances.
- `/sitemap.xml` — production sitemap.
- `/robots.txt` — crawler policy and sitemap discovery.

The obsolete `index (1).html` Projects page has been removed from production.

## QA

GitHub Actions validates:
- JavaScript syntax.
- Primary navigation and approved destinations.
- Run 9 production defaults and adaptive/iOS safeguards.
- Root and phone rendering smoke tests.
- `kilejones.com` CNAME and canonical URLs.
- Sitemap presence.
- Absence of the former domain in production files.
- Absence of the obsolete Projects page.

## Important maintenance rules

- Keep `CNAME` set to `kilejones.com`.
- Do not reintroduce `kilebardenjones.com` into production canonical, Open Graph, Twitter, robots, or sitemap metadata.
- Keep the former-domain redirect logic isolated in `kilebardenjones-redirect`.
- Preserve the current Run 9 hero unless a deliberate visual revision is requested.
- Preserve mobile/iOS performance safeguards when changing the renderer.
