import assert from 'node:assert/strict';
import { mkdir, open, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import {
  ATTACHMENT_MAX_BYTES,
  getAttachmentExtension,
  getAttachmentKind,
  getAttachmentPreviewHref,
  validateAttachmentFile,
} from '../src/lib/attachments.ts';
import { renderSafeMarkdownToHtml } from '../src/lib/markdown.ts';

test('attachment types and preview URLs are deterministic', () => {
  assert.equal(getAttachmentKind('/attachments/example/file.md'), 'markdown');
  assert.equal(getAttachmentKind('/attachments/example/file.PDF'), 'pdf');
  assert.equal(getAttachmentKind('/attachments/example/file.jpeg'), 'image');
  assert.equal(getAttachmentExtension('/attachments/example/file.WEBP'), 'webp');
  assert.equal(
    getAttachmentPreviewHref('thoughts', '中文 article', 1),
    '/attachments/thoughts/%E4%B8%AD%E6%96%87%20article/2',
  );
  assert.throws(() => getAttachmentKind('/attachments/example/file.docx'), /Unsupported/);
});

test('attachment validation accepts existing files and rejects missing or oversized files', async () => {
  const testFolder = `.attachment-test-${randomUUID()}`;
  const publicFolder = path.join(process.cwd(), 'public', 'attachments', testFolder);
  const validPath = path.join(publicFolder, 'notes.md');
  const oversizedPath = path.join(publicFolder, 'oversized.pdf');

  await mkdir(publicFolder, { recursive: true });
  try {
    await writeFile(validPath, '# Notes');
    const valid = await validateAttachmentFile(`/attachments/${testFolder}/notes.md`);
    assert.equal(valid.kind, 'markdown');
    assert.equal(valid.size, 7);

    await assert.rejects(
      validateAttachmentFile(`/attachments/${testFolder}/missing.pdf`),
      /does not exist/,
    );
    await assert.rejects(
      validateAttachmentFile('/images/not-an-attachment.pdf'),
      /must be stored/,
    );

    const oversized = await open(oversizedPath, 'w');
    await oversized.truncate(ATTACHMENT_MAX_BYTES + 1);
    await oversized.close();
    await assert.rejects(
      validateAttachmentFile(`/attachments/${testFolder}/oversized.pdf`),
      /20 MB/,
    );
  } finally {
    await rm(publicFolder, { recursive: true, force: true });
  }
});

test('safe Markdown rendering keeps GFM content and removes dangerous HTML', async () => {
  const html = await renderSafeMarkdownToHtml(`
# Attachment

| A | B |
| - | - |
| 1 | 2 |

<script>alert('unsafe')</script>

[unsafe](javascript:alert('unsafe'))
`);

  assert.match(html, /<h1>Attachment<\/h1>/);
  assert.match(html, /<table>/);
  assert.doesNotMatch(html, /<script/);
  assert.doesNotMatch(html, /javascript:/);
});

test('Markdown attachment images require public or absolute URLs', async () => {
  await assert.rejects(
    renderSafeMarkdownToHtml('![relative](./local-image.png)'),
    /Unsupported relative image path/,
  );
  await assert.doesNotReject(
    renderSafeMarkdownToHtml('![uploaded](/attachments/example/image.png)'),
  );
  await assert.doesNotReject(
    renderSafeMarkdownToHtml('![remote](https://example.com/image.png)'),
  );
});
