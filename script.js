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
  const MODE_SECONDS = window.KBJScenes?.duration || 5.2;
  const TRANSITION_SECONDS = window.KBJScenes?.transition || 1.65;
  const MODE_NAMES = window.KBJScenes?.names || [
    'FILM / REVEAL', 'DEEP COBALT', 'MERCURY / STUDIO',
    'MONOCHROME / CLOSE', 'HIGH KEY / MOTION', 'FILM / OPEN WORLD'
  ];
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
    // Optical 17% wordmark enlargement only on intentional desktop glyph hover.
    letterScale: 1,
    letterHoverUntil: 0,
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
    const setMenu = (open) => {
      if (!menuToggle || !mobileDrawer) return;
      menuToggle.setAttribute('aria-expanded', String(open));
      mobileDrawer.classList.toggle('is-open', open);
      mobileDrawer.setAttribute('aria-hidden', String(!open));
      mobileDrawer.inert = !open;
    };

    menuToggle?.addEventListener('click', () => setMenu(menuToggle.getAttribute('aria-expanded') !== 'true'));
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
    const updatePointer = (e) => {
      const x = e.clientX;
      const y = e.clientY;
      pointer.vx = x - pointer.x;
      pointer.vy = y - pointer.y;
      pointer.speed = Math.min(1, Math.hypot(pointer.vx, pointer.vy) / 52);
      pointer.x = x;
      pointer.y = y;
      pointer.nx = state.w ? (x / state.w) * 2 - 1 : 0;
      pointer.ny = state.h ? (y / state.h) * 2 - 1 : 0;
      pointer.active = true;
      // Works even while the underlying fallback canvas is hidden.
      pointer.overCanvas = !!(e.target?.closest?.('.hero'));

      if (finePointer && cursorRoot && cursorDot) {
        cursorRoot.classList.add('is-visible');
        cursorDot.style.transform = `translate3d(${x}px,${y}px,0) scale(${1 + pointer.speed * .22})`;
      }
    };

    const eventName = 'onpointerrawupdate' in window ? 'pointerrawupdate' : 'pointermove';
    addEventListener(eventName, updatePointer, { passive: true });
    canvas.addEventListener('pointerenter', (e) => { pointer.overCanvas = true; updatePointer(e); }, { passive: true });
    canvas.addEventListener('pointerleave', () => { pointer.overCanvas = false; }, { passive: true });
    addEventListener('pointerdown', () => { pointer.down = true; cursorRoot?.classList.add('is-down'); }, { passive: true });
    addEventListener('pointerup', () => { pointer.down = false; cursorRoot?.classList.remove('is-down'); }, { passive: true });
    document.addEventListener('pointerover', (e) => cursorRoot?.classList.toggle('is-hover', !!e.target.closest('a,button,[role="button"]')));
    document.addEventListener('pointerout', (e) => { if (!e.relatedTarget) cursorRoot?.classList.remove('is-visible'); });

    if (finePointer && cursorRing) {
      const ring = () => {
        pointer.px += (pointer.x - pointer.px) * 0.62;
        pointer.py += (pointer.y - pointer.py) * 0.62;
        const angle = Math.atan2(pointer.vy, pointer.vx || 0.001) * 180 / Math.PI;
        cursorRing.style.transform = `translate3d(${pointer.px}px,${pointer.py}px,0) rotate(${angle}deg) scale(${1 + pointer.speed * .22},${1 - pointer.speed * .07})`;
        requestAnimationFrame(ring);
      };
      requestAnimationFrame(ring);
    }
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

    buildMask();
    gpuRenderer?.resize(state.w, state.h, state.dpr, maskCanvas);
  }

  function buildMask() {
    const g = maskCtx;
    g.clearRect(0, 0, state.w, state.h);
    g.fillStyle = INK;
    g.strokeStyle = INK;
    g.textAlign = 'center';
    g.textBaseline = 'middle';

    // Noth.in-style monumental grotesque, keeping your name and the two lines.
    // Actual glyph bounds, not a reduced 3D image, define the entire artwork.
    const family = '"Archivo Black","Arial Black","Helvetica Neue",Arial,sans-serif';
    const horizontal = state.mobile ? .92 : .94;
    const targetW = state.w * .975 / horizontal;
    const top = fitFont(g, 'KILE B.', family, 900, targetW,
      Math.min(state.w * (state.mobile ? .46 : .60), state.h * (state.mobile ? .28 : .44)));
    const bottom = fitFont(g, 'JONES', family, 900, targetW,
      Math.min(state.w * (state.mobile ? .52 : .65), state.h * (state.mobile ? .34 : .49)));

    // Keep both lines inside the screen, including the actual font ascenders.
    const middle = state.h * (state.mobile ? .52 : .53);
    const separation = (top + bottom) * (state.mobile ? .32 : .278);
    g.save();
    g.translate(state.w / 2, 0);
    g.scale(horizontal, 1);
    g.lineJoin = 'round';
    g.font = `900 ${top}px ${family}`;
    g.lineWidth = Math.max(1, top * .017);
    g.strokeText('KILE B.', 0, middle - separation);
    g.fillText('KILE B.', 0, middle - separation);
    g.font = `900 ${bottom}px ${family}`;
    g.lineWidth = Math.max(1, bottom * .017);
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

  function updateLetterHover(now,dt) {
    // Hit-test the real offscreen letter mask, never the whole hero rectangle.
    // While zooming, invert the current zoom to avoid hover flicker on an
    // enlarged letter edge. Hold very briefly while crossing counters/gaps.
    let hit=false;
    if (finePointer && !reduceMotion && pointer.active && pointer.overCanvas &&
        pointer.x>=0 && pointer.x<state.w && pointer.y>=0 && pointer.y<state.h) {
      const z=state.letterScale;
      const x=((pointer.x/state.w-.5)/z+.5)*maskCanvas.width;
      const y=((pointer.y/state.h-.5)/z+.5)*maskCanvas.height;
      const bx= Math.floor(x),by=Math.floor(y);
      if (bx>=0 && bx<maskCanvas.width && by>=0 && by<maskCanvas.height) {
        // One RGBA pixel per redraw, no WebGL readback or texture upload.
        hit=maskCtx.getImageData(bx,by,1,1).data[3]>38;
      }
    }
    if(hit)state.letterHoverUntil=now+150;
    const target=finePointer && !reduceMotion &&
       pointer.overCanvas && now<state.letterHoverUntil ? 1.17 : 1;
    const ease=1-Math.exp(-dt*(target>state.letterScale?9.0:7.2));
    state.letterScale+=(target-state.letterScale)*ease;
    if(Math.abs(state.letterScale-target)<.0007)state.letterScale=target;
    pointer.glyphHover=hit;
  }

  function updateMode(now) {
    // QA-only diagnostic world selection; no visible controls on the website.
    const force=window.__KBJ_FORCE_SCENE;
    if(Number.isInteger(force) && force>=0 && force<MODE_NAMES.length){
      state.mode=force;
      state.nextMode=(force+1)%MODE_NAMES.length;
      state.mix=0;
      state.modeStart=now;
      return;
    }
    const elapsed = (now - state.modeStart) / 1000;
    const transitionStart = MODE_SECONDS - TRANSITION_SECONDS;
    if (elapsed < transitionStart) {
      state.mix = 0;
      return;
    }
    state.mix = smoothstep((elapsed - transitionStart) / TRANSITION_SECONDS);
    if (elapsed >= MODE_SECONDS) {
      state.mode = state.nextMode;
      state.nextMode = (state.mode + 1) % MODE_NAMES.length;
      state.modeStart = now;
      state.mix = 0;
    }
  }

  function frame(now) {
    if (!state.running) return;
    requestAnimationFrame(frame);
    // Hardware-aware redraw budget: pointer coordinates are still sampled at
    // full frequency; expensive material and alpha masks are not.
    const interval = 1000 / (state.mobile ? 30 : 50);
    if (now - state.lastDraw < interval) return;
    state.lastDraw = now;

    const dt = Math.min(0.05, Math.max(0.001, (now - state.last) / 1000));
    state.last = now;
    const t = (now - state.start) / 1000;
    updateLetterHover(now,dt);
    updateMode(now);

    // The GPU draws the actual glyph mask and footage without readback.
    // If the CDN blocks CORS or WebGL fails, the original pipeline runs.
    const gpuActive = !!gpuRenderer?.render({
      now, dt, pointer, mode:state.mode, nextMode:state.nextMode,
      mix:state.mix, reducedMotion:reduceMotion,
      letterScale:state.letterScale
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
        letterScale:+state.letterScale.toFixed(4),
        letterHover:pointer.glyphHover,
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

    // Constant black letter body keeps the name readable between moving objects.
    ctx.fillStyle = INK;
    ctx.save();
    ctx.translate(state.w/2,state.h/2);
    ctx.scale(state.letterScale,state.letterScale);
    ctx.translate(-state.w/2,-state.h/2);
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
      letterScale:+state.letterScale.toFixed(4),
      letterHover:pointer.glyphHover,
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

    // The native Canvas2D safety path must cover all six object stages and
    // never show the previously rejected liquid-metal treatment.
    switch (mode % 3) {
      case 0: drawVideo(g, t); drawFluidOverlay(g, t, 0, .52); break;
      case 1: drawFoilWorld(g, t); break;
      case 2: drawVideo(g, t); drawFluidOverlay(g, t, 0, .42); break;
    }
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
