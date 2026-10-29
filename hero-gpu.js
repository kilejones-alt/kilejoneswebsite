/* Independent WebGL2 compositor for the KILE B. / JONES wordmark.
   It is NOT source code from noth.in, Skeleton Fluid Reveal, or PavelDoGreat.
   Uses the existing DOM-generated glyph mask and preserves script.js as fallback.
   No external dependencies, assets, or navigation changes. */
(() => {
  'use strict';

  const VERTEX = `#version 300 es
precision highp float;
out vec2 vUv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

  const ADVECT = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uFlow;
uniform vec2 uPointer;
uniform vec2 uMotion;
uniform float uAspect;
uniform float uInject;
uniform float uDelta;
uniform float uTime;
void main() {
  vec2 velocity = (texture(uFlow, vUv).rg - .5) * 2.0;
  vec2 origin = clamp(vUv - velocity * uDelta * .72, vec2(.002), vec2(.998));
  vec4 advected = texture(uFlow, origin);
  vec2 oldVelocity = (advected.rg - .5) * 2.0;
  vec2 delta = (vUv - uPointer) * vec2(uAspect, 1.0);
  float brush = exp(-dot(delta, delta) * 92.0);
  float eddy = sin(uTime * .41 + vUv.y * 9.0) * .014;
  vec2 spin = vec2(-delta.y, delta.x) * (uInject * .45 + eddy);
  vec2 nextVelocity = clamp(oldVelocity * .981 +
      uMotion * brush * uInject * 1.65 + spin * brush,
      vec2(-.94), vec2(.94));
  float dye = max(advected.b * .989, brush * uInject * .88);
  outColor = vec4(nextVelocity * .5 + .5, clamp(dye, 0.0, 1.0), 1.0);
}`;

  const DIVERGENCE = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uFlow;
uniform vec2 uTexel;
vec2 velocity(vec2 p) {
  return (texture(uFlow, clamp(p, vec2(.001), vec2(.999))).rg - .5) * 2.0;
}
void main() {
  float l = velocity(vUv - vec2(uTexel.x, 0.0)).x;
  float r = velocity(vUv + vec2(uTexel.x, 0.0)).x;
  float b = velocity(vUv - vec2(0.0, uTexel.y)).y;
  float t = velocity(vUv + vec2(0.0, uTexel.y)).y;
  float divergence = (r - l + t - b) * .5;
  outColor = vec4(clamp(.5 + divergence * .5, 0.0, 1.0), 0.0, 0.0, 1.0);
}`;

  const PRESSURE = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
uniform vec2 uTexel;
float pressure(vec2 p) {
  return (texture(uPressure, clamp(p, vec2(.001), vec2(.999))).r - .5) * 2.0;
}
void main() {
  float l = pressure(vUv - vec2(uTexel.x, 0.0));
  float r = pressure(vUv + vec2(uTexel.x, 0.0));
  float b = pressure(vUv - vec2(0.0, uTexel.y));
  float t = pressure(vUv + vec2(0.0, uTexel.y));
  float divergence = (texture(uDivergence, vUv).r - .5) * 2.0;
  float p = (l + r + b + t - divergence) * .25;
  outColor = vec4(clamp(p * .5 + .5, 0.0, 1.0), 0.0, 0.0, 1.0);
}`;

  const PROJECT = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uFlow;
uniform sampler2D uPressure;
uniform vec2 uTexel;
float pressure(vec2 p) {
  return (texture(uPressure, clamp(p, vec2(.001), vec2(.999))).r - .5) * 2.0;
}
void main() {
  vec4 original = texture(uFlow, vUv);
  vec2 velocity = (original.rg - .5) * 2.0;
  float l = pressure(vUv - vec2(uTexel.x, 0.0));
  float r = pressure(vUv + vec2(uTexel.x, 0.0));
  float b = pressure(vUv - vec2(0.0, uTexel.y));
  float t = pressure(vUv + vec2(0.0, uTexel.y));
  velocity -= vec2(r - l, t - b) * .46;
  outColor = vec4(clamp(velocity * .5 + .5, vec2(0.0), vec2(1.0)),
                  original.b, 1.0);
}`;

  // Video and text are GPU textures. The fluid density is a crisp-ish binary
  // reveal between original moving footage and a refracted color-graded pass.
  // This deliberately does not claim physically based 3D rendering.
  const COMPOSITE = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uGlyph;
uniform sampler2D uVideo;
uniform sampler2D uFlow;
uniform vec2 uViewport;
uniform vec2 uVideoSize;
uniform vec2 uPointer;
uniform float uLetterScale;
uniform float uTime;
uniform float uMode;
uniform float uNextMode;
uniform float uMix;
uniform float uReduced;

vec2 coverUV(vec2 uv, vec2 offset) {
  float viewAspect = uViewport.x / max(uViewport.y, 1.0);
  float filmAspect = uVideoSize.x / max(uVideoSize.y, 1.0);
  vec2 visible = filmAspect > viewAspect
    ? vec2(viewAspect / filmAspect, 1.0)
    : vec2(1.0, filmAspect / viewAspect);
  return clamp((uv - .5) * visible + .5 + offset, vec2(.001), vec2(.999));
}
vec3 footage(vec2 uv, vec2 offset) {
  return texture(uVideo, coverUV(uv, offset)).rgb;
}
float brightness(vec3 c) {
  return dot(c, vec3(.2126,.7152,.0722));
}
vec3 grade(vec3 film, float mode, vec2 uv, vec3 normal) {
  float luminance = brightness(film);
  vec3 lightDir = normalize(vec3(-.35, .65, .75));
  float specular = pow(max(dot(reflect(-lightDir, normal), vec3(0., 0., 1.)), 0.0), 32.0);
  float studio = pow(max(0.0, sin(uv.x * 8.0 - uv.y * 5.4 + uTime * .32)), 28.0);
  if (mode < .5) {
    return film;
  }
  if (mode < 1.5) {
    vec3 cobalt = mix(vec3(.008, .026, .070), film * vec3(.33, .59, 1.10), .88);
    return cobalt + vec3(.25,.48,.85) * specular * .62
                  + vec3(.12,.27,.63) * studio * .20;
  }
  vec3 silver = mix(vec3(luminance), film, .22) * vec3(.81,.88,.98);
  return silver + vec3(.65,.77,.88) * specular * .42
                + vec3(.22,.26,.34) * studio * .16;
}
vec3 world(float mode, float reveal, vec2 uv, vec2 velocity, vec3 normal) {
  vec2 camera = -uPointer * vec2(.007,.005);
  vec2 filmShift = (uv - .5) * 0.0 + camera;
  vec3 original = footage(uv, filmShift);
  vec2 refractUV = uv + vec2(-velocity.y, velocity.x) * .012 * (1.0 - uReduced);
  vec3 altered = grade(
    footage(refractUV, filmShift * 1.4),
    mode, uv, normal
  );
  return mix(original, altered, reveal * (mode < .5 ? .10 : .92));
}
void main() {
  float glyph = texture(uGlyph, vec2(.5)+(vUv-vec2(.5))/max(1.,uLetterScale)).a;
  vec3 paper = vec3(.953,.961,.969);
  if (glyph < .008) {
    outColor = vec4(paper, 1.0);
    return;
  }

  vec4 flow = texture(uFlow, vUv);
  vec2 velocity = (flow.rg - .5) * 2.0;
  vec2 eps = 2.0 / uViewport;
  float dx = texture(uFlow, vUv + vec2(eps.x,0.)).b -
             texture(uFlow, vUv - vec2(eps.x,0.)).b;
  float dy = texture(uFlow, vUv + vec2(0.,eps.y)).b -
             texture(uFlow, vUv - vec2(0.,eps.y)).b;
  vec3 normal = normalize(vec3(-dx*2.0,-dy*2.0,1.0));
  float reveal = smoothstep(.21,.32,flow.b);
  vec3 a = world(uMode, reveal, vUv, velocity, normal);
  vec3 b = world(uNextMode, reveal, vUv, velocity, normal);
  vec3 scene = mix(a, b, uMix);
  // Letter boundaries come from the canvas-rendered type, not a CSS overlay.
  outColor = vec4(mix(paper, clamp(scene,0.0,1.0), glyph), 1.0);
}`;

  const OVERLAY = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uGlyph;
uniform sampler2D uFlow;
uniform float uMode;
uniform float uNextMode;
uniform float uMix;
uniform float uTime;
uniform float uIntro;
uniform vec2 uPointer;
uniform float uLetterScale;
uniform float uObjects;
float hash21(vec2 p){
  p=fract(p*vec2(123.34,456.21));
  p+=dot(p,p+45.32);
  return fract(p.x*p.y);
}
float noise(vec2 p){
  vec2 f=fract(p);vec2 i=floor(p);
  f=f*f*(3.0-2.0*f);
  return mix(mix(hash21(i),hash21(i+vec2(1.,0.)),f.x),
             mix(hash21(i+vec2(0.,1.)),hash21(i+vec2(1.,1.)),f.x),f.y);
}
vec3 material(float scene, vec2 uv){
  // Ink is a quiet neutral film over native photographed footage.
  if(scene<.5) return vec3(.012,.017,.025);
  if(scene<1.5) return vec3(.012,.018,.035);
  if(scene<2.5) return vec3(.017,.020,.026);
  if(scene<3.5) return vec3(.008,.008,.010);
  if(scene<4.5) return vec3(.12,.13,.14);
  return vec3(.016,.018,.025);
}
void main() {
  float glyph = texture(uGlyph, vec2(.5)+(vUv-vec2(.5))/max(1.,uLetterScale)).a;
  if(glyph<.005) discard;
  vec4 flow = texture(uFlow,vUv);
  float density = flow.b;
  // Not a circular radial reveal. Let the fluid field create an irregular,
  // approximately binary boundary, like the photographed Nothin effect.
  float small = noise(vUv*vec2(19.0,13.0)+vec2(uTime*.18,0.0));
  float broad = noise(vUv*vec2(6.0,4.0)-vec2(uTime*.07,0.0));
  float organic = (small-.5)*.085 + (broad-.5)*.12;
  float activated = smoothstep(.19+organic,.29+organic,density);

  // Slow opening animation. The scene remains moving when the cursor is idle.
  float sweep = smoothstep(-.36,1.30,uIntro);
  float advancing = vUv.x*.9 + vUv.y*.46;
  float initial = 1.0-smoothstep(sweep-.28,sweep+.14,
              advancing+(broad-.5)*.23);
  float revealed = max(activated,initial*.60);

  vec3 ink = mix(material(uMode,vUv),material(uNextMode,vUv),uMix);
  float ambient = mix(.18,.37,smoothstep(.7,3.8,uMode));
  // Retain the liquid-cursor aperture; do not obscure real sculptural objects.
  if (uObjects > .5) ambient *= .34;
  // Ink veil thins sharply in the locally fluid-revealed region.
  float alpha = glyph*ambient*(1.0-.985*revealed);
  outColor = vec4(ink,alpha);
}`;

  class GPUHero {
    constructor(originalCanvas, originalVideo) {
      this.original = originalCanvas;
      this.originalVideo = originalVideo;
      this.originalVideoParent = originalVideo?.parentNode;
      this.originalVideoNext = originalVideo?.nextSibling;
      this.status = 'initializing';
      this.failed = false;
      this.last = 0;
      this.oldPoint = null;
      this.simSize = 0;
      this.width = 0;
      this.height = 0;
      this.readyFrame = false;
      this.birthTime = performance.now()*.001;

      this.canvas = document.createElement('canvas');
      this.canvas.className = 'hero-gpu-layer';
      this.canvas.setAttribute('aria-hidden', 'true');
      this.canvas.style.display = 'none';
      const host = originalCanvas.parentNode;
      if (!host) throw new Error('Missing hero container');
      host.appendChild(this.canvas);

      const gl = this.canvas.getContext('webgl2', {
        alpha: true, premultipliedAlpha: false, antialias: false, depth: false, stencil: false,
        preserveDrawingBuffer: false, powerPreference: 'high-performance'
      });
      if (!gl) {
        this.status = 'WebGL2 unavailable';
        this.canvas.remove();
        this.failed = true;
        return;
      }
      this.gl = gl;
      // Preserve velocity and pressure precision where the device supports
      // renderable float textures; RGBA8 remains a safe WebGL2 fallback.
      this.floatSim = !!gl.getExtension('EXT_color_buffer_float');
      this.floatLinear = !!gl.getExtension('OES_texture_float_linear');
      this.vao = gl.createVertexArray();
      gl.bindVertexArray(this.vao);

      try {
        this.advect = this.program(ADVECT);
        this.divergence = this.program(DIVERGENCE);
        this.pressure = this.program(PRESSURE);
        this.project = this.program(PROJECT);
        this.composite = this.program(COMPOSITE);
        this.overlay = this.program(OVERLAY);
        this.videoTexture = this.texture();
        this.glyphTexture = this.texture();
        this.initializeVideo(host);
      } catch (error) {
        this.fail('GPU setup failed', error);
      }

      this.canvas.addEventListener('webglcontextlost', event => {
        event.preventDefault();
        this.fail('WebGL context lost');
      });
    }

    fail(message, error) {
      this.failed = true;
      this.status = message;
      this.canvas.style.display = 'none';
      // A GPU failure must restore the untouched 2D+video fallback.
      if (this.nativeMode && this.originalVideo) {
        const video = this.originalVideo;
        video.classList.remove('gpu-native-film');
        video.style.removeProperty('transform');
        video.style.removeProperty('filter');
        video.style.removeProperty('opacity');
        const parent = this.originalVideoParent || document.body;
        parent.insertBefore(video,
          this.originalVideoNext?.parentNode === parent ? this.originalVideoNext : null);
        window.KBJObjectWorlds?.destroy();
        window.KBJStage?.detach();
        this.filmWindow?.remove();
        this.filmWindow = null;
        this.nativeMode = false;
      }
      if (error) console.warn('[Kile GPU renderer] ' + message, error);
    }


    enableNativeVideo() {
      if (this.failed || this.nativeMode) return;
      // CSS masks work on a cross-origin native <video> without reading pixels.
      // Reuse the original video node: no duplicate decoder/download.
      this.nativeMode = true;
      const video = this.originalVideo;
      const filmWindow = document.createElement('div');
      filmWindow.className = 'hero-film-window';
      filmWindow.setAttribute('aria-hidden','true');
      this.canvas.parentNode.insertBefore(filmWindow,this.canvas);
      filmWindow.appendChild(video);
      this.filmWindow = filmWindow;
      video.classList.add('gpu-native-film');
      if (this.video) {
        this.video.pause();
        this.video.remove();
        this.video = null;
      }
      this.status = 'native video + GPU fluid reveal';
      window.KBJStage?.attach(filmWindow);
      this.objectStage = window.KBJObjectWorlds?.create(filmWindow) || null;
      this.syncNativeMask();
    }

    syncNativeMask() {
      if (!this.nativeMode || !this.maskCanvas) return;
      const url = this.maskCanvas.toDataURL('image/png');
      const image = 'url("' + url + '")';
      this.originalGlyphImage = image;
      const filmWindow = this.filmWindow;
      filmWindow.style.webkitMaskImage = image;
      filmWindow.style.maskImage = image;
      filmWindow.style.webkitMaskRepeat = 'no-repeat';
      filmWindow.style.maskRepeat = 'no-repeat';
      filmWindow.style.webkitMaskSize = '100% 100%';
      filmWindow.style.maskSize = '100% 100%';
    }

    updateFluidCursorMask(pointer,time) {
      // Three uneven, independently moving fluid lobes are additive to the
      // fixed letter aperture. Their strength rises/falls with a smooth
      // response, avoiding a hard jump when the pointer leaves the hero.
      if(!this.filmWindow || !this.originalGlyphImage)return;
      let eligible=!!pointer?.overCanvas && !!pointer?.active &&
        !window.matchMedia('(pointer: coarse)').matches &&
        !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      // A fluid opening should originate from the actual wordmark, not
      // appear as an unrelated dark ink blot in the empty middle gutter.
      // The main canvas already performs an inverse-zoomed glyph hit test.
      // Reuse it to avoid a second pixel readback on each frame.
      if(eligible) eligible=!!pointer.glyphHover;
      const dt=Math.max(0,Math.min(80,time-(this.lastFluidMaskUpdate||time)));
      if (this.lastFluidMaskUpdate && dt<28)return;
      this.lastFluidMaskUpdate=time;
      const previous=this.cursorRevealStrength||0;
      const response=1-Math.exp(-Math.max(dt,16)/220);
      const amount=this.cursorRevealStrength=previous+
        ((eligible?1:0)-previous)*response;
      if(amount<.008){
        if(this.cursorMaskExpanded){
          this.filmWindow.style.webkitMaskImage=this.originalGlyphImage;
          this.filmWindow.style.maskImage=this.originalGlyphImage;
          this.cursorMaskExpanded=false;
        }
        return;
      }
      const x=(pointer.nx*.5+.5)*100,y=(pointer.ny*.5+.5)*100;
      const t=time*.001;
      const radius=Math.min(this.width,this.height)*.22*amount;
      const ellipses=[
        [0,0,1.00,.74],
        [Math.sin(t*1.23)*.25,-.28,.68,.50],
        [Math.cos(t*.91)*.32,.25,.62,.60]
      ];
      const gradients=ellipses.map(([dx,dy,a,b])=>{
        const cx=(x+dx*radius/this.width*100).toFixed(2);
        const cy=(y+dy*radius/this.height*100).toFixed(2);
        const w=Math.max(1,Math.round(radius*a));
        const h=Math.max(1,Math.round(radius*b));
        return 'radial-gradient(ellipse '+w+'px '+h+'px at '+
          cx+'% '+cy+'%, black 55%, transparent 100%)';
      });
      const value=[this.originalGlyphImage,...gradients].join(', ');
      this.filmWindow.style.webkitMaskImage=value;
      this.filmWindow.style.maskImage=value;
      this.filmWindow.style.webkitMaskComposite='source-over';
      this.filmWindow.style.maskComposite='add';
      this.filmWindow.style.webkitMaskRepeat='no-repeat';
      this.filmWindow.style.maskRepeat='no-repeat';
      this.cursorMaskExpanded=true;
    }

    updateNativeLetterScale(scale) {
      if(!this.filmWindow)return;
      const z=Math.max(1,Math.min(1.17,scale||1));
      const layers=this.cursorMaskExpanded?4:1;
      // Reapply when the set of fluid lobes changes, even at constant zoom.
      // Otherwise CSS repeats the first mask size onto the gradients.
      if(Math.abs((this.nativeLetterScale||1)-z)<.0015 &&
         layers===this.nativeLetterLayers)return;
      this.nativeLetterScale=z;
      this.nativeLetterLayers=layers;
      // The original mask is sized and zoomed independently of the 3D
      // objects and film: users see MORE object surface inside each letter.
      // The additional pointer-fluid gradient layers retain normal scale.
      const sizes=[(z*100).toFixed(2)+'% '+(z*100).toFixed(2)+'%',
        ...Array.from({length:layers-1},()=> '100% 100%')].join(', ');
      this.filmWindow.style.webkitMaskSize=sizes;
      this.filmWindow.style.maskSize=sizes;
    }

    initializeVideo(host) {
      // Cross-origin video cannot be uploaded into WebGL without CORS.
      // A second, CORS-enabled video avoids breaking the original 2D fallback.
      const src = this.originalVideo?.getAttribute('src') ||
                  this.originalVideo?.currentSrc || '';
      // Production footage is served from another origin. Its browser CORS
      // response was inconsistent despite permissive headers to a CLI probe.
      // Keep video as native media and compose WebGL alpha over it.
      if (src && new URL(src, location.href).origin !== location.origin) {
        this.enableNativeVideo();
        return;
      }
      const v = document.createElement('video');
      v.className = 'gpu-source-video';
      v.muted = true;
      v.defaultMuted = true;
      v.loop = true;
      v.playsInline = true;
      v.autoplay = true;
      v.preload = 'auto';
      v.crossOrigin = 'anonymous';
      v.setAttribute('muted', '');
      v.setAttribute('playsinline', '');
      v.setAttribute('aria-hidden', 'true');
      v.src = this.originalVideo?.getAttribute('src') || this.originalVideo?.currentSrc || '';
      if (!v.src) throw new Error('No original video URL');
      host.appendChild(v);
      this.video = v;
      v.addEventListener('error', () => {
        this.fail('Video CDN did not permit CORS video loading');
      });
      v.addEventListener('loadeddata', () => {
        this.status = 'video loaded';
        this.play();
      });
      window.addEventListener('pointerdown', () => this.play(), {passive:true});
      window.addEventListener('keydown', () => this.play());
      this.play();
    }

    play() {
      if (!this.failed && this.video?.paused && !document.hidden) {
        this.video.play().catch(() => {
          this.status = 'Awaiting browser video permission';
        });
      }
    }

    shader(type, code) {
      const gl = this.gl;
      const shader = gl.createShader(type);
      gl.shaderSource(shader, code);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const message = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(message);
      }
      return shader;
    }

    program(fragment) {
      const gl = this.gl;
      const vertex = this.shader(gl.VERTEX_SHADER, VERTEX);
      const pixel = this.shader(gl.FRAGMENT_SHADER, fragment);
      const program = gl.createProgram();
      gl.attachShader(program, vertex);
      gl.attachShader(program, pixel);
      gl.linkProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(pixel);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program));
      }
      return {program, locations: Object.create(null)};
    }

    texture(filter) {
      const gl = this.gl;
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      const mode = filter || gl.LINEAR;
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mode);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, mode);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return texture;
    }

    target(size, neutral=false) {
      const gl = this.gl;
      const useFloat = this.floatSim;
      const texture = this.texture(useFloat && !this.floatLinear ? gl.NEAREST : gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, useFloat ? gl.RGBA16F : gl.RGBA8,
                    size, size, 0, gl.RGBA,
                    useFloat ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE, null);
      const framebuffer = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
                              gl.TEXTURE_2D, texture, 0);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        throw new Error('Fluid framebuffer incomplete');
      }
      gl.viewport(0,0,size,size);
      gl.clearColor(neutral ? .5 : 0, neutral ? .5 : 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      return {texture, framebuffer};
    }

    resetFluid(size) {
      if (size === this.simSize) return;
      const gl = this.gl;
      for (const target of [
        ...(this.flow || []), ...(this.pressures || []),
        ...(this.divergenceTarget ? [this.divergenceTarget] : [])
      ]) {
        gl.deleteTexture(target.texture);
        gl.deleteFramebuffer(target.framebuffer);
      }
      this.flow = [this.target(size,true), this.target(size,true)];
      this.pressures = [this.target(size,true), this.target(size,true)];
      this.divergenceTarget = this.target(size,true);
      this.simSize = size;
      this.oldPoint = null;
    }

    resize(width, height, dpr, maskCanvas) {
      if (this.failed) return;
      try {
        this.width = width;
        this.height = height;
        // Film remains full browser resolution; only the translucent GPU ink
        // is lowered on high-DPR screens to control mobile fill-rate.
        const inkDpr = Math.min(dpr,width <= 700 ? 1.15 : 1.35);
        this.canvas.width = Math.max(1,Math.round(width*inkDpr));
        this.canvas.height = Math.max(1,Math.round(height*inkDpr));
        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';
        this.resetFluid(width < 700 ? 160 : 224);
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D,this.glyphTexture);
        this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA,
                           this.gl.RGBA, this.gl.UNSIGNED_BYTE,maskCanvas);
        this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, false);
        this.maskCanvas = maskCanvas;
        this.syncNativeMask();
        if (this.gl.getError() !== this.gl.NO_ERROR) {
          throw new Error('Uploading glyph mask failed');
        }
        this.status = 'awaiting video texture';
      } catch (error) {
        this.fail('GPU resize failed', error);
      }
    }

    use(entry, uniforms={}) {
      const gl = this.gl;
      gl.useProgram(entry.program);
      for (const [name,value] of Object.entries(uniforms)) {
        if (!(name in entry.locations)) {
          entry.locations[name] = gl.getUniformLocation(entry.program,name);
        }
        const loc = entry.locations[name];
        if (loc === null) continue;
        if (Array.isArray(value)) gl.uniform2f(loc,value[0],value[1]);
        else if (name.startsWith('u') && Number.isInteger(value) &&
                 ['uFlow','uPressure','uDivergence','uGlyph','uVideo'].includes(name)) {
          gl.uniform1i(loc,value);
        } else gl.uniform1f(loc,value);
      }
    }

    bindTextures(...textures) {
      const gl=this.gl;
      textures.forEach((texture,index)=>{
        gl.activeTexture(gl.TEXTURE0 + index);
        gl.bindTexture(gl.TEXTURE_2D,texture);
      });
    }

    pass(entry,target,uniforms,textures) {
      const gl=this.gl;
      gl.bindFramebuffer(gl.FRAMEBUFFER,target.framebuffer);
      gl.viewport(0,0,this.simSize,this.simSize);
      this.bindTextures(...textures);
      this.use(entry,uniforms);
      gl.drawArrays(gl.TRIANGLES,0,3);
    }

    simulate(now, pointer, dt, reducedMotion) {
      const S=this.simSize;
      if (!S) return;
      const isActive = !reducedMotion && pointer.active && pointer.overCanvas;
      const t=now*.001;
      const autoX=.50+.28*Math.sin(t*.39);
      const autoY=.50+.23*Math.sin(t*.31+.9);
      const p={
        x:isActive?(pointer.nx*.5+.5):autoX,
        y:isActive?(-pointer.ny*.5+.5):autoY
      };
      const before=this.oldPoint || p;
      const move=[Math.max(-.14,Math.min(.14,p.x-before.x)),
                  Math.max(-.14,Math.min(.14,p.y-before.y))];
      const velocity=Math.abs(move[0])+Math.abs(move[1]);
      const inject=reducedMotion?0:
        isActive ? (velocity>.0002?1:0) :
                   (velocity>.00005?.55:0);
      this.oldPoint=p;
      const texel=[1/S,1/S];
      const {flow,pressures}=this;
      this.pass(this.advect,flow[1],{
        uFlow:0,uPointer:[p.x,p.y],uMotion:move,
        uAspect:this.width/this.height,uInject:inject,
        uDelta:Math.max(.001,Math.min(.05,dt)),uTime:t
      },[flow[0].texture]);
      this.pass(this.divergence,this.divergenceTarget,{
        uFlow:0,uTexel:texel
      },[flow[1].texture]);

      // Jacobi pressure iterations, then subtract pressure gradient.
      // Density persists independently of the velocity projection.
      for(let iteration=0;iteration<7;iteration++) {
        const dst=(iteration+1)%2,src=iteration%2;
        this.pass(this.pressure,pressures[dst],{
          uPressure:0,uDivergence:1,uTexel:texel
        },[pressures[src].texture,this.divergenceTarget.texture]);
      }
      this.pass(this.project,flow[0],{
        uFlow:0,uPressure:1,uTexel:texel
      },[flow[1].texture,pressures[1].texture]);
    }

    render(options) {
      if(this.failed || !this.gl || !this.width) return false;
      if (this.nativeMode) {
        try {
          window.KBJScenes?.apply(this.originalVideo,options);
          window.KBJStage?.update(options);
          this.updateFluidCursorMask(options.pointer,options.now);
          this.updateNativeLetterScale(options.letterScale);
          const objectActive=!!this.objectStage?.render(options);
          // Keep original video as an instantly reversible fallback. When the
          // constructed 3D worlds render successfully, the 320x240 source
          // is hidden; real objects replace rather than recolor that video.
          this.originalVideo.style.opacity=objectActive?'0':'1';
          if(objectActive && !this.originalVideo.paused)this.originalVideo.pause();
          if(!objectActive && this.originalVideo.paused)
            this.originalVideo.play().catch(()=>{});
          const gl=this.gl;
          this.simulate(options.now,options.pointer,options.dt,options.reducedMotion);
          gl.bindFramebuffer(gl.FRAMEBUFFER,null);
          gl.viewport(0,0,this.canvas.width,this.canvas.height);
          gl.disable(gl.BLEND);
          gl.clearColor(0,0,0,0);
          gl.clear(gl.COLOR_BUFFER_BIT);
          this.bindTextures(this.glyphTexture,this.flow[0].texture);
          this.use(this.overlay,{
            uGlyph:0,uFlow:1,
            uMode:options.mode,uNextMode:options.nextMode,
            uMix:options.mix,uTime:options.now*.001,
            uPointer:[options.pointer.nx,options.pointer.ny],
            uLetterScale:options.letterScale||1,
            uObjects:objectActive?1:0,
            uIntro:Math.min(1.6,options.now*.001 - this.birthTime)
          });
          gl.drawArrays(gl.TRIANGLES,0,3);
          if (gl.getError()!==gl.NO_ERROR) throw new Error('Native video fluid pass failed');
          this.canvas.style.display='block';
          this.status='native video + GPU fluid reveal active';
          return true;
        } catch(error) {
          this.fail('Native-video GPU render failed',error);
          return false;
        }
      }
      const v=this.video;
      if (!v || v.readyState<2 || !v.videoWidth || !v.videoHeight) return false;
      const gl=this.gl;
      try {
        // Cross-origin failure here is caught, and original canvas takes over.
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D,this.videoTexture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,v);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
        if(gl.getError()!==gl.NO_ERROR) throw new Error('WebGL video upload denied');
        this.simulate(options.now,options.pointer,options.dt,options.reducedMotion);
        gl.bindFramebuffer(gl.FRAMEBUFFER,null);
        gl.viewport(0,0,this.canvas.width,this.canvas.height);
        gl.disable(gl.BLEND);
        this.bindTextures(this.glyphTexture,this.videoTexture,this.flow[0].texture);
        this.use(this.composite,{
          uGlyph:0,uVideo:1,uFlow:2,
          uViewport:[this.width,this.height],
          uVideoSize:[v.videoWidth,v.videoHeight],
          uPointer:[options.pointer.nx,options.pointer.ny],
          uLetterScale:options.letterScale||1,
          uTime:options.now*.001,
          uMode:options.mode,uNextMode:options.nextMode,
          uMix:options.mix,
          uReduced:options.reducedMotion?1:0
        });
        gl.drawArrays(gl.TRIANGLES,0,3);
        if(gl.getError()!==gl.NO_ERROR) throw new Error('GPU draw failed');
        this.canvas.style.display='block';
        this.status='active';
        return true;
      }catch(error){
        this.fail('GPU rendering failed; original renderer retained',error);
        return false;
      }
    }

    diagnostic() {
      return {
        status:this.status,active:!this.failed && (this.status==='active' || this.status==='native video + GPU fluid reveal active'),
        simSize:this.simSize,fluidFormat:this.floatSim ? 'RGBA16F' : 'RGBA8',source:this.nativeMode ? 'original native MP4 + stable letter aperture' : 'same-origin GPU video texture',
        scenes:window.KBJScenes?.diagnostics?.() || null,
        extraMedia:window.KBJStage?.diagnostics?.() || null,
        objectWorlds:window.KBJObjectWorlds?.diagnostic?.() || null,
        nativeLetterScale:this.nativeLetterScale||1
      };
    }
  }

  window.KBJGpuRenderer={
    create(originalCanvas,originalVideo) {
      if(!originalCanvas || !originalVideo) return null;
      // Development QA escape hatch; no change to default presentation.
      if (new URLSearchParams(location.search).get('renderer') === 'legacy') return null;
      // Keep the original reduced-motion behavior (static/non-autoplay fallback).
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return null;
      try{return new GPUHero(originalCanvas,originalVideo);}
      catch(error){console.warn('GPU renderer disabled',error);return null;}
    }
  };
})();
