# Cinematic scene media — optional original assets

The six existing modes currently all preserve and use the original Creative Claw MP4 (320 × 240). The site will not silently substitute new imagery.

This manifest provides six **optional additional real media scenes**. Leave a scene's \`layers\` array empty until a specific original/licensed photograph, CGI render or video is approved and committed to this repository.

Example:

\`\`\`json
{
  "name":"FOIL / ZIO",
  "layers":[
    {"src":"assets/helium-foil-foreground.webp","type":"image","depth":1.2,"scale":1.08,"x":0,"y":0},
    {"src":"assets/helium-foil-background.webm","type":"video","depth":0.45,"scale":1.04,"x":0,"y":0}
  ]
}
\`\`\`

Keep assets self-hosted and properly licensed; do not download from the Noth.in website or use any rejected cartoon, hand-drawn star or staircase material. The current Content Security Policy accepts same-origin media.

Recommended video: 1920 × 1080 or larger, 24/30 FPS, no hard-coded titles, natural softbox lighting and compositions wide enough to be read inside letters. Mobile scenes benefit from transparent WebP foregrounds at least 1200 pixels wide, and from visual subjects with recognizable silhouettes at mobile scale.

The engine accepts up to three depth layers per scene. It animates each independently with pointer-responsive camera displacement, slow idle drift, transforms, and opacity crossfades. The native original MP4 remains underneath, and the original Music/Menu/pages and legacy fallback are unchanged. With every \`layers\` array empty, it adds no new visuals.
