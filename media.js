(() => {
  const root = document.getElementById('kj-interview-row');
  if (!root || !root.querySelector('.rail')) return;
  const rail = root.querySelector('.rail');
  const reels = [...rail.querySelectorAll('.reel')];
  const title = root.querySelector('[data-title-caption]');
  const source = root.querySelector('[data-source-caption]');
  const description = root.querySelector('[data-description-caption]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const colors = ['#a52ad4','#008fce','#e52d8a','#7b8d00','#d5540a','#632ed4','#008f87','#bd3b61','#3974e6','#b15400','#a41f71','#3e8c20','#c43a7b','#0079a6'];
  let current = 0, timer, scrollTimer, hovering = false, focused = false, touching = false, animating = false;
  function center(index, behavior = 'instant') {
    const reel = reels[index];
    rail.scrollTo({left: reel.offsetLeft + (reel.offsetWidth - rail.clientWidth) / 2, behavior});
  }
  function pause() { clearTimeout(timer); }
  function schedule() {
    pause();
    if (hovering || focused || touching || document.hidden) return;
    timer = setTimeout(() => move((current + 1) % reels.length), 5000);
  }
  function select(index) {
    current = index;
    reels.forEach((reel, position) => {
      const active = index === position;
      const button = reel.querySelector('.take');
      const link = reel.querySelector('.watch');
      reel.toggleAttribute('data-active', active);
      if (active && document.activeElement === button) link.focus({preventScroll:true});
      button.hidden = active;
      link.hidden = !active;
    });
    const reel = reels[index];
    title.textContent = reel.dataset.title;
    title.href = reel.querySelector('.watch').href;
    source.textContent = reel.dataset.source;
    source.hidden = !reel.dataset.source;
    description.textContent = reel.dataset.description;
    root.style.setProperty('--active-color', colors[index % colors.length]);
    schedule();
  }
  function move(index) {
    const target = (index + reels.length) % reels.length;
    select(target);
    if (reduced.matches || (target === 0 && index > 0)) {
      center(target);
      return;
    }
    const destination = reels[target].offsetLeft + (reels[target].offsetWidth - rail.clientWidth) / 2;
    const start = rail.scrollLeft, change = destination - start;
    const duration = 280, startTime = performance.now();
    animating = true;
    rail.style.scrollSnapType = 'none';
    function frame(now) {
      const progress = Math.min(1, (now - startTime) / duration);
      rail.scrollLeft = start + change * (1 - Math.pow(1 - progress, 3));
      if (progress < 1) requestAnimationFrame(frame);
      else { rail.style.scrollSnapType = ''; animating = false; }
    }
    requestAnimationFrame(frame);
  }
  rail.addEventListener('scroll', () => {
    if (animating) return;
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      const middle = rail.scrollLeft + rail.clientWidth / 2;
      const nearest = reels.reduce((best, reel) => Math.abs(middle - reel.offsetLeft - reel.offsetWidth / 2) < Math.abs(middle - best.offsetLeft - best.offsetWidth / 2) ? reel : best);
      const index = reels.indexOf(nearest);
      if (index !== current) select(index);
    }, 90);
  }, {passive:true});
  root.querySelector('.screening').addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { hovering = true; pause(); } });
  root.querySelector('.screening').addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { hovering = false; schedule(); } });
  root.querySelector('.screening').addEventListener('focusin', e => { focused = e.target.matches(':focus-visible'); if (focused) pause(); });
  root.querySelector('.screening').addEventListener('focusout', () => { focused = root.querySelector('.screening').contains(document.activeElement) && document.activeElement.matches(':focus-visible'); if (!focused) schedule(); });
  rail.addEventListener('touchstart', () => { touching = true; pause(); }, {passive:true});
  rail.addEventListener('touchend', () => { touching = false; schedule(); }, {passive:true});
  rail.addEventListener('touchcancel', () => { touching = false; schedule(); }, {passive:true});
  rail.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); move(current + (e.key === 'ArrowRight' ? 1 : -1)); }
  });
  document.addEventListener('visibilitychange', schedule);
  reduced.addEventListener('change', schedule);
  for (const [index, reel] of reels.entries()) reel.querySelector('.take').addEventListener('click', () => move(index));
  root.setAttribute('data-enhanced', '');
  select(0);
  center(0);
  if ('ResizeObserver' in window) {
    let width = rail.clientWidth;
    new ResizeObserver(() => { if (rail.clientWidth !== width) { width = rail.clientWidth; center(current); } }).observe(rail);
  }
})();

