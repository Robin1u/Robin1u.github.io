#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

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
const cwd = process.cwd();

function printHelp() {
  console.log(`
用法:
  node scripts/bilingual-content.mjs --collection thoughts --source ./draft.txt --slug my-post --write
  node scripts/bilingual-content.mjs --collection projects --source ./draft.txt --target ./src/content/projects/demo.md --write
  node scripts/bilingual-content.mjs --collection thoughts --source ./draft.txt --stdout

必填参数:
  --collection thoughts|projects
  --source     双语原稿文件路径

输出方式:
  --write      直接写入内容文件
  --stdout     输出生成后的 Markdown 到终端

定位方式:
  --target     指定输出文件完整路径
  --slug       当未提供 --target 时，用于自动生成文件名

常用可选参数:
  --date       日期，默认当前时间 ISO 字符串
  --category   分类
  --tags       逗号分隔标签，如 "AI,Research"
  --readTime   仅 thoughts 使用，默认 5
  --featured   true|false，默认 false
  --draft      true|false，默认 false
  --image      封面图路径
  --liveUrl    仅 projects 使用
  --githubUrl  仅 projects 使用
`);
}

function parseArgs(argv) {
  const args = {};

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;

    const key = token.slice(2);
    const next = argv[i + 1];

    if (!next || next.startsWith('--')) {
      args[key] = true;
      continue;
    }

    args[key] = next;
    i += 1;
  }

  return args;
}

function normalizeLineEndings(value) {
  return String(value ?? '').replace(/\r\n?/g, '\n');
}

function parseTaggedSource(rawSource) {
  const source = normalizeLineEndings(rawSource).trim();
  if (!source) {
    throw new Error('双语原稿为空。');
  }

  const matches = [...source.matchAll(/^\[(?<tag>[A-Z_]+)\]\s*$/gm)];
  if (matches.length === 0) {
    throw new Error('未找到标签。请使用 [ZH_TITLE] / [EN_TITLE] / [ZH_BODY] / [EN_BODY] 这类标签。');
  }

  const parsed = {};

  matches.forEach((match, index) => {
    const rawTag = String(match.groups?.tag ?? '').trim().toUpperCase();
    const field = SECTION_ALIASES[rawTag];

    if (!field) {
      throw new Error(`无法识别的标签: [${rawTag}]`);
    }

    if (Object.prototype.hasOwnProperty.call(parsed, field)) {
      throw new Error(`标签重复: [${rawTag}]`);
    }

    const start = match.index + match[0].length;
    const end = index + 1 < matches.length ? matches[index + 1].index : source.length;
    parsed[field] = source.slice(start, end).trim();
  });

  const missing = REQUIRED_FIELDS.filter((field) => !parsed[field]);
  if (missing.length > 0) {
    throw new Error(`缺少必填内容: ${missing.join(', ')}`);
  }

  return parsed;
}

function yamlEscape(value) {
  const text = String(value ?? '');
  return `"${text
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')}"`;
}

function yamlBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  const normalized = String(value ?? '').toLowerCase().trim();
  if (normalized === 'true') return 'true';
  if (normalized === 'false') return 'false';
  return fallback ? 'true' : 'false';
}

function yamlBlock(name, value) {
  const lines = normalizeLineEndings(value).split('\n');
  const indented = lines.map((line) => `  ${line}`).join('\n');
  return `${name}: |\n${indented}`;
}

function makeSlug(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

function resolveTarget(args, parsed) {
  if (args.target) {
    return path.resolve(cwd, args.target);
  }

  const slug = makeSlug(args.slug || parsed.titleEn || parsed.title);
  if (!slug) {
    throw new Error('未提供 --slug，且无法从标题生成文件名。');
  }

  const datePrefix = String(args.date ?? new Date().toISOString())
    .slice(0, 10);

  const baseDir = args.collection === 'thoughts'
    ? path.join(cwd, 'src/content/thoughts')
    : path.join(cwd, 'src/content/projects');

  return path.join(baseDir, `${datePrefix}-${slug}.md`);
}

function buildFrontmatter(args, parsed) {
  const lines = [
    '---',
    `title: ${yamlEscape(parsed.title)}`,
    `titleEn: ${yamlEscape(parsed.titleEn)}`,
  ];

  if (parsed.description) {
    lines.push(`description: ${yamlEscape(parsed.description)}`);
  }

  if (parsed.descriptionEn) {
    lines.push(`descriptionEn: ${yamlEscape(parsed.descriptionEn)}`);
  }

  lines.push(yamlBlock('bodyEn', parsed.bodyEn));

  if (args.category) {
    lines.push(`category: ${yamlEscape(args.category)}`);
  }

  if (args.tags) {
    const tags = String(args.tags)
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    if (tags.length > 0) {
      lines.push('tags:');
      tags.forEach((tag) => lines.push(`  - ${yamlEscape(tag)}`));
    }
  }

  lines.push(`date: ${args.date ?? new Date().toISOString()}`);

  if (args.collection === 'thoughts') {
    lines.push(`readTime: ${Number(args.readTime ?? 5)}`);
  }

  if (args.image) {
    lines.push(`image: ${yamlEscape(args.image)}`);
  }

  if (args.liveUrl) {
    lines.push(`liveUrl: ${yamlEscape(args.liveUrl)}`);
  }

  if (args.githubUrl) {
    lines.push(`githubUrl: ${yamlEscape(args.githubUrl)}`);
  }

  lines.push(`featured: ${yamlBoolean(args.featured, false)}`);
  lines.push(`draft: ${yamlBoolean(args.draft, false)}`);
  lines.push('---');

  return lines.join('\n');
}

function buildDocument(args, parsed) {
  return `${buildFrontmatter(args, parsed)}\n\n${normalizeLineEndings(parsed.body).trim()}\n`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || args.h) {
    printHelp();
    process.exit(0);
  }

  if (!args.collection || !['thoughts', 'projects'].includes(String(args.collection))) {
    throw new Error('请用 --collection 指定 thoughts 或 projects。');
  }

  if (!args.source) {
    throw new Error('请用 --source 指定双语原稿文件路径。');
  }

  if (!args.write && !args.stdout) {
    throw new Error('请至少选择一种输出方式：--write 或 --stdout。');
  }

  const sourcePath = path.resolve(cwd, args.source);
  const rawSource = await fs.readFile(sourcePath, 'utf8');
  const parsed = parseTaggedSource(rawSource);
  const document = buildDocument(args, parsed);

  if (args.stdout) {
    process.stdout.write(document);
  }

  if (args.write) {
    const targetPath = resolveTarget(args, parsed);
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, document, 'utf8');
    console.log(`已写入: ${targetPath}`);
  }
}

main().catch((error) => {
  console.error(`错误: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
