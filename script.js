(() => {
  'use strict';

  const canvas = document.querySelector('#type-canvas');
  const musicToggle = document.querySelector('#music-toggle');
  const backgroundMusic = document.querySelector('#background-music');
  const menuToggle = document.querySelector('#menu-toggle');
  const mobileDrawer = document.querySelector('#mobile-drawer');
  const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;

  const PAPER = '#e9e6df';
  const INK = '#101010';
  const CYCLE_DURATION = 10000;
  const TRANSITION_START = 0.8;
  const ARRIVAL_DELAY = 1800;
  const STYLES = ['PINK', 'CASCADE', 'SOVIET', 'NOIR', 'MECHANICAL'];
  const MOTIONS = ['SNAKE', 'KEYTURN', 'CORKSCREW', 'RATCHET'];

  const pointer = {
    x: window.innerWidth * 0.5,
    y: window.innerHeight * 0.5,
    tx: window.innerWidth * 0.5,
    ty: window.innerHeight * 0.5,
    vx: 0,
    vy: 0,
    active: false,
    down: false,
    reveal: 0,
    type: coarsePointer ? 'touch' : 'mouse',
    releaseTimer: 0
  };

  const stage = {
    w: 0,
    h: 0,
    dpr: 1,
    mobile: false,
    frameBudget: 1000 / 60,
    lastRender: 0,
    base: null,
    textMask: null,
    underTextMask: null,
    layers: [],
    oilMask: null,
    tempA: null,
    tempB: null,
    resizeTimer: 0,
    visible: !document.hidden,
    dprCap: 2,
    slowFrames: 0,
    fastFrames: 0
  };

  function makeCanvas() {
    const c = document.createElement('canvas');
    const x = c.getContext('2d');
    return { c, x };
  }

  function prepare(surface) {
    surface.c.width = Math.round(stage.w * stage.dpr);
    surface.c.height = Math.round(stage.h * stage.dpr);
    surface.x.setTransform(stage.dpr, 0, 0, stage.dpr, 0, 0);
  }

  function clear(surface) {
    surface.x.save();
    surface.x.setTransform(stage.dpr, 0, 0, stage.dpr, 0, 0);
    surface.x.clearRect(0, 0, stage.w, stage.h);
    surface.x.restore();
  }

  function resize() {
    stage.w = Math.max(320, window.innerWidth);
    stage.h = Math.max(500, window.innerHeight);
    stage.mobile = stage.w < 700;
    stage.dpr = Math.min(stage.mobile ? 1.35 : stage.dprCap, window.devicePixelRatio || 1);
    stage.frameBudget = stage.mobile ? 1000 / 40 : 1000 / 60;

    canvas.width = Math.round(stage.w * stage.dpr);
    canvas.height = Math.round(stage.h * stage.dpr);
    canvas.style.width = `${stage.w}px`;
    canvas.style.height = `${stage.h}px`;
    ctx.setTransform(stage.dpr, 0, 0, stage.dpr, 0, 0);

    stage.base = makeCanvas();
    stage.textMask = makeCanvas();
    stage.underTextMask = makeCanvas();
    stage.layers = STYLES.map(makeCanvas);
    stage.oilMask = makeCanvas();
    stage.tempA = makeCanvas();
    stage.tempB = makeCanvas();

    [stage.base, stage.textMask, stage.underTextMask, ...stage.layers, stage.oilMask, stage.tempA, stage.tempB].forEach(prepare);
    renderStaticLayers(0);
  }

  function debouncedResize() {
    window.clearTimeout(stage.resizeTimer);
    stage.resizeTimer = window.setTimeout(resize, 140);
  }

  function textLayout() {
    const mobile = stage.mobile;
    return {
      mobile,
      cx: stage.w * 0.5,
      cy: stage.h * 0.5,
      maxWidth: mobile ? stage.w * 0.88 : (stage.w / stage.h > 1.9 ? stage.w * 0.84 : stage.w * 0.91),
      size: mobile ? Math.min(stage.w * 0.22, stage.h * 0.13) : (stage.w / stage.h > 1.9 ? Math.min(stage.w * 0.106, stage.h * 0.26) : Math.min(stage.w * 0.122, stage.h * 0.245)),
      lines: mobile ? ['KILE B.', 'JONES'] : ['KILE B. JONES'],
      lineHeight: mobile ? 0.76 : 0.84
    };
  }

  function fitFont(g, text, family, weight, targetWidth, maxSize) {
    let size = maxSize;
    for (let i = 0; i < 18; i += 1) {
      g.font = `${weight} ${size}px ${family}`;
      const width = g.measureText(text).width;
      if (width <= targetWidth) break;
      size *= targetWidth / Math.max(width, 1);
    }
    return size;
  }

  function drawSpacedText(g, text, cx, y, font, spacing, fill) {
    g.font = font;
    const chars = [...text];
    const widths = chars.map((ch) => g.measureText(ch).width);
    const total = widths.reduce((sum, width) => sum + width, 0) + spacing * (chars.length - 1);
    let x = cx - total / 2;
    g.textAlign = 'left';
    chars.forEach((ch, index) => {
      g.fillStyle = fill;
      g.fillText(ch, x, y);
      x += widths[index] + spacing;
    });
  }

  function renderText(g, layout, fill, options = {}) {
    const family = options.family || '"Syne", "Arial Black", sans-serif';
    const weight = options.weight || 800;
    const xScale = options.xScale ?? 1.02;
    const yScale = options.yScale ?? 1.12;
    const widthMult = options.widthMult ?? 1;
    const sizeMult = options.sizeMult ?? 1;
    const yOffset = options.yOffset ?? 0;
    const spacing = options.spacing ?? (layout.mobile ? -2 : -5);
    const longest = layout.lines.reduce((a, b) => (a.length > b.length ? a : b), '');
    const size = fitFont(g, longest, family, weight, (layout.maxWidth * widthMult) / xScale, layout.size * sizeMult);
    const lineGap = size * layout.lineHeight;
    const firstY = layout.cy - ((layout.lines.length - 1) * lineGap) / 2 + yOffset;

    g.save();
    g.translate(layout.cx, layout.cy);
    g.scale(xScale, yScale);
    g.translate(-layout.cx, -layout.cy);
    g.textAlign = 'center';
    g.textBaseline = 'middle';

    layout.lines.forEach((line, index) => {
      const font = `${weight} ${size}px ${family}`;
      drawSpacedText(g, line, layout.cx, firstY + index * lineGap, font, spacing, fill);
    });

    g.restore();
  }

  function clipToText(surface, maskCanvas = stage.textMask.c) {
    surface.x.save();
    surface.x.setTransform(stage.dpr, 0, 0, stage.dpr, 0, 0);
    surface.x.globalCompositeOperation = 'destination-in';
    surface.x.drawImage(maskCanvas, 0, 0, stage.w, stage.h);
    surface.x.restore();
  }

  function fillPink(surface) {
    clear(surface);
    const g = surface.x;
    g.fillStyle = '#ff1493';
    g.fillRect(0, 0, stage.w, stage.h);
    clipToText(surface, stage.underTextMask.c);
  }

  function fillCascade(surface, layout, now = 0) {
    clear(surface);
    const g = surface.x;
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, stage.w, stage.h);

    const yStart = layout.cy - layout.size * (layout.mobile ? 1.28 : 0.96);
    const yEnd = layout.cy + layout.size * (layout.mobile ? 1.28 : 0.96);
    const band = Math.max(8, layout.size * 0.06);
    const cycle = band * 26;
    const shift = (now * 0.045) % cycle;

    for (let y = yStart - cycle; y <= yEnd + cycle; y += band) {
      const normalized = ((y + shift - yStart) % cycle + cycle) % cycle / cycle;
      const shade = Math.round(255 * (1 - normalized));
      g.fillStyle = `rgb(${shade}, ${shade}, ${shade})`;
      g.fillRect(0, y, stage.w, band + 1.5);
    }

    clipToText(surface, stage.underTextMask.c);
  }

  function fillSoviet(surface, layout) {
    clear(surface);
    const g = surface.x;
    g.fillStyle = '#d82020';
    g.fillRect(0, 0, stage.w, stage.h);

    g.save();
    g.translate(layout.cx, layout.cy);
    g.rotate(-0.2);
    g.translate(-layout.cx, -layout.cy);
    const stripe = Math.max(20, layout.size * 0.13);
    for (let x = -stage.h; x < stage.w + stage.h; x += stripe * 3.1) {
      g.fillStyle = '#f1dfb3';
      g.fillRect(x, layout.cy - layout.size * 1.25, stripe, layout.size * 2.5);
      g.fillStyle = '#111';
      g.fillRect(x + stripe, layout.cy - layout.size * 1.25, stripe * 0.48, layout.size * 2.5);
    }
    g.restore();

    g.save();
    g.globalAlpha = 0.78;
    g.fillStyle = '#f1dfb3';
    const rayCount = 14;
    for (let i = 0; i < rayCount; i += 1) {
      const angle = (Math.PI * 2 * i) / rayCount;
      g.beginPath();
      g.moveTo(layout.cx, layout.cy);
      g.arc(layout.cx, layout.cy, layout.maxWidth * 0.52, angle, angle + 0.055);
      g.closePath();
      g.fill();
    }
    g.restore();
    clipToText(surface, stage.underTextMask.c);
  }

  function fillNoir(surface, layout) {
    clear(surface);
    const g = surface.x;
    const gradient = g.createLinearGradient(
      layout.cx - layout.maxWidth * 0.52,
      layout.cy - layout.size,
      layout.cx + layout.maxWidth * 0.52,
      layout.cy + layout.size
    );
    gradient.addColorStop(0, '#050505');
    gradient.addColorStop(0.29, '#d9d9d4');
    gradient.addColorStop(0.46, '#323232');
    gradient.addColorStop(0.69, '#f6f6f1');
    gradient.addColorStop(1, '#121212');
    g.fillStyle = gradient;
    g.fillRect(0, 0, stage.w, stage.h);

    g.save();
    g.globalAlpha = 0.5;
    const band = Math.max(8, layout.size * 0.052);
    for (let y = layout.cy - layout.size; y <= layout.cy + layout.size; y += band * 2.6) {
      g.fillStyle = '#000';
      g.fillRect(0, y, stage.w, band);
    }
    g.restore();

    g.save();
    g.globalAlpha = 0.18;
    for (let i = 0; i < 360; i += 1) {
      const x = Math.random() * stage.w;
      const y = Math.random() * stage.h;
      const s = Math.random() * 1.8 + 0.4;
      g.fillStyle = Math.random() > 0.5 ? '#fff' : '#000';
      g.fillRect(x, y, s, s);
    }
    g.restore();
    clipToText(surface, stage.underTextMask.c);
  }

  function fillMechanical(surface, layout) {
    clear(surface);
    const g = surface.x;
    const steel = g.createLinearGradient(layout.cx, layout.cy - layout.size, layout.cx, layout.cy + layout.size);
    steel.addColorStop(0, '#bcecff');
    steel.addColorStop(0.18, '#1678a8');
    steel.addColorStop(0.38, '#d6f6ff');
    steel.addColorStop(0.56, '#17405d');
    steel.addColorStop(0.78, '#65c9ea');
    steel.addColorStop(1, '#09273d');
    g.fillStyle = steel;
    g.fillRect(0, 0, stage.w, stage.h);

    const cell = Math.max(28, layout.size * 0.19);
    const xStart = layout.cx - layout.maxWidth * 0.56;
    const xEnd = layout.cx + layout.maxWidth * 0.56;
    const yStart = layout.cy - layout.size * (layout.mobile ? 1.1 : 0.78);
    const yEnd = layout.cy + layout.size * (layout.mobile ? 1.1 : 0.78);

    g.save();
    g.strokeStyle = 'rgba(6,27,42,.8)';
    g.lineWidth = Math.max(1.2, layout.size * 0.009);
    for (let x = xStart; x <= xEnd; x += cell) {
      g.beginPath();
      g.moveTo(x, yStart);
      g.lineTo(x, yEnd);
      g.stroke();
    }
    for (let y = yStart; y <= yEnd; y += cell) {
      g.beginPath();
      g.moveTo(xStart, y);
      g.lineTo(xEnd, y);
      g.stroke();
    }

    for (let y = yStart; y <= yEnd; y += cell * 1.4) {
      for (let x = xStart; x <= xEnd; x += cell * 1.45) {
        const r = cell * 0.24;
        const gear = g.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.05, x, y, r);
        gear.addColorStop(0, '#fff');
        gear.addColorStop(0.26, '#7fe4ff');
        gear.addColorStop(0.58, '#1a658a');
        gear.addColorStop(1, '#061a2a');
        g.fillStyle = gear;
        g.beginPath();
        g.arc(x, y, r, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = '#ff7a21';
        g.lineWidth = Math.max(1.5, layout.size * 0.011);
        g.beginPath();
        g.arc(x, y, r * 1.34, -0.55, 1.6);
        g.stroke();
      }
    }
    g.restore();
    clipToText(surface, stage.underTextMask.c);
  }

  function renderStaticLayers(now = 0) {
    const layout = textLayout();

    clear(stage.textMask);
    renderText(stage.textMask.x, layout, '#fff');

    clear(stage.underTextMask);
    renderText(stage.underTextMask.x, layout, '#fff', {
      widthMult: 1.055,
      sizeMult: 1.11,
      xScale: 1.04,
      yScale: 1.18,
      yOffset: layout.mobile ? 8 : 6,
      spacing: layout.mobile ? -2 : -6
    });

    clear(stage.base);
    renderText(stage.base.x, layout, INK);

    fillPink(stage.layers[0]);
    fillCascade(stage.layers[1], layout, now);
    fillSoviet(stage.layers[2], layout);
    fillNoir(stage.layers[3], layout);
    fillMechanical(stage.layers[4], layout);
  }

  function updateDynamicLayers(now) {
    fillCascade(stage.layers[1], textLayout(), now);
  }

  function smoothstep(value) {
    const x = Math.max(0, Math.min(1, value));
    return x * x * (3 - 2 * x);
  }

  function cycleState(now) {
    const elapsed = Math.max(0, now - ARRIVAL_DELAY);
    const progress = reduceMotion ? 0 : elapsed / CYCLE_DURATION;
    const whole = Math.floor(progress);
    const fraction = progress - whole;
    return { whole, fraction };
  }

  function morphState(now) {
    const { whole, fraction } = cycleState(now);
    const current = whole % STYLES.length;
    const next = (current + 1) % STYLES.length;
    const mix = smoothstep((fraction - TRANSITION_START) / (1 - TRANSITION_START));
    return { current, next, mix };
  }

  function motionState(now) {
    const { whole, fraction } = cycleState(now);
    const current = whole % MOTIONS.length;
    const action = Math.max(0, Math.min(1, (fraction - TRANSITION_START) / (1 - TRANSITION_START)));
    const envelope = Math.pow(Math.sin(Math.PI * action), 2);
    return { name: MOTIONS[current], phase: action, envelope };
  }

  function oilPoints(now, radius) {
    const points = [];
    const count = 72;
    const speed = Math.min(45, Math.hypot(pointer.vx, pointer.vy));
    const direction = speed > 0.25 ? Math.atan2(pointer.vy, pointer.vx) : 0;
    const stretch = 1 + speed * 0.006;
    const t = now * 0.001;

    for (let i = 0; i < count; i += 1) {
      const angle = (Math.PI * 2 * i) / count;
      const wobble = 1 + Math.sin(angle * 3 + t * 1.15) * 0.075 + Math.sin(angle * 5 - t * 0.74) * 0.048 + Math.sin(angle * 8 + t * 1.47) * 0.022;

      const x = Math.cos(angle) * radius * 1.47 * wobble * stretch;
      const y = Math.sin(angle) * radius * 0.86 * wobble / Math.sqrt(stretch);
      const cos = Math.cos(direction);
      const sin = Math.sin(direction);

      points.push({
        x: pointer.x + (x * cos - y * sin),
        y: pointer.y + (x * sin + y * cos)
      });
    }
    return points;
  }

  function traceSmoothBlob(g, points) {
    const last = points[points.length - 1];
    const first = points[0];
    g.beginPath();
    g.moveTo((last.x + first.x) * 0.5, (last.y + first.y) * 0.5);
    for (let i = 0; i < points.length; i += 1) {
      const current = points[i];
      const next = points[(i + 1) % points.length];
      g.quadraticCurveTo(current.x, current.y, (current.x + next.x) * 0.5, (current.y + next.y) * 0.5);
    }
    g.closePath();
  }

  function pointOverText(x, y) {
    if (stage.mobile) return true;
    const px = Math.max(0, Math.min(stage.textMask.c.width - 1, Math.round(x * stage.dpr)));
    const py = Math.max(0, Math.min(stage.textMask.c.height - 1, Math.round(y * stage.dpr)));
    return stage.textMask.x.getImageData(px, py, 1, 1).data[3] > 10;
  }

  function adjustDesktopPerformance(dt) {
    if (stage.mobile) return;
    if (dt > 28) {
      stage.slowFrames += 1;
      stage.fastFrames = Math.max(0, stage.fastFrames - 1);
    } else if (dt < 18) {
      stage.fastFrames += 1;
      stage.slowFrames = Math.max(0, stage.slowFrames - 1);
    }

    if (stage.slowFrames > 18 && stage.dprCap > 1.5) {
      stage.dprCap = Math.max(1.5, stage.dprCap - 0.25);
      stage.slowFrames = 0;
      stage.fastFrames = 0;
      resize();
    } else if (stage.fastFrames > 180 && stage.dprCap < 2) {
      stage.dprCap = Math.min(2, stage.dprCap + 0.25);
      stage.slowFrames = 0;
      stage.fastFrames = 0;
      resize();
    }
  }

  const introDemo = { userInteracted: false, completed: false };

  function applyIntroDemo(now) {
    if (stage.mobile || introDemo.userInteracted || introDemo.completed) return false;
    const start = 1280;
    const end = 3100;
    if (now < start) return false;
    if (now > end) {
      introDemo.completed = true;
      pointer.active = false;
      return false;
    }
    const layout = textLayout();
    const t = (now - start) / (end - start);
    const eased = smoothstep(t);
    pointer.active = true;
    pointer.tx = layout.cx - layout.maxWidth * 0.16 + layout.maxWidth * 0.32 * eased;
    pointer.ty = layout.cy + Math.sin(eased * Math.PI) * 6;
    return true;
  }

  function createOilMask(now) {
    const mask = stage.oilMask;
    const speed = Math.min(45, Math.hypot(pointer.vx, pointer.vy));
    const base = Math.min(stage.w, stage.h) * (stage.mobile ? 0.205 : 0.18);
    const radius = Math.max(2, (base + speed * 0.7) * pointer.reveal);
    const points = oilPoints(now, radius);

    clear(mask);
    mask.x.save();
    mask.x.setTransform(stage.dpr, 0, 0, stage.dpr, 0, 0);
    mask.x.filter = 'blur(5px)';
    mask.x.fillStyle = 'rgba(255,255,255,.88)';
    traceSmoothBlob(mask.x, points);
    mask.x.fill();
    mask.x.filter = 'none';
    mask.x.fillStyle = '#fff';
    traceSmoothBlob(mask.x, points);
    mask.x.fill();

    const speedSplit = Math.min(1, speed / 18);
    const splitPulse = 0.5 + 0.5 * Math.sin(now * 0.0022);
    if (!stage.mobile && speedSplit * splitPulse > 0.26) {
      const splitOffset = Math.min(24, 8 + speed * 0.4);
      const offsetX = pointer.vx === 0 && pointer.vy === 0 ? -splitOffset : (-pointer.vx / Math.max(0.001, speed)) * splitOffset;
      const offsetY = pointer.vx === 0 && pointer.vy === 0 ? 0 : (-pointer.vy / Math.max(0.001, speed)) * splitOffset;
      const splitPoints = points.map((pt, index) => ({
        x: pt.x + offsetX + Math.sin(index * 0.7 + now * 0.004) * 2.4,
        y: pt.y + offsetY + Math.cos(index * 0.62 + now * 0.003) * 1.8
      }));
      mask.x.globalAlpha = 0.82;
      traceSmoothBlob(mask.x, splitPoints);
      mask.x.fill();
      mask.x.globalAlpha = 1;
    }

    mask.x.restore();
    return mask.c;
  }

  function drawMovedLayer(g, layer, motion) {
    const src = layer.c;
    const dpr = stage.dpr;
    const layout = textLayout();
    const phase = motion.phase;
    const strength = motion.envelope;
    const parallaxX = stage.mobile ? 0 : -((pointer.x - stage.w * 0.5) / Math.max(stage.w * 0.5, 1)) * 12;
    const parallaxY = stage.mobile ? 0 : -((pointer.y - stage.h * 0.5) / Math.max(stage.h * 0.5, 1)) * 6;

    const slice = (sx, sy, sw, sh, dx, dy, dw, dh) => {
      g.drawImage(src, sx * dpr, sy * dpr, sw * dpr, sh * dpr, dx, dy, dw, dh);
    };

    if (strength < 0.001) {
      g.drawImage(src, parallaxX, parallaxY, stage.w, stage.h);
      return;
    }

    if (motion.name === 'SNAKE') {
      const band = stage.mobile ? 4 : 5;
      const amplitude = Math.min(42, layout.size * 0.22) * strength;
      const travel = phase * Math.PI * 4;
      for (let y = 0; y < stage.h; y += band) {
        const wave = Math.sin((y - layout.cy) * 0.032 + travel);
        const second = Math.sin((y - layout.cy) * 0.071 - travel * 0.62);
        const dx = wave * amplitude + second * amplitude * 0.22;
        const dy = Math.cos((y - layout.cy) * 0.024 + travel) * amplitude * 0.06;
        slice(0, y, stage.w, band + 1, dx + parallaxX, y + dy + parallaxY, stage.w, band + 1.4);
      }
      return;
    }

    if (motion.name === 'KEYTURN') {
      const band = stage.mobile ? 5 : 7;
      const angle = Math.sin(phase * Math.PI * 2) * 0.92 * strength;
      const turn = Math.sin(angle);
      const compression = 1 - Math.abs(turn) * 0.46;
      const halfWidth = Math.max(1, layout.maxWidth * 0.5);

      for (let x = 0; x < stage.w; x += band) {
        const normalized = (x - layout.cx) / halfWidth;
        const dx = layout.cx + (x - layout.cx) * compression + normalized * turn * 18;
        const dy = normalized * turn * Math.min(38, layout.size * 0.2);
        const dw = band * compression + 1.4;
        slice(x, 0, band + 1, stage.h, dx + parallaxX, dy + parallaxY, dw, stage.h);
      }
      return;
    }

    if (motion.name === 'CORKSCREW') {
      const band = stage.mobile ? 4 : 5;
      const travel = phase * Math.PI * 4.5;
      const amplitude = Math.min(38, layout.size * 0.19) * strength;

      for (let y = 0; y < stage.h; y += band) {
        const twist = (y - layout.cy) * 0.047 + travel;
        const localScale = 1 - (0.14 * strength * (0.5 + 0.5 * Math.cos(twist)));
        const dw = stage.w * localScale;
        const dx = (stage.w - dw) * 0.5 + Math.sin(twist) * amplitude;
        const dy = Math.cos(twist * 0.72) * amplitude * 0.055;
        slice(0, y, stage.w, band + 1, dx + parallaxX, y + dy + parallaxY, dw, band + 1.4);
      }
      return;
    }

    const band = stage.mobile ? 8 : 11;
    const notchProgress = phase * 12;
    const notch = Math.floor(notchProgress);
    const fraction = notchProgress - notch;
    const snap = Math.exp(-fraction * 8) * Math.sin(fraction * Math.PI * 4);

    for (let x = 0; x < stage.w; x += band) {
      const tooth = ((Math.floor(x / band) + notch) % 7) - 3;
      const dx = (notch % 2 ? 4 : -4) * strength + snap * (tooth % 2 ? 4 : -4) * strength;
      const dy = tooth * 2.15 * strength + snap * (tooth % 2 ? 9 : -9) * strength;
      slice(x, 0, band + 1, stage.h, x + dx + parallaxX, dy + parallaxY, band + 1.5, stage.h);
    }
  }

  function drawLayerThroughOil(layer, oilMask, alpha, surface, motion) {
    clear(surface);
    surface.x.save();
    surface.x.setTransform(stage.dpr, 0, 0, stage.dpr, 0, 0);
    surface.x.globalAlpha = alpha;
    drawMovedLayer(surface.x, layer, motion);
    surface.x.globalCompositeOperation = 'destination-in';
    surface.x.drawImage(oilMask, 0, 0, stage.w, stage.h);
    surface.x.restore();
    ctx.drawImage(surface.c, 0, 0, stage.w, stage.h);
  }

  function drawFrame(now) {
    requestAnimationFrame(drawFrame);
    if (!stage.visible) return;
    const dt = now - stage.lastRender;
    if (dt < stage.frameBudget) return;
    stage.lastRender = now;
    adjustDesktopPerformance(dt);

    updateDynamicLayers(now);
    const morph = morphState(now);
    const motion = motionState(now);

    const demoActive = applyIntroDemo(now);

    pointer.vx += (pointer.tx - pointer.x) * 0.085;
    pointer.vy += (pointer.ty - pointer.y) * 0.085;
    pointer.vx *= 0.74;
    pointer.vy *= 0.74;
    pointer.x += pointer.vx;
    pointer.y += pointer.vy;

    const revealTarget = (demoActive || pointer.active) ? 1 : 0;
    pointer.reveal += (revealTarget - pointer.reveal) * (pointer.active ? 0.105 : 0.07);

    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, stage.w, stage.h);
    ctx.drawImage(stage.base.c, 0, 0, stage.w, stage.h);

    if (pointer.reveal > 0.01) {
      const oilMask = createOilMask(now);
      drawLayerThroughOil(stage.layers[morph.current], oilMask, 1 - morph.mix, stage.tempA, motion);
      drawLayerThroughOil(stage.layers[morph.next], oilMask, morph.mix, stage.tempB, motion);
    }
  }

  function setPointer(clientX, clientY, active = true, type = pointer.type, bypassHitTest = false) {
    window.clearTimeout(pointer.releaseTimer);
    introDemo.userInteracted = true;
    pointer.type = type || pointer.type;
    const yLift = pointer.type === 'touch' ? 46 : 0;
    const targetY = clientY - yLift;
    const overText = bypassHitTest || pointOverText(clientX, targetY);
    pointer.tx = clientX;
    pointer.ty = targetY;
    pointer.active = active && (pointer.type === 'touch' || overText);
  }

  function hidePointerWithDelay(delay = 0) {
    window.clearTimeout(pointer.releaseTimer);
    if (!delay) {
      pointer.active = false;
      return;
    }
    pointer.releaseTimer = window.setTimeout(() => {
      pointer.active = false;
    }, delay);
  }

  canvas.addEventListener('pointerenter', (event) => {
    if (event.pointerType === 'touch') return;
    setPointer(event.clientX, event.clientY, true, event.pointerType || 'mouse');
  });

  canvas.addEventListener('pointermove', (event) => {
    setPointer(event.clientX, event.clientY, true, event.pointerType || 'mouse');
  }, { passive: true });

  canvas.addEventListener('pointerleave', (event) => {
    if (event.pointerType === 'touch') {
      hidePointerWithDelay(1200);
      return;
    }
    hidePointerWithDelay(0);
  });

  canvas.addEventListener('pointerdown', (event) => {
    pointer.down = true;
    canvas.setPointerCapture?.(event.pointerId);
    setPointer(event.clientX, event.clientY, true, event.pointerType || 'mouse');
  });

  canvas.addEventListener('pointerup', (event) => {
    pointer.down = false;
    canvas.releasePointerCapture?.(event.pointerId);
    if (event.pointerType === 'touch') {
      hidePointerWithDelay(1200);
    }
  });

  canvas.addEventListener('pointercancel', () => {
    pointer.down = false;
    hidePointerWithDelay(1200);
  });

  function setMenu(open) {
    if (!menuToggle || !mobileDrawer) return;
    menuToggle.setAttribute('aria-expanded', String(open));
    mobileDrawer.classList.toggle('is-open', open);
    mobileDrawer.setAttribute('aria-hidden', String(!open));
    document.body.classList.toggle('drawer-open', open);
  }

  menuToggle?.addEventListener('click', () => {
    const open = menuToggle.getAttribute('aria-expanded') !== 'true';
    setMenu(open);
  });

  document.addEventListener('click', (event) => {
    if (!menuToggle || !mobileDrawer) return;
    if (menuToggle.contains(event.target) || mobileDrawer.contains(event.target)) return;
    setMenu(false);
  });

  const music = {
    active: false,
    userPaused: false,
    starting: false,
    volume: 0.32
  };

  function updateMusicButton() {
    if (!musicToggle || !backgroundMusic) return;
    const active = !backgroundMusic.paused && !backgroundMusic.ended;
    music.active = active;
    musicToggle.classList.toggle('is-active', active);
    musicToggle.setAttribute('aria-pressed', String(active));
  }

  function restoreMusicState() {
    if (!backgroundMusic) return;
    backgroundMusic.volume = music.volume;
    backgroundMusic.loop = true;

    try {
      const savedTime = Number(sessionStorage.getItem('kbj-music-time'));
      const savedPaused = sessionStorage.getItem('kbj-music-paused');
      if (Number.isFinite(savedTime) && savedTime > 0 && savedTime < (backgroundMusic.duration || Infinity)) {
        backgroundMusic.currentTime = savedTime;
      }
      music.userPaused = savedPaused === 'true';
    } catch (_) {
      music.userPaused = false;
    }
  }

  function saveMusicState() {
    if (!backgroundMusic) return;
    try {
      sessionStorage.setItem('kbj-music-time', String(backgroundMusic.currentTime || 0));
      sessionStorage.setItem('kbj-music-paused', String(music.userPaused));
    } catch (_) {
      // Storage can be unavailable in private modes; playback still works.
    }
  }

  async function tryStartMusic() {
    if (!backgroundMusic || music.userPaused || music.starting || !backgroundMusic.paused) {
      updateMusicButton();
      return !backgroundMusic?.paused;
    }

    music.starting = true;
    backgroundMusic.volume = music.volume;
    backgroundMusic.loop = true;

    try {
      await backgroundMusic.play();
      music.active = true;
      updateMusicButton();
      return true;
    } catch (_) {
      updateMusicButton();
      return false;
    } finally {
      music.starting = false;
    }
  }

  function attemptMusicFromInteraction() {
    if (!music.userPaused) tryStartMusic();
  }

  async function toggleMusic() {
    if (!backgroundMusic) return;

    if (!backgroundMusic.paused) {
      music.userPaused = true;
      backgroundMusic.pause();
      saveMusicState();
      updateMusicButton();
      return;
    }

    music.userPaused = false;
    await tryStartMusic();
    saveMusicState();
  }

  musicToggle?.addEventListener('click', () => {
    toggleMusic().catch(() => undefined);
  });

  backgroundMusic?.addEventListener('play', updateMusicButton);
  backgroundMusic?.addEventListener('pause', updateMusicButton);
  backgroundMusic?.addEventListener('ended', updateMusicButton);
  backgroundMusic?.addEventListener('loadedmetadata', restoreMusicState, { once: true });

  // Best-effort audible autoplay, then retry on movement and valid user activation.
  const passiveStartEvents = ['pointermove', 'mousemove', 'scroll'];
  passiveStartEvents.forEach((eventName) => {
    window.addEventListener(eventName, attemptMusicFromInteraction, { passive: true });
  });

  const activationEvents = ['pointerdown', 'touchstart', 'click', 'keydown', 'wheel'];
  activationEvents.forEach((eventName) => {
    window.addEventListener(eventName, attemptMusicFromInteraction, { passive: eventName !== 'keydown' });
  });

  window.addEventListener('load', tryStartMusic, { once: true });
  window.addEventListener('pageshow', tryStartMusic);
  window.addEventListener('focus', tryStartMusic);
  window.addEventListener('pagehide', saveMusicState);

  restoreMusicState();
  tryStartMusic();

  document.addEventListener('visibilitychange', () => {
    stage.visible = !document.hidden;
    if (stage.visible) {
      stage.lastRender = 0;
      tryStartMusic();
    } else {
      saveMusicState();
    }
  });

  window.addEventListener('resize', debouncedResize, { passive: true });

  resize();
  requestAnimationFrame(drawFrame);

  Promise.all([
    document.fonts.load('800 120px "Syne"'),
    document.fonts.load('500 120px "DM Mono"')
  ]).then(() => renderStaticLayers(0)).catch(() => undefined);
})();
