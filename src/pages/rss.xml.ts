import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const posts = await getCollection('blog');
  const sorted = posts.sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());

  return rss({
    title: 'SAPVIK Insights | Digital Growth & Web Engineering',
    description: 'Technical teardowns on Local SEO, Google Business Profile verification, Core Web Vitals, and conversion rate optimization for commercial businesses.',
    site: context.site || 'https://sapvik.com',
    items: sorted.map((post) => ({
      title: post.data.title,
      pubDate: post.data.pubDate,
      description: post.data.description,
      link: `/blog/${post.id}`,
      categories: [post.data.category, ...post.data.tags]
    })),
    customData: `<language>en-IN</language>`
  });
}
