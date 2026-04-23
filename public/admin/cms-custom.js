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
  const DOM_SYNC_DEBOUNCE_MS = 160;
  const FIELD_LABELS = {
    title: ['标题 (Title)'],
    titleEn: ['英文标题 (English Title)'],
    description: ['描述 (Description)', '摘要 (Description)'],
    descriptionEn: ['英文描述 (English Description)', '英文摘要 (English Description)'],
    body: ['中文正文 (Chinese Body)'],
    bodyEn: ['英文正文（支持 Markdown）'],
  };

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

  function normalizeText(value) {
    return String(value ?? '').replace(/\s+/g, ' ').trim();
  }

  function setControlValue(control, value) {
    if (!control) return;

    if (control.matches('input, textarea')) {
      const prototype = control.tagName === 'TEXTAREA'
        ? window.HTMLTextAreaElement?.prototype
        : window.HTMLInputElement?.prototype;
      const setter = prototype
        ? Object.getOwnPropertyDescriptor(prototype, 'value')?.set
        : null;

      if (setter) {
        setter.call(control, value);
      } else {
        control.value = value;
      }

      control.dispatchEvent(new Event('input', { bubbles: true }));
      control.dispatchEvent(new Event('change', { bubbles: true }));
      control.dispatchEvent(new Event('blur', { bubbles: true }));
      return;
    }

    if (control.isContentEditable) {
      control.textContent = value;
      control.dispatchEvent(new InputEvent('input', { bubbles: true, data: value, inputType: 'insertText' }));
      control.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function findFieldLabelElement(labelText) {
    const target = normalizeText(labelText);
    const candidates = [...document.querySelectorAll('label, legend, span, div, p, h6')];

    return candidates.find((element) => {
      if (element.closest('.nc-previewPane')) return false;
      return normalizeText(element.textContent).startsWith(target);
    });
  }

  function findFieldControlByLabels(labels) {
    for (const labelText of labels) {
      const labelElement = findFieldLabelElement(labelText);
      if (!labelElement) continue;

      let container = labelElement;
      while (container && container !== document.body) {
        const control = container.querySelector(
          'textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), [contenteditable="true"]',
        );
        if (control) return control;
        container = container.parentElement;
      }
    }

    return null;
  }

  function fillParsedFieldsIntoForm(parsed) {
    const fieldNames = ['title', 'titleEn', 'description', 'descriptionEn', 'body', 'bodyEn'];

    fieldNames.forEach((fieldName) => {
      const control = findFieldControlByLabels(FIELD_LABELS[fieldName] ?? []);
      if (!control) return;
      setControlValue(control, parsed[fieldName] ?? '');
    });
  }

  function getSourceControl() {
    const labelElement = findFieldLabelElement('双语原稿自动拆分（可选）');
    if (!labelElement) return null;

    let container = labelElement;
    while (container && container !== document.body) {
      const control = container.querySelector('textarea:not([disabled]), input:not([disabled])');
      if (control) return control;
      container = container.parentElement;
    }

    return null;
  }

  function syncSourceControlIntoFields(sourceControl) {
    if (!sourceControl) return;

    const rawSource = String(sourceControl.value ?? '').trim();
    if (!rawSource) return;

    let parsed;
    try {
      parsed = parseTaggedSource(rawSource);
    } catch {
      return;
    }

    fillParsedFieldsIntoForm(parsed);
    setControlValue(sourceControl, '');
  }

  function bindSourceFieldAutoFill() {
    const sourceControl = getSourceControl();
    if (!sourceControl || sourceControl.dataset.bilingualAutofillBound === 'true') return;

    sourceControl.dataset.bilingualAutofillBound = 'true';

    let timer = null;
    const scheduleSync = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => syncSourceControlIntoFields(sourceControl), DOM_SYNC_DEBOUNCE_MS);
    };

    sourceControl.addEventListener('paste', scheduleSync);
    sourceControl.addEventListener('change', scheduleSync);
    sourceControl.addEventListener('blur', scheduleSync);
  }

  function watchEditorDom() {
    const observer = new MutationObserver(() => {
      bindSourceFieldAutoFill();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    bindSourceFieldAutoFill();
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
        return entry.set('data', applyParsedFields(data, parsed));
      },
    });
  }

  function waitForCMS() {
    if (window.CMS?.registerEventListener) {
      registerHook(window.CMS);
      watchEditorDom();
      return;
    }

    window.setTimeout(waitForCMS, WAIT_MS);
  }

  waitForCMS();
})();
