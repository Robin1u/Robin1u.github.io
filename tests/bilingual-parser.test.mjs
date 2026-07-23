import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyParsedRecord,
  normalizeOptionalUrls,
  parseTaggedSource,
  prepareContentRecord,
  preparePreviewRecord,
  validateManualOrSource,
} from '../public/admin/bilingual-parser.js';

const completeSource = `[ZH_TITLE]
中文标题

[EN_TITLE]
English title

[ZH_DESC]
中文摘要

[EN_DESC]
English summary

[ZH_BODY]
## 中文正文

[EN_BODY]
## English body`;

test('parses all supported bilingual sections', () => {
  assert.deepEqual(parseTaggedSource(completeSource), {
    title: '中文标题',
    titleEn: 'English title',
    description: '中文摘要',
    descriptionEn: 'English summary',
    body: '## 中文正文',
    bodyEn: '## English body',
  });
});

test('rejects missing, duplicate, and unknown tags', () => {
  assert.throws(() => parseTaggedSource('[ZH_TITLE]\n标题'), /缺少必填部分/);
  assert.throws(() => parseTaggedSource(`${completeSource}\n[ZH_TITLE]\n重复`), /标签重复/);
  assert.throws(() => parseTaggedSource(`${completeSource}\n[OTHER]\n内容`), /无法识别/);
});

test('applies parsed fields and removes the temporary source', () => {
  const result = applyParsedRecord(
    { bilingualSource: completeSource, title: '旧标题', category: 'web' },
    parseTaggedSource(completeSource),
  );
  assert.equal(result.title, '中文标题');
  assert.equal(result.category, 'web');
  assert.equal('bilingualSource' in result, false);
});

test('keeps manual entry behavior and removes empty URLs', () => {
  const result = prepareContentRecord({
    title: '手动标题',
    body: '手动正文',
    liveUrl: ' ',
    githubUrl: '',
  });
  assert.equal(result.parsedSource, false);
  assert.deepEqual(result.data, { title: '手动标题', body: '手动正文' });
});

test('requires either manual content or a complete source', () => {
  assert.throws(() => validateManualOrSource({ title: '', body: '' }), /请二选一/);
  assert.doesNotThrow(() => validateManualOrSource({ title: '标题', body: '正文' }));
});

test('normalizes only optional URL fields', () => {
  assert.deepEqual(
    normalizeOptionalUrls({ liveUrl: ' ', githubUrl: 'https://github.com/test', title: '标题' }),
    { githubUrl: 'https://github.com/test', title: '标题' },
  );
});

test('previews tagged source without mutating the source record', () => {
  const record = { bilingualSource: completeSource, title: '旧标题' };
  const preview = preparePreviewRecord(record);

  assert.equal(preview.parsedSource, true);
  assert.equal(preview.error, null);
  assert.equal(preview.data.title, '中文标题');
  assert.equal(preview.data.titleEn, 'English title');
  assert.equal(record.title, '旧标题');
  assert.equal(record.bilingualSource, completeSource);
});

test('keeps formal fields and reports incomplete preview source', () => {
  const preview = preparePreviewRecord({
    bilingualSource: '[ZH_TITLE]\n只有标题',
    title: '手动标题',
    body: '手动正文',
  });

  assert.equal(preview.parsedSource, false);
  assert.match(preview.error, /缺少必填部分/);
  assert.equal(preview.data.title, '手动标题');
});
