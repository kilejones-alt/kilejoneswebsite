(() => {
  'use strict';

  const canvas = document.querySelector('#hero-canvas');
  const menuToggle = document.querySelector('#menu-toggle');
  const mobileDrawer = document.querySelector('#mobile-drawer');
  const musicToggle = document.querySelector('#music-toggle');
  const audio = document.querySelector('#background-music');
  const cursorRoot = document.querySelector('#elite-cursor');
  const cursorRing = cursorRoot?.querySelector('.elite-cursor-ring');
  const cursorDot = cursorRoot?.querySelector('.elite-cursor-dot');
  if (!canvas) return;

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarsePointer = matchMedia('(pointer: coarse)').matches;
  const finePointer = matchMedia('(pointer: fine) and (hover:hover)').matches;
  const PAPER = [0.953, 0.961, 0.969];
  const INK = [0.043, 0.043, 0.047];
  const IDLE_STYLE_SECONDS = 4.15;
  const STYLE_TRANSITION_SECONDS = 0.65;
  const MATERIAL_NAMES = ['SILVER MYLAR','ELECTRIC BLUE FOIL','BLACK INFLATED','MAGENTA FLUID','BUBBLE GLASS'];
  const STYLE_COUNT = MATERIAL_NAMES.length;

  window.__KBJ_MATERIALS = MATERIAL_NAMES.slice();

  setupUI();
  setupEliteCursor();

  function setupUI() {
    const setMenu = (open) => {
      if (!menuToggle || !mobileDrawer) return;
      menuToggle.setAttribute('aria-expanded', String(open));
      mobileDrawer.classList.toggle('is-open', open);
      mobileDrawer.setAttribute('aria-hidden', String(!open));
    };

    menuToggle?.addEventListener('click', () => setMenu(menuToggle.getAttribute('aria-expanded') !== 'true'));
    document.addEventListener('click', (e) => {
      if (!menuToggle || !mobileDrawer) return;
      if (menuToggle.contains(e.target) || mobileDrawer.contains(e.target)) return;
      setMenu(false);
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

    const music = { userPaused: false, volume: 0.28 };
    const updateMusicButton = () => {
      if (!audio || !musicToggle) return;
      const active = !audio.paused && !audio.ended;
      musicToggle.classList.toggle('is-active', active);
      musicToggle.setAttribute('aria-pressed', String(active));
      musicToggle.setAttribute('aria-label', active ? 'Pause background music' : 'Play background music');
    };
    const startMusic = async () => {
      if (!audio || music.userPaused || !audio.paused) return;
      audio.volume = music.volume;
      try { await audio.play(); } catch (_) {}
      updateMusicButton();
    };
    musicToggle?.addEventListener('click', async () => {
      if (!audio) return;
      if (!audio.paused) { music.userPaused = true; audio.pause(); }
      else { music.userPaused = false; await startMusic(); }
      updateMusicButton();
    });
    audio?.addEventListener('play', updateMusicButton);
    audio?.addEventListener('pause', updateMusicButton);
    ['pointerdown','click','keydown','wheel'].forEach(name => {
      window.addEventListener(name, () => startMusic(), { passive: name !== 'keydown' });
    });
  }

  function setupEliteCursor() {
    if (!finePointer || reduceMotion || !cursorRoot || !cursorRing || !cursorDot) return;
    const c = { x: innerWidth/2, y: innerHeight/2, px:innerWidth/2, py:innerHeight/2, rx: innerWidth/2, ry: innerHeight/2, visible:false, speed:0, angle:0 };
    let raf = 0;
    const tick = () => {
      const vx=c.x-c.px, vy=c.y-c.py;
      c.px += vx*.32; c.py += vy*.32;
      c.speed += (Math.min(1,Math.hypot(vx,vy)/48)-c.speed)*.18;
      if(Math.hypot(vx,vy)>.3)c.angle=Math.atan2(vy,vx)*180/Math.PI;
      c.rx += (c.x - c.rx) * 0.155;
      c.ry += (c.y - c.ry) * 0.155;
      const sx=1+c.speed*.42, sy=1-c.speed*.16;
      cursorRing.style.transform = `translate3d(${c.rx}px,${c.ry}px,0) rotate(${c.angle}deg) scale(${sx},${sy})`;
      cursorDot.style.transform = `translate3d(${c.x}px,${c.y}px,0) scale(${1+c.speed*.35})`;
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener('pointermove', (e) => {
      c.x=e.clientX; c.y=e.clientY;
      if (!c.visible) { c.visible=true; cursorRoot.classList.add('is-visible'); }
    }, {passive:true});
    window.addEventListener('pointerout', (e) => { if (!e.relatedTarget) cursorRoot.classList.remove('is-visible'); }, {passive:true});
    document.addEventListener('pointerover', (e) => cursorRoot.classList.toggle('is-hover', !!e.target.closest('a,button,[role="button"]')));
    document.addEventListener('pointerdown', () => cursorRoot.classList.add('is-down'));
    document.addEventListener('pointerup', () => cursorRoot.classList.remove('is-down'));
    raf = requestAnimationFrame(tick);
    window.addEventListener('pagehide', () => cancelAnimationFrame(raf), {once:true});
  }

  const glOptions = { alpha:false, antialias:false, depth:false, stencil:false, powerPreference:'high-performance' };
  if (reduceMotion) {
    startCanvasFallback();
    return;
  }
  const capabilityCanvas = document.createElement('canvas');
  const capabilityGl = capabilityCanvas.getContext('webgl2', glOptions);
  const capabilityFloat = capabilityGl?.getExtension('EXT_color_buffer_float');
  capabilityGl?.getExtension('WEBGL_lose_context')?.loseContext();
  if (!capabilityGl || !capabilityFloat) {
    startCanvasFallback();
    return;
  }
  const gl = canvas.getContext('webgl2', glOptions);
  const extFloat = gl?.getExtension('EXT_color_buffer_float');
  if (!gl || !extFloat) {
    startCanvasFallback();
    return;
  }

  const VERT = `#version 300 es
    precision highp float;
    out vec2 vUv;
    void main(){
      vec2 p=vec2((gl_VertexID==1)?3.0:-1.0,(gl_VertexID==2)?3.0:-1.0);
      vUv=p*.5+.5; gl_Position=vec4(p,0.,1.);
    }`;

  const COMMON = `
    precision highp float;
    in vec2 vUv; out vec4 outColor;
    vec4 bilerp(sampler2D s, vec2 uv, vec2 texel){
      vec2 st=uv/texel-.5; vec2 i=floor(st); vec2 f=fract(st);
      vec2 a=(i+.5)*texel;
      vec4 A=texture(s,a); vec4 B=texture(s,a+vec2(texel.x,0.));
      vec4 C=texture(s,a+vec2(0.,texel.y)); vec4 D=texture(s,a+texel);
      return mix(mix(A,B,f.x),mix(C,D,f.x),f.y);
    }`;

  const FS_COPY = `#version 300 es ${COMMON}
    uniform sampler2D uTexture;
    void main(){outColor=texture(uTexture,vUv);}`;

  const FS_ADVECT = `#version 300 es ${COMMON}
    uniform sampler2D uSource; uniform sampler2D uVelocity;
    uniform vec2 uTexel; uniform float uDt; uniform float uDissipation;
    void main(){
      vec2 vel=bilerp(uVelocity,vUv,uTexel).xy;
      vec2 pos=clamp(vUv-uDt*vel,0.,1.);
      outColor=bilerp(uSource,pos,uTexel)*uDissipation;
    }`;

  const FS_CURL = `#version 300 es ${COMMON}
    uniform sampler2D uVelocity; uniform vec2 uTexel;
    void main(){
      float L=texture(uVelocity,vUv-vec2(uTexel.x,0.)).y;
      float R=texture(uVelocity,vUv+vec2(uTexel.x,0.)).y;
      float B=texture(uVelocity,vUv-vec2(0.,uTexel.y)).x;
      float T=texture(uVelocity,vUv+vec2(0.,uTexel.y)).x;
      float c=.5*(R-L-T+B); outColor=vec4(c,0.,0.,1.);
    }`;

  const FS_VORTICITY = `#version 300 es ${COMMON}
    uniform sampler2D uVelocity; uniform sampler2D uCurl; uniform vec2 uTexel;
    uniform float uDt; uniform float uStrength;
    void main(){
      float L=abs(texture(uCurl,vUv-vec2(uTexel.x,0.)).r);
      float R=abs(texture(uCurl,vUv+vec2(uTexel.x,0.)).r);
      float B=abs(texture(uCurl,vUv-vec2(0.,uTexel.y)).r);
      float T=abs(texture(uCurl,vUv+vec2(0.,uTexel.y)).r);
      float C=texture(uCurl,vUv).r;
      vec2 force=.5*vec2(T-B,R-L);
      force/=length(force)+.0001;
      force*=uStrength*C;
      vec2 vel=texture(uVelocity,vUv).xy+force*uDt;
      vel=clamp(vel,vec2(-3.),vec2(3.)); outColor=vec4(vel,0.,1.);
    }`;

  const FS_DIVERGENCE = `#version 300 es ${COMMON}
    uniform sampler2D uVelocity; uniform vec2 uTexel;
    void main(){
      float L=texture(uVelocity,vUv-vec2(uTexel.x,0.)).x;
      float R=texture(uVelocity,vUv+vec2(uTexel.x,0.)).x;
      float B=texture(uVelocity,vUv-vec2(0.,uTexel.y)).y;
      float T=texture(uVelocity,vUv+vec2(0.,uTexel.y)).y;
      outColor=vec4(.5*(R-L+T-B),0.,0.,1.);
    }`;

  const FS_CLEAR = `#version 300 es ${COMMON}
    uniform sampler2D uTexture; uniform float uValue;
    void main(){outColor=texture(uTexture,vUv)*uValue;}`;

  const FS_PRESSURE = `#version 300 es ${COMMON}
    uniform sampler2D uPressure; uniform sampler2D uDivergence; uniform vec2 uTexel;
    void main(){
      float L=texture(uPressure,vUv-vec2(uTexel.x,0.)).r;
      float R=texture(uPressure,vUv+vec2(uTexel.x,0.)).r;
      float B=texture(uPressure,vUv-vec2(0.,uTexel.y)).r;
      float T=texture(uPressure,vUv+vec2(0.,uTexel.y)).r;
      float D=texture(uDivergence,vUv).r;
      outColor=vec4((L+R+B+T-D)*.25,0.,0.,1.);
    }`;

  const FS_GRADIENT = `#version 300 es ${COMMON}
    uniform sampler2D uPressure; uniform sampler2D uVelocity; uniform vec2 uTexel;
    void main(){
      float L=texture(uPressure,vUv-vec2(uTexel.x,0.)).r;
      float R=texture(uPressure,vUv+vec2(uTexel.x,0.)).r;
      float B=texture(uPressure,vUv-vec2(0.,uTexel.y)).r;
      float T=texture(uPressure,vUv+vec2(0.,uTexel.y)).r;
      vec2 vel=texture(uVelocity,vUv).xy-vec2(R-L,T-B)*.5;
      outColor=vec4(vel,0.,1.);
    }`;

  const FS_SPLAT = `#version 300 es ${COMMON}
    uniform sampler2D uTarget; uniform vec2 uPoint; uniform vec3 uColor;
    uniform float uRadius; uniform float uAspect;
    void main(){
      vec2 p=vUv-uPoint; p.x*=uAspect;
      float s=exp(-dot(p,p)/max(.000001,uRadius));
      vec4 base=texture(uTarget,vUv);
      outColor=base+vec4(uColor*s,0.);
    }`;

  const FS_FINAL = `#version 300 es ${COMMON}
    uniform sampler2D uDye; uniform sampler2D uVelocity; uniform sampler2D uTextMask;
    uniform vec2 uTexel; uniform vec2 uParallax; uniform float uTime;
    uniform vec2 uPointer; uniform vec2 uPointerVelocity; uniform float uPointerActive; uniform float uAspect;
    uniform float uStyleA; uniform float uStyleB; uniform float uMix;
    uniform vec3 uPaper; uniform vec3 uInk;

    float hash(vec2 p){
      p=fract(p*vec2(123.34,345.45));
      p+=dot(p,p+34.345);
      return fract(p.x*p.y);
    }
    float noise2(vec2 p){
      vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);
      float a=hash(i),b=hash(i+vec2(1.,0.)),c=hash(i+vec2(0.,1.)),d=hash(i+vec2(1.,1.));
      return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);
    }
    float fbm(vec2 p){
      float v=0.,a=.52;
      mat2 r=mat2(.80,.60,-.60,.80);
      for(int i=0;i<4;i++){v+=noise2(p)*a;p=r*p*2.03+vec2(11.7,7.3);a*=.50;}
      return v;
    }

    vec3 silverMylar(vec2 p,float t){
      vec2 q=p-.5;
      float n=fbm(q*5.2+vec2(t*.07,-t*.045));
      q+=vec2(n-.5,fbm(q*8.0-vec2(t*.04,t*.06))-.5)*.055;
      float broad=.5+.5*sin(q.x*8.1-q.y*4.2+t*.24+sin(q.y*8.0)*.55);
      float sweep=pow(max(0.,.5+.5*sin(q.x*15.8+q.y*4.6-t*.62+n*2.4)),8.0);
      float fold1=pow(max(0.,.5+.5*sin(q.x*51.-q.y*29.+n*8.0+t*.29)),14.0);
      float fold2=pow(max(0.,.5+.5*sin(q.x*76.+q.y*47.-n*6.0-t*.19)),18.0);
      float micro=.5+.5*sin(q.x*126.+sin(q.y*71.-t*.17)*2.5+n*3.0);
      vec3 c=mix(vec3(.018,.024,.034),vec3(.42,.46,.54),.16+.70*broad);
      c=mix(c,vec3(.91,.94,.985),clamp(sweep*.92+fold1*.28,0.,1.));
      c=mix(c,vec3(1.),fold2*.24);
      c*=.87+.13*micro;
      return clamp(c,0.,1.);
    }

    vec3 blueFoil(vec2 p,float t){
      vec2 q=p-.5;
      float n=fbm(q*5.8+vec2(t*.05,-t*.035));
      vec2 z=(q+vec2(n-.5,fbm(q*11.3)-.5)*.06)*vec2(17.,12.);
      vec2 id=floor(z),f=fract(z)-.5;
      float ang=hash(id)*6.2831853;
      vec2 dir=vec2(cos(ang),sin(ang));
      float facet=.5+.5*dot(normalize(f+dir*.18),dir);
      float ridge=pow(1.-clamp(abs(dot(f,vec2(-dir.y,dir.x)))*2.15,0.,1.),7.0);
      float sweep=pow(max(0.,.5+.5*sin(q.x*12.0-q.y*7.0-t*.44+n*5.0)),7.0);
      float crinkle=pow(max(0.,.5+.5*sin(q.x*61.+q.y*43.+n*9.0+t*.17)),13.0);
      vec3 deep=vec3(.006,.035,.13), cobalt=vec3(.015,.16,.64), electric=vec3(.10,.49,1.0), ice=vec3(.68,.90,1.0);
      vec3 c=mix(deep,cobalt,.28+.55*facet);
      c=mix(c,electric,clamp(sweep*.82+ridge*.26,0.,1.));
      c=mix(c,ice,crinkle*.34);
      return clamp(c,0.,1.);
    }

    vec3 blackInflated(vec2 p,float t){
      vec2 q=p-.5;
      float n=fbm(q*4.6+vec2(t*.035,-t*.025));
      q+=vec2(n-.5,fbm(q*8.8+4.2)-.5)*.035;
      float body=.5+.5*sin(q.x*4.4-q.y*3.1+t*.10+n*1.8);
      float ribbon=pow(max(0.,.5+.5*sin(q.x*11.7+q.y*5.4-t*.36+n*3.0)),11.0);
      float pin=pow(max(0.,.5+.5*sin(q.x*39.-q.y*22.+n*7.0+t*.20)),20.0);
      float wrinkle=.5+.5*sin(q.x*83.+sin(q.y*52.-t*.13)*2.0+n*5.0);
      vec3 c=mix(vec3(.002,.003,.005),vec3(.045,.052,.065),.22+.50*body);
      c=mix(c,vec3(.40,.45,.53),ribbon*.64);
      c=mix(c,vec3(.97,.985,1.0),pin*.74);
      c*=.90+.10*wrinkle;
      return clamp(c,0.,1.);
    }

    vec3 magentaFluid(vec2 p,float t){
      vec2 q=p-.5;
      float n1=fbm(q*4.0+vec2(t*.08,-t*.055));
      float n2=fbm(q*8.3+vec2(-t*.045,t*.07)+n1*1.8);
      vec2 w=q+vec2(n1-.5,n2-.5)*.16;
      float flow=.5+.5*sin(w.x*8.5+w.y*5.1+t*.34+n2*4.0);
      float vein=pow(max(0.,.5+.5*sin(w.x*24.-w.y*13.-t*.41+n1*7.0)),10.0);
      float gloss=pow(max(0.,.5+.5*sin(w.x*14.0+w.y*2.0-t*.65+n2*4.5)),9.0);
      vec3 wine=vec3(.075,.0,.055), hot=vec3(1.0,.015,.48), rose=vec3(1.0,.26,.67), white=vec3(1.0,.92,.98);
      vec3 c=mix(wine,hot,.22+.72*flow);
      c=mix(c,rose,vein*.48);
      c=mix(c,white,gloss*.42);
      return clamp(c,0.,1.);
    }

    vec3 bubbleGlass(vec2 p,float t){
      vec2 q=p;
      vec2 scale=vec2(12.0,8.0);
      vec2 z=q*scale;
      float row=floor(z.y);
      z.x+=mod(row,2.0)*.5;
      vec2 id=floor(z),f=fract(z)-.5;
      float d=length(f);
      float dome=sqrt(max(0.,1.-min(1.,d*2.0)*min(1.,d*2.0)));
      float rim=smoothstep(.50,.42,d)-smoothstep(.42,.34,d);
      float glint=pow(max(0.,dot(normalize(vec3(f*.95,dome+.05)),normalize(vec3(-.42,.48,.78)))),18.0);
      float shadow=pow(clamp(1.-d*1.7,0.,1.),2.4);
      float drift=.5+.5*sin((id.x*1.7+id.y*2.1)+t*.22+hash(id)*6.28);
      float textureN=fbm(q*16.+vec2(t*.02,-t*.018));
      vec3 clear=vec3(.72,.79,.87), pearl=vec3(.94,.97,1.0), cyan=vec3(.58,.90,1.0), blush=vec3(1.0,.72,.89);
      vec3 c=mix(clear,pearl,.40+.30*dome);
      c=mix(c,cyan,rim*(.35+.25*drift));
      c=mix(c,blush,rim*(.12+.20*(1.-drift)));
      c+=vec3(glint*.76);
      c*=.88+.12*textureN;
      c-=vec3(shadow*.07);
      return clamp(c,0.,1.);
    }

    vec3 style(float id,vec2 p,float t){
      if(id<.5)return silverMylar(p,t);
      if(id<1.5)return blueFoil(p,t);
      if(id<2.5)return blackInflated(p,t);
      if(id<3.5)return magentaFluid(p,t);
      return bubbleGlass(p,t);
    }
    float inflationWeight(float id){
      if(id<.5)return 1.0;
      if(id<1.5)return .84;
      if(id<2.5)return .72;
      if(id<3.5)return .14;
      return .34;
    }

    vec3 layeredStyle(float id,vec2 p0,vec2 p1,vec2 p2,float t){
      vec3 farS=style(id,p0,t);
      vec3 midS=style(id,p1,t+.61);
      vec3 nearS=style(id,p2,t-.43);
      return clamp(farS*.70+midS*.21+nearS*.09,0.,1.);
    }

    void main(){
      float text=texture(uTextMask,vUv).a;
      float dye=texture(uDye,vUv).r;
      vec2 vel=texture(uVelocity,vUv).xy;
      float L=texture(uDye,vUv-vec2(uTexel.x,0.)).r;
      float R=texture(uDye,vUv+vec2(uTexel.x,0.)).r;
      float B=texture(uDye,vUv-vec2(0.,uTexel.y)).r;
      float T=texture(uDye,vUv+vec2(0.,uTexel.y)).r;
      vec2 grad=vec2(R-L,T-B);

      // Three depth planes respond at different pointer/parallax speeds. The final
      // reveal is still multiplied by the exact text alpha, so no layer can bleed.
      vec2 p0=vUv+uParallax*.42+vel*.020+grad*.016;
      vec2 p1=vUv+uParallax*1.08+vel*.034+grad*.028;
      vec2 p2=vUv+uParallax*1.72+vel*.048+grad*.040;

      // Latest pointer sample is applied directly each rendered frame. Velocity
      // stretches the local refraction without adding easing latency.
      vec2 ptr=vec2(uPointer.x,1.0-uPointer.y);
      vec2 pd=vUv-ptr; vec2 pa=pd; pa.x*=uAspect;
      float pointerField=exp(-dot(pa,pa)*88.0)*uPointerActive;
      float pointerSpeed=clamp(length(uPointerVelocity)*46.0,0.0,1.0);
      vec2 tangent=vec2(-pd.y,pd.x);
      vec2 directWarp=pointerField*(uPointerVelocity*(.120+.070*pointerSpeed)+tangent*(.011+.027*pointerSpeed));
      p1+=directWarp*.62;
      p2+=directWarp*1.32;

      float morph=sin(clamp(uMix,0.,1.)*3.14159265);
      vec2 morphVec=vec2(sin(p1.y*18.+uTime*.34),cos(p1.x*16.-uTime*.29))*(.010*morph);
      vec3 a=layeredStyle(uStyleA,p0-morphVec,p1-morphVec*.45,p2+directWarp*.20,uTime);
      vec3 b=layeredStyle(uStyleB,p0+morphVec,p1+morphVec*.45,p2-directWarp*.20,uTime);
      vec3 hidden=mix(a,b,uMix);

      float reveal=smoothstep(.028,.138,dye)*text;
      float edge=smoothstep(.010,.112,length(grad))*smoothstep(.012,.19,dye)*text;
      vec3 n=normalize(vec3(grad*10.,.23));
      vec3 light=normalize(vec3(-.42,.48,.78));
      float spec=pow(max(dot(n,light),0.),20.)*.64*edge;
      float sheen=pow(max(dot(n,normalize(vec3(.52,-.22,.82))),0.),7.)*.15*edge;
      float meniscus=edge*(.085+.045*sin(uTime*1.55+p1.x*20.-p1.y*13.));
      hidden=max(vec3(0.),hidden*(1.-meniscus)+vec3(spec+sheen));

      // Material-aware inflated edge model. The first three skins behave like
      // physical foil/plastic; liquid remains flatter and glass receives a light rim.
      float mL=texture(uTextMask,vUv-vec2(.0032,0.)).a, mR=texture(uTextMask,vUv+vec2(.0032,0.)).a;
      float mB=texture(uTextMask,vUv-vec2(0.,.0046)).a, mT=texture(uTextMask,vUv+vec2(0.,.0046)).a;
      float wL=texture(uTextMask,vUv-vec2(.0095,0.)).a, wR=texture(uTextMask,vUv+vec2(.0095,0.)).a;
      float wB=texture(uTextMask,vUv-vec2(0.,.0130)).a, wT=texture(uTextMask,vUv+vec2(0.,.0130)).a;
      float inner=min(min(mL,mR),min(mB,mT));
      float innerWide=min(min(wL,wR),min(wB,wT));
      float rim=text*(1.-inner);
      float shoulder=text*inner*(1.-innerWide);
      float body=text*innerWide;
      vec2 mg=vec2(mR-mL,mT-mB);
      vec3 surfN=normalize(vec3(-mg*4.8,.50));
      float rimSpec=pow(max(dot(surfN,normalize(vec3(-.48,.38,.79))),0.),11.0);
      float sideSpec=pow(max(dot(surfN,normalize(vec3(.58,-.18,.80))),0.),6.0);
      float inflate=mix(inflationWeight(uStyleA),inflationWeight(uStyleB),uMix);
      hidden*=1.-inflate*(rim*.27+shoulder*.075);
      hidden+=inflate*(rim*vec3(.13+.72*rimSpec)+shoulder*vec3(.09+.23*sideSpec)+body*vec3(.032));

      vec3 base=mix(uPaper,uInk,text);
      outColor=vec4(mix(base,hidden,reveal),1.);
    }`;

  function compile(type, source){
    const s=gl.createShader(type); gl.shaderSource(s,source); gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)||'shader compile');
    return s;
  }
  function program(fs){
    const p=gl.createProgram(); gl.attachShader(p,compile(gl.VERTEX_SHADER,VERT)); gl.attachShader(p,compile(gl.FRAGMENT_SHADER,fs)); gl.linkProgram(p);
    if(!gl.getProgramParameter(p,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)||'program link'); return p;
  }
  let programs;
  try{
    programs={ copy:program(FS_COPY), advect:program(FS_ADVECT), curl:program(FS_CURL), vort:program(FS_VORTICITY), div:program(FS_DIVERGENCE), clear:program(FS_CLEAR), pressure:program(FS_PRESSURE), grad:program(FS_GRADIENT), splat:program(FS_SPLAT), final:program(FS_FINAL) };
  }catch(err){
    console.warn('GPU shader fallback:',err);
    startCanvasFallback();
    return;
  }
  const vao=gl.createVertexArray(); gl.bindVertexArray(vao);
  const uniformCache=new WeakMap();
  const loc=(p,n)=>{let m=uniformCache.get(p);if(!m){m=new Map();uniformCache.set(p,m);}if(!m.has(n))m.set(n,gl.getUniformLocation(p,n));return m.get(n);};

  function texture(w,h,internal=gl.RGBA16F,format=gl.RGBA,type=gl.HALF_FLOAT,filter=gl.NEAREST){
    const t=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,t);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,filter); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,filter);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D,0,internal,w,h,0,format,type,null); return t;
  }
  function target(w,h){
    const tex=texture(w,h); const fbo=gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER,fbo); gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,tex,0);
    if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE) throw new Error('float framebuffer incomplete');
    return {tex,fbo,w,h};
  }
  function doubleTarget(w,h){ const a=target(w,h), b=target(w,h); return {read:a,write:b,swap(){const x=this.read;this.read=this.write;this.write=x;}}; }
  function bindTexture(unit, tex){ gl.activeTexture(gl.TEXTURE0+unit); gl.bindTexture(gl.TEXTURE_2D,tex); }
  function draw(p,fbo,w,h){ gl.bindFramebuffer(gl.FRAMEBUFFER,fbo); gl.viewport(0,0,w,h); gl.drawArrays(gl.TRIANGLES,0,3); }
  function clearFbo(fbo,w,h){ gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);gl.viewport(0,0,w,h);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT); }

  const state={w:0,h:0,dpr:1,simW:0,simH:0,mobile:false,last:performance.now(),lastSim:performance.now(),start:performance.now(),visible:!document.hidden,pressureIterations:18,minPressure:10,maxPressure:24,avgMs:16.7,frameCount:0};
  const pointer={x:innerWidth*.5,y:innerHeight*.54,lastX:innerWidth*.5,lastY:innerHeight*.54,vx:0,vy:0,lastInput:0,down:false,interacted:false,overText:false,splats:[]};
  const styleMachine={current:0,next:1,mix:0,idle:0,transition:0,transitioning:false,startedThisFrame:false};
  let velocity,dye,pressure,divergence,curl,textMaskTex,textMaskAlpha=null;
  const textMaskCanvas=document.createElement('canvas'), textCtx=textMaskCanvas.getContext('2d',{willReadFrequently:true});

  function fitSize(g,text,family,weight,target,max){let s=max;for(let i=0;i<20;i++){g.font=`${weight} ${s}px ${family}`;const spacing=-s*.035;let w=[...text].reduce((a,ch)=>a+g.measureText(ch).width,0)+spacing*(text.length-1);if(w<=target)break;s*=target/Math.max(w,1);}return s;}
  function drawSpaced(g,text,cx,y,family,weight,size,fill){const spacing=-size*.035,font=`${weight} ${size}px ${family}`;g.font=font;g.fillStyle=fill;g.textBaseline='middle';const chars=[...text], widths=chars.map(ch=>g.measureText(ch).width);const total=widths.reduce((a,b)=>a+b,0)+spacing*(chars.length-1);let x=cx-total/2;chars.forEach((ch,i)=>{g.fillText(ch,x,y);x+=widths[i]+spacing;});}
  function buildTextMask(){
    textMaskCanvas.width=Math.round(state.w*state.dpr); textMaskCanvas.height=Math.round(state.h*state.dpr); textCtx.setTransform(state.dpr,0,0,state.dpr,0,0);textCtx.clearRect(0,0,state.w,state.h);
    const family='"Inter Tight","Helvetica Neue",Arial,sans-serif', target=state.w*(state.mobile?.90:.83), max=Math.min(state.w*(state.mobile?.31:.25),state.h*(state.mobile?.205:.315));
    const top=fitSize(textCtx,'KILE B.',family,800,target,max), bot=fitSize(textCtx,'JONES',family,800,target,max*1.08), gap=Math.max(top,bot)*(state.mobile?.80:.75), cy=state.h*(state.mobile?.54:.555);
    drawSpaced(textCtx,'KILE B.',state.w/2,cy-gap/2,family,800,top,'#fff'); drawSpaced(textCtx,'JONES',state.w/2,cy+gap/2,family,800,bot,'#fff');
    textMaskAlpha=textCtx.getImageData(0,0,textMaskCanvas.width,textMaskCanvas.height).data;
    if(!textMaskTex)textMaskTex=gl.createTexture();bindTexture(0,textMaskTex);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,textMaskCanvas);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
  }

  function destroyTarget(x){if(!x)return;gl.deleteTexture(x.tex);gl.deleteFramebuffer(x.fbo)}
  function destroyDouble(x){if(!x)return;destroyTarget(x.read);destroyTarget(x.write)}
  function resize(){
    state.w=Math.max(320,innerWidth); state.h=Math.max(320,innerHeight); state.mobile=state.w<=700||(coarsePointer&&state.h<=700);
    const maxPixels=state.mobile?650000:2200000; let dpr=Math.min(state.mobile?1.0:1.5,devicePixelRatio||1); const px=state.w*state.h*dpr*dpr;if(px>maxPixels)dpr*=Math.sqrt(maxPixels/px); state.dpr=Math.max(state.mobile?.75:.5,dpr);
    canvas.width=Math.round(state.w*state.dpr);canvas.height=Math.round(state.h*state.dpr);canvas.style.width=`${state.w}px`;canvas.style.height=`${state.h}px`;
    const shortSide=state.mobile?224:(state.w<1200?336:448); const aspect=state.w/state.h;
    if(aspect>=1){state.simH=shortSide;state.simW=Math.round(shortSide*aspect)}else{state.simW=shortSide;state.simH=Math.round(shortSide/aspect)}
    const maxLong=state.mobile?600:800;
    if(Math.max(state.simW,state.simH)>maxLong){const k=maxLong/Math.max(state.simW,state.simH);state.simW=Math.round(state.simW*k);state.simH=Math.round(state.simH*k)}
    state.pressureIterations=state.mobile?13:(state.w<1200?16:18);state.minPressure=state.mobile?8:10;state.maxPressure=state.mobile?18:24;
    destroyDouble(velocity);destroyDouble(dye);destroyDouble(pressure);destroyTarget(divergence);destroyTarget(curl);
    velocity=doubleTarget(state.simW,state.simH);dye=doubleTarget(state.simW,state.simH);pressure=doubleTarget(state.simW,state.simH);divergence=target(state.simW,state.simH);curl=target(state.simW,state.simH);
    [velocity.read,velocity.write,dye.read,dye.write,pressure.read,pressure.write,divergence,curl].forEach(x=>clearFbo(x.fbo,x.w,x.h));buildTextMask();
  }

  function pointOverText(x,y){
    if(!textMaskCanvas.width||!textMaskCanvas.height||!textMaskAlpha)return false;
    const px=Math.max(0,Math.min(textMaskCanvas.width-1,Math.round(x*state.dpr)));
    const py=Math.max(0,Math.min(textMaskCanvas.height-1,Math.round(y*state.dpr)));
    return textMaskAlpha[(py*textMaskCanvas.width+px)*4+3]>18;
  }
  function updateStyleMachine(dt){
    styleMachine.startedThisFrame=false;
    if(styleMachine.transitioning){
      styleMachine.transition+=dt/STYLE_TRANSITION_SECONDS;
      const x=Math.max(0,Math.min(1,styleMachine.transition));
      styleMachine.mix=x*x*(3-2*x);
      if(x>=1){styleMachine.current=styleMachine.next;styleMachine.next=(styleMachine.current+1)%STYLE_COUNT;styleMachine.mix=0;styleMachine.transition=0;styleMachine.transitioning=false;}
      return;
    }
    styleMachine.idle+=dt;
    if(styleMachine.idle>=IDLE_STYLE_SECONDS){
      styleMachine.idle=0;styleMachine.transition=0;styleMachine.transitioning=true;styleMachine.next=(styleMachine.current+1)%STYLE_COUNT;styleMachine.startedThisFrame=true;
    }
  }
  function styleState(){return{a:styleMachine.current,b:styleMachine.next,m:styleMachine.mix};}

  function passAdvect(field, source, dt, diss){const p=programs.advect;gl.useProgram(p);bindTexture(0,source.tex);bindTexture(1,velocity.read.tex);gl.uniform1i(loc(p,'uSource'),0);gl.uniform1i(loc(p,'uVelocity'),1);gl.uniform2f(loc(p,'uTexel'),1/state.simW,1/state.simH);gl.uniform1f(loc(p,'uDt'),dt);gl.uniform1f(loc(p,'uDissipation'),diss);draw(p,field.write.fbo,state.simW,state.simH);field.swap();}
  function passCurl(){const p=programs.curl;gl.useProgram(p);bindTexture(0,velocity.read.tex);gl.uniform1i(loc(p,'uVelocity'),0);gl.uniform2f(loc(p,'uTexel'),1/state.simW,1/state.simH);draw(p,curl.fbo,state.simW,state.simH);}
  function passVorticity(dt){const p=programs.vort;gl.useProgram(p);bindTexture(0,velocity.read.tex);bindTexture(1,curl.tex);gl.uniform1i(loc(p,'uVelocity'),0);gl.uniform1i(loc(p,'uCurl'),1);gl.uniform2f(loc(p,'uTexel'),1/state.simW,1/state.simH);gl.uniform1f(loc(p,'uDt'),dt);gl.uniform1f(loc(p,'uStrength'),state.mobile?20:24);draw(p,velocity.write.fbo,state.simW,state.simH);velocity.swap();}
  function passDivergence(){const p=programs.div;gl.useProgram(p);bindTexture(0,velocity.read.tex);gl.uniform1i(loc(p,'uVelocity'),0);gl.uniform2f(loc(p,'uTexel'),1/state.simW,1/state.simH);draw(p,divergence.fbo,state.simW,state.simH);}
  function solvePressure(){let p=programs.clear;gl.useProgram(p);bindTexture(0,pressure.read.tex);gl.uniform1i(loc(p,'uTexture'),0);gl.uniform1f(loc(p,'uValue'),.80);draw(p,pressure.write.fbo,state.simW,state.simH);pressure.swap();p=programs.pressure;gl.useProgram(p);bindTexture(1,divergence.tex);gl.uniform1i(loc(p,'uPressure'),0);gl.uniform1i(loc(p,'uDivergence'),1);gl.uniform2f(loc(p,'uTexel'),1/state.simW,1/state.simH);for(let i=0;i<state.pressureIterations;i++){bindTexture(0,pressure.read.tex);draw(p,pressure.write.fbo,state.simW,state.simH);pressure.swap();}}
  function subtractGradient(){const p=programs.grad;gl.useProgram(p);bindTexture(0,pressure.read.tex);bindTexture(1,velocity.read.tex);gl.uniform1i(loc(p,'uPressure'),0);gl.uniform1i(loc(p,'uVelocity'),1);gl.uniform2f(loc(p,'uTexel'),1/state.simW,1/state.simH);draw(p,velocity.write.fbo,state.simW,state.simH);velocity.swap();}
  function splat(field, point, color, radius){const p=programs.splat;gl.useProgram(p);bindTexture(0,field.read.tex);gl.uniform1i(loc(p,'uTarget'),0);gl.uniform2f(loc(p,'uPoint'),point.x,point.y);gl.uniform3f(loc(p,'uColor'),color[0],color[1],color[2]);gl.uniform1f(loc(p,'uRadius'),radius*radius);gl.uniform1f(loc(p,'uAspect'),state.simW/state.simH);draw(p,field.write.fbo,state.simW,state.simH);field.swap();}

  function queueSplat(x,y,dx,dy,power=1){
    const speed=Math.min(1,Math.hypot(dx,dy)/38); const point={x:x/state.w,y:1-y/state.h};
    const force=(state.mobile?12.0:15.5)*(0.54+speed*.74)*power; const vx=(dx/state.w)*force, vy=-(dy/state.h)*force;
    const radius=(state.mobile?.118:.094)*(1+speed*.24);
    pointer.splats.push({point,vx,vy,radius,dye:.76+speed*.24}); if(pointer.splats.length>72)pointer.splats.splice(0,pointer.splats.length-72);
  }
  function consumeSplats(){
    if(!pointer.splats.length)return;
    const all=pointer.splats.splice(0);
    const cap=state.mobile?5:8;
    const samples=[];
    if(all.length<=cap)samples.push(...all);
    else{for(let i=0;i<cap;i++){const idx=Math.round(i*(all.length-1)/(cap-1));samples.push(all[idx]);}}
    for(const q of samples){splat(velocity,q.point,[q.vx,q.vy,0],q.radius);splat(dye,q.point,[q.dye,0,0],q.radius*1.28);}
  }

  function syntheticIntro(t){if(pointer.interacted||t<.8||t>4.0)return;const u=(t-.8)/3.2;const x=state.w*(.17+u*.66), y=state.h*(.54+Math.sin(u*Math.PI*3.1)*.052);const dx=x-pointer.lastX,dy=y-pointer.lastY;if(Math.hypot(dx,dy)>8){queueSplat(x,y,dx,dy,.82);pointer.lastX=x;pointer.lastY=y;}}

  function renderFinal(t){
    const st=styleState(),p=programs.final;gl.useProgram(p);bindTexture(0,dye.read.tex);bindTexture(1,velocity.read.tex);bindTexture(2,textMaskTex);
    gl.uniform1i(loc(p,'uDye'),0);gl.uniform1i(loc(p,'uVelocity'),1);gl.uniform1i(loc(p,'uTextMask'),2);gl.uniform2f(loc(p,'uTexel'),1/state.simW,1/state.simH);
    const nx=pointer.x/state.w-.5,ny=pointer.y/state.h-.5;gl.uniform2f(loc(p,'uParallax'),-nx*.030,ny*.019);
    gl.uniform2f(loc(p,'uPointer'),pointer.x/state.w,pointer.y/state.h);gl.uniform2f(loc(p,'uPointerVelocity'),pointer.vx,pointer.vy);
    gl.uniform1f(loc(p,'uPointerActive'),pointer.overText?1:0);gl.uniform1f(loc(p,'uAspect'),state.w/state.h);
    gl.uniform1f(loc(p,'uTime'),t);gl.uniform1f(loc(p,'uStyleA'),st.a);gl.uniform1f(loc(p,'uStyleB'),st.b);gl.uniform1f(loc(p,'uMix'),st.m);gl.uniform3fv(loc(p,'uPaper'),PAPER);gl.uniform3fv(loc(p,'uInk'),INK);draw(p,null,canvas.width,canvas.height);
  }

  function updateAdaptiveQuality(ms){state.avgMs=state.avgMs*.94+ms*.06;state.frameCount++;if(state.frameCount%90!==0)return;if(state.avgMs>18.4&&state.pressureIterations>state.minPressure)state.pressureIterations-=2;else if(state.avgMs<14.8&&state.pressureIterations<state.maxPressure)state.pressureIterations+=1; window.__KBJ_DIAGNOSTICS={mode:'webgl2-fluid',avgFrameMs:+state.avgMs.toFixed(2),estimatedFps:+(1000/state.avgMs).toFixed(1),pressureIterations:state.pressureIterations,simulation:[state.simW,state.simH],canvas:[canvas.width,canvas.height],style:styleMachine.current,styleName:MATERIAL_NAMES[styleMachine.current],nextStyle:styleMachine.next,nextStyleName:MATERIAL_NAMES[styleMachine.next],styleMix:+styleMachine.mix.toFixed(3),pointer:[+pointer.x.toFixed(1),+pointer.y.toFixed(1)],overText:pointer.overText};}

  function frame(now){
    requestAnimationFrame(frame);if(!state.visible)return;
    const raw=now-state.last,styleDt=Math.max(0,raw/1000);state.last=now;const t=(now-state.start)/1000;
    syntheticIntro(t);updateStyleMachine(styleDt);if(styleMachine.startedThisFrame)queueSplat(state.w*.5,state.h*.555,0,0,.30);
    const simElapsed=Math.max(0,(now-state.lastSim)/1000),simInterval=state.mobile?1/55:1/80;
    if(simElapsed>=simInterval){
      const dt=Math.min(.033,Math.max(.001,simElapsed));state.lastSim=now;
      passAdvect(velocity,velocity.read,dt,Math.pow(.991,dt*60));passCurl();passVorticity(dt);passDivergence();solvePressure();subtractGradient();
      passAdvect(dye,dye.read,dt,Math.pow(.9974,dt*60));consumeSplats();
    }
    renderFinal(t);pointer.vx*=.72;pointer.vy*=.72;updateAdaptiveQuality(raw);
  }

  function input(e,active=true){
    pointer.interacted=true;const lift=(e.pointerType==='touch'||coarsePointer)?32:0,x=e.clientX,y=Math.max(0,e.clientY-lift),dx=x-pointer.lastX,dy=y-pointer.lastY;pointer.x=x;pointer.y=y;pointer.vx=dx/state.w;pointer.vy=-dy/state.h;pointer.lastInput=performance.now();pointer.overText=pointOverText(x,y);window.__KBJ_LAST_POINTER={x:+x.toFixed(1),y:+y.toFixed(1),t:+pointer.lastInput.toFixed(1),overText:pointer.overText};
    if(active&&pointer.overText){const d=Math.hypot(dx,dy),steps=Math.max(1,Math.min(7,Math.ceil(d/15)));for(let i=1;i<=steps;i++){const q=i/steps;queueSplat(pointer.lastX+dx*q,pointer.lastY+dy*q,dx/steps,dy/steps,1);}}
    pointer.lastX=x;pointer.lastY=y;
  }
  function feedPointer(e,active=true){
    if(e.pointerType==='touch'&&!pointer.down&&active)return;
    const batch=(active&&typeof e.getCoalescedEvents==='function')?e.getCoalescedEvents():null;
    if(batch&&batch.length){for(const q of batch)input(q,active);}else input(e,active);
  }
  canvas.addEventListener('pointerenter',e=>feedPointer(e,false),{passive:true});
  if('onpointerrawupdate' in window) canvas.addEventListener('pointerrawupdate',e=>feedPointer(e,true),{passive:true});
  else canvas.addEventListener('pointermove',e=>feedPointer(e,true),{passive:true});
  canvas.addEventListener('pointerleave',()=>{pointer.overText=false;},{passive:true});
  canvas.addEventListener('pointerdown',e=>{pointer.down=true;input(e,true);canvas.setPointerCapture?.(e.pointerId)});
  canvas.addEventListener('pointerup',e=>{pointer.down=false;canvas.releasePointerCapture?.(e.pointerId)});
  canvas.addEventListener('pointercancel',()=>{pointer.down=false;pointer.overText=false});
  window.addEventListener('resize',()=>{clearTimeout(resize._t);resize._t=setTimeout(resize,140)},{passive:true});
  document.addEventListener('visibilitychange',()=>{state.visible=!document.hidden;if(state.visible)state.last=performance.now()});

  try{resize();document.fonts?.ready?.then(buildTextMask);requestAnimationFrame(frame);}catch(err){console.warn('GPU fluid fallback:',err);startCanvasFallback();}

  function startCanvasFallback(){
    const ctx=canvas.getContext('2d'); if(!ctx)return;
    const off=document.createElement('canvas'), ox=off.getContext('2d'), mask=document.createElement('canvas'), mx=mask.getContext('2d',{willReadFrequently:true}), base=document.createElement('canvas'), bctx=base.getContext('2d'), blob=document.createElement('canvas'), bx=blob.getContext('2d');
    const s={w:0,h:0,dpr:1,mobile:false,start:performance.now(),last:0,trail:[],x:innerWidth*.5,y:innerHeight*.54,tx:innerWidth*.5,ty:innerHeight*.54,down:false,interacted:false,overText:false,visible:!document.hidden,maskAlpha:null};
    const fallbackStyleMachine={current:0,next:1,mix:0,idle:0,transition:0,transitioning:false,startedThisFrame:false};
    function prep(c,g){c.width=Math.round(s.w*s.dpr);c.height=Math.round(s.h*s.dpr);g.setTransform(s.dpr,0,0,s.dpr,0,0)}
    function text(){mx.clearRect(0,0,s.w,s.h);bctx.clearRect(0,0,s.w,s.h);const family='"Inter Tight","Helvetica Neue",Arial,sans-serif',target=s.w*(s.mobile?.90:.83),max=Math.min(s.w*(s.mobile?.31:.25),s.h*(s.mobile?.205:.315));const top=fitSize(mx,'KILE B.',family,800,target,max),bot=fitSize(mx,'JONES',family,800,target,max*1.08),gap=Math.max(top,bot)*(s.mobile?.80:.75),cy=s.h*(s.mobile?.54:.555);drawSpaced(mx,'KILE B.',s.w/2,cy-gap/2,family,800,top,'#fff');drawSpaced(mx,'JONES',s.w/2,cy+gap/2,family,800,bot,'#fff');drawSpaced(bctx,'KILE B.',s.w/2,cy-gap/2,family,800,top,'#0b0b0c');drawSpaced(bctx,'JONES',s.w/2,cy+gap/2,family,800,bot,'#0b0b0c');s.maskAlpha=mx.getImageData(0,0,mask.width,mask.height).data;}
    function rsz(){s.w=Math.max(320,innerWidth);s.h=Math.max(320,innerHeight);s.mobile=s.w<=700||(coarsePointer&&s.h<=700);const maxPx=s.mobile?650000:1800000;let fdpr=Math.min(s.mobile?1:1.25,devicePixelRatio||1),fpx=s.w*s.h*fdpr*fdpr;if(fpx>maxPx)fdpr*=Math.sqrt(maxPx/fpx);s.dpr=Math.max(s.mobile?.75:.5,fdpr);canvas.width=Math.round(s.w*s.dpr);canvas.height=Math.round(s.h*s.dpr);canvas.style.width=`${s.w}px`;canvas.style.height=`${s.h}px`;ctx.setTransform(s.dpr,0,0,s.dpr,0,0);prep(off,ox);prep(mask,mx);prep(base,bctx);prep(blob,bx);text();}
    function add(x,y,dx=0,dy=0,p=1){s.trail.push({x,y,dx,dy,life:p,phase:Math.random()*6.28});const maxTrail=s.mobile?36:50;if(s.trail.length>maxTrail)s.trail.splice(0,s.trail.length-maxTrail);}
    function fallbackPointOverText(x,y){if(!mask.width||!mask.height||!s.maskAlpha)return false;const px=Math.max(0,Math.min(mask.width-1,Math.round(x*s.dpr))),py=Math.max(0,Math.min(mask.height-1,Math.round(y*s.dpr)));return s.maskAlpha[(py*mask.width+px)*4+3]>18;}
    function updateFallbackStyle(dt){const m=fallbackStyleMachine;m.startedThisFrame=false;if(m.transitioning){m.transition+=dt/STYLE_TRANSITION_SECONDS;const x=Math.max(0,Math.min(1,m.transition));m.mix=x*x*(3-2*x);if(x>=1){m.current=m.next;m.next=(m.current+1)%STYLE_COUNT;m.mix=0;m.transition=0;m.transitioning=false;}return;}m.idle+=dt;if(m.idle>=IDLE_STYLE_SECONDS){m.idle=0;m.transition=0;m.transitioning=true;m.next=(m.current+1)%STYLE_COUNT;m.startedThisFrame=true;}}
    function fallbackStyle(){const m=fallbackStyleMachine;return{a:m.current,b:m.next,m:m.mix};}
    function fallbackPattern(g,id,t,alpha){
      g.save();
      g.globalAlpha=alpha;

      if(id===0){
        // Silver inflated Mylar.
        const gr=g.createLinearGradient(0,s.h*.08,s.w,s.h*.92);
        gr.addColorStop(0,'#111722');gr.addColorStop(.16,'#dce2ea');gr.addColorStop(.31,'#5e6877');gr.addColorStop(.49,'#fbfdff');gr.addColorStop(.66,'#727c8b');gr.addColorStop(.83,'#edf2f8');gr.addColorStop(1,'#151c27');
        g.fillStyle=gr;g.fillRect(0,0,s.w,s.h);
        const sweepX=((t*58)%(s.w*1.55))-s.w*.28;
        const shine=g.createLinearGradient(sweepX-s.w*.18,0,sweepX+s.w*.18,0);
        shine.addColorStop(0,'rgba(255,255,255,0)');shine.addColorStop(.43,'rgba(255,255,255,.10)');shine.addColorStop(.50,'rgba(255,255,255,.96)');shine.addColorStop(.57,'rgba(255,255,255,.12)');shine.addColorStop(1,'rgba(255,255,255,0)');
        g.globalAlpha*=.70;g.fillStyle=shine;g.fillRect(0,0,s.w,s.h);
        g.globalAlpha*=.58;g.strokeStyle='rgba(26,32,42,.82)';g.lineWidth=Math.max(1.1,s.w*.0013);
        for(let k=-3;k<9;k++){g.beginPath();for(let y=0;y<=s.h;y+=15){const x=s.w*(.06+k*.14)+Math.sin(y*.032+t*.39+k)*14+Math.sin(y*.087-k)*5;if(y===0)g.moveTo(x,y);else g.lineTo(x,y)}g.stroke()}
      }else if(id===1){
        // Crumpled electric-blue foil.
        const gr=g.createLinearGradient(0,0,s.w,s.h);
        gr.addColorStop(0,'#03113a');gr.addColorStop(.24,'#0a42c6');gr.addColorStop(.47,'#63c8ff');gr.addColorStop(.60,'#0b2c86');gr.addColorStop(.79,'#2d79ff');gr.addColorStop(1,'#020a24');
        g.fillStyle=gr;g.fillRect(0,0,s.w,s.h);
        g.globalAlpha*=.60;g.lineWidth=Math.max(1.1,s.w*.0014);
        for(let k=-5;k<14;k++){
          g.strokeStyle=k%3===0?'rgba(210,244,255,.76)':'rgba(1,17,71,.70)';
          g.beginPath();
          for(let y=-20;y<=s.h+20;y+=18){const x=s.w*(k*.095)+Math.sin(y*.042+k*1.6+t*.28)*18+Math.sin(y*.099-k)*6;if(y<0)g.moveTo(x,y);else g.lineTo(x,y)}
          g.stroke();
        }
        g.globalAlpha*=.46;for(let y=0;y<s.h;y+=42){g.strokeStyle='rgba(255,255,255,.42)';g.beginPath();g.moveTo(0,y+Math.sin(t+y)*6);g.lineTo(s.w,y+Math.sin(t*.7+y*.03)*18);g.stroke()}
      }else if(id===2){
        // Glossy black inflated plastic.
        g.fillStyle='#020305';g.fillRect(0,0,s.w,s.h);
        const cx=s.w*(.46+.05*Math.sin(t*.17)),cy=s.h*(.42+.04*Math.cos(t*.15));
        const rg=g.createRadialGradient(cx-s.w*.08,cy-s.h*.12,0,cx,cy,Math.max(s.w,s.h)*.68);
        rg.addColorStop(0,'rgba(255,255,255,.72)');rg.addColorStop(.06,'rgba(120,137,162,.42)');rg.addColorStop(.18,'rgba(34,40,52,.36)');rg.addColorStop(.58,'rgba(4,5,8,.16)');rg.addColorStop(1,'rgba(0,0,0,.82)');
        g.fillStyle=rg;g.fillRect(0,0,s.w,s.h);
        g.globalAlpha*=.52;g.strokeStyle='rgba(235,244,255,.32)';g.lineWidth=Math.max(1.2,s.w*.0014);
        for(let k=-2;k<8;k++){g.beginPath();for(let y=0;y<=s.h;y+=17){const x=s.w*(.07+k*.15)+Math.sin(y*.027+t*.31+k)*10+Math.sin(y*.075-k)*4;if(y===0)g.moveTo(x,y);else g.lineTo(x,y)}g.stroke()}
      }else if(id===3){
        // Saturated viscous magenta.
        const gr=g.createLinearGradient(0,0,s.w,s.h);
        gr.addColorStop(0,'#210015');gr.addColorStop(.26,'#9a075d');gr.addColorStop(.54,'#ff167c');gr.addColorStop(.76,'#64033f');gr.addColorStop(1,'#12000d');
        g.fillStyle=gr;g.fillRect(0,0,s.w,s.h);
        g.globalAlpha*=.66;
        for(let k=-2;k<10;k++){
          g.strokeStyle=k%3===0?'rgba(255,225,246,.52)':'rgba(91,0,52,.68)';g.lineWidth=k%3===0?5:12;g.beginPath();
          for(let y=-20;y<=s.h+20;y+=14){const x=s.w*(.04+k*.12)+Math.sin(y*.029+t*.55+k*.8)*22+Math.sin(y*.073-t*.24)*8;if(y<0)g.moveTo(x,y);else g.lineTo(x,y)}g.stroke();
        }
      }else{
        // Bubble-wrap / refractive glass.
        const bg=g.createLinearGradient(0,0,s.w,s.h);bg.addColorStop(0,'#748493');bg.addColorStop(.45,'#e9f0f5');bg.addColorStop(1,'#8796a4');g.fillStyle=bg;g.fillRect(0,0,s.w,s.h);
        const cell=Math.max(34,Math.min(64,s.w*.052)),r=cell*.34;
        for(let row=-1,y=-cell*.5;y<s.h+cell;y+=cell,row++){
          const off=(row&1)?cell*.5:0;
          for(let x=-cell+off;x<s.w+cell;x+=cell){
            const drift=Math.sin(t*.35+row*.7+x*.01)*1.8;
            const rg=g.createRadialGradient(x-r*.28,y-r*.30,1,x+drift,y,r);
            rg.addColorStop(0,'rgba(255,255,255,.96)');rg.addColorStop(.18,'rgba(214,246,255,.68)');rg.addColorStop(.58,'rgba(155,188,206,.20)');rg.addColorStop(.82,'rgba(255,184,225,.16)');rg.addColorStop(1,'rgba(34,63,83,.48)');
            g.fillStyle=rg;g.beginPath();g.arc(x+drift,y,r,0,Math.PI*2);g.fill();
            g.strokeStyle='rgba(235,251,255,.48)';g.lineWidth=1;g.stroke();
          }
        }
      }
      g.restore();
    }
    function fallbackFrame(now){requestAnimationFrame(fallbackFrame);if(!s.visible)return;const interval=s.mobile?32:16;if(now-s.last<interval)return;const elapsed=s.last?Math.max(0,(now-s.last)/1000):interval/1000;s.last=now;const t=(now-s.start)/1000;updateFallbackStyle(elapsed);s.x=s.tx;s.y=s.ty;window.__KBJ_DIAGNOSTICS={mode:'canvas2d-fallback',canvas:[canvas.width,canvas.height],style:fallbackStyleMachine.current,styleName:MATERIAL_NAMES[fallbackStyleMachine.current],nextStyle:fallbackStyleMachine.next,nextStyleName:MATERIAL_NAMES[fallbackStyleMachine.next],styleMix:+fallbackStyleMachine.mix.toFixed(3),pointer:[+s.tx.toFixed(1),+s.ty.toFixed(1)],overText:s.overText};if(!reduceMotion&&!s.interacted&&t>.7&&t<4){const u=(t-.7)/3.3;add(s.w*(.17+u*.66),s.h*(.54+Math.sin(u*Math.PI*3)*.05),8,0,.9)}if(fallbackStyleMachine.startedThisFrame)add(s.w*.5,s.h*.555,0,0,.62);s.trail.forEach(p=>p.life*=s.mobile?.948:.955);s.trail=s.trail.filter(p=>p.life>.025);
      ox.clearRect(0,0,s.w,s.h);const fs=fallbackStyle();fallbackPattern(ox,fs.a,t,1-fs.m);fallbackPattern(ox,fs.b,t,fs.m);ox.globalCompositeOperation='destination-in';
      bx.clearRect(0,0,s.w,s.h);bx.filter=`blur(${s.mobile?6:8}px)`;for(let ii=0;ii<s.trail.length;ii+=(s.mobile?2:1)){const p=s.trail[ii];const r=Math.min(s.w,s.h)*(s.mobile?.22:.185)*(0.58+p.life*.52);const wob=1+Math.sin(t*1.45+p.phase)*.115;bx.save();bx.translate(p.x,p.y);bx.rotate(Math.atan2(p.dy,p.dx||.001));bx.scale(1.46*wob,.70/wob);const g=bx.createRadialGradient(0,0,0,0,0,r);g.addColorStop(0,`rgba(255,255,255,${p.life})`);g.addColorStop(.48,`rgba(255,255,255,${p.life*.96})`);g.addColorStop(.78,`rgba(255,255,255,${p.life*.58})`);g.addColorStop(1,'rgba(255,255,255,0)');bx.fillStyle=g;bx.fillRect(-r,-r,r*2,r*2);bx.restore();}ox.drawImage(blob,0,0,s.w,s.h);ox.drawImage(mask,0,0,s.w,s.h);ox.globalCompositeOperation='source-over';ctx.globalCompositeOperation='source-over';ctx.fillStyle='#f3f5f7';ctx.fillRect(0,0,s.w,s.h);ctx.drawImage(base,0,0,s.w,s.h);ctx.drawImage(off,0,0,s.w,s.h);
    }
    function inp(e,act=true){s.interacted=true;if(reduceMotion)return;const lift=(e.pointerType==='touch'||coarsePointer)?32:0,x=e.clientX,y=Math.max(0,e.clientY-lift),dx=x-s.tx,dy=y-s.ty;s.tx=x;s.ty=y;s.overText=fallbackPointOverText(x,y);window.__KBJ_LAST_POINTER={x:+x.toFixed(1),y:+y.toFixed(1),t:+performance.now().toFixed(1),overText:s.overText};if(act&&s.overText){const d=Math.hypot(dx,dy),steps=Math.max(1,Math.min(8,Math.ceil(d/13)));for(let i=1;i<=steps;i++){const q=i/steps;add(x-dx+dx*q,y-dy+dy*q,dx/steps,dy/steps,1)}}}
    function feedFallback(e,act=true){if(e.pointerType==='touch'&&!s.down&&act)return;const batch=(act&&typeof e.getCoalescedEvents==='function')?e.getCoalescedEvents():null;if(batch&&batch.length){for(const q of batch)inp(q,act)}else inp(e,act)}
    canvas.addEventListener('pointerenter',e=>feedFallback(e,false),{passive:true});if('onpointerrawupdate' in window)canvas.addEventListener('pointerrawupdate',e=>feedFallback(e,true),{passive:true});else canvas.addEventListener('pointermove',e=>feedFallback(e,true),{passive:true});canvas.addEventListener('pointerleave',()=>{s.overText=false;},{passive:true});canvas.addEventListener('pointerdown',e=>{s.down=true;inp(e,true)});canvas.addEventListener('pointerup',()=>s.down=false);canvas.addEventListener('pointercancel',()=>{s.down=false;s.overText=false});window.addEventListener('resize',()=>{clearTimeout(rsz._t);rsz._t=setTimeout(rsz,140)},{passive:true});document.addEventListener('visibilitychange',()=>{s.visible=!document.hidden;if(s.visible)s.last=performance.now();});rsz();window.__KBJ_DIAGNOSTICS={mode:'canvas2d-fallback',simulation:null,canvas:[canvas.width,canvas.height]};document.fonts?.ready?.then(text);requestAnimationFrame(fallbackFrame);
  }
})();
