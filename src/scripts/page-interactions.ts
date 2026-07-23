export function initCounters() {
  const counters = document.querySelectorAll<HTMLElement>('[data-count]');
  if (counters.length === 0) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const element = entry.target as HTMLElement;
      const target = Number.parseInt(element.dataset.count ?? '0', 10);
      const suffix = element.dataset.suffix ?? '';
      let startedAt: number | undefined;

      const step = (timestamp: number) => {
        startedAt ??= timestamp;
        const progress = Math.min((timestamp - startedAt) / 1200, 1);
        const eased = 1 - (1 - progress) ** 3;
        element.textContent = `${Math.round(eased * target)}${suffix}`;
        if (progress < 1) requestAnimationFrame(step);
      };

      requestAnimationFrame(step);
      observer.unobserve(element);
    });
  }, { threshold: 0.5 });

  counters.forEach((counter) => observer.observe(counter));
}

export function initPortfolioFilter() {
  const buttons = document.querySelectorAll<HTMLButtonElement>('.filter-btn');
  const cards = document.querySelectorAll<HTMLElement>('.portfolio-card[data-category]');
  if (buttons.length === 0) return;

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      buttons.forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      const category = button.dataset.filter;

      cards.forEach((card) => {
        const matches = category === 'all' || card.dataset.category === category;
        card.hidden = !matches;
        if (matches) {
          card.style.animation = 'none';
          void card.offsetHeight;
          card.style.animation = '';
        }
      });
    });
  });
}
