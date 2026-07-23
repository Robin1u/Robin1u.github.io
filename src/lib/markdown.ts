import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';

interface MarkdownNode {
  type?: string;
  url?: string;
  identifier?: string;
  children?: MarkdownNode[];
}

function walkMarkdown(node: MarkdownNode, visit: (child: MarkdownNode) => void) {
  visit(node);
  node.children?.forEach((child) => walkMarkdown(child, visit));
}

function isAllowedAttachmentImageUrl(url: string) {
  return /^https?:\/\//i.test(url) || url.startsWith('/attachments/');
}

function validateAttachmentImageSources() {
  return (tree: MarkdownNode) => {
    const imageReferenceIds = new Set<string>();
    const definitions = new Map<string, string>();

    walkMarkdown(tree, (node) => {
      if (node.type === 'image' && node.url && !isAllowedAttachmentImageUrl(node.url)) {
        throw new Error(`Unsupported relative image path in Markdown attachment: ${node.url}`);
      }
      if (node.type === 'imageReference' && node.identifier) {
        imageReferenceIds.add(node.identifier.toLowerCase());
      }
      if (node.type === 'definition' && node.identifier && node.url) {
        definitions.set(node.identifier.toLowerCase(), node.url);
      }
    });

    imageReferenceIds.forEach((identifier) => {
      const url = definitions.get(identifier);
      if (url && !isAllowedAttachmentImageUrl(url)) {
        throw new Error(`Unsupported relative image path in Markdown attachment: ${url}`);
      }
    });
  };
}

export async function renderMarkdownToHtml(markdown: string): Promise<string> {
  const source = String(markdown ?? '').trim();
  if (!source) return '';

  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(source);

  return String(file);
}

export async function renderSafeMarkdownToHtml(markdown: string): Promise<string> {
  const source = String(markdown ?? '').trim();
  if (!source) return '';

  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(validateAttachmentImageSources)
    .use(remarkRehype)
    .use(rehypeSanitize)
    .use(rehypeStringify)
    .process(source);

  return String(file);
}
