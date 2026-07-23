export function initMobileSidebar() {
  const menuButton = document.querySelector<HTMLButtonElement>('#menuBtn');
  const sidebar = document.querySelector<HTMLElement>('#sidebar');
  const overlay = document.querySelector<HTMLElement>('#overlay');
  if (!menuButton || !sidebar || !overlay) return;

  const close = () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
    menuButton.classList.remove('open');
    document.body.style.overflow = '';
  };

  const open = () => {
    sidebar.classList.add('open');
    overlay.classList.add('open');
    menuButton.classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  menuButton.addEventListener('click', () => {
    sidebar.classList.contains('open') ? close() : open();
  });
  overlay.addEventListener('click', close);
  document.querySelectorAll('.nav-link').forEach((link) => link.addEventListener('click', close));
}

export function initScrollProgress() {
  const progress = document.querySelector<HTMLElement>('#scrollProgress');
  if (!progress) return;

  const update = () => {
    const maximum = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = `scaleX(${maximum > 0 ? window.scrollY / maximum : 0})`;
  };

  window.addEventListener('scroll', update, { passive: true });
  update();
}