(() => {
  const section = document.querySelector('.articles-section');
  if (!section) return;
  const deck = section.querySelector('.article-deck');
  const stage = deck.querySelector('.article-stage');
  const slides = [...stage.querySelectorAll('.article-slide')];
  const dots = [...deck.querySelectorAll('.article-dots button')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let current = 0, timer, leaveTimer, visible = false;
  let hovering = false, focused = false, touching = false, startX = null, suppressClick = false;
  function pause() { clearTimeout(timer); }
  function schedule() {
    pause();
    if (!visible || hovering || focused || touching || document.hidden || reduced.matches) return;
    timer = setTimeout(() => show((current + 1) % slides.length), 5000);
  }
  function show(index) {
    const next = (index + slides.length) % slides.length;
    if (next === current) { schedule(); return; }
    clearTimeout(leaveTimer);
    slides.forEach(slide => slide.classList.remove('is-leaving'));
    const outgoing = slides[current], incoming = slides[next];
    outgoing.classList.remove('is-active');
    outgoing.classList.add('is-leaving');
    outgoing.inert = true;
    outgoing.setAttribute('aria-hidden', 'true');
    outgoing.tabIndex = -1;
    incoming.inert = false;
    incoming.removeAttribute('aria-hidden');
    incoming.removeAttribute('tabindex');
    incoming.classList.add('is-active');
    current = next;
    dots.forEach((dot, i) => dot.setAttribute('aria-pressed', String(i === next)));
    leaveTimer = setTimeout(() => outgoing.classList.remove('is-leaving'), 380);
    schedule();
  }
  dots.forEach((dot, index) => dot.addEventListener('click', () => show(index)));
  section.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { hovering = true; pause(); } });
  section.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { hovering = false; schedule(); } });
  section.addEventListener('focusin', () => { focused = section.contains(document.activeElement) && document.activeElement.matches(':focus-visible'); if (focused) pause(); });
  section.addEventListener('focusout', () => { focused = section.contains(document.activeElement) && document.activeElement.matches(':focus-visible'); if (!focused) schedule(); });
  stage.addEventListener('pointerdown', e => { startX = e.clientX; if (e.pointerType === 'touch') { touching = true; pause(); } });
  stage.addEventListener('pointerup', e => {
    if (startX !== null && Math.abs(e.clientX - startX) > 45) {
      suppressClick = true;
      show(current + (e.clientX < startX ? 1 : -1));
      setTimeout(() => { suppressClick = false; }, 250);
    }
    startX = null;
    touching = false;
    schedule();
  });
  stage.addEventListener('pointercancel', () => { startX = null; touching = false; schedule(); });
  stage.addEventListener('dragstart', e => e.preventDefault());
  stage.addEventListener('click', e => { if (suppressClick) { e.preventDefault(); e.stopPropagation(); suppressClick = false; } }, true);
  deck.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); show(current + (e.key === 'ArrowRight' ? 1 : -1)); }
  });
  document.addEventListener('visibilitychange', schedule);
  reduced.addEventListener('change', schedule);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => { visible = entries[0].isIntersecting; schedule(); }, {threshold:.15}).observe(section);
  } else { visible = true; schedule(); }
})();

(() => {
  'use strict';
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
  const targets=[...document.querySelectorAll('.media-entry')];
  if(!targets.length)return;
  document.documentElement.classList.add('media-enhanced');
  const io=new IntersectionObserver(entries=>{
    for(const entry of entries){
      if(!entry.isIntersecting)continue;
      entry.target.classList.add('is-visible');
      io.unobserve(entry.target);
    }
  },{rootMargin:'0px 0px -6% 0px',threshold:.06});
  targets.forEach(el=>io.observe(el));
})();
