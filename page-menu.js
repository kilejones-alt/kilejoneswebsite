(() => {
  const button = document.querySelector('#page-menu-toggle');
  const drawer = document.querySelector('#page-drawer');
  if (!button || !drawer) return;
  const setOpen = open => {
    button.setAttribute('aria-expanded', String(open));
    drawer.classList.toggle('is-open', open);
    drawer.inert = !open;
  };
  button.addEventListener('click', () => setOpen(button.getAttribute('aria-expanded') !== 'true'));
  button.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') setOpen(true); });
  document.addEventListener('click', e => { if (!button.contains(e.target) && !drawer.contains(e.target)) setOpen(false); });
  drawer.addEventListener('click', e => { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });
})();
