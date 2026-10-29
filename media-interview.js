/* Media-only scroll reveal. The interview opening awaits the user's own video.
 * No video URL is selected, loaded or played by this script.
 */
(() => {
  'use strict';
  const elements = document.querySelectorAll('.media-entry, .media-section h2');
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      !('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  }, { threshold: 0.1, rootMargin: '0px 0px -5% 0px' });
  document.documentElement.classList.add('media-enhanced');
  elements.forEach(node => observer.observe(node));
})();
