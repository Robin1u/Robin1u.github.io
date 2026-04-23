'use strict';

(function bootstrapBilingualAutoSplit() {
  const SUPPORTED_COLLECTIONS = new Set(['thoughts', 'projects']);
  const SECTION_ALIASES = {
    ZH_TITLE: 'title',
    TITLE_ZH: 'title',
    EN_TITLE: 'titleEn',
    TITLE_EN: 'titleEn',
    ZH_DESC: 'description',
    ZH_DESCRIPTION: 'description',
    DESCRIPTION_ZH: 'description',
    EN_DESC: 'descriptionEn',
    EN_DESCRIPTION: 'descriptionEn',
    DESCRIPTION_EN: 'descriptionEn',
    ZH_BODY: 'body',
    BODY_ZH: 'body',
    EN_BODY: 'bodyEn',
    BODY_EN: 'bodyEn',
  };
  const REQUIRED_FIELDS = ['title', 'titleEn', 'body', 'bodyEn'];
  const SOURCE_FIELD = 'bilingualSource';
  const WAIT_MS = 120;
  const TOAST_ID = 'bilingual-autofill-toast';
  let shouldShowPostSaveToast = false;

  function normalizeLineEndings(value) {
    return String(value ?? '').replace(/\r\n?/g, '\n');
  }

  function canonicalTag(rawTag) {
    return SECTION_ALIASES[String(rawTag ?? '').trim().toUpperCase()];
  }

  function parseTaggedSource(rawSource) {
    const source = normalizeLineEndings(rawSource).trim();
    if (!source) return null;

    const matches = [...source.matchAll(/^\[(?<tag>[A-Z_]+)\]\s*$/gm)];
    if (matches.length === 0) {
      throw new Error(
        [
          '双语原稿无法识别。',
          '请使用 [ZH_TITLE] / [EN_TITLE] / [ZH_BODY] / [EN_BODY] 这类标签进行分段。',
        ].join('\n'),
      );
    }

    const parsed = {};

    matches.forEach((match, index) => {
      const rawTag = match.groups?.tag ?? '';
      const mappedField = canonicalTag(rawTag);

      if (!mappedField) {
        throw new Error(`发现无法识别的标签 [${rawTag}]。请检查标签拼写。`);
      }

      if (Object.prototype.hasOwnProperty.call(parsed, mappedField)) {
        throw new Error(`标签 [${rawTag}] 重复出现。每个标签只能写一次。`);
      }

      const start = match.index + match[0].length;
      const end = index + 1 < matches.length ? matches[index + 1].index : source.length;
      const value = source.slice(start, end).trim();

      parsed[mappedField] = value;
    });

    const missing = REQUIRED_FIELDS.filter((field) => !parsed[field]);
    if (missing.length > 0) {
      const labelMap = {
        title: '[ZH_TITLE]',
        titleEn: '[EN_TITLE]',
        body: '[ZH_BODY]',
        bodyEn: '[EN_BODY]',
      };

      throw new Error(`双语原稿缺少必填部分：${missing.map((field) => labelMap[field]).join(', ')}`);
    }

    return parsed;
  }

  function applyParsedFields(data, parsed) {
    let nextData = data;
    const fieldNames = ['title', 'titleEn', 'description', 'descriptionEn', 'body', 'bodyEn'];

    fieldNames.forEach((field) => {
      const value = parsed[field];
      if (typeof value === 'string' && value.trim()) {
        nextData = nextData.set(field, value.trim());
      } else if (field === 'description' || field === 'descriptionEn') {
        nextData = nextData.delete(field);
      }
    });

    return nextData.delete(SOURCE_FIELD);
  }

  function ensureToastElement() {
    let toast = document.getElementById(TOAST_ID);
    if (toast) return toast;

    toast = document.createElement('div');
    toast.id = TOAST_ID;
    toast.setAttribute('aria-live', 'polite');
    toast.style.position = 'fixed';
    toast.style.top = '20px';
    toast.style.right = '20px';
    toast.style.zIndex = '9999';
    toast.style.padding = '10px 14px';
    toast.style.borderRadius = '12px';
    toast.style.background = 'rgba(18, 18, 18, 0.92)';
    toast.style.color = '#f3e0a2';
    toast.style.fontSize = '13px';
    toast.style.lineHeight = '1.4';
    toast.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.2)';
    toast.style.border = '1px solid rgba(243, 224, 162, 0.16)';
    toast.style.backdropFilter = 'blur(12px)';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-6px)';
    toast.style.transition = 'opacity 180ms ease, transform 180ms ease';
    toast.style.pointerEvents = 'none';

    document.body.appendChild(toast);
    return toast;
  }

  function showToast(message) {
    const toast = ensureToastElement();
    toast.textContent = message;
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';

    window.clearTimeout(showToast._timer);
    showToast._timer = window.setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-6px)';
    }, 2200);
  }

  function validateManualOrSource(data) {
    const rawSource = String(data.get(SOURCE_FIELD) ?? '').trim();
    if (rawSource) return;

    const title = String(data.get('title') ?? '').trim();
    const body = String(data.get('body') ?? '').trim();

    if (!title || !body) {
      throw new Error(
        [
          '请二选一完成内容录入：',
          '1. 直接填写标题 + 中文正文；或',
          '2. 在“双语原稿自动拆分”中粘贴带标签的完整原稿。',
        ].join('\n'),
      );
    }
  }

  function registerHook(CMS) {
    CMS.registerEventListener({
      name: 'preSave',
      handler: ({ entry }) => {
        const collection = entry.get('collection');
        if (!SUPPORTED_COLLECTIONS.has(collection)) return entry;

        const data = entry.get('data');
        const rawSource = data.get(SOURCE_FIELD);
        if (!String(rawSource ?? '').trim()) {
          validateManualOrSource(data);
          return entry;
        }

        const parsed = parseTaggedSource(rawSource);
        shouldShowPostSaveToast = true;
        return entry.set('data', applyParsedFields(data, parsed));
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
      registerHook(window.CMS);
      return;
    }

    window.setTimeout(waitForCMS, WAIT_MS);
  }

  waitForCMS();
})();
