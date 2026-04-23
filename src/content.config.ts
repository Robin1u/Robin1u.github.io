// src/content.config.ts
import { defineCollection, z } from 'astro:content';
import { glob, file } from 'astro/loaders';

const optionalUrl = z.preprocess((value) => {
  if (typeof value !== 'string') return value;
  const normalized = value.trim();
  return normalized ? normalized : undefined;
}, z.string().url().optional());

const siteHome = defineCollection({
  loader: glob({ pattern: 'home.json', base: './src/content/site' }),
  schema: z.object({
    name: z.string(),
    nameEn: z.string().optional(),
    heroTag: z.string().optional(),
    heroTagEn: z.string().optional(),
    status: z.string(),
    statusEn: z.string().optional(),
    location: z.string().optional(),
    locationEn: z.string().optional(),
    roles: z.array(z.object({
      zh: z.string(),
      en: z.string().optional(),
    })).default([]),
    heroLeadPrefix: z.string().optional(),
    heroLeadPrefixEn: z.string().optional(),
    heroTypingWord: z.string().optional(),
    heroTypingWordEn: z.string().optional(),
    heroLeadSuffix: z.string().optional(),
    heroLeadSuffixEn: z.string().optional(),
    heroLeadSecondLine: z.string().optional(),
    heroLeadSecondLineEn: z.string().optional(),
    heroDescriptionParagraphs: z.array(z.object({
      zh: z.string(),
      en: z.string().optional(),
    })).default([]),
    aboutTitle: z.string().default('关于我'),
    aboutTitleEn: z.string().optional(),
    aboutParagraphs: z.array(z.object({
      zh: z.string(),
      en: z.string().optional(),
    })).default([]),
    recentTitle: z.string().default('最近在做'),
    recentTitleEn: z.string().optional(),
    contactEmail: z.string().optional(),
    findMeLinks: z.array(z.object({
      platform: z.enum(['github', 'linkedin', 'huggingface', 'website']),
      label: z.string().optional(),
      url: z.string().optional(),
    })).default([]),
    recentItems: z.array(z.object({
      category: z.enum(['learning', 'certification', 'reading', 'project']),
      title: z.string(),
      titleEn: z.string().optional(),
      subtitle: z.string().optional(),
      subtitleEn: z.string().optional(),
      date: z.coerce.date(),
      done: z.boolean().default(false),
    })).default([]),
  }),
});

const sitePages = defineCollection({
  loader: glob({ pattern: 'pages.json', base: './src/content/site' }),
  schema: z.object({
    home: z.object({
      navLabel: z.string().default('首页'),
      navLabelEn: z.string().optional(),
    }),
    portfolio: z.object({
      sectionNumber: z.string().default('02'),
      navLabel: z.string().default('作品集'),
      navLabelEn: z.string().optional(),
      intro: z.string().default('这里收录我正在做和已经完成的项目。从最初的想法，到设计、搭建与迭代，它们记录了我如何把抽象的概念变成具体的结果。'),
      introEn: z.string().optional(),
    }),
    thoughts: z.object({
      sectionNumber: z.string().default('03'),
      navLabel: z.string().default('想法'),
      navLabelEn: z.string().optional(),
      intro: z.string().default('这里整理我持续关心的问题与观察。是观点，是方法，是哲学，是我试着把复杂事情讲清楚的过程。'),
      introEn: z.string().optional(),
    }),
    life: z.object({
      sectionNumber: z.string().default('04'),
      navLabel: z.string().default('生活'),
      navLabelEn: z.string().optional(),
      intro: z.string().default('这里留下生活本身的痕迹，还有那些值得被记住一下的普通时刻。'),
      introEn: z.string().optional(),
    }),
    channel: z.object({
      sectionNumber: z.string().default('05'),
      navLabel: z.string().default('频道'),
      navLabelEn: z.string().optional(),
      intro: z.string().default('这里连接我在不同平台上的持续表达。视频、笔记与日常更新会先在那里发生，再慢慢沉淀成这里的一部分。'),
      introEn: z.string().optional(),
    }),
  }),
});

const siteChannel = defineCollection({
  loader: glob({ pattern: 'channel.json', base: './src/content/site' }),
  schema: z.object({
    channels: z.array(z.object({
      platform: z.enum(['bilibili', 'xiaohongshu', 'github']),
      title: z.string().optional(),
      titleEn: z.string().optional(),
      description: z.string().optional(),
      descriptionEn: z.string().optional(),
      handle: z.string().optional(),
      url: z.string().optional(),
    })).default([]),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    titleEn: z.string().optional(),
    description: z.string().optional(),
    descriptionEn: z.string().optional(),
    bodyEn: z.string().optional(),
    category: z.enum(['web', 'design', 'tool', 'mobile']).optional(),
    tags: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    image: z.string().optional(),
    liveUrl: optionalUrl,
    githubUrl: optionalUrl,
    date: z.coerce.date(),
    draft: z.boolean().default(false),
  }),
});

const thoughts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/thoughts' }),
  schema: z.object({
    title: z.string(),
    titleEn: z.string().optional(),
    description: z.string().optional(),
    descriptionEn: z.string().optional(),
    bodyEn: z.string().optional(),
    category: z.string().optional(),
    tags: z.array(z.string()).default([]),
    readTime: z.number().default(5),
    date: z.coerce.date(),       
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

const life = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/life' }),
  schema: z.object({
    id: z.string().optional(),
    title: z.string(),
    titleEn: z.string().optional(),
    caption: z.string().optional(),
    captionEn: z.string().optional(),
    location: z.string().optional(),
    locationEn: z.string().optional(),
    image: z.string(),
    date: z.coerce.date(),
    wide: z.boolean().default(false),
    tall: z.boolean().default(false),
  }),
});

const cats = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/cats' }),
  schema: z.object({
    id: z.string().optional(),
    title: z.string(),
    titleEn: z.string().optional(),
    caption: z.string().optional(),
    captionEn: z.string().optional(),
    location: z.string().optional(),
    locationEn: z.string().optional(),
    image: z.string(),
    date: z.coerce.date(),
    featured: z.boolean().default(false),
  }),
});

// 记得导出 collections
export const collections = { siteHome, sitePages, siteChannel, projects, thoughts, life, cats };
