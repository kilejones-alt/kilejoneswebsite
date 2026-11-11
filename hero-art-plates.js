/* Art-directed, self-hosted sculptures inside the existing letter mask. */
(() => {
  'use strict';

  const scenes = [
    {src:'assets/midnight-ceramic-v1.png', tone:'midnight'},
    {src:'assets/balloon-rabbit-v1.png', tone:'rabbit'},
    {src:'assets/amber-resin-v1.png', tone:'amber'},
    {src:'assets/matte-rhino-v1.png', tone:'rhino'},
    {src:'assets/folded-glass-v1.png', tone:'glass'},
    {src:'assets/silver-zio-v1.png', tone:'foil'}
  ];

  class ArtPlates {
    constructor(host) {
      this.layers = scenes.map((scene, index) => {
        const layer = document.createElement('div');
        layer.className = `hero-art-plate hero-art-plate-${scene.tone}`;
        layer.setAttribute('aria-hidden', 'true');
        const image = document.createElement('img');
        image.alt = '';
        image.decoding = 'async';
        image.draggable = false;
        if (index === 0) image.src = scene.src;
        layer.appendChild(image);
        host.appendChild(layer);
        return {layer, image, src:scene.src};
      });
    }

    render(options) {
      const mode = options.mode % scenes.length;
      const next = options.nextMode % scenes.length;
      const mix = Math.max(0, Math.min(1, options.mix || 0));
      const pointer = options.pointer || {};
      const x = options.reducedMotion ? 0 : Math.max(-1, Math.min(1, pointer.nx || 0));
      const y = options.reducedMotion ? 0 : Math.max(-1, Math.min(1, pointer.ny || 0));
      let active = false;
      this.layers.forEach(({layer, image, src}, index) => {
        const weight = (mode === index ? 1 - mix : 0) + (next === index ? mix : 0);
        if ((index === mode || index === next) && !image.getAttribute('src')) image.src = src;
        layer.style.opacity = weight.toFixed(3);
        if (weight > .001) {
          image.style.transform = `translate3d(${(-x * 2.1).toFixed(2)}%,${(y * 1.5).toFixed(2)}%,0) scale(1.06)`;
          active = true;
        }
      });
      return active;
    }

    destroy() { this.layers.forEach(({layer}) => layer.remove()); }
  }

  window.KBJArtPlates = {create(host) { return new ArtPlates(host); }};
})();
