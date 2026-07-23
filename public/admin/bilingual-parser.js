export const SOURCE_FIELD = 'bilingualSource';
export const CONTENT_FIELDS = [
  'title',
  'titleEn',
  'description',
  'descriptionEn',
  'body',
  'bodyEn',
];

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

export function normalizeLineEndings(value) {
  return String(value ?? '').replace(/\r\n?/g, '\n');
}

export function parseTaggedSource(rawSource) {
  const source = normalizeLineEndings(rawSource).trim();
  if (!source) throw new Error('双语原稿为空。');

  const matches = [...source.matchAll(/^\[(?<tag>[A-Z_]+)\]\s*$/gm)];
  if (matches.length === 0) {
    throw new Error('未找到标签。请使用 [ZH_TITLE] / [EN_TITLE] / [ZH_BODY] / [EN_BODY] 这类标签。');
  }

  const parsed = {};
  matches.forEach((match, index) => {
    const rawTag = String(match.groups?.tag ?? '').trim().toUpperCase();
    const field = SECTION_ALIASES[rawTag];
    if (!field) throw new Error(`无法识别的标签: [${rawTag}]`);
    if (Object.hasOwn(parsed, field)) throw new Error(`标签重复: [${rawTag}]`);

    const start = match.index + match[0].length;
    const end = index + 1 < matches.length ? matches[index + 1].index : source.length;
    parsed[field] = source.slice(start, end).trim();
  });

  const missing = REQUIRED_FIELDS.filter((field) => !parsed[field]);
  if (missing.length > 0) {
    const labels = {
      title: '[ZH_TITLE]',
      titleEn: '[EN_TITLE]',
      body: '[ZH_BODY]',
      bodyEn: '[EN_BODY]',
    };
    throw new Error(`双语原稿缺少必填部分：${missing.map((field) => labels[field]).join(', ')}`);
  }

  return parsed;
}

export function normalizeOptionalUrls(record) {
  const normalized = { ...record };
  ['liveUrl', 'githubUrl'].forEach((field) => {
    if (typeof normalized[field] === 'string' && !normalized[field].trim()) {
      delete normalized[field];
    }
  });
  return normalized;
}

export function validateManualOrSource(record) {
  if (String(record[SOURCE_FIELD] ?? '').trim()) return;
  if (String(record.title ?? '').trim() && String(record.body ?? '').trim()) return;

  throw new Error([
    '请二选一完成内容录入：',
    '1. 直接填写标题 + 中文正文；或',
    '2. 在“双语原稿自动拆分”中粘贴带标签的完整原稿。',
  ].join('\n'));
}

export function applyParsedRecord(record, parsed) {
  const next = { ...record };
  CONTENT_FIELDS.forEach((field) => {
    const value = parsed[field];
    if (typeof value === 'string' && value.trim()) {
      next[field] = value.trim();
    } else if (field === 'description' || field === 'descriptionEn') {
      delete next[field];
    }
  });
  delete next[SOURCE_FIELD];
  return next;
}

export function prepareContentRecord(record) {
  const normalized = normalizeOptionalUrls(record);
  const rawSource = String(normalized[SOURCE_FIELD] ?? '').trim();
  if (!rawSource) {
    validateManualOrSource(normalized);
    return { data: normalized, parsedSource: false };
  }

  return {
    data: applyParsedRecord(normalized, parseTaggedSource(rawSource)),
    parsedSource: true,
  };
}

export function preparePreviewRecord(record) {
  const rawSource = String(record?.[SOURCE_FIELD] ?? '').trim();
  if (!rawSource) {
    return { data: { ...record }, parsedSource: false, error: null };
  }

  try {
    return {
      data: applyParsedRecord(record, parseTaggedSource(rawSource)),
      parsedSource: true,
      error: null,
    };
  } catch (error) {
    return {
      data: { ...record },
      parsedSource: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
