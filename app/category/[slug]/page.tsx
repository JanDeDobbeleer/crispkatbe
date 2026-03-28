// app/category/[slug]/page.tsx — posts filtered by category
import { getPostsByCategory } from "@/lib/posts";
import { getAllCategories, getAllCategorySlugs } from "@/lib/categories";
import PostCard from "@/components/PostCard";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

export async function generateStaticParams() {
  return getAllCategorySlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cats = getAllCategories();
  const cat = cats.find((c) => c.slug === slug);
  if (!cat) return {};
  return {
    title: `${cat.name} — crispkat`,
    description: `All posts in the ${cat.name} category`,
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cats = getAllCategories();
  const cat = cats.find((c) => c.slug === slug);
  if (!cat) notFound();

  const posts = getPostsByCategory(slug);
  if (!posts.length) notFound();

  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="font-serif font-bold text-[#a4aeb3] text-3xl mb-2">
          {cat.name}
        </h1>
        <p className="font-serif italic text-sm text-[#999594] mb-4">
          {posts.length} post{posts.length !== 1 ? "s" : ""}
        </p>
        <Link
          href="/"
          className="inline-block border-2 border-[#999594] rounded-full text-[#999594] text-xs font-bold uppercase tracking-widest px-6 py-2 hover:bg-[#e57667] hover:border-[#e57667] hover:text-white transition-all"
        >
          ← All posts
        </Link>
      </div>

      <div>
        {posts.map((post) => (
          <PostCard key={post.slug} post={post} />
        ))}
      </div>
    </>
  );
}
