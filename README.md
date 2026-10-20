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


## Stage 3 — original, animated 3D object worlds (supersedes the video-only modes above)

**Main hero objects have been implemented, not merely specified.** The development branch now includes \`hero-object-worlds.js\`, an original browser-native WebGL2 renderer that constructs four 3D hero subjects and two supporting worlds from programmatically generated triangle meshes:

| Scene | Distinct geometry | Motion and staging |
| --- | --- | --- |
| 0 — Midnight stars | Fourteen beveled/extruded, metallic midnight-blue stars | Every star has independent position, depth, drift direction and continuous three-axis rotation. |
| 1 — Pink balloon rabbit | A joined, 12-component glossy hot-pink rabbit, including long inflated loop ears | Gentle buoyancy, group-level yaw and independent mouse-responsive parallax. The sole pink hero. |
| 2 — Black studio | Five soft-edged black graphite shapes/loops | Low-contrast, slower independent rotations and motion. |
| 3 — Matte-black rhino | A 19-component 3D rhino sculpture, including large body, shoulder, four legs, head and horns | Heavy camera/orbit illusion, restrained group yaw, bright side-lit gray studio. Not pink. |
| 4 — Translucent white | Four suspended white pearl/frosted forms | Continuous slow float, independent rotation and soft studio contrasts. |
| 5 — Foil ZIO | Three separate uppercase inflated letter assemblies, with Z made of three strokes, I of three, and O of one loop | Different depth drift/yaw for Z, I and O. Each letter moves as one assembly rather than its pieces disconnecting. Crinkled foil material highlight shader. |

The original MP4 is automatically suppressed when the fully procedurally rendered 3D stage is available. **The original MP4 and unchanged Canvas-2D renderer remain in the repo as fallbacks and are not replaced.** There are no AI-generated image assets, no unlicensed external 3D models, no imported Noth.in source, and no new visible navigation text.

The title's existing pixel-accurate two-line glyph texture remains a *fixed mask*. Moving actors are rendered in actual XYZ positions inside this mask, with per-scene responsive framing on desktop and phone. The native video is kept in the masked container for reversible fallback. The cursor-driven fluid overlay continues to use iterative pressure solving, and desktop mouse motion can open an additional three-lobed reveal beside the letters so large objects are more visually understandable.

### QA / visual-review directions

1. Open GitHub Actions \`gpu-renderer-preview\` artifacts from the latest successful run. It contains default \`desktop.png\` / \`mobile.png\`, plus \`desktop-stars.png\`, \`desktop-rabbit.png\`, \`desktop-rhino.png\`, \`desktop-zio.png\`, and phone-sized equivalents.
2. \`window.__KBJ_DIAGNOSTICS.gpu.objectWorlds\` reports the active renderer, each scene's object component count, GPU resolution and failure status.
3. The automated test asserts all six object scenes are constructed with expected component counts, and checks fixed mask, legacy video, Music/Menu and all five links.
4. The development-only JS \`window.__KBJ_FORCE_SCENE = 0..5\` freezes a particular world for inspection; set it back to \`undefined\` to resume normal five-second sequencing. It is not a visible UI control.
5. Desktop pointer reveals around letters should be tested in hardware Safari/Chrome/Firefox. Phone and reduced-motion preferences keep the static glyph aperture.

**Visual limitation:** These are genuine 3D polygon actors, **not final physically-based photorealistic Blender/Cycles renders**. The rabbit and rhino are assembled procedurally from spheres/rings/cones; their sculptural silhouette can be improved further by replacing the assemblies with licensed high-detail glTF assets or custom high-quality sculpted geometry. Reflective foil is a GPU approximation with procedural wrinkles, not a physically accurate foil simulation. CI runs WebGL through software rendering; its FPS measurements are not representative of actual desktop or iPhone hardware. The live site is unchanged. Keep the PR in draft until actual design review.
