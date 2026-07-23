export type Language = 'zh' | 'en';

const LANGUAGE_STORAGE_KEY = 'site-language';

export function getPreferredLanguage(): Language {
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved === 'zh' || saved === 'en') return saved;
  } catch {
  }

  return document.documentElement.dataset.language === 'en' ? 'en' : 'zh';
}

function updateDocumentMetadata(language: Language) {
  const body = document.body;
  const title = language === 'en' ? body.dataset.pageTitleEn : body.dataset.pageTitleZh;
  const description = language === 'en'
    ? body.dataset.pageDescriptionEn
    : body.dataset.pageDescriptionZh;
  const metaDescription = document.querySelector<HTMLMetaElement>('#metaDescription');

  if (title) document.title = title;
  if (description) metaDescription?.setAttribute('content', description);
  document.documentElement.lang = language === 'en' ? 'en' : 'zh-CN';
}

function updateLocalizedText(language: Language) {
  document.querySelectorAll<HTMLElement>('[data-i18n-text]').forEach((element) => {
    const text = element.dataset[language];
    if (text) element.textContent = text;
  });
}

function updateLocalizedAttributes(language: Language) {
  const mappings = [
    ['aria-label', language === 'en' ? 'i18nAriaLabelEn' : 'i18nAriaLabelZh'],
    ['alt', language === 'en' ? 'i18nAltEn' : 'i18nAltZh'],
    ['title', language === 'en' ? 'i18nTitleEn' : 'i18nTitleZh'],
    ['placeholder', language === 'en' ? 'i18nPlaceholderEn' : 'i18nPlaceholderZh'],
  ] as const;

  mappings.forEach(([attribute, datasetKey]) => {
    const dataAttribute = datasetKey.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
    document.querySelectorAll<HTMLElement>(`[data-${dataAttribute}]`).forEach((element) => {
      const value = element.dataset[datasetKey];
      if (value) element.setAttribute(attribute, value);
    });
  });
}

export function applyLanguage(language: Language) {
  document.documentElement.dataset.language = language;
  document.querySelectorAll<HTMLElement>('[data-set-language]').forEach((button) => {
    button.classList.toggle('active', button.dataset.setLanguage === language);
  });
  updateLocalizedText(language);
  updateLocalizedAttributes(language);
  updateDocumentMetadata(language);

  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
  }

  document.dispatchEvent(new CustomEvent('site:language-change', {
    detail: { language },
  }));
}

export function initLanguageToggle() {
  document.querySelectorAll<HTMLElement>('[data-set-language]').forEach((button) => {
    button.addEventListener('click', () => {
      applyLanguage(button.dataset.setLanguage === 'en' ? 'en' : 'zh');
    });
  });

  applyLanguage(getPreferredLanguage());
}
