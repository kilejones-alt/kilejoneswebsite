# Kile B. Jones homepage

Upload these five files directly to the repository root:

- `index.html`
- `styles.css`
- `script.js`
- `music.mp3`
- `README.md`

The Glossary pill links to the live Antizionist Glossary. Music uses the included MP3, attempts autoplay, retries on pointer movement, and reliably starts after the first browser-approved user activation such as a click, tap, keypress, or wheel gesture.


## Progressive GPU renderer experiment (development branch only)

The original file `hero-webgl.js` and Canvas 2D path in `script.js` are intentionally retained as progressive fallbacks. `hero-gpu.js` is an independent WebGL2 video-texture compositor using the existing glyph mask, cursor injection, an iterative pressure-projection fluid pass, and binary fluid-field reveal between video treatments. It does **not** replicate or contain proprietary Noth.in source, nor does it introduce a true modeled 3D scene yet.

This experiment keeps KILE B. / JONES, the original MP4 and MP3 URLs, all five existing destinations, and the menu UI. No original objects, fonts, or assets have been deleted.

### Test instructions

1. Open the development branch's `index.html` on a secure HTTP origin. Do not test via `file://`.
2. Move the mouse across the letters; inspect `window.__KBJ_DIAGNOSTICS` for `renderer`, `gpu.status`, and frame rate.
3. Verify video playback, pause/play Music, open/close Menu, and visit all five destinations.
4. Test iPhone Safari, laptop Chrome/Safari, and desktop Chrome/Firefox, including reduced motion.
5. The CDN-hosted MP4 must send permissive cross-origin headers for the GPU path. If it does not, or when WebGL2 fails, the original 2D renderer continues automatically. The CDN's CORS behavior has not been independently confirmed.

The fluid algorithm is a new bespoke implementation informed by public research on fluid masking and pressure solving; no source from the reference projects was copied. Visual fidelity to Noth.in has **not** been verified. This is the first engineering integration, not a final visual sign-off.
