(() => {
  const root = document.getElementById('kj-interview-row');
  if (!root) return;
  const rail = root.querySelector('.rail');
  const reels = [...rail.querySelectorAll('.reel')];
  const previous = root.querySelector('.previous');
  const next = root.querySelector('.next');
  const title = root.querySelector('[data-title-caption]');
  const source = root.querySelector('[data-source-caption]');
  const queueIndex = root.querySelector('.index');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let current = reels.findIndex(reel => reel.hasAttribute('data-active'));
  let scrollTimer;

  function center(index, behavior) {
    const reel = reels[index];
    if (!reel) return;
    rail.scrollTo({left: reel.offsetLeft + (reel.offsetWidth - rail.clientWidth) / 2, behavior});
  }

  function select(index) {
    current = index;
    queueIndex.textContent = String(index + 1).padStart(2, '0') + ' / ' + String(reels.length).padStart(2, '0');
    for (const [position, reel] of reels.entries()) {
      const active = index === position;
      const button = reel.querySelector('.take');
      const link = reel.querySelector('.watch');
      reel.toggleAttribute('data-active', active);
      if (active && document.activeElement === button) {
        link.hidden = false;
        link.focus({preventScroll:true});
      }
      button.hidden = active;
      link.hidden = !active;
    }
    title.textContent = reels[index].dataset.title;
    source.textContent = reels[index].dataset.source;
    previous.setAttribute('aria-disabled', String(index === 0));
    next.setAttribute('aria-disabled', String(index === reels.length - 1));
  }

  function move(index) {
    center(index, reducedMotion.matches ? 'instant' : 'smooth');
  }

  rail.addEventListener('scroll', () => {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      const middle = rail.scrollLeft + rail.clientWidth / 2;
      const distance = reel => Math.abs(middle - reel.offsetLeft - reel.offsetWidth / 2);
      const nearest = reels.reduce((best, reel) => distance(reel) < distance(best) ? reel : best);
      const index = reels.indexOf(nearest);
      if (index !== current) select(index);
    }, 85);
  }, {passive:true});

  previous.addEventListener('click', () => move(current - 1));
  next.addEventListener('click', () => move(current + 1));
  for (const [index, reel] of reels.entries()) {
    reel.querySelector('.take').addEventListener('click', () => move(index));
  }
  root.setAttribute('data-enhanced', '');
  select(current);
  center(current, 'instant');
  if ('ResizeObserver' in window) {
    let lastWidth = rail.clientWidth;
    new ResizeObserver(() => {
      if (rail.clientWidth === lastWidth) return;
      lastWidth = rail.clientWidth;
      center(current, 'instant');
    }).observe(rail);
  }
})();

(() => {
  'use strict';
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
  const targets=[...document.querySelectorAll('.media-entry,.media-section-label')];
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
