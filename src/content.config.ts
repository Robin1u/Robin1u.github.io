// src/content.config.ts
import { defineCollection, z } from 'astro:content';
import { glob, file } from 'astro/loaders';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    titleEn: z.string().optional(),
    // 将可能在 CMS 中没填的字段都加上 .optional()
    description: z.string().optional(),
    descriptionEn: z.string().optional(),
    category: z.enum(['web', 'design', 'tool', 'mobile']).optional(),
    tags: z.array(z.string()).optional(),
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
    // 给 thoughts 加上 .optional()，因为后台只有正文没有描述和分类
    description: z.string().optional(),
    category: z.enum(['观点', '设计', '生活']).optional(),
    readTime: z.number().default(5),
    date: z.coerce.date(),       
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

const life = defineCollection({
  loader: file('./src/content/life/index.json'),
  schema: z.object({
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
export const collections = { projects, thoughts, life };
