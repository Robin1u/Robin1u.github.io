import {
  CONTENT_FIELDS,
  SOURCE_FIELD,
  prepareContentRecord,
  preparePreviewRecord,
} from './bilingual-parser.js';

const SUPPORTED_COLLECTIONS = new Set(['thoughts', 'projects']);
const TOAST_ID = 'bilingual-autofill-toast';
let shouldShowPostSaveToast = false;
let registered = false;

function ensureToastElement() {
  const existing = document.getElementById(TOAST_ID);
  if (existing) return existing;

  const toast = document.createElement('div');
  toast.id = TOAST_ID;
  toast.setAttribute('aria-live', 'polite');
  Object.assign(toast.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    zIndex: '9999',
    padding: '10px 14px',
    borderRadius: '12px',
    background: 'rgba(18, 18, 18, 0.92)',
    color: '#f3e0a2',
    fontSize: '13px',
    lineHeight: '1.4',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
    border: '1px solid rgba(243, 224, 162, 0.16)',
    backdropFilter: 'blur(12px)',
    opacity: '0',
    transform: 'translateY(-6px)',
    transition: 'opacity 180ms ease, transform 180ms ease',
    pointerEvents: 'none',
  });
  document.body.appendChild(toast);
  return toast;
}

function showToast(message) {
  const toast = ensureToastElement();
  toast.textContent = message;
  toast.style.opacity = '1';
  toast.style.transform = 'translateY(0)';
  window.setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-6px)';
  }, 2200);
}

function textBlock(h, className, value) {
  if (!value) return null;
  return h('div', { className }, value);
}

function renderPreviewLanguage(h, widgetFor, record, language, parsedSource) {
  const isEnglish = language === 'en';
  const title = record[isEnglish ? 'titleEn' : 'title'];
  const description = record[isEnglish ? 'descriptionEn' : 'description'];
  const bodyField = isEnglish ? 'bodyEn' : 'body';
  const body = record[bodyField];

  if (!title && !description && !body) return null;

  return h(
    'section',
    { className: 'cms-article-preview-language', lang: isEnglish ? 'en' : 'zh-CN' },
    h('span', { className: 'cms-article-preview-language-label' }, isEnglish ? 'EN' : '中文'),
    title && h('h1', {}, title),
    description && h('p', { className: 'cms-article-preview-description' }, description),
    parsedSource
      ? textBlock(h, 'cms-article-preview-body cms-article-preview-source-body', body)
      : h('div', { className: 'cms-article-preview-body' }, widgetFor(bodyField)),
  );
}

function registerPreviewTemplates(CMS) {
  const h = window.h;
  const createClass = window.createClass;
  if (typeof h !== 'function' || typeof createClass !== 'function') return;

  const ArticlePreview = createClass({
    render() {
      const { entry, widgetFor } = this.props;
      const record = entry.get('data')?.toJS?.() ?? {};
      const preview = preparePreviewRecord(record);

      return h(
        'article',
        { className: 'cms-article-preview' },
        preview.error &&
          h(
            'div',
            { className: 'cms-article-preview-error', role: 'alert' },
            `双语原稿暂时无法拆分：${preview.error}`,
          ),
        preview.parsedSource &&
          h(
            'div',
            { className: 'cms-article-preview-status' },
            '正在预览双语原稿；保存时会写入正式字段并清空原稿。',
          ),
        renderPreviewLanguage(h, widgetFor, preview.data, 'zh', preview.parsedSource),
        renderPreviewLanguage(h, widgetFor, preview.data, 'en', preview.parsedSource),
        !preview.error &&
          !preview.data.title &&
          !preview.data.titleEn &&
          h('p', { className: 'cms-article-preview-empty' }, '填写正式字段或粘贴双语原稿后，这里会显示文章预览。'),
      );
    },
  });

  SUPPORTED_COLLECTIONS.forEach((collection) => {
    CMS.registerPreviewTemplate(collection, ArticlePreview);
  });
  CMS.registerPreviewStyle('/admin/cms-preview.css');
}

function registerHooks(CMS) {
  if (registered) return;
  registered = true;
  registerPreviewTemplates(CMS);

  CMS.registerEventListener({
    name: 'preSave',
    handler: ({ entry }) => {
      const collection = entry.get('collection');
      if (!SUPPORTED_COLLECTIONS.has(collection)) return entry;

      const immutableData = entry.get('data');
      const plainData = immutableData.toJS();
      const result = prepareContentRecord(plainData);
      shouldShowPostSaveToast = result.parsedSource;

      let nextData = immutableData;
      [...CONTENT_FIELDS, SOURCE_FIELD, 'liveUrl', 'githubUrl'].forEach((field) => {
        if (Object.hasOwn(result.data, field)) {
          nextData = nextData.set(field, result.data[field]);
        } else {
          nextData = nextData.delete(field);
        }
      });
      return entry.set('data', nextData);
    },
  });

  CMS.registerEventListener({
    name: 'postSave',
    handler: () => {
      if (!shouldShowPostSaveToast) return;
      shouldShowPostSaveToast = false;
      showToast('已自动拆分并保存到正式字段');
    },
  });
}

function waitForCMS() {
  if (window.CMS?.registerEventListener) {
    registerHooks(window.CMS);
    return;
  }
  window.setTimeout(waitForCMS, 120);
}

waitForCMS();
