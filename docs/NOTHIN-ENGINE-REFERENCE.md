# Technical reference: Noth.in-inspired typographic interaction

This site's hero is an original implementation **inspired by the interaction technique** of https://noth.in. It does not represent or reproduce Noth.in's private source code, brand identity, 3D models, visual assets, or commercial font.

## Public reference and the closest inspectable code

- Live visual reference: https://noth.in
- Third-party analysis of its Webflow layout and custom GSAP/Vite animation layer: https://kompose.agency/en/resources/recreate-noth-in-webflow-gsap
- Open-source fluid image reveal implementation (WebGL/WebGPU, minimal and full source): https://github.com/artcodev/three-fluid-fx
- Open-source cursor mask, liquid image reveal and water ripple demos: https://github.com/dghez/mouse-effects-webgl-water
- Open-source WebGL cursor fluid with ink trail, source and attribution: https://github.com/tahabakri/fluid-cursor
- Open-source GPU-driven typographic fluid displacement: https://github.com/tahabakri/webgl-fluid-lab

Those repositories are **reference implementations**, not dependencies included in this website. Consult each repository's license before reusing its code.

## How this website now works

- `index.html`: two-line "KILE B." / "JONES" letter stage, preserved Music and Menu controls, five selected destinations.
- `script.js`: enlarged independent letter alpha mask; background video behind the glyphs; transparent GPU reveal layered above; pointer and touch input; scene timing; canvas fallback, responsive rendering and reduced-motion behavior.
- `hero-webgl.js`: original WebGL2 ping-pong field that advects a pointer-injected dye/velocity texture; the field controls the opacity and surface normals of blue/silver reflective material. The underlying video remains visible and shifts independently of the dye.
- `styles.css`: heavyweight public webfont (Archivo Black), restrained mono interface (IBM Plex Mono), preserved navigation interactions.

The video and blue/silver liquid are the only active visual scenes. Earlier drawn stars, inflatable staircase and illustrated word objects were deleted from the running hero.

## What is and is not equivalent to Noth.in

Implemented: oversize type, actual content masked into the letters, cursor-responsive persistent liquid trails, glossy shading, video layering, touch input, reduced-motion handling, and performance-conscious mobile frame caps.

Not yet equivalent: Noth.in's exact production Webflow/GSAP bundle, its commercial PP Neue Montreal face, its authored high-resolution 3D objects, or separately approved photography/materials. Shader lighting approximates a reflective surface; it does not substitute for a professionally modeled and textured 3D asset.

## How to inspect

Open the site and move the mouse deliberately across the letters; the blue/silver reveal should travel, deform and decay rather than acting as a rigid spotlight. `window.__KBJ_DIAGNOSTICS` in browser DevTools reports the current scene, frame rate, and display size.

To inspect the two most important implementation files directly:

- https://github.com/kilejones-alt/kilejoneswebsite/blob/main/hero-webgl.js
- https://github.com/kilejones-alt/kilejoneswebsite/blob/main/script.js

Browser-based QA on Chrome/Safari and real GPUs remains necessary; a successful source update or JavaScript parse alone does not confirm the final appearance.
