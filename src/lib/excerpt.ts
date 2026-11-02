import type { CollectionEntry } from 'astro:content';

/** Strip Markdown syntax to plain text (good enough for excerpt generation). */
export function markdownToText(md: string): string {
  return md
    .replace(/^---[\s\S]*?---/, '')               // frontmatter (if present)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')          // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')       // links → text
    .replace(/^#{1,6}\s+/gm, '')                   // headings
    .replace(/^\s*[-*+]\s+/gm, '')                 // list bullets
    .replace(/^\s*---+\s*$/gm, '')                 // hr
    .replace(/[*_`>]/g, '')                        // emphasis, code, quotes
    .replace(/\s+/g, ' ')
    .trim();
}

/** WordPress-style auto excerpt: first N words + "…" */
export function autoExcerpt(body: string, words = 40): string {
  const text = markdownToText(body);
  const parts = text.split(' ');
  if (parts.length <= words) return text;
  return parts.slice(0, words).join(' ') + '…';
}

export function excerptOf(post: CollectionEntry<'news'>): string {
  return post.data.excerpt ?? autoExcerpt(post.body ?? '');
}
