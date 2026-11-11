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
