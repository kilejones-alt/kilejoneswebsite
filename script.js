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
  const MODE_SECONDS = 6.4;
  const TRANSITION_SECONDS = 0.72;
  const MODE_NAMES = [
    'ELECTRIC BLUE FOIL STARS',
    'BLACK INFLATABLE IMPOSSIBLE STAIRCASE',
    'HOT PINK BALLOON RHINO',
    'SAFETY ORANGE METAL SICKLE AND HAMMER',
    'ARCHIVAL VIDEO'
  ];

  const state = {
    w: 0,
    h: 0,
    dpr: 1,
    mobile: false,
    running: true,
    start: performance.now(),
    last: performance.now(),
    mode: 0,
    nextMode: 1,
    modeStart: performance.now(),
    mix: 0,
    fps: 60,
    frames: 0,
    fpsMark: performance.now(),
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
  };

  const maskCanvas = document.createElement('canvas');
  const maskCtx = maskCanvas.getContext('2d');
  const sceneA = document.createElement('canvas');
  const sceneACtx = sceneA.getContext('2d');
  const sceneB = document.createElement('canvas');
  const sceneBCtx = sceneB.getContext('2d');

  const stars = Array.from({ length: 12 }, (_, i) => ({
    i,
    lane: ((i * 0.61803398875) % 1),
    speed: 0.072 + (i % 4) * 0.012,
    size: 0.050 + (i % 5) * 0.008,
    phase: (i * 1.731) % (Math.PI * 2),
    spin: (i % 2 ? -1 : 1) * (0.20 + (i % 4) * 0.045),
    white: i === 5,
  }));

  setupUI();
  setupCursor();
  setupVideo();
  resize();
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
    const tryPlay = () => video.play().catch(() => {});
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

    const pixelBudget = state.mobile ? 2_300_000 : 5_600_000;
    let dpr = Math.min(devicePixelRatio || 1, state.mobile ? 1.65 : 2.0);
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
  }

  function buildMask() {
    const g = maskCtx;
    g.clearRect(0, 0, state.w, state.h);
    g.fillStyle = INK;
    g.textAlign = 'center';
    g.textBaseline = 'middle';

    const family = '"Arial Black","Helvetica Neue",Arial,sans-serif';
    const targetW = state.w * (state.mobile ? 0.92 : 0.91);
    const topMax = Math.min(state.w * (state.mobile ? 0.25 : 0.20), state.h * (state.mobile ? 0.225 : 0.265));
    const bottomMax = Math.min(state.w * (state.mobile ? 0.31 : 0.245), state.h * (state.mobile ? 0.275 : 0.335));
    const top = fitFont(g, 'KILE B.', family, 900, targetW, topMax);
    const bottom = fitFont(g, 'JONES', family, 900, targetW, bottomMax);
    const gap = Math.max(12, Math.min(top, bottom) * (state.mobile ? 0.72 : 0.58));
    const cy = state.h * (state.mobile ? 0.55 : 0.56);

    g.font = `900 ${top}px ${family}`;
    g.fillText('KILE B.', state.w / 2, cy - gap * 0.58);
    g.font = `900 ${bottom}px ${family}`;
    g.fillText('JONES', state.w / 2, cy + gap * 0.58);
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

  function updateMode(now) {
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

    const dt = Math.min(0.05, Math.max(0.001, (now - state.last) / 1000));
    state.last = now;
    const t = (now - state.start) / 1000;
    updateMode(now);

    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, state.w, state.h);

    // Constant black letter body keeps the name readable between moving objects.
    ctx.fillStyle = INK;
    ctx.drawImage(maskCanvas, 0, 0, state.w, state.h);

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
      rawPointerInput: 'onpointerrawupdate' in window,
      videoReady: !!video && video.readyState >= 2,
    };
  }

  function renderMode(g, mode, t, dt) {
    g.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
    g.clearRect(0, 0, state.w, state.h);

    switch (mode) {
      case 0: drawStars(g, t); break;
      case 1: drawStaircase(g, t); break;
      case 2: drawRhino(g, t); break;
      case 3: drawSickleHammer(g, t); break;
      case 4: drawVideo(g, t); break;
    }
  }

  function compositeMasked(scene, alpha) {
    if (alpha <= 0) return;
    const g = scene === sceneA ? sceneACtx : sceneBCtx;
    g.save();
    g.globalCompositeOperation = 'destination-in';
    g.globalAlpha = 1;
    g.drawImage(maskCanvas, 0, 0, state.w, state.h);
    g.restore();

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(scene, 0, 0, state.w, state.h);
    ctx.restore();
  }

  function drawStars(g, t) {
    const minDim = Math.min(state.w, state.h);
    const influence = Math.max(100, minDim * 0.20);
    const driftSpan = state.w * 1.34;

    for (const s of stars) {
      const cycle = ((t * s.speed + s.i / stars.length) % 1 + 1) % 1;
      let x = -state.w * 0.17 + cycle * driftSpan;
      let y = state.h * (0.24 + s.lane * 0.57) + Math.sin(t * 0.42 + s.phase) * state.h * 0.018;
      const z = 0.78 + 0.28 * (0.5 + 0.5 * Math.sin(t * 0.31 + s.phase * 1.7));
      let size = minDim * s.size * z;

      const dx = x - pointer.x;
      const dy = y - pointer.y;
      const dist = Math.hypot(dx, dy);
      if (pointer.active && dist < influence) {
        const k = 1 - dist / influence;
        const force = 22 * k * k;
        const inv = 1 / Math.max(1, dist);
        x += dx * inv * force + pointer.vx * 0.14 * k;
        y += dy * inv * force + pointer.vy * 0.14 * k;
        size *= 1 + k * 0.12;
      }

      const rot = t * s.spin + s.phase + pointer.nx * 0.12 + pointer.ny * 0.08;
      drawFoilStar(g, x, y, size, rot, s.white, t + s.phase);
    }
  }

  function drawFoilStar(g, x, y, r, rot, whiteVariant, t) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = rot - Math.PI / 2 + i * Math.PI / 5;
      const rr = i % 2 === 0 ? r : r * 0.43;
      pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
    }

    g.save();
    g.shadowColor = 'rgba(0,40,170,.42)';
    g.shadowBlur = Math.max(7, r * 0.18);
    g.beginPath();
    pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]));
    g.closePath();
    const body = g.createLinearGradient(x - r, y - r, x + r, y + r);
    body.addColorStop(0, '#03164f');
    body.addColorStop(.24, '#0b51e7');
    body.addColorStop(.50, '#1f82ff');
    body.addColorStop(.72, '#0739b6');
    body.addColorStop(1, '#020a27');
    g.fillStyle = body;
    g.fill();
    g.shadowBlur = 0;

    for (let i = 0; i < 10; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % 10];
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(a[0], a[1]);
      g.lineTo(b[0], b[1]);
      g.closePath();
      const whiteFacet = whiteVariant && (i === 2 || i === 7);
      if (whiteFacet) {
        g.fillStyle = i === 2 ? '#f7fbff' : '#cfd8e1';
      } else {
        const shimmer = 0.5 + 0.5 * Math.sin(t * 1.2 + i * 1.8);
        g.fillStyle = i % 2
          ? `rgba(${Math.round(35 + shimmer * 45)},${Math.round(105 + shimmer * 80)},255,.72)`
          : `rgba(2,30,120,.72)`;
      }
      g.fill();
    }

    g.strokeStyle = 'rgba(190,235,255,.72)';
    g.lineWidth = Math.max(1, r * 0.024);
    g.beginPath();
    pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]));
    g.closePath();
    g.stroke();
    g.restore();
  }

  function drawStaircase(g, t) {
    const cx = state.w * 0.50 + pointer.nx * state.w * 0.030;
    const cy = state.h * 0.54 + pointer.ny * state.h * 0.026;
    const scale = Math.min(state.w, state.h) * (state.mobile ? 0.58 : 0.70);
    const autoRot = Math.sin(t * 0.16) * 0.16;
    const rot = autoRot + pointer.nx * 0.18 + pointer.vx * 0.0008;
    const tilt = pointer.ny * 0.16 + Math.sin(t * 0.21) * 0.05;

    g.save();
    g.translate(cx, cy);
    g.rotate(rot);
    g.transform(1, tilt * 0.16, tilt * -0.18, 1, 0, 0);

    const stepW = scale * 0.18;
    const stepH = scale * 0.075;
    const rise = scale * 0.065;
    const run = scale * 0.106;
    const runs = [
      { x: -scale * .50, y: scale * .05, dx: run, dy: -rise, angle: 0 },
      { x: scale * .13, y: -scale * .35, dx: run * .54, dy: rise * .92, angle: .62 },
      { x: scale * .47, y: scale * .05, dx: -run, dy: rise, angle: 0 },
      { x: -scale * .15, y: scale * .42, dx: -run * .55, dy: -rise * .92, angle: .62 },
    ];

    for (let r = 0; r < runs.length; r++) {
      const runDef = runs[r];
      for (let i = 0; i < 7; i++) {
        const x = runDef.x + runDef.dx * i;
        const y = runDef.y + runDef.dy * i;
        drawInflatedStep(g, x, y, stepW, stepH, runDef.angle + (r % 2 ? Math.PI / 2 : 0), i, t);
      }
    }

    g.restore();
  }

  function drawInflatedStep(g, x, y, w, h, angle, index, t) {
    g.save();
    g.translate(x, y);
    g.rotate(angle);
    const pulse = 1 + Math.sin(t * .38 + index) * .015;
    g.scale(pulse, 1 / pulse);

    const grad = g.createLinearGradient(-w * .5, -h * .6, w * .45, h * .55);
    grad.addColorStop(0, '#050608');
    grad.addColorStop(.28, '#1b1e23');
    grad.addColorStop(.45, '#545b65');
    grad.addColorStop(.53, '#17191e');
    grad.addColorStop(1, '#020203');

    g.shadowColor = 'rgba(0,0,0,.34)';
    g.shadowBlur = h * .42;
    g.shadowOffsetY = h * .20;
    roundedRect(g, -w / 2, -h / 2, w, h, h * .45);
    g.fillStyle = grad;
    g.fill();
    g.shadowBlur = 0;
    g.shadowOffsetY = 0;

    g.strokeStyle = 'rgba(235,245,255,.26)';
    g.lineWidth = Math.max(1, h * .055);
    roundedRect(g, -w * .42, -h * .34, w * .70, h * .26, h * .15);
    g.stroke();
    g.restore();
  }

  function drawRhino(g, t) {
    const cx = state.w * 0.50 + Math.sin(t * .23) * state.w * .035 + pointer.nx * state.w * .035;
    const cy = state.h * 0.55 + Math.cos(t * .31) * state.h * .015 + pointer.ny * state.h * .026;
    const s = Math.min(state.w, state.h) * (state.mobile ? .50 : .64);
    const yaw = Math.sin(t * .27) * .12 + pointer.nx * .16;
    const tilt = Math.sin(t * .19) * .025 + pointer.ny * .05;

    g.save();
    g.translate(cx, cy);
    g.rotate(tilt);
    g.scale(1 + yaw * .15, 1 - Math.abs(yaw) * .05);

    const pinkA = '#ff1f8c';
    const pinkB = '#a00051';
    const pinkC = '#ff75ba';

    balloon(g, -s * .10, -s * .02, s * .50, s * .23, -0.05, pinkA, pinkB, pinkC);
    balloon(g, s * .22, -s * .035, s * .24, s * .18, 0.08, pinkA, pinkB, pinkC);
    balloon(g, s * .39, -s * .04, s * .25, s * .16, 0.03, pinkA, pinkB, pinkC);
    balloon(g, s * .49, -s * .025, s * .14, s * .115, -0.02, pinkA, pinkB, pinkC);

    // Legs.
    [[-.25,.14],[-.03,.15],[.15,.14],[.31,.12]].forEach(([x,y], i) => {
      balloon(g, s*x, s*y, s*.105, s*.22, i % 2 ? .035 : -.035, pinkA, pinkB, pinkC);
      balloon(g, s*x, s*(y+.11), s*.105, s*.12, 0, pinkA, pinkB, pinkC);
    });

    // Ears.
    balloon(g, s * .31, -s * .17, s * .09, s * .13, -.5, pinkA, pinkB, pinkC);
    balloon(g, s * .39, -s * .16, s * .085, s * .12, .42, pinkA, pinkB, pinkC);

    // Horn makes the rhino unmistakable.
    g.save();
    g.translate(s * .55, -s * .085);
    g.rotate(-.28 + pointer.ny * .08);
    const horn = g.createLinearGradient(0, 0, s * .18, 0);
    horn.addColorStop(0, '#ff69b0');
    horn.addColorStop(.62, '#ff2a8f');
    horn.addColorStop(1, '#b00055');
    g.fillStyle = horn;
    g.beginPath();
    g.moveTo(0, s * .032);
    g.quadraticCurveTo(s * .11, -s * .08, s * .20, -s * .10);
    g.quadraticCurveTo(s * .12, s * .01, 0, s * .05);
    g.closePath();
    g.fill();
    g.restore();

    // Tail.
    g.strokeStyle = pinkA;
    g.lineWidth = s * .035;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(-s * .36, -s * .02);
    g.quadraticCurveTo(-s * .50, -s * .12, -s * .53, -s * .01);
    g.stroke();

    // Eye.
    g.fillStyle = '#060608';
    g.beginPath();
    g.arc(s * .42, -s * .085, s * .016, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#fff';
    g.beginPath();
    g.arc(s * .425, -s * .091, s * .005, 0, Math.PI * 2);
    g.fill();

    g.restore();
  }

  function balloon(g, x, y, w, h, angle, c1, c2, c3) {
    g.save();
    g.translate(x, y);
    g.rotate(angle);
    const grad = g.createLinearGradient(-w * .5, -h * .45, w * .48, h * .42);
    grad.addColorStop(0, c2);
    grad.addColorStop(.25, c1);
    grad.addColorStop(.47, c3);
    grad.addColorStop(.62, c1);
    grad.addColorStop(1, c2);
    g.shadowColor = 'rgba(100,0,50,.28)';
    g.shadowBlur = h * .16;
    g.fillStyle = grad;
    g.beginPath();
    g.ellipse(0, 0, w * .5, h * .5, 0, 0, Math.PI * 2);
    g.fill();
    g.shadowBlur = 0;
    g.strokeStyle = 'rgba(255,210,235,.38)';
    g.lineWidth = Math.max(1, h * .035);
    g.beginPath();
    g.ellipse(-w * .12, -h * .12, w * .25, h * .11, -.18, Math.PI * 1.05, Math.PI * 1.72);
    g.stroke();
    g.restore();
  }

  function drawSickleHammer(g, t) {
    const cx = state.w * 0.50 + pointer.nx * state.w * .026;
    const cy = state.h * 0.54 + pointer.ny * state.h * .022;
    const size = Math.min(state.w * .44, state.h * .60);
    const yaw = t * 0.42 + pointer.nx * .34 + pointer.vx * .0012;
    const face = Math.cos(yaw);
    const sx = Math.sign(face || 1) * Math.max(.13, Math.abs(face));
    const tilt = pointer.ny * .08 + Math.sin(t * .18) * .025;

    g.save();
    g.translate(cx, cy);
    g.rotate(tilt);
    g.scale(sx, 1);

    // Flat powder-coated orange metal: almost no glossy plastic highlight.
    const orange = '#ff5a00';
    const orangeDark = '#b93600';
    const orangeLight = '#ff7a22';

    // Hammer handle.
    g.save();
    g.rotate(-0.73);
    g.fillStyle = orange;
    roundedRect(g, -size * .045, -size * .36, size * .09, size * .64, size * .025);
    g.fill();
    g.strokeStyle = orangeDark;
    g.lineWidth = Math.max(2, size * .012);
    g.stroke();
    g.fillStyle = orangeLight;
    roundedRect(g, -size * .22, -size * .42, size * .43, size * .12, size * .022);
    g.fill();
    g.strokeStyle = orangeDark;
    g.stroke();
    g.restore();

    // Sickle handle.
    g.save();
    g.rotate(0.72);
    g.fillStyle = orange;
    roundedRect(g, -size * .035, -size * .18, size * .07, size * .49, size * .022);
    g.fill();
    g.strokeStyle = orangeDark;
    g.lineWidth = Math.max(2, size * .012);
    g.stroke();
    g.restore();

    // Sickle blade.
    g.beginPath();
    g.arc(size * .06, -size * .10, size * .29, -1.28, 1.24, false);
    g.arc(size * .06, -size * .10, size * .17, 1.07, -1.08, true);
    g.closePath();
    g.fillStyle = orange;
    g.fill();
    g.strokeStyle = orangeDark;
    g.lineWidth = Math.max(2, size * .012);
    g.stroke();

    // Subtle metal plane, not plastic shine.
    g.globalAlpha = .28;
    g.fillStyle = orangeLight;
    g.fillRect(-size * .16, -size * .015, size * .34, size * .018);
    g.globalAlpha = 1;
    g.restore();
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
    const scale = Math.max(state.w / vw, state.h / vh) * 1.10;
    const dw = vw * scale;
    const dh = vh * scale;
    const maxShiftX = Math.max(0, (dw - state.w) * .46);
    const maxShiftY = Math.max(0, (dh - state.h) * .46);
    const x = (state.w - dw) * .5 - pointer.nx * Math.min(maxShiftX, state.w * .045) + Math.sin(t * .11) * 3;
    const y = (state.h - dh) * .5 - pointer.ny * Math.min(maxShiftY, state.h * .045);
    g.drawImage(video, x, y, dw, dh);
  }

  function roundedRect(g, x, y, w, h, r) {
    const rr = Math.min(r, Math.abs(w) * .5, Math.abs(h) * .5);
    g.beginPath();
    g.moveTo(x + rr, y);
    g.lineTo(x + w - rr, y);
    g.quadraticCurveTo(x + w, y, x + w, y + rr);
    g.lineTo(x + w, y + h - rr);
    g.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    g.lineTo(x + rr, y + h);
    g.quadraticCurveTo(x, y + h, x, y + h - rr);
    g.lineTo(x, y + rr);
    g.quadraticCurveTo(x, y, x + rr, y);
    g.closePath();
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
