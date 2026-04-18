import { defineCollection, z } from 'astro:content';

const projects = defineCollection({
    type: 'content',
    schema: z.object({
        title: z.string(),
        description: z.string(),
        category: z.enum(['web', 'design', 'tool', 'mobile']),
        tags: z.array(z.string()),
        featured: z.boolean().default(false),
        image: z.string().optional(),
        liveUrl: z.string().url().optional(),
        githubUrl: z.string().url().optional(),
        date: z.date(),
        draft: z.boolean().default(false),
    }),
});

const thoughts = defineCollection({
    type: 'content',
    schema: z.object({
        title: z.string(),
        description: z.string(),
        category: z.enum(['观点', '设计', '生活']),
        readTime: z.number().default(5),
        date: z.date(),
        featured: z.boolean().default(false),
        draft: z.boolean().default(false),
    }),
});

const life = defineCollection({
    type: 'data',
    schema: z.object({
        title: z.string(),
        caption: z.string().optional(),
        image: z.string(),
        date: z.date(),
        wide: z.boolean().default(false),
        tall: z.boolean().default(false),
    }),
});

export const collections = { projects, thoughts, life };