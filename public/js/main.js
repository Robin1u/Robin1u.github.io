/* =============================================
   MAIN.JS — Shared interaction logic
   ============================================= */

'use strict';

const LANGUAGE_STORAGE_KEY = 'site-language';

function getPreferredLanguage() {
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved === 'zh' || saved === 'en') return saved;
  } catch {
  }

  const current = document.documentElement.dataset.language;
  return current === 'en' ? 'en' : 'zh';
}

function updateDocumentMetadata(lang) {
  const body = document.body;
  if (!body) return;

  const title = lang === 'en' ? body.dataset.pageTitleEn : body.dataset.pageTitleZh;
  const description = lang === 'en' ? body.dataset.pageDescriptionEn : body.dataset.pageDescriptionZh;
  const metaDescription = document.getElementById('metaDescription');

  if (title) document.title = title;
  if (description && metaDescription) metaDescription.setAttribute('content', description);

  document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN';
}

function updateLocalizedText(lang) {
  document.querySelectorAll('[data-i18n-text]').forEach((el) => {
    const text = el.dataset[lang];
    if (text) el.textContent = text;
  });
}

function updateLocalizedAttributes(lang) {
  const attrMappings = [
    { attr: 'aria-label', datasetKey: lang === 'en' ? 'i18nAriaLabelEn' : 'i18nAriaLabelZh' },
    { attr: 'alt', datasetKey: lang === 'en' ? 'i18nAltEn' : 'i18nAltZh' },
    { attr: 'title', datasetKey: lang === 'en' ? 'i18nTitleEn' : 'i18nTitleZh' },
    { attr: 'placeholder', datasetKey: lang === 'en' ? 'i18nPlaceholderEn' : 'i18nPlaceholderZh' },
  ];

  attrMappings.forEach(({ attr, datasetKey }) => {
    document.querySelectorAll(`[data-${datasetKey.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)}]`).forEach((el) => {
      const value = el.dataset[datasetKey];
      if (value) el.setAttribute(attr, value);
    });
  });
}

function syncLanguageButtons(lang) {
  document.querySelectorAll('[data-set-language]').forEach((button) => {
    button.classList.toggle('active', button.getAttribute('data-set-language') === lang);
  });
}

function applyLanguage(lang) {
  const nextLanguage = lang === 'en' ? 'en' : 'zh';

  document.documentElement.dataset.language = nextLanguage;
  syncLanguageButtons(nextLanguage);
  updateLocalizedText(nextLanguage);
  updateLocalizedAttributes(nextLanguage);
  updateDocumentMetadata(nextLanguage);

  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
  } catch {
  }

  document.dispatchEvent(new CustomEvent('site:language-change', {
    detail: { language: nextLanguage },
  }));
}

function initLanguageToggle() {
  const initialLanguage = getPreferredLanguage();

  document.querySelectorAll('[data-set-language]').forEach((button) => {
    button.addEventListener('click', () => {
      applyLanguage(button.getAttribute('data-set-language'));
    });
  });

  applyLanguage(initialLanguage);
}

// ── Mobile sidebar ──────────────────────────────
function initMobileSidebar() {
  const menuBtn = document.getElementById('menuBtn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');

  if (!menuBtn || !sidebar || !overlay) return;

  function openMenu() {
    sidebar.classList.add('open');
    overlay.classList.add('open');
    menuBtn.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
    menuBtn.classList.remove('open');
    document.body.style.overflow = '';
  }

  menuBtn.addEventListener('click', () => {
    sidebar.classList.contains('open') ? closeMenu() : openMenu();
  });

  overlay.addEventListener('click', closeMenu);

  // Close on nav link click (mobile)
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', closeMenu);
  });
}

// ── Scroll progress bar ──────────────────────────
function initScrollProgress() {
  const bar = document.getElementById('scrollProgress');
  if (!bar) return;

  function update() {
    const scrolled = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const pct = max > 0 ? scrolled / max : 0;
    bar.style.transform = `scaleX(${pct})`;
  }

  window.addEventListener('scroll', update, { passive: true });
  update();
}

// ── Skill bars animation ─────────────────────────
function initSkillBars() {
  const fills = document.querySelectorAll('.skill-fill[data-pct]');
  if (!fills.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const pct = el.getAttribute('data-pct');
        el.style.width = pct + '%';
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.2 });

  fills.forEach(el => observer.observe(el));
}

// ── Counter animation ────────────────────────────
function initCounters() {
  const counters = document.querySelectorAll('[data-count]');
  if (!counters.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.getAttribute('data-count'), 10);
      const suffix = el.getAttribute('data-suffix') || '';
      const duration = 1200;
      let start = null;

      function step(timestamp) {
        if (!start) start = timestamp;
        const progress = Math.min((timestamp - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(eased * target) + suffix;
        if (progress < 1) requestAnimationFrame(step);
      }

      requestAnimationFrame(step);
      observer.unobserve(el);
    });
  }, { threshold: 0.5 });

  counters.forEach(el => observer.observe(el));
}

