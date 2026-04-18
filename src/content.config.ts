// src/content.config.ts
import { defineCollection, z } from 'astro:content';
import { glob, file } from 'astro/loaders';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.enum(['web', 'design', 'tool', 'mobile']),
    tags: z.array(z.string()),
    featured: z.boolean().default(false),
    image: z.string().optional(),
    liveUrl: z.string().url().optional(),
    githubUrl: z.string().url().optional(),
    date: z.coerce.date(),       // ← coerce 自动转换
    draft: z.boolean().default(false),
  }),
});

const thoughts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/thoughts' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.enum(['观点', '设计', '生活']),
    readTime: z.number().default(5),
    date: z.coerce.date(),       // ← coerce 自动转换
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

const life = defineCollection({
  loader: file('./src/content/life/index.json'),
  schema: z.object({
    title: z.string(),
    caption: z.string().optional(),
    image: z.string(),
    date: z.coerce.date(),       // ← coerce 自动转换
    wide: z.boolean().default(false),
    tall: z.boolean().default(false),
  }),
});

export const collections = { projects, thoughts, life };