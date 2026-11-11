/* Self-hosted film and sculpture imagery inside the existing letter mask. */
(() => {
  'use strict';

  const scenes = [
    {src:'assets/midnight-ceramic-v1.png', tone:'midnight'},
    {src:'assets/balloon-rabbit-v1.png', tone:'rabbit'},
    {src:'assets/amber-resin-v1.png', tone:'amber'},
    {src:'assets/matte-rhino-v1.png', tone:'rhino'},
    {src:'assets/folded-glass-v1.png', tone:'glass'},
    {src:'assets/silver-zio-v1.png', tone:'foil'},
    {src:'assets/work-film-v1.mp4', poster:'assets/work-film-poster-v1.jpg', tone:'work', film:true},
    {src:'assets/archival-film-v1.mp4', poster:'assets/archival-film-poster-v1.jpg', tone:'archive', film:true}
  ];

  class ArtPlates {
    constructor(host) {
      this.layers = scenes.map((scene, index) => {
        const layer = document.createElement('div');
        layer.className = `hero-art-plate hero-art-plate-${scene.tone}`;
        layer.setAttribute('aria-hidden', 'true');
        const media = document.createElement(scene.film ? 'video' : 'img');
        media.draggable = false;
        if (scene.film) {
          media.muted = true;
          media.loop = true;
          media.playsInline = true;
          media.preload = 'none';
          media.poster = scene.poster;
          media.setAttribute('aria-hidden', 'true');
        } else {
          media.alt = '';
          media.decoding = 'async';
          if (index === 0) media.src = scene.src;
        }
        layer.appendChild(media);
        host.appendChild(layer);
        return {layer, media, scene, playing:false, playBlocked:false};
      });
      this.visible = true;
      this.pauseFilms = () => this.layers.forEach(({media, scene}) => {
        if (scene.film && !media.paused) media.pause();
      });
      this.onVisibilityChange = () => { if (document.hidden) this.pauseFilms(); };
      document.addEventListener('visibilitychange', this.onVisibilityChange);
      if ('IntersectionObserver' in window) {
        this.observer = new IntersectionObserver(([entry]) => {
          this.visible = entry.isIntersecting;
          if (!this.visible) this.pauseFilms();
        }, {threshold:.01});
        this.observer.observe(host);
      }
    }

    render(options) {
      const mode = options.mode % scenes.length;
      const next = options.nextMode % scenes.length;
      const mix = Math.max(0, Math.min(1, options.mix || 0));
      const pointer = options.pointer || {};
      const x = options.reducedMotion ? 0 : Math.max(-1, Math.min(1, pointer.nx || 0));
      const y = options.reducedMotion ? 0 : Math.max(-1, Math.min(1, pointer.ny || 0));
      let active = false;
      this.layers.forEach((entry, index) => {
        const {layer, media, scene} = entry;
        const weight = (mode === index ? 1 - mix : 0) + (next === index ? mix : 0);
        if ((index === mode || index === next) && !media.getAttribute('src')) media.src = scene.src;
        layer.style.opacity = weight.toFixed(3);
        if (weight > .001) {
          media.style.transform = `translate3d(${(-x * 2.1).toFixed(2)}%,${(y * 1.5).toFixed(2)}%,0) scale(1.06)`;
          active = true;
        }
        if (!scene.film) return;
        const shouldPlay = weight > .001 && !options.reducedMotion && !document.hidden && this.visible;
        if (!shouldPlay) {
          if (!media.paused) media.pause();
          entry.playing = false;
          if (weight <= .001) entry.playBlocked = false;
        } else if (media.paused && !entry.playing && !entry.playBlocked) {
          entry.playing = true;
          media.play().catch(() => { entry.playBlocked = true; })
            .finally(() => { entry.playing = false; });
        }
      });
      return active;
    }

    destroy() {
      this.observer?.disconnect();
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
      this.layers.forEach(({layer, media, scene}) => {
        if (scene.film) media.pause();
        layer.remove();
      });
    }
  }

  window.KBJArtPlates = {create(host) { return new ArtPlates(host); }};
})();
