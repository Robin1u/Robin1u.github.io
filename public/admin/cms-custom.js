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
      return;
    }

    window.setTimeout(waitForCMS, WAIT_MS);
  }

  waitForCMS();
})();