// ── Tab switching ────────────────────────────────
function initTabs() {
  document.querySelectorAll('.tab-nav').forEach(nav => {
    const btns = nav.querySelectorAll('.tab-btn');
    const contents = nav.closest('[data-tabs]')
      ? nav.closest('[data-tabs]').querySelectorAll('.tab-content')
      : document.querySelectorAll('.tab-content');

    btns.forEach((btn, i) => {
      btn.addEventListener('click', () => {
        btns.forEach(b => b.classList.remove('active'));
        contents.forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        if (contents[i]) contents[i].classList.add('active');
      });
    });
  });
}

// ── Portfolio filter ─────────────────────────────
function initPortfolioFilter() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  const cards = document.querySelectorAll('.portfolio-card[data-category]');

  if (!filterBtns.length) return;

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const cat = btn.getAttribute('data-filter');
      cards.forEach(card => {
        const match = cat === 'all' || card.getAttribute('data-category') === cat;
        card.style.display = match ? '' : 'none';
        if (match) {
          card.style.animation = 'none';
          card.offsetHeight; // reflow
          card.style.animation = '';
        }
      });
    });
  });
}

// ── Channel preview toggle ────────────────────────
function initChannelPreviews() {
  document.querySelectorAll('.channel-preview-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const frame = btn.closest('.channel-card').querySelector('.channel-preview-frame');
      if (!frame) return;
      const isOpen = frame.classList.contains('open');
      frame.classList.toggle('open', !isOpen);
      btn.classList.toggle('open', !isOpen);
      btn.querySelector('.toggle-label').textContent = isOpen ? '预览频道' : '隐藏预览';
    });
  });
}

// ── Open preview in iframe ────────────────────────
function initPreviewButtons() {
  document.querySelectorAll('.preview-open-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const url = btn.getAttribute('data-url');
      const wrap = btn.closest('.preview-iframe-wrap');
      if (!url || !wrap) return;

      // Replace overlay with iframe
      const iframe = document.createElement('iframe');
      iframe.src = url;
      iframe.title = 'Channel Preview';
      iframe.loading = 'lazy';
      iframe.sandbox = 'allow-scripts allow-same-origin allow-popups allow-forms';

      const overlay = wrap.querySelector('.preview-iframe-overlay');
      if (overlay) overlay.remove();
      wrap.appendChild(iframe);
    });
  });
}

// ── Contact form ──────────────────────────────────
function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = form.querySelector('.form-submit');
    const success = document.getElementById('formSuccess');

    btn.textContent = '发送中…';
    btn.disabled = true;

    setTimeout(() => {
      btn.textContent = '发送留言';
      btn.disabled = false;
      form.reset();
      if (success) {
        success.classList.add('visible');
        setTimeout(() => success.classList.remove('visible'), 5000);
      }
    }, 1500);
  });
}

// ── Typing animation ──────────────────────────────
function initTypingAnimation() {
  const el = document.getElementById('typingText');
  if (!el) return;

  let wordIdx = 0;
  let charIdx = 0;
  let deleting = false;
  let timerId;

  function readWords(lang) {
    const raw = lang === 'en' ? el.dataset.wordsEn : el.dataset.wordsZh;
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return [];
    }
  }

  function getWords() {
    const lang = getPreferredLanguage();
    const words = readWords(lang);
    return words.length > 0 ? words : [''];
  }

  function schedule(delay) {
    clearTimeout(timerId);
    timerId = window.setTimeout(tick, delay);
  }

  function resetTyping() {
    wordIdx = 0;
    charIdx = 0;
    deleting = false;
    el.textContent = '';
    schedule(120);
  }

  function tick() {
    const words = getWords();
    const word = words[wordIdx % words.length] ?? '';

    if (!word) {
      el.textContent = '';
      return;
    }

    if (!deleting) {
      el.textContent = word.slice(0, ++charIdx);
      if (charIdx === word.length) {
        deleting = true;
        schedule(1800);
        return;
      }
    } else {
      el.textContent = word.slice(0, --charIdx);
      if (charIdx === 0) {
        deleting = false;
        wordIdx = (wordIdx + 1) % words.length;
      }
    }

    schedule(deleting ? 60 : 110);
  }

  document.addEventListener('site:language-change', resetTyping);
  resetTyping();
}

// ── Active nav highlight ──────────────────────────
function setActiveNav(page) {
  document.querySelectorAll('.nav-link[data-page]').forEach(link => {
    link.classList.toggle('active', link.getAttribute('data-page') === page);
  });
}

// ── Fade-in on scroll ─────────────────────────────
function initScrollReveal() {
  const items = document.querySelectorAll('.reveal');
  if (!items.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  items.forEach(el => observer.observe(el));
}

// ── INIT ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initLanguageToggle();
  initMobileSidebar();
  initScrollProgress();
  initSkillBars();
  initCounters();
  initTabs();
  initPortfolioFilter();
  initChannelPreviews();
  initPreviewButtons();
  initContactForm();
  initTypingAnimation();
  initScrollReveal();
});
