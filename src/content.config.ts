import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    author: z.string().default('SAPVIK Growth & Engineering Team'),
    category: z.enum(['Local SEO', 'Web Engineering', 'Paid Acquisition', 'Analytics & Attribution']),
    tags: z.array(z.string()),
    readingTime: z.string(),
    featured: z.boolean().default(false),
    relatedServiceSlug: z.string().optional(),
    image: z.string().default('https://sapvik.com/assets/og-image.png')
  })
});

export const collections = { blog };
