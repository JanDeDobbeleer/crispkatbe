// lib/types.ts

export interface PostMeta {
  title: string;
  date: string;
  author: string;
  categories: string[];
  tags: string[];
  excerpt: string;
  coverImage: string;
  slug: string;
}

export interface Post extends PostMeta {
  content: string; // rendered HTML
}

export interface Category {
  name: string;
  slug: string;
  count: number;
}
