// lib/categories.ts
import { getAllPostMeta } from "./posts";
import type { Category } from "./types";

export function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

/** Return all categories with post counts, sorted by name. */
export function getAllCategories(): Category[] {
  const posts = getAllPostMeta();
  const map = new Map<string, Category>();

  for (const post of posts) {
    for (const cat of post.categories) {
      const slug = slugify(cat);
      if (!map.has(slug)) {
        map.set(slug, { name: cat, slug, count: 0 });
      }
      map.get(slug)!.count++;
    }
  }

  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** Return all category slugs (for generateStaticParams). */
export function getAllCategorySlugs(): string[] {
  return getAllCategories().map((c) => c.slug);
}
