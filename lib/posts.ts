// lib/posts.ts
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkHtml from "remark-html";
import type { Post, PostMeta } from "./types";

const POSTS_DIR = path.join(process.cwd(), "content", "posts");

function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

function parsePostMeta(slug: string, data: Record<string, unknown>): PostMeta {
  return {
    slug,
    title: String(data.title ?? ""),
    date: String(data.date ?? ""),
    author: String(data.author ?? "crispkat"),
    categories: Array.isArray(data.categories) ? data.categories.map(String) : [],
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    excerpt: String(data.excerpt ?? ""),
    coverImage: String(data.coverImage ?? ""),
  };
}

/** Return all post metadata sorted newest-first. */
export function getAllPostMeta(): PostMeta[] {
  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"));

  const posts = files.map((file) => {
    const slug = file.replace(/\.md$/, "");
    const raw = fs.readFileSync(path.join(POSTS_DIR, file), "utf8");
    const { data } = matter(raw);
    return parsePostMeta(slug, data);
  });

  return posts.sort((a, b) => (a.date < b.date ? 1 : -1));
}

/** Return a single post with rendered HTML content. */
export async function getPostBySlug(slug: string): Promise<Post | null> {
  const filePath = path.join(POSTS_DIR, `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);

  const processed = await remark()
    .use(remarkGfm)
    .use(remarkHtml, { sanitize: false }) // allow raw iframes
    .process(content);

  // Prefix local image paths with the base path so they resolve correctly
  // when the site is deployed to a GitHub Pages sub-path (e.g. /crispkatbe/).
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const html = basePath
    ? processed.toString().replace(/(<img\b[^>]*\ssrc=)(["'])(\/)/g, `$1$2${basePath}/`)
    : processed.toString();

  return {
    ...parsePostMeta(slug, data),
    content: html,
  };
}

/** Return all unique slugs (for generateStaticParams). */
export function getAllSlugs(): string[] {
  return fs
    .readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""));
}

/** Paginate an array of posts. */
export function paginate<T>(items: T[], page: number, pageSize = 10) {
  const total = items.length;
  const totalPages = Math.ceil(total / pageSize);
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const start = (currentPage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    currentPage,
    totalPages,
    total,
  };
}

/** Return posts filtered by category slug. */
export function getPostsByCategory(categorySlug: string): PostMeta[] {
  return getAllPostMeta().filter((p) =>
    p.categories.some((c) => slugify(c) === categorySlug)
  );
}
