/* Media page only. No homepage animation, audio or navigation changes. */
(() => {
  'use strict';
  const root = document.querySelector('.media-premiere');
  const player = document.getElementById('media-feature-player');
  const sound = document.getElementById('media-feature-sound');
  if (!root || !player || !sound) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const parameters = new URLSearchParams({
    autoplay: reduceMotion ? '0' : '1',
    mute: '1',
    playsinline: '1',
    controls: '1',
    enablejsapi: '1',
    rel: '0',
    origin: window.location.origin
  });

  // This is the actual Fifth Question interview with Kile B. Jones.
  // We do not load or substitute any unrelated video.
  player.src = 'https://www.youtube-nocookie.com/embed/m7oJH0S0BhI?' + parameters;
  player.setAttribute('title', 'From Anti-Zionist to Pro-Israel: Why Kile Jones Changed His Mind');

  const send = (func, args = []) => {
    if (!player.contentWindow) return;
    player.contentWindow.postMessage(
      JSON.stringify({event:'command', func, args}),
      'https://www.youtube-nocookie.com'
    );
  };

  let soundEnabled = false;
  const applySound = () => {
    sound.textContent = soundEnabled ? 'Mute' : 'Enable sound';
    sound.setAttribute('aria-pressed', String(soundEnabled));
    if (soundEnabled) {
      send('unMute');
      send('setVolume', [100]);
      send('playVideo');
    } else {
      send('mute');
    }
  };
  sound.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    applySound();
    // A user gesture can start playback when the browser blocked autoplay.
    if (soundEnabled) window.setTimeout(() => send('playVideo'), 80);
  });

  // Opening film expands once, while later sections settle into place only
  // when actually scrolled into view. Content stays visible without JS.
  document.documentElement.classList.add('media-enhanced');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    document.querySelectorAll('.media-entry, .media-section h2')
      .forEach(item => item.classList.add('is-visible'));
    return;
  }
  const items = document.querySelectorAll('.media-entry, .media-section h2');
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  }, {threshold:0.10, rootMargin:'0px 0px -5% 0px'});
  for (const item of items) observer.observe(item);
})();