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

The hero keeps the KILE / JONES typography fixed and front-facing while six art-directed sculpture plates move gently inside the glyph masks. Below it, each sculpture has a full-viewport scene where its form is readable on desktop and phone. The sequence is midnight ceramic, pink rabbit, amber resin, black rhino, folded glass, and silver foil ZIO. The earlier procedural stars and two ring/sphere scenes were removed.

All six art assets are original generated raster cutouts with alpha transparency, self-hosted in `assets/`. The hero uses subtle pointer parallax and timed crossfades; the gallery uses restrained CSS float. These are not animated 3D models. The gallery images load lazily as their sections approach the viewport, and the hidden hero stops drawing while the gallery is on screen. No paid assets or services are required.

The renderer uses:
- `script.js` — production state, pointer/inertia, adaptive quality governor, fallbacks.
- `hero-art-plates.js` — six self-hosted sculpture plates and pointer movement.
- `hero-gpu.js` — GPU compositing/fluid layer and strict glyph containment.
- `hero-webgl.js`, `hero-stage.js`, `hero-scenes.js` — retained progressive/fallback infrastructure.

Run 9 retains desktop and mobile safeguards, including iOS/Safari GPU limits, adaptive resolution, context-loss recovery, orientation/history recovery, and strict glyph-edge containment.

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
- Preserve the six-scene art direction unless a deliberate visual revision is requested.
- Preserve mobile/iOS performance safeguards when changing the renderer.
