import { CONTENT_FIELDS, SOURCE_FIELD, prepareContentRecord } from './bilingual-parser.js';

const SUPPORTED_COLLECTIONS = new Set(['thoughts', 'projects']);
const TOAST_ID = 'bilingual-autofill-toast';
let shouldShowPostSaveToast = false;

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

function registerHooks(CMS) {
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
