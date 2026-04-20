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
  const SOURCE_LABEL = '双语原稿自动拆分（可选）';
  const WAIT_MS = 120;
  const LIVE_PREVIEW_STYLE_ID = 'cms-bilingual-live-preview-style';
  const LIVE_PREVIEW_CARD_CLASS = 'cms-bilingual-live-preview';
  const LIVE_PREVIEW_INLINE_ATTR = 'data-live-preview-inline';
  let activeTextarea = null;
  let isApplyingLiveSync = false;
  const FIELD_LABELS = {
    title: ['标题 (Title)', '标题'],
    titleEn: ['英文标题 (English Title)', '英文标题'],
    description: ['摘要 (Description)', '描述 (Description)', '摘要', '描述'],
    descriptionEn: ['英文摘要 (English Description)', '英文描述 (English Description)', '英文摘要', '英文描述'],
    body: ['中文正文 (Chinese Body)', '中文正文', '正文内容 (Body)'],
    bodyEn: ['英文正文（支持 Markdown）', '英文正文 (English Body)', '英文正文'],
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

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function ensureLivePreviewStyles() {
    if (document.getElementById(LIVE_PREVIEW_STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = LIVE_PREVIEW_STYLE_ID;
    style.textContent = `
      .${LIVE_PREVIEW_CARD_CLASS} {
        margin-top: 16px;
        padding: 16px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.03);
        color: rgba(255, 255, 255, 0.92);
      }

      .${LIVE_PREVIEW_CARD_CLASS}__title {
        font-size: 14px;
        font-weight: 700;
        margin-bottom: 12px;
      }

      .${LIVE_PREVIEW_CARD_CLASS}__hint {
        font-size: 12px;
        line-height: 1.6;
        color: rgba(255, 255, 255, 0.6);
        margin-bottom: 14px;
      }

      .${LIVE_PREVIEW_CARD_CLASS}__error {
        font-size: 13px;
        line-height: 1.7;
        color: #ffb4b4;
        white-space: pre-wrap;
      }

      .${LIVE_PREVIEW_CARD_CLASS}__grid {
        display: grid;
        gap: 12px;
      }

      .${LIVE_PREVIEW_CARD_CLASS}__section {
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 10px;
        overflow: hidden;
      }

      .${LIVE_PREVIEW_CARD_CLASS}__label {
        display: block;
        padding: 10px 12px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: rgba(255, 255, 255, 0.72);
        background: rgba(255, 255, 255, 0.04);
      }

      .${LIVE_PREVIEW_CARD_CLASS}__body {
        margin: 0;
        padding: 12px;
        font-size: 13px;
        line-height: 1.75;
        white-space: pre-wrap;
        word-break: break-word;
      }

      .${LIVE_PREVIEW_CARD_CLASS}[${LIVE_PREVIEW_INLINE_ATTR}="true"] {
        margin-bottom: 20px;
      }
    `;

    document.head.appendChild(style);
  }

  function renderLivePreview(parsed, errorMessage) {
    if (errorMessage) {
      return `
        <div class="${LIVE_PREVIEW_CARD_CLASS}__title">实时拆分预览</div>
        <div class="${LIVE_PREVIEW_CARD_CLASS}__hint">保存前这里会先告诉你拆分结果；如果标签不完整，也会在这里直接报错。</div>
        <div class="${LIVE_PREVIEW_CARD_CLASS}__error">${escapeHtml(errorMessage)}</div>
      `;
    }

    if (!parsed) {
      return `
        <div class="${LIVE_PREVIEW_CARD_CLASS}__title">实时拆分预览</div>
        <div class="${LIVE_PREVIEW_CARD_CLASS}__hint">在左侧粘贴双语原稿后，这里会即时显示已拆开的中文标题、英文标题、摘要和正文。</div>
      `;
    }

    const sections = [
      ['中文标题', parsed.title],
      ['英文标题', parsed.titleEn],
      ['中文摘要', parsed.description],
      ['英文摘要', parsed.descriptionEn],
      ['中文正文', parsed.body],
      ['英文正文', parsed.bodyEn],
    ];

    const content = sections
      .filter(([, value]) => String(value ?? '').trim())
      .map(([label, value]) => `
        <section class="${LIVE_PREVIEW_CARD_CLASS}__section">
          <span class="${LIVE_PREVIEW_CARD_CLASS}__label">${escapeHtml(label)}</span>
          <pre class="${LIVE_PREVIEW_CARD_CLASS}__body">${escapeHtml(value)}</pre>
        </section>
      `)
      .join('');

    return `
      <div class="${LIVE_PREVIEW_CARD_CLASS}__title">实时拆分预览</div>
      <div class="${LIVE_PREVIEW_CARD_CLASS}__hint">这是保存前的即时拆分结果。真正写入仓库仍然发生在点击保存时。</div>
      <div class="${LIVE_PREVIEW_CARD_CLASS}__grid">${content}</div>
    `;
  }

  function getOrCreatePreviewCard(host, attrName, attrValue) {
    let card = host.querySelector(`[${attrName}="${attrValue}"]`);

    if (!card) {
      card = document.createElement('section');
      card.className = LIVE_PREVIEW_CARD_CLASS;
      card.setAttribute(attrName, attrValue);
      host.appendChild(card);
    }

    return card;
  }

  function candidateTextForElement(element) {
    return normalizeLineEndings(element?.textContent ?? '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function findSourceTextarea() {
    const textareas = [...document.querySelectorAll('textarea')];
    for (const textarea of textareas) {
      let current = textarea;
      while (current && current !== document.body) {
        if (candidateTextForElement(current).includes(SOURCE_LABEL)) {
          return textarea;
        }
        current = current.parentElement;
      }
    }
    return null;
  }

  function findEditPreviewHost(textarea) {
    let current = textarea?.parentElement ?? null;
    while (current && current !== document.body) {
      const text = candidateTextForElement(current);
      if (text.includes(SOURCE_LABEL)) {
        return current;
      }
      current = current.parentElement;
    }
    return textarea?.parentElement ?? null;
  }

  function textIncludesLabel(text, labels) {
    return labels.some((label) => text.includes(label));
  }

  function findFieldControl(fieldName) {
    const labels = FIELD_LABELS[fieldName] ?? [];
    if (labels.length === 0) return null;

    const controls = [...document.querySelectorAll('input, textarea')];
    for (const control of controls) {
      if (control === activeTextarea) continue;

      let current = control.parentElement;
      while (current && current !== document.body) {
        const text = candidateTextForElement(current);
        if (textIncludesLabel(text, labels) && !text.includes(SOURCE_LABEL)) {
          return control;
        }
        current = current.parentElement;
      }
    }

    return null;
  }

  function setControlValue(control, value) {
    if (!control) return;

    const nextValue = String(value ?? '');
    if (control.value === nextValue) return;

    control.value = nextValue;
    control.dispatchEvent(new Event('input', { bubbles: true }));
    control.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function syncParsedFieldsToEditor(parsed) {
    if (!parsed || isApplyingLiveSync) return;

    isApplyingLiveSync = true;

    try {
      Object.keys(FIELD_LABELS).forEach((fieldName) => {
        const control = findFieldControl(fieldName);
        const value = parsed[fieldName];

        if (typeof value === 'string' && value.trim()) {
          setControlValue(control, value.trim());
        } else if (fieldName === 'description' || fieldName === 'descriptionEn') {
          setControlValue(control, '');
        }
      });
    } finally {
      isApplyingLiveSync = false;
    }
  }

  function findRightPreviewHost() {
    const nodes = [...document.querySelectorAll('h1, h2, h3, h4, span, div')];
    const previewTitle = nodes.find((node) => candidateTextForElement(node) === 'Preview');
    if (!previewTitle) return null;

    let current = previewTitle.parentElement;
    while (current && current !== document.body) {
      if (current.querySelectorAll('*').length > 3) {
        return current;
      }
      current = current.parentElement;
    }
    return previewTitle.parentElement;
  }

  function updateLivePreview(rawSource) {
    ensureLivePreviewStyles();

    let parsed = null;
    let errorMessage = '';

    if (String(rawSource ?? '').trim()) {
      try {
        parsed = parseTaggedSource(rawSource);
        syncParsedFieldsToEditor(parsed);
      } catch (error) {
        errorMessage = error instanceof Error ? error.message : String(error);
      }
    }

    const textarea = findSourceTextarea();
    if (!textarea) return;

    const html = renderLivePreview(parsed, errorMessage);

    const inlineHost = textarea.parentElement;
    if (inlineHost) {
      const inlineCard = getOrCreatePreviewCard(inlineHost, LIVE_PREVIEW_INLINE_ATTR, 'true');
      inlineCard.innerHTML = html;
    }
  }

  function attachLivePreview() {
    const textarea = findSourceTextarea();
    if (!textarea || textarea === activeTextarea) {
      if (textarea) updateLivePreview(textarea.value);
      return;
    }

    activeTextarea = textarea;

    const sync = () => updateLivePreview(textarea.value);
    textarea.addEventListener('input', sync);
    textarea.addEventListener('change', sync);
    sync();
  }

  function initLivePreviewObserver() {
    const observer = new MutationObserver(() => {
      attachLivePreview();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    attachLivePreview();
  }

  function registerHook(CMS) {
    CMS.registerEventListener({
      name: 'preSave',
      handler: ({ entry }) => {
        const collection = entry.get('collection');
        if (!SUPPORTED_COLLECTIONS.has(collection)) return entry;

        const data = entry.get('data');
        const rawSource = data.get(SOURCE_FIELD);
        if (!String(rawSource ?? '').trim()) return entry;

        const parsed = parseTaggedSource(rawSource);
        const nextData = applyParsedFields(data, parsed);
        return entry.set('data', nextData);
      },
    });
  }

  function waitForCMS() {
    if (window.CMS?.registerEventListener) {
      registerHook(window.CMS);
      initLivePreviewObserver();
      return;
    }

    window.setTimeout(waitForCMS, WAIT_MS);
  }

  waitForCMS();
})();
