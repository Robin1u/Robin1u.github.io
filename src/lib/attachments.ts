import { stat } from 'node:fs/promises';
import path from 'node:path';

export const ATTACHMENT_MAX_BYTES = 20 * 1024 * 1024;
export const ATTACHMENT_EXTENSIONS = ['md', 'pdf', 'png', 'jpg', 'jpeg', 'webp'] as const;

export type AttachmentKind = 'markdown' | 'pdf' | 'image';
export type AttachmentSource = 'projects' | 'thoughts';

export interface ArticleAttachment {
  title: string;
  titleEn?: string;
  description?: string;
  descriptionEn?: string;
  file: string;
}

const extensionKinds: Record<(typeof ATTACHMENT_EXTENSIONS)[number], AttachmentKind> = {
  md: 'markdown',
  pdf: 'pdf',
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  webp: 'image',
};

export function getAttachmentExtension(file: string) {
  return path.extname(file).slice(1).toLowerCase();
}

export function getAttachmentKind(file: string): AttachmentKind {
  const extension = getAttachmentExtension(file);
  if (!ATTACHMENT_EXTENSIONS.includes(extension as (typeof ATTACHMENT_EXTENSIONS)[number])) {
    throw new Error(`Unsupported attachment format: ${file}`);
  }
  return extensionKinds[extension as (typeof ATTACHMENT_EXTENSIONS)[number]];
}

export function getAttachmentPreviewHref(
  source: AttachmentSource,
  entryId: string,
  index: number,
) {
  const encodedId = entryId.split('/').map(encodeURIComponent).join('/');
  return `/attachments/${source}/${encodedId}/${index + 1}`;
}

export async function validateAttachmentFile(file: string) {
  if (!file.startsWith('/attachments/')) {
    throw new Error(`Attachment must be stored under /attachments/: ${file}`);
  }

  const attachmentsRoot = path.resolve(process.cwd(), 'public/attachments');
  const absolutePath = path.resolve(process.cwd(), 'public', file.slice(1));
  if (!absolutePath.startsWith(`${attachmentsRoot}${path.sep}`)) {
    throw new Error(`Attachment path escapes public/attachments: ${file}`);
  }

  const kind = getAttachmentKind(file);
  let fileStat;
  try {
    fileStat = await stat(absolutePath);
  } catch {
    throw new Error(`Attachment file does not exist: ${file}`);
  }

  if (!fileStat.isFile()) {
    throw new Error(`Attachment path is not a file: ${file}`);
  }
  if (fileStat.size > ATTACHMENT_MAX_BYTES) {
    throw new Error(`Attachment exceeds the 20 MB limit: ${file}`);
  }

  return { absolutePath, kind, size: fileStat.size };
}
