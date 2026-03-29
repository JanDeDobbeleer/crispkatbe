// app/posts/[slug]/page.tsx — individual blog post
import { getPostBySlug, getAllSlugs } from "@/lib/posts";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { withBasePath } from "@/lib/utils";

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return {};

  return {
    title: post.title || "Post",
    description: post.excerpt || undefined,
    openGraph: post.coverImage
      ? { images: [{ url: withBasePath(post.coverImage) }] }
      : undefined,
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const date = new Date(post.date).toLocaleDateString("en-BE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <article className="bg-white px-8 py-12">
      {/* Categories */}
      <div className="flex flex-wrap gap-3 mb-4">
        {post.categories.map((cat) => {
          const catSlug = cat.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
          return (
            <Link
              key={cat}
              href={`/category/${catSlug}`}
              className="text-xs font-bold uppercase tracking-widest text-[#999594] hover:text-[#e57667] transition-colors"
            >
              {cat}
            </Link>
          );
        })}
      </div>

      <h1 className="font-serif font-bold text-[#e57667] text-3xl leading-tight mb-2">
        {post.title || "(untitled)"}
      </h1>

      <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-[#999594] mb-8">
        <time dateTime={post.date}>{date}</time>
        {post.author && <span>&mdash; {post.author}</span>}
      </div>

      {/* Markdown content rendered as HTML */}
      <div
        className="prose max-w-none
          prose-headings:font-serif prose-headings:font-bold prose-headings:text-[#a4aeb3]
          prose-p:text-[#666] prose-p:font-light prose-p:leading-relaxed
          prose-a:text-[#e57667] prose-a:no-underline hover:prose-a:underline
          prose-blockquote:font-serif prose-blockquote:italic prose-blockquote:text-[#a4aeb3] prose-blockquote:border-l-[#a4aeb3]
          prose-strong:font-bold prose-strong:text-[#555]
          prose-li:text-[#666]
          prose-img:rounded"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />

      {/* Tags */}
      {post.tags.length > 0 && (
        <div className="mt-10 pt-6 border-t border-gray-100">
          <p className="text-xs font-bold uppercase tracking-widest text-[#999594] mb-3">
            Tags
          </p>
          <div className="flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-[#e4e8eb] px-3 py-1 text-xs font-bold text-white hover:bg-[#e57667] transition-colors"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8">
        <Link
          href="/"
          className="inline-block border-2 border-[#999594] rounded-full text-[#999594] text-xs font-bold uppercase tracking-widest px-6 py-2 hover:bg-[#e57667] hover:border-[#e57667] hover:text-white transition-all"
        >
          ← All posts
        </Link>
      </div>
    </article>
  );
}
