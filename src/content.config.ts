// src/content.config.ts
import { defineCollection, z } from 'astro:content';
import { glob, file } from 'astro/loaders';

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

const siteChannel = defineCollection({
  loader: glob({ pattern: 'channel.json', base: './src/content/site' }),
  schema: z.object({
    pageTitle: z.string().default('频道'),
    pageTitleEn: z.string().optional(),
    intro: z.string().optional(),
    introEn: z.string().optional(),
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
    category: z.enum(['web', 'design', 'tool', 'mobile']).optional(),
    tags: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    image: z.string().optional(),
    liveUrl: z.string().url().optional(),
    githubUrl: z.string().url().optional(),
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
    image: z.string(),
    date: z.coerce.date(),
    wide: z.boolean().default(false),
    tall: z.boolean().default(false),
  }),
});

// 记得导出 collections
export const collections = { siteHome, siteChannel, projects, thoughts, life };
