import { initLanguageToggle } from './language';
import { initMobileSidebar, initScrollProgress } from './navigation';
import { initCounters, initPortfolioFilter } from './page-interactions';
import { initTypingAnimation } from './typing';

function initializeSite() {
  initLanguageToggle();
  initMobileSidebar();
  initScrollProgress();
  initCounters();
  initPortfolioFilter();
  initTypingAnimation();
}

document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', initializeSite, { once: true })
  : initializeSite();
