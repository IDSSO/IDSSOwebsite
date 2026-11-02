import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * News posts. One Markdown file per post in src/content/news/.
 * The file name (without .md) is the slug and becomes the URL: /{slug}/
 * (WordPress permalink structure was /%postname%/, so posts live at the site root.)
 */
const news = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/news' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    author: z.string().default('IDSSO Admins'),
    excerpt: z.string().optional(),
    description: z.string().optional(),
  }),
});

export const collections = { news };
