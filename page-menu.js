(() => {
  const button = document.querySelector('#page-menu-toggle');
  const drawer = document.querySelector('#page-drawer');
  if (!button || !drawer) return;
  const setOpen = open => {
    button.setAttribute('aria-expanded', String(open));
    drawer.classList.toggle('is-open', open);
    drawer.inert = !open;
  };
  button.addEventListener('click', event => {
    const finePointer = matchMedia('(hover:hover) and (pointer:fine)').matches;
    const open = button.getAttribute('aria-expanded') === 'true';
    setOpen(finePointer && event.detail > 0 ? true : !open);
  });
  button.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') setOpen(true); });
  document.addEventListener('click', e => { if (!button.contains(e.target) && !drawer.contains(e.target)) setOpen(false); });
  drawer.addEventListener('click', e => { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });
})();
