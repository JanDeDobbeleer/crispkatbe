// app/sitemap.ts
import { getAllPostMeta } from "@/lib/posts";
import { getAllCategories } from "@/lib/categories";
import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const BASE_URL = "https://www.crispkat.be";

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPostMeta();
  const categories = getAllCategories();

  const postEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${BASE_URL}/posts/${post.slug}`,
    lastModified: post.date ? new Date(post.date) : new Date(),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const categoryEntries: MetadataRoute.Sitemap = categories.map((cat) => ({
    url: `${BASE_URL}/category/${cat.slug}`,
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  return [
    { url: BASE_URL, changeFrequency: "daily", priority: 1 },
    ...postEntries,
    ...categoryEntries,
  ];
}
