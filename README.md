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
5. Production's cross-origin MP4 uses its original native HTML video element, masked through the current glyph canvas, while WebGL2 renders the fluid reveal with transparency above it. This avoids WebGL video-texture CORS restrictions without altering the MP4. Same-origin video can use GPU texture sampling directly. If WebGL2 is unavailable, the legacy Canvas 2D renderer remains available. Verify the native video and GPU overlay together on iPhone Safari.

The fluid algorithm is a new bespoke implementation informed by public research on fluid masking and pressure solving; no source from the reference projects was copied. Visual fidelity to Noth.in has **not** been verified. This is the first engineering integration, not a final visual sign-off.

### Verified browser finding

Chromium rejected direct WebGL video texture loading from the original CDN on 2026-10-19, even though a separate HTTP Range probe returned Access-Control-Allow-Origin: *. The native-video plus GPU-alpha route was added specifically to address this rather than assuming the synthetic-video shader test covered production conditions.


## Stage 2 — cinematic wordmark, true fluid precision and mobile framing

- \`hero-scenes.js\` adds six **cinematic treatments of the same original footage**, with smooth camera drift, pointer-responsive perspective motion, distinct grades, and a 5.2-second cycle. It does not invent extra visual assets or pretend these are six photoreal scenes. The original media URL remains unchanged.
- Native video now moves *inside a stationary masked parent*, so the enormous letters remain pinned to the viewport while the footage travels behind them.
- The fluid reveal boundary uses two scales of animated procedural breakup combined with the physically advected fluid field. It remains approximately binary: an ink veil opens to reveal the original video rather than a fake material substituting for it.
- Renderable floating-point RGBA16F fluid and pressure buffers are used when \`EXT_color_buffer_float\` is present. Otherwise RGBA8 remains available. The old 2D engine is still intact.
- The native film is framed more generously on narrow viewports, so the 4:3 source does not need to fill an entire tall phone screen. High-DPR GPU ink is capped independently of the browser-decoded video, improving fill-rate.
- \`?renderer=legacy\` gives a reversible development-only comparison with the original path; the default is unchanged.

### Blocking media-quality finding

Chromium read the original video at **320x240 pixels**, reported in actual page testing on Oct 19, 2026. It is being substantially magnified to fill the typography. That lack of picture detail cannot be repaired by WebGL, CSS, fluid mathematics, or ordinary resizing. Only genuinely higher-resolution original footage (ideally 1920x1080 or higher) or additional licensed high-quality real/photo-rendered media can close this quality gap with Noth.in. No AI-generated images were added, and no existing video or graphic was deleted.

### Benchmark limits

GitHub Actions uses software/virtualized graphics, not physical iPhone or desktop GPU testing. Chromium screenshots and diagnostic FPS establish functionality only, not deployment-grade frame rate, perceived fidelity to Noth.in, or iOS Safari compatibility. The branch must stay draft until real-device profiling and final asset curation.
