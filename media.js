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
  const deck = document.querySelector('#articles .article-deck');
  if (!deck) return;
  const stage = deck.querySelector('.article-stage');
  const slides = [...stage.querySelectorAll('.article-slide')];
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let current = 0, timer, exitTimer, touchStart;
  let clicked = false, hovered = false, focused = false, visible = false;
  let swallowClick = false;

  function schedule() {
    clearTimeout(timer);
    if (visible && !document.hidden && !motion.matches && !clicked && !hovered && !focused && !touchStart) {
      timer = setTimeout(() => show(current + 1), 5000);
    }
  }

  function show(index) {
    const next = (index + slides.length) % slides.length;
    if (next !== current) {
      const outgoing = slides[current];
      const incoming = slides[next];
      clearTimeout(exitTimer);
      slides.forEach(slide => slide.classList.remove('is-leaving'));
      outgoing.classList.remove('is-active');
      outgoing.classList.add('is-leaving');
      outgoing.inert = true;
      incoming.inert = false;
      incoming.classList.add('is-active');
      current = next;
      exitTimer = setTimeout(() => outgoing.classList.remove('is-leaving'), 320);
    }
    schedule();
  }

  slides.forEach((slide, i) => { slide.inert = i !== current; });
  deck.dataset.rotating = '';
  deck.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch') {
      hovered = false;
      focused = false;
      schedule();
    }
  });
  motion.addEventListener('change', schedule);
  schedule();

  deck.addEventListener('pointerenter', event => {
    if (event.pointerType === 'mouse') { hovered = true; schedule(); }
  });
  deck.addEventListener('pointerleave', event => {
    if (event.pointerType === 'mouse') { hovered = false; clicked = false; schedule(); }
  });
  deck.addEventListener('focusin', event => { focused = event.target.matches(':focus-visible'); schedule(); });
  deck.addEventListener('focusout', event => { focused = deck.contains(event.relatedTarget) && event.relatedTarget.matches(':focus-visible'); schedule(); });
  deck.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    show(current + (event.key === 'ArrowRight' ? 1 : -1));
    slides[current].querySelector('h3 a').focus({preventScroll: true});
  });

  stage.addEventListener('pointerdown', event => {
    touchStart = {x: event.clientX, y: event.clientY};
    swallowClick = false;
    schedule();
  });
  stage.addEventListener('pointercancel', () => { touchStart = null; schedule(); });
  stage.addEventListener('pointerup', event => {
    if (!touchStart) return;
    const dx = event.clientX - touchStart.x, dy = event.clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
      swallowClick = true;
      show(current + (dx < 0 ? 1 : -1));
    }
    schedule();
  });
  stage.addEventListener('pointerleave', event => {
    if (event.pointerType === 'mouse') { touchStart = null; schedule(); }
  });
  stage.addEventListener('click', event => {
    if (swallowClick) { event.preventDefault(); swallowClick = false; }
    else if (!event.target.closest('a')) { clicked = !clicked; schedule(); }
  }, true);
  document.addEventListener('pointerdown', event => {
    if (!deck.contains(event.target) && clicked) { clicked = false; schedule(); }
  });
  stage.addEventListener('dragstart', event => event.preventDefault());
  document.addEventListener('visibilitychange', schedule);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; schedule(); }, {threshold: .15}).observe(stage);
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
