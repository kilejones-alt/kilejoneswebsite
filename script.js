(() => {
  'use strict';

  const canvas = document.querySelector('#hero-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
  if (!ctx) return;

  const menuToggle = document.querySelector('#menu-toggle');
  const mobileDrawer = document.querySelector('#mobile-drawer');
  const musicToggle = document.querySelector('#music-toggle');
  const audio = document.querySelector('#background-music');
  const video = document.querySelector('#hero-video');
  const cursorRoot = document.querySelector('#elite-cursor');
  const cursorRing = cursorRoot?.querySelector('.elite-cursor-ring');
  const cursorDot = cursorRoot?.querySelector('.elite-cursor-dot');

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarsePointer = matchMedia('(pointer: coarse)').matches;
  const finePointer = matchMedia('(pointer: fine) and (hover:hover)').matches;

  const PAPER = '#f3f5f7';
  const INK = '#09090a';
  const MODE_SECONDS = 6.8;
  const TRANSITION_SECONDS = 1.35;
  // Six real material worlds. Bright pigments are deliberately interrupted
  // by matte black and silver/foil so the hero changes material, not only hue.
  const MODE_NAMES = ['MIDNIGHT GLOSS', 'NEON PINK LATEX', 'HOT ORANGE', 'MATTE BLACK', 'BRIGHT TEAL', 'SILVER FOIL'];
  const SOLID_COLORS = ['#071226', '#FF0668', '#FF5A00', '#050506', '#00D9C6', '#C9D1DD'];

  const HERO_TRY = Math.max(1, Math.min(7, Number(new URLSearchParams(location.search).get('try')) || 1));
  const HERO_PROFILES = {
    1:{name:'soft-mass',family:'"Instrument Sans","Helvetica Neue",Arial,sans-serif',weight:700,horizontal:.965,
       gravity:2650,restitution:.23,damping:4.8,squash:.074,wobble:14.2,delay:.26,parallax:1.30},
    2:{name:'dense-rubber',family:'"Archivo","Helvetica Neue",Arial,sans-serif',weight:760,horizontal:.955,
       gravity:3150,restitution:.31,damping:5.2,squash:.095,wobble:16.4,delay:.20,parallax:1.55},
    3:{name:'editorial-elastic',family:'"Space Grotesk","Helvetica Neue",Arial,sans-serif',weight:650,horizontal:.972,
       gravity:2850,restitution:.27,damping:4.3,squash:.086,wobble:12.8,delay:.30,parallax:1.78},
    4:{name:'quiet-heavy',family:'"IBM Plex Sans","Helvetica Neue",Arial,sans-serif',weight:600,horizontal:.948,
       gravity:3500,restitution:.17,damping:6.0,squash:.060,wobble:18.4,delay:.16,parallax:1.18,oil:1.0},
    5:{name:'nothin-viscous',family:'"Instrument Sans","Helvetica Neue",Arial,sans-serif',weight:700,horizontal:.965,
       gravity:0,restitution:0,damping:0,squash:0,wobble:0,delay:0,parallax:2.15,oil:1.75},
    6:{name:'nothin-deep',family:'"Instrument Sans","Helvetica Neue",Arial,sans-serif',weight:700,horizontal:.965,
       gravity:0,restitution:0,damping:0,squash:0,wobble:0,delay:0,parallax:2.75,oil:2.25},
    7:{name:'nothin-layered-physics',family:'"Instrument Sans","Helvetica Neue",Arial,sans-serif',weight:700,horizontal:.965,
       gravity:0,restitution:0,damping:0,squash:0,wobble:0,delay:0,parallax:2.42,oil:2.55}
  };
  for(const k of [1,2,3,4]) if(!('oil' in HERO_PROFILES[k])) HERO_PROFILES[k].oil=1.0;
  const HERO_PROFILE = HERO_PROFILES[HERO_TRY];
  document.documentElement.dataset.heroTry = String(HERO_TRY);
  const state = {
    w: 0,
    h: 0,
    dpr: 1,
    mobile: false,
    running: true,
    start: performance.now(),
    lastDraw: 0,
    last: performance.now(),
    mode: 0,
    nextMode: 1,
    modeStart: performance.now(),
    mix: 0,
    fps: 60,
    frames: 0,
    fpsMark: performance.now(),
    // The typography itself stays front-facing. Pointer energy is routed into
    // the internal world rather than scaling or tilting the wordmark.
    letterScale: 1,
    letterHoverUntil: 0,
    entry: {
      initialized:false, y:0, vy:0, impact:0, impactAt:0,
      scaleX:1, scaleY:1, settled:false, startedAt:performance.now()
    },
  };

  const pointer = {
    x: innerWidth * 0.5,
    y: innerHeight * 0.5,
    nx: 0,
    ny: 0,
    px: innerWidth * 0.5,
    py: innerHeight * 0.5,
    vx: 0,
    vy: 0,
    speed: 0,
    active: false,
    down: false,
    overCanvas: false,
    glyphHover: false,
    nvx: 0,
    nvy: 0,
    speedN: 0,
    lastT: performance.now(),
  };

  const maskCanvas = document.createElement('canvas');
  const maskCtx = maskCanvas.getContext('2d');
  const sceneA = document.createElement('canvas');
  const sceneACtx = sceneA.getContext('2d');
  const sceneB = document.createElement('canvas');
  const sceneBCtx = sceneB.getContext('2d');

  // Progressive GPU stage; the established 2D/video renderer stays intact.
  const gpuRenderer = window.KBJGpuRenderer?.create(canvas, video) || null;

  setupUI();
  setupCursor();
  setupVideo();
  resize();
  document.fonts?.ready.then(() => { if(state.running) resize(); });
  addEventListener('resize', debounce(resize, 80), { passive: true });
  document.addEventListener('visibilitychange', () => {
    state.running = !document.hidden;
    if (state.running) {
      state.last = performance.now();
      requestAnimationFrame(frame);
    }
  });

  requestAnimationFrame(frame);

  function setupUI() {
    let menuCloseTimer=0;
    const cancelMenuClose=()=>{clearTimeout(menuCloseTimer);menuCloseTimer=0;};
    const closeAfterPointerLeave=(delay=230)=>{
      if(!finePointer)return;
      cancelMenuClose();
      menuCloseTimer=setTimeout(()=>{
        if(mobileDrawer?.classList.contains('is-open')){
          setMenu(false);
        }
      },delay);
    };
    const setMenu = (open) => {
      if (!menuToggle || !mobileDrawer) return;
      if(!open)cancelMenuClose();
      menuToggle.setAttribute('aria-expanded', String(open));
      mobileDrawer.classList.toggle('is-open', open);
      mobileDrawer.setAttribute('aria-hidden', String(!open));
      mobileDrawer.inert = !open;
    };

    menuToggle?.addEventListener('click', (event) => {
      // Mouse hover already opens this menu. A mouse click must not
      // immediately reverse that opening; touch and keyboard still toggle.
      const open=menuToggle.getAttribute('aria-expanded')==='true';
      setMenu(finePointer && event.detail>0 ? true : !open);
    });
    if(finePointer){
      // Desktop: open by hovering, without requiring a click.
      // Keep a small bridge across the gap between pill and dropdown.
      menuToggle?.addEventListener('pointerenter',()=>{
        cancelMenuClose();setMenu(true);
      },{passive:true});
      menuToggle?.addEventListener('pointerleave',()=>closeAfterPointerLeave(300),{passive:true});
      mobileDrawer?.addEventListener('pointerenter',cancelMenuClose,{passive:true});
      mobileDrawer?.addEventListener('pointerleave',()=>closeAfterPointerLeave(180),{passive:true});
      window.addEventListener('blur',()=>setMenu(false));
    }
    document.addEventListener('click', (e) => {
      if (!menuToggle || !mobileDrawer) return;
      if (menuToggle.contains(e.target) || mobileDrawer.contains(e.target)) return;
      setMenu(false);
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

    const updateMusicButton = () => {
      if (!audio || !musicToggle) return;
      const active = !audio.paused && !audio.ended;
      musicToggle.classList.toggle('is-active', active);
      musicToggle.setAttribute('aria-pressed', String(active));
      musicToggle.setAttribute('aria-label', active ? 'Pause background music' : 'Play background music');
    };

    musicToggle?.addEventListener('click', async () => {
      if (!audio) return;
      audio.volume = 0.28;
      if (audio.paused) {
        try { await audio.play(); } catch (_) {}
      } else {
        audio.pause();
      }
      updateMusicButton();
    });

    audio?.addEventListener('play', updateMusicButton);
    audio?.addEventListener('pause', updateMusicButton);
  }

  function setupVideo() {
    if (!video) return;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    const tryPlay = () => { if (!reduceMotion) video.play().catch(() => {}); };
    video.addEventListener('canplay', tryPlay, { once: true });
    tryPlay();
    ['pointerdown', 'touchstart', 'keydown'].forEach((name) => addEventListener(name, tryPlay, { once: true, passive: true }));
  }

  function setupCursor() {
    // Keep a native OS cursor: no oversized rings, trails or hover morphs.
    // Pointer coordinates still drive gentle 3D camera parallax.
    const updatePointer=(e)=>{
      const x=e.clientX,y=e.clientY,now=performance.now();
      const seconds=Math.max(.004,Math.min(.05,(now-pointer.lastT)/1000||.0167));
      const dx=x-pointer.x,dy=y-pointer.y;
      pointer.vx=dx;
      pointer.vy=dy;
      pointer.speed=Math.min(1,Math.hypot(dx,dy)/28);

      // Frame-rate-independent normalized velocity. Raw pointer events can
      // arrive much faster than pointermove; measuring pixels/event made fast
      // hardware mice look artificially slow.
      const instantVX=dx/Math.max(1,state.w)/seconds;
      const instantVY=dy/Math.max(1,state.h)/seconds;
      const a=1-Math.exp(-seconds*22);
      pointer.nvx+=(instantVX-pointer.nvx)*a;
      pointer.nvy+=(instantVY-pointer.nvy)*a;
      pointer.speedN=Math.min(3,Math.hypot(pointer.nvx,pointer.nvy));
      pointer.lastT=now;

      pointer.x=x;pointer.y=y;
      pointer.nx=state.w?(x/state.w)*2-1:0;
      pointer.ny=state.h?(y/state.h)*2-1:0;
      pointer.active=true;
      pointer.overCanvas=x>=0&&y>=0&&x<=state.w&&y<=state.h;
    };
    // Listen to pointermove unconditionally; raw updates are an additional
    // high-frequency input when the browser provides them, never the only one.
    addEventListener('pointermove',updatePointer,{passive:true});
    if('onpointerrawupdate' in window)
      addEventListener('pointerrawupdate',updatePointer,{passive:true});
    addEventListener('pointerdown',updatePointer,{passive:true});
    canvas.addEventListener('pointerenter',e=>{pointer.overCanvas=true;updatePointer(e);},{passive:true});
    canvas.addEventListener('pointerleave',()=>{pointer.overCanvas=false;},{passive:true});
  }

  function resize() {
    state.w = Math.max(320, innerWidth);
    state.h = Math.max(320, innerHeight);
    state.mobile = state.w <= 700 || (coarsePointer && state.h <= 700);

    const pixelBudget = state.mobile ? 1_700_000 : 3_600_000;
    let dpr = Math.min(devicePixelRatio || 1, state.mobile ? 1.5 : 1.75);
    const requested = state.w * state.h * dpr * dpr;
    if (requested > pixelBudget) dpr *= Math.sqrt(pixelBudget / requested);
    state.dpr = Math.max(1, dpr);

    const bw = Math.max(1, Math.round(state.w * state.dpr));
    const bh = Math.max(1, Math.round(state.h * state.dpr));
    [canvas, maskCanvas, sceneA, sceneB].forEach((c) => { c.width = bw; c.height = bh; });
    canvas.style.width = `${state.w}px`;
    canvas.style.height = `${state.h}px`;

    [ctx, maskCtx, sceneACtx, sceneBCtx].forEach((g) => {
      g.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
      g.imageSmoothingEnabled = true;
      g.imageSmoothingQuality = 'high';
    });

    if(!state.entry.initialized){
      state.entry.initialized=true;
      const staticHero=HERO_TRY>=5;
      state.entry.y=(reduceMotion||staticHero)?0:-Math.max(state.h*1.18,720);
      state.entry.vy=0;
      state.entry.startedAt=performance.now();
      state.entry.settled=reduceMotion||staticHero;
    }
    buildMask();
    gpuRenderer?.resize(state.w, state.h, state.dpr, maskCanvas);
    // Put the WebGL plane above the viewport before first paint so there is
    // no flash of the final wordmark followed by a belated fall.
    gpuRenderer?.updatePhysicalTransform?.(state.entry);
  }

  function buildMask() {
    const g = maskCtx;
    g.clearRect(0, 0, state.w, state.h);
    g.fillStyle = INK;
    g.strokeStyle = INK;
    g.textAlign = 'center';
    g.textBaseline = 'middle';

    // Four forward-facing typography trials. All use contemporary grotesks
    // and identical geometry so the comparison is about feel, not layout.
    const family = HERO_PROFILE.family;
    const weight = HERO_PROFILE.weight;
    const horizontal = HERO_PROFILE.horizontal * (state.mobile ? .985 : 1);
    const targetW = state.w * .925 / horizontal;
    const top = fitFont(g, 'KILE B.', family, weight, targetW,
      Math.min(state.w * (state.mobile ? .45 : .59), state.h * (state.mobile ? .275 : .43)));
    const bottom = fitFont(g, 'JONES', family, weight, targetW,
      Math.min(state.w * (state.mobile ? .50 : .64), state.h * (state.mobile ? .33 : .475)));

    const middle = state.h * (state.mobile ? .525 : .535);
    const separation = (top + bottom) * (state.mobile ? .305 : .268);
    g.save();
    g.translate(state.w / 2, 0);
    g.scale(horizontal, 1);
    g.lineJoin = 'round';
    g.font = `${weight} ${top}px ${family}`;
    g.lineWidth = Math.max(.45, top * .0025);
    g.strokeText('KILE B.', 0, middle - separation);
    g.fillText('KILE B.', 0, middle - separation);
    g.font = `${weight} ${bottom}px ${family}`;
    g.lineWidth = Math.max(.45, bottom * .0025);
    g.strokeText('JONES', 0, middle + separation);
    g.fillText('JONES', 0, middle + separation);
    g.restore();
  }

  function fitFont(g, text, family, weight, targetW, maxSize) {
    let lo = 16;
    let hi = Math.max(16, maxSize);
    for (let i = 0; i < 16; i++) {
      const mid = (lo + hi) * 0.5;
      g.font = `${weight} ${mid}px ${family}`;
      if (g.measureText(text).width <= targetW) lo = mid;
      else hi = mid;
    }
    return lo;
  }

  function updateLetterHover() {
    // The aperture never swells around the mouse. The internal simulation
    // receives the pointer; the typography remains a stable physical object.
    state.letterScale=1;
    let hit=false;
    if(finePointer&&pointer.active&&pointer.overCanvas&&
       pointer.x>=0&&pointer.x<state.w&&pointer.y>=0&&pointer.y<state.h){
      const bx=Math.floor(pointer.x/state.w*maskCanvas.width);
      const by=Math.floor(pointer.y/state.h*maskCanvas.height);
      if(bx>=0&&by>=0&&bx<maskCanvas.width&&by<maskCanvas.height)
        hit=maskCtx.getImageData(bx,by,1,1).data[3]>42;
    }
    pointer.glyphHover=hit;
  }

  function updateEntry(now,dt){
    const e=state.entry,p=HERO_PROFILE;
    if(reduceMotion||HERO_TRY>=5){e.y=0;e.vy=0;e.scaleX=e.scaleY=1;e.settled=true;return;}
    if(e.settled)return;
    const age=(now-e.startedAt)/1000;
    if(age<p.delay)return;
    e.vy+=p.gravity*dt;
    e.y+=e.vy*dt;
    if(e.y>=0){
      const impact=Math.abs(e.vy);
      e.y=0;
      e.impact=Math.min(1,impact/2100);
      e.impactAt=now;
      e.vy=-impact*p.restitution;
    }
    if(e.y<0)e.vy*=Math.exp(-.12*dt);
    else e.vy*=Math.exp(-p.damping*dt);

    const since=Math.max(0,(now-e.impactAt)/1000);
    const pulse=e.impactAt?e.impact*Math.exp(-p.wobble*.42*since)*Math.cos(p.wobble*since):0;
    e.scaleY=1-p.squash*pulse;
    e.scaleX=1+p.squash*.58*pulse;

    if(age>1.0 && Math.abs(e.vy)<8 && Math.abs(e.y)<.6 && since>.55){
      e.y=0;e.vy=0;e.scaleX=1;e.scaleY=1;e.settled=true;
    }
  }

  function updateMode(now) {
    const force=window.__KBJ_FORCE_SCENE;
    if(Number.isInteger(force) && force>=0 && force<MODE_NAMES.length){
      state.mode=force;state.nextMode=(force+1)%MODE_NAMES.length;
      state.mix=0;state.modeStart=now;return;
    }
    const elapsed=(now-state.modeStart)/1000;
    if(elapsed>=MODE_SECONDS){
      const steps=Math.floor(elapsed/MODE_SECONDS);
      state.mode=(state.mode+steps)%MODE_NAMES.length;
      state.nextMode=(state.mode+1)%MODE_NAMES.length;
      state.modeStart+=steps*MODE_SECONDS*1000;
    }
    const local=(now-state.modeStart)/1000;
    const start=MODE_SECONDS-TRANSITION_SECONDS;
    const x=Math.max(0,Math.min(1,(local-start)/TRANSITION_SECONDS));
    state.mix=x*x*(3-2*x);
  }

  function frame(now) {
    if (!state.running) return;
    requestAnimationFrame(frame);
    // Hardware-aware redraw budget: pointer coordinates are still sampled at
    // full frequency; expensive material and alpha masks are not.
    const interval = 1000 / (state.mobile ? 30 : 50);
    if (now - state.lastDraw < interval) return;
    state.lastDraw = now;

    const elapsed = Math.max(0.001, (now - state.last) / 1000);
    // Fluid simulation clamps to 50ms for numerical stability; the visual
    // hover spring must instead use real wall time so the title still returns
    // smoothly under low FPS, software WebGL or heavy mobile GPU load.
    const dt = Math.min(0.05, elapsed);
    state.last = now;
    const t = (now - state.start) / 1000;
    updateLetterHover();
    updateEntry(now,Math.min(.05,elapsed));
    updateMode(now);

    // The GPU draws the actual glyph mask and footage without readback.
    // If the CDN blocks CORS or WebGL fails, the original pipeline runs.
    const gpuActive = !!gpuRenderer?.render({
      now, dt, pointer, mode:state.mode, nextMode:state.nextMode,
      mix:state.mix, reducedMotion:reduceMotion,
      letterScale:state.letterScale,
      entry:state.entry, heroTry:HERO_TRY,
      parallaxGain:HERO_PROFILE.parallax, oilGain:HERO_PROFILE.oil
    });
    if (gpuActive) {
      canvas.style.visibility = 'hidden';
      state.frames++;
      if (now - state.fpsMark >= 1000) {
        state.fps = Math.round(state.frames * 1000 / (now - state.fpsMark));
        state.frames = 0;
        state.fpsMark = now;
      }
      window.__KBJ_DIAGNOSTICS = {
        renderer:'WebGL2 GPU',fps:state.fps,
        mode:MODE_NAMES[state.mode],nextMode:MODE_NAMES[state.nextMode],
        mix:+state.mix.toFixed(3), dpr:+state.dpr.toFixed(2),
        videoReady:true,
        modeSeconds:MODE_SECONDS,transitionSeconds:TRANSITION_SECONDS,
        solidColors:SOLID_COLORS,
        letterScale:+state.letterScale.toFixed(4),
        letterHover:pointer.glyphHover,
        heroTry:HERO_TRY,heroProfile:HERO_PROFILE.name,
        parallaxGain:HERO_PROFILE.parallax,oilGain:HERO_PROFILE.oil,
        entrySettled:state.entry.settled,
        gpu:gpuRenderer.diagnostic()
      };
      return;
    }
    canvas.style.visibility = 'visible';

    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, state.w, state.h);

    // Canvas fallback follows the same physical entrance transform.
    ctx.save();
    ctx.translate(state.w/2,state.h/2 + state.entry.y);
    ctx.scale(state.entry.scaleX,state.entry.scaleY);
    ctx.translate(-state.w/2,-state.h/2);
    ctx.fillStyle = INK;
    ctx.drawImage(maskCanvas, 0, 0, state.w, state.h);
    ctx.restore();

    renderMode(sceneACtx, state.mode, t, dt);
    compositeMasked(sceneA, 1 - state.mix);

    if (state.mix > 0.001) {
      renderMode(sceneBCtx, state.nextMode, t, dt);
      compositeMasked(sceneB, state.mix);
    }

    state.frames++;
    if (now - state.fpsMark >= 1000) {
      state.fps = Math.round((state.frames * 1000) / (now - state.fpsMark));
      state.frames = 0;
      state.fpsMark = now;
    }

    window.__KBJ_DIAGNOSTICS = {
      mode: MODE_NAMES[state.mode],
      nextMode: MODE_NAMES[state.nextMode],
      mix: +state.mix.toFixed(3),
      fps: state.fps,
      dpr: +state.dpr.toFixed(2),
      viewport: [state.w, state.h],
      pointer: [Math.round(pointer.x), Math.round(pointer.y)],
      modeSeconds:MODE_SECONDS,transitionSeconds:TRANSITION_SECONDS,
      solidColors:SOLID_COLORS,
      letterScale:+state.letterScale.toFixed(4),
      letterHover:pointer.glyphHover,
      heroTry:HERO_TRY,heroProfile:HERO_PROFILE.name,
      parallaxGain:HERO_PROFILE.parallax,oilGain:HERO_PROFILE.oil,
      entrySettled:state.entry.settled,
      rawPointerInput: 'onpointerrawupdate' in window,
      videoReady: !!video && video.readyState >= 2,
      renderer: 'original Canvas 2D fallback',
      gpu: gpuRenderer?.diagnostic() || {status:'not supported or reduced motion'},
    };
  }

  function renderMode(g, mode, t, dt) {
    g.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
    g.clearRect(0, 0, state.w, state.h);

    // Canvas2D accessibility / device fallback matches the live GPU colors.
    // No 3D objects, videos, gradients, or blending between frames.
    g.fillStyle = SOLID_COLORS[mode % SOLID_COLORS.length];
    g.fillRect(0, 0, state.w, state.h);
  }

  function compositeMasked(scene, alpha) {
    if (alpha <= 0) return;
    const g = scene === sceneA ? sceneACtx : sceneBCtx;
    g.save();
    g.globalCompositeOperation = 'destination-in';
    g.globalAlpha = 1;
    g.translate(state.w/2,state.h/2);
    g.scale(state.letterScale,state.letterScale);
    g.translate(-state.w/2,-state.h/2);
    g.drawImage(maskCanvas, 0, 0, state.w, state.h);
    g.restore();

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(scene, 0, 0, state.w, state.h);
    ctx.restore();
  }


  // Full-bleed moving foil environment: letters are windows onto a scene,
  // not isolated tiny pictures pasted in black glyphs.
  // The background is real moving footage. The GPU fluid is a translucent
  // reveal on top, rather than another full-screen flat illustration.
  function drawFluidOverlay(g, t, material, opacity) {
    const fluid = window.KBJEnvironment?.render(material,state.w,state.h,t,
      pointer.nx,pointer.ny,pointer.active && pointer.overCanvas && !reduceMotion,!reduceMotion);
    if(!fluid) return;
    g.save();
    g.globalAlpha=opacity;
    g.drawImage(fluid,0,0,state.w,state.h);
    g.restore();
  }

  function drawFoilWorld(g, t) {
    drawVideo(g,t);
    drawFluidOverlay(g,t,1,.97);
  }

  function drawLiquidSilver(g, t) {
    drawVideo(g,t);
    drawFluidOverlay(g,t,2,.97);
  }

  function drawVideo(g, t) {
    if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
      // Neutral fallback while media initializes.
      g.fillStyle = '#111';
      g.fillRect(0, 0, state.w, state.h);
      for (let y = 0; y < state.h; y += 6) {
        const v = 25 + ((y / 6) % 3) * 8;
        g.fillStyle = `rgb(${v},${v},${v})`;
        g.fillRect(0, y, state.w, 3);
      }
      return;
    }

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const scale = Math.max(state.w / vw, state.h / vh) * 1.012;
    const dw = vw * scale;
    const dh = vh * scale;
    const maxShiftX = Math.max(0, (dw - state.w) * .46);
    const maxShiftY = Math.max(0, (dh - state.h) * .46);
    const x = (state.w - dw) * .5 - pointer.nx * Math.min(maxShiftX, state.w * .08) + Math.sin(t * .12) * 5;
    const y = (state.h - dh) * .5 - pointer.ny * Math.min(maxShiftY, state.h * .075);
    g.drawImage(video, x, y, dw, dh);
  }

  function smoothstep(x) {
    x = Math.max(0, Math.min(1, x));
    return x * x * (3 - 2 * x);
  }

  function debounce(fn, ms) {
    let timer = 0;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  }
})();
